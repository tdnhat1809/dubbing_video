"""
Extract hardcoded subtitles from video - V3 (Two-Pass)
======================================================
Pipeline:
  PASS 1: YOLO scan all frames → collect raw bbox timeline (fast, no OCR)
  GAP FILL: Interpolate missing bboxes from neighboring detections
  PASS 2: Binarized diff → RapidOCR on changed crops only

Outputs:
  - text_ocr.srt:          Subtitle text with timing
  - subtitle_bboxes.json:  Per-frame bounding box data for hardsub blur masking

Key design:
  - Two-pass separates detection from recognition → cleaner, faster
  - Bbox interpolation fills YOLO gaps (no more missed subtitles)
  - Bottom-zone filter: only accept boxes in bottom 15% of frame
  - Clamp height: prevent including game UI text above subtitle
  - Stable bbox merge: prevent YOLO flickering
  - Dedup lookback: prevent A-B-A-B alternating pattern
  - Min duration filter: skip subs < 0.3s (noise)
"""
import os
import sys
import cv2
import json
import numpy as np
import re
import time
from rapidfuzz import fuzz

# ========================
# CONFIG
# ========================
VIDEO_FILE = "1.mp4"
OUTPUT_SRT = "text_ocr.srt"
OUTPUT_BBOX_JSON = "subtitle_bboxes.json"

# Frame sampling
FRAME_SKIP_SECONDS = 0.1

# YOLO settings
YOLO_CONF = 0.25
YOLO_IMGSZ = 320
YOLO_DEVICE = 0        # 0 = first GPU, 'cpu' for CPU
YOLO_HALF = True        # FP16 half precision

# Bottom zone: only accept YOLO boxes whose bottom edge (y2) > this fraction
BOTTOM_ZONE_FRAC = 0.85  # y2 must be in bottom 15% of frame

# Max subtitle height as fraction of frame height
MAX_SUB_HEIGHT_FRAC = 0.15

# Gap interpolation: max consecutive YOLO misses to interpolate (in sampled frames)
# e.g., 30 = up to 3 seconds at 0.1s skip
MAX_INTERPOLATE_GAP = 30

# OCR / text processing
TEXT_DIFF_THRESHOLD = 20    # Similarity threshold for dedup
MIN_SUB_DURATION = 0.3      # Minimum subtitle duration (seconds)
DEDUP_LOOKBACK = 3          # Recent subs to check for A-B-A-B pattern

# Binarized diff sensitivity
CHANGE_THRESHOLD = 0.015    # 1.5% pixel change = new subtitle


# ========================
# INITIALIZATION
# ========================
def init_yolo():
    """Initialize YOLO model for subtitle region detection."""
    from ultralytics import YOLO
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "best.pt")
    if not os.path.exists(model_path):
        print(f"Error: YOLO model not found at {model_path}")
        sys.exit(1)
    model = YOLO(model_path)
    print(f"  YOLO model loaded: {model_path}")
    return model


def init_ocr():
    """Initialize RapidOCR with CUDA GPU acceleration."""
    import onnxruntime as ort
    providers = ort.get_available_providers()
    use_cuda = 'CUDAExecutionProvider' in providers

    from rapidocr_onnxruntime import RapidOCR
    if use_cuda:
        engine = RapidOCR(det_use_cuda=True, rec_use_cuda=True, cls_use_cuda=True)
        print(f"  RapidOCR initialized (CUDA)")
    else:
        engine = RapidOCR()
        print(f"  RapidOCR initialized (CPU)")
    return engine


# ========================
# UTILITY FUNCTIONS
# ========================
def frame_to_timecode(frame_number, fps):
    """Convert frame number to SRT timecode."""
    total_seconds = frame_number / fps
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)
    milliseconds = int((total_seconds - int(total_seconds)) * 1000)
    return f'{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}'


def timecode_to_seconds(tc):
    """Convert SRT timecode to seconds."""
    parts = tc.replace(',', '.').split(':')
    return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])


def binarize_crop(crop_bgr):
    """Convert crop to binary (white text only) for fast comparison."""
    gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
    return binary


def crop_changed(prev_bin, curr_bin):
    """Compare two binarized crops to detect text changes."""
    if prev_bin is None:
        return True
    if prev_bin.shape != curr_bin.shape:
        return True
    try:
        diff = cv2.absdiff(prev_bin, curr_bin)
        changed_pixels = np.sum(diff > 0)
        change_ratio = changed_pixels / diff.size
        return change_ratio > CHANGE_THRESHOLD
    except Exception:
        return True


def ocr_crop(engine, crop_bgr):
    """Run RapidOCR on cropped subtitle region."""
    try:
        result, _ = engine(crop_bgr)
        if result is None:
            return ""
        texts = [item[1] for item in result if item[2] > 0.5]
        if not texts:
            return ""
        return "".join(texts)
    except Exception as e:
        print(f"  OCR error: {e}")
        return ""


def clean_text(text):
    """Clean OCR output text."""
    if not text:
        return ""
    text = text.replace('\n', '').replace('\r', '')
    text = re.sub(r"[^\u4e00-\u9fa5\s?!'_0-9一——\-，。？！；：a-zA-Z]", '', text)
    text = re.sub(r'^\s*●|●\s*$', '', text)
    text = text.strip()
    if not re.search(r"[^\d\s]", text):
        return ""
    if len(text) < 2:
        return ""
    return text


def is_text_different(text1, text2, threshold=20):
    """Check if two texts are different enough."""
    if not text1 or not text2:
        return True
    similarity = fuzz.partial_ratio(text1, text2)
    return (100 - similarity) >= threshold


def is_duplicate_of_recent(newtext, recent_subs, threshold=20):
    """Check if newtext is a duplicate of any recent subtitle."""
    for sub_text in recent_subs:
        if not is_text_different(newtext, sub_text, threshold):
            return True
    return False


# ========================
# PASS 1: YOLO DETECTION SCAN
# ========================
def detect_subtitle_box_raw(model, frame, frame_height, frame_width):
    """Run YOLO on a single frame. Returns (x1, y1, x2, y2, conf) or None.
    
    Only accepts boxes whose bottom edge is in the bottom zone.
    Clamps height to prevent including game UI text.
    """
    results = model.predict(
        source=frame, show=False, save=False, verbose=False,
        imgsz=YOLO_IMGSZ, conf=YOLO_CONF, device=YOLO_DEVICE, half=YOLO_HALF,
    )
    data = results[0].boxes.data.cpu().numpy()
    if len(data) == 0:
        return None

    # Only accept boxes in the bottom zone
    bottom_zone = frame_height * BOTTOM_ZONE_FRAC
    bottom_boxes = [box for box in data if box[3] > bottom_zone]
    if len(bottom_boxes) == 0:
        return None

    # Pick the box with the largest y2 (most bottom), then widest
    candidates = sorted(bottom_boxes, key=lambda b: (b[3], b[2] - b[0]), reverse=True)
    best = candidates[0]
    x1, y1, x2, y2, conf, cls = best.tolist()

    # Add padding
    x1 = max(int(x1) - 10, 0)
    y1 = max(int(y1) - 10, 0)
    x2 = min(int(x2) + 10, frame_width)
    y2 = min(int(y2) + 10, frame_height)

    # Clamp height
    max_h = int(frame_height * MAX_SUB_HEIGHT_FRAC)
    if (y2 - y1) > max_h:
        y1 = y2 - max_h

    if (y2 - y1) < 5 or (x2 - x1) < 10:
        return None

    return (x1, y1, x2, y2, conf)


def scan_yolo_detections(model, video_path):
    """PASS 1: Scan all sampled frames with YOLO. Returns detection timeline.
    
    Returns:
        detections: list of (frame_num, bbox_or_None)
                    bbox = (x1, y1, x2, y2) or None
        video_info: dict with fps, frame_width, frame_height, total_frames
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Cannot open video {video_path}")
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_skip = max(int(fps * FRAME_SKIP_SECONDS), 1)
    num_samples = total_frames // frame_skip

    video_info = {
        'fps': fps,
        'total_frames': total_frames,
        'frame_width': frame_width,
        'frame_height': frame_height,
        'frame_skip': frame_skip,
    }

    print(f"\n  PASS 1: YOLO Detection Scan")
    print(f"  {'='*45}")
    print(f"  Resolution: {frame_width}x{frame_height}, FPS: {fps:.1f}")
    print(f"  Total frames: {total_frames}, Sampling every {frame_skip} frames")
    print(f"  Frames to scan: ~{num_samples}")

    detections = []  # list of (frame_num, bbox_or_None)
    detected_count = 0
    t0 = time.time()

    frame_number = 0
    scanned = 0
    last_bbox = None  # For stable bbox merge

    while frame_number < total_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = cap.read()
        if not ret:
            break

        scanned += 1
        raw = detect_subtitle_box_raw(model, frame, frame_height, frame_width)

        if raw is not None:
            x1, y1, x2, y2, conf = raw
            # Stable bbox merge with last detection
            if last_bbox is not None:
                lx1, ly1, lx2, ly2 = last_bbox
                overlap_y = max(0, min(y2, ly2) - max(y1, ly1))
                union_y = max(y2, ly2) - min(y1, ly1)
                if union_y > 0 and overlap_y / union_y > 0.5:
                    x1 = min(x1, lx1)
                    x2 = max(x2, lx2)
            
            bbox = (x1, y1, x2, y2)
            last_bbox = bbox
            detected_count += 1
        else:
            bbox = None

        detections.append((frame_number, bbox))

        # Progress every 100 frames
        if scanned % 100 == 0:
            elapsed = time.time() - t0
            pct = scanned / num_samples * 100
            eta = (elapsed / scanned) * (num_samples - scanned) if scanned > 0 else 0
            print(f"  [{pct:5.1f}%] Frame {frame_number}/{total_frames} "
                  f"| Detected: {detected_count}/{scanned} "
                  f"| ETA: {eta:.0f}s")

        frame_number += frame_skip

    cap.release()
    elapsed = time.time() - t0

    detect_rate = detected_count / max(scanned, 1) * 100
    print(f"\n  PASS 1 DONE in {elapsed:.1f}s")
    print(f"  Scanned: {scanned} frames, Detected: {detected_count} ({detect_rate:.1f}%)")
    print(f"  Missed: {scanned - detected_count} frames")

    return detections, video_info


# ========================
# GAP INTERPOLATION
# ========================
def interpolate_bbox_gaps(detections):
    """Fill gaps in YOLO detections by interpolating from neighbors.
    
    For each gap (consecutive None entries):
    - If gap <= MAX_INTERPOLATE_GAP: use bbox from nearest detection
    - If gap > MAX_INTERPOLATE_GAP: leave as None (truly no subtitle)
    
    Returns: list of (frame_num, bbox_or_None, source)
             source = 'yolo', 'interpolated', or 'none'
    """
    n = len(detections)
    filled = []
    
    # Build arrays for easier manipulation
    frames = [d[0] for d in detections]
    bboxes = [d[1] for d in detections]
    sources = ['yolo' if b is not None else 'none' for b in bboxes]
    
    # For each None entry, find nearest detection before and after
    for i in range(n):
        if bboxes[i] is not None:
            filled.append((frames[i], bboxes[i], 'yolo'))
            continue
        
        # Find nearest detection BEFORE
        prev_bbox = None
        prev_dist = 0
        for j in range(i - 1, -1, -1):
            prev_dist = i - j
            if bboxes[j] is not None:
                prev_bbox = bboxes[j]
                break
        
        # Find nearest detection AFTER
        next_bbox = None
        next_dist = 0
        for j in range(i + 1, n):
            next_dist = j - i
            if bboxes[j] is not None:
                next_bbox = bboxes[j]
                break
        
        # Decide whether to interpolate
        # Use nearest available bbox if within MAX_INTERPOLATE_GAP
        chosen_bbox = None
        if prev_bbox is not None and prev_dist <= MAX_INTERPOLATE_GAP:
            if next_bbox is not None and next_dist <= MAX_INTERPOLATE_GAP:
                # Both available — use whichever is closer
                if prev_dist <= next_dist:
                    chosen_bbox = prev_bbox
                else:
                    chosen_bbox = next_bbox
            else:
                chosen_bbox = prev_bbox
        elif next_bbox is not None and next_dist <= MAX_INTERPOLATE_GAP:
            chosen_bbox = next_bbox
        
        if chosen_bbox is not None:
            filled.append((frames[i], chosen_bbox, 'interpolated'))
        else:
            filled.append((frames[i], None, 'none'))
    
    # Stats
    yolo_count = sum(1 for f in filled if f[2] == 'yolo')
    interp_count = sum(1 for f in filled if f[2] == 'interpolated')
    none_count = sum(1 for f in filled if f[2] == 'none')
    
    print(f"\n  GAP INTERPOLATION")
    print(f"  {'='*45}")
    print(f"  YOLO direct:    {yolo_count}")
    print(f"  Interpolated:   {interp_count}")
    print(f"  No subtitle:    {none_count}")
    print(f"  Total coverage: {yolo_count + interp_count}/{len(filled)} "
          f"({(yolo_count + interp_count) / max(len(filled), 1) * 100:.1f}%)")
    
    return filled


# ========================
# PASS 2: OCR EXTRACTION
# ========================
def extract_text_from_detections(filled_detections, video_info, video_path, engine):
    """PASS 2: OCR on changed crops using filled detection bboxes.
    
    Returns:
        all_subs: list of {'text', 'start', 'end'}
        bbox_timeline: list of {'frame', 'time', 'bbox', 'source'} for JSON output
    """
    fps = video_info['fps']
    frame_skip = video_info['frame_skip']
    frame_height = video_info['frame_height']
    frame_width = video_info['frame_width']
    total_frames = video_info['total_frames']
    
    print(f"\n  PASS 2: OCR Extraction")
    print(f"  {'='*45}")
    
    cap = cv2.VideoCapture(video_path)
    
    # State
    current_text = ""
    start_time_srt = ""
    end_time_srt = ""
    prev_crop_bin = None
    recent_subs = []
    all_subs = []
    bbox_timeline = []
    
    # Stats
    ocr_calls = 0
    skipped_same = 0
    skipped_dedup = 0
    
    t0 = time.time()
    total_to_scan = len(filled_detections)
    
    def save_current_sub():
        nonlocal current_text, start_time_srt, end_time_srt
        if current_text and start_time_srt and end_time_srt:
            all_subs.append({
                'text': current_text,
                'start': start_time_srt,
                'end': end_time_srt,
            })
            recent_subs.append(current_text)
            if len(recent_subs) > DEDUP_LOOKBACK:
                recent_subs.pop(0)
        current_text = ""
        start_time_srt = ""
        end_time_srt = ""
    
    for idx, (frame_num, bbox, source) in enumerate(filled_detections):
        new_start = frame_to_timecode(frame_num, fps)
        new_end = frame_to_timecode(frame_num + frame_skip, fps)
        frame_time = frame_num / fps
        
        # Record bbox for timeline
        bbox_entry = {
            'frame': frame_num,
            'time': round(frame_time, 3),
            'bbox': list(bbox) if bbox is not None else None,
            'source': source,
        }
        bbox_timeline.append(bbox_entry)
        
        if bbox is None:
            # No subtitle in this frame
            save_current_sub()
            prev_crop_bin = None
            continue
        
        # Read frame and crop
        x1, y1, x2, y2 = bbox
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
        ret, frame = cap.read()
        if not ret:
            continue
        
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            save_current_sub()
            prev_crop_bin = None
            continue
        
        # Binarize and diff
        crop_bin = binarize_crop(crop)
        
        if not crop_changed(prev_crop_bin, crop_bin):
            # Same subtitle text — just extend
            skipped_same += 1
            if current_text:
                end_time_srt = new_end
            continue
        
        prev_crop_bin = crop_bin.copy()
        
        # OCR on changed crop
        ocr_calls += 1
        raw_text = ocr_crop(engine, crop)
        newtext = clean_text(raw_text)
        
        if newtext:
            if is_text_different(newtext, current_text, TEXT_DIFF_THRESHOLD):
                # Check dedup against recent subs
                if is_duplicate_of_recent(newtext, recent_subs, TEXT_DIFF_THRESHOLD):
                    skipped_dedup += 1
                    if current_text:
                        end_time_srt = new_end
                    continue
                
                # New subtitle
                save_current_sub()
                current_text = newtext
                start_time_srt = new_start
                end_time_srt = new_end
                tag = "(interp)" if source == 'interpolated' else ""
                print(f"  [{len(all_subs)+1}] {new_start} {tag} {current_text}")
            else:
                end_time_srt = new_end
        else:
            # OCR returned empty — could be transition frame
            # Don't immediately close; only close if next frame also empty
            pass
        
        # Progress every 200 frames
        if (idx + 1) % 200 == 0:
            elapsed = time.time() - t0
            pct = (idx + 1) / total_to_scan * 100
            eta = (elapsed / (idx + 1)) * (total_to_scan - idx - 1) if idx > 0 else 0
            print(f"  [{pct:5.1f}%] OCR calls: {ocr_calls} | Subs: {len(all_subs)+1} | ETA: {eta:.0f}s")
    
    # Save last subtitle
    save_current_sub()
    cap.release()
    
    elapsed = time.time() - t0
    print(f"\n  PASS 2 DONE in {elapsed:.1f}s")
    print(f"  OCR calls:      {ocr_calls}")
    print(f"  Skipped (same):  {skipped_same}")
    print(f"  Skipped (dedup): {skipped_dedup}")
    print(f"  Raw subs:        {len(all_subs)}")
    
    return all_subs, bbox_timeline


# ========================
# POST-PROCESSING
# ========================
def post_process_subs(all_subs):
    """Filter short subs and merge duplicates."""
    filtered = []
    for sub in all_subs:
        dur = timecode_to_seconds(sub['end']) - timecode_to_seconds(sub['start'])
        if dur < MIN_SUB_DURATION:
            continue
        
        if filtered and not is_text_different(sub['text'], filtered[-1]['text'], TEXT_DIFF_THRESHOLD):
            filtered[-1]['end'] = sub['end']
        else:
            filtered.append(sub)
    
    return filtered


def write_srt(subs, output_path):
    """Write subtitle list to SRT file."""
    with open(output_path, "w", encoding="utf-8") as f:
        for i, sub in enumerate(subs, 1):
            f.write(f"{i}\n{sub['start']} --> {sub['end']}\n{sub['text']}\n\n")


def write_bbox_json(bbox_timeline, video_info, video_path, output_path):
    """Write per-frame bbox timeline to JSON for blur masking."""
    data = {
        'video': os.path.basename(video_path),
        'fps': video_info['fps'],
        'resolution': [video_info['frame_width'], video_info['frame_height']],
        'frame_skip': video_info['frame_skip'],
        'total_entries': len(bbox_timeline),
        'bboxes': bbox_timeline,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ========================
# MAIN PIPELINE
# ========================
def process_video_v3(video_path, output_srt=OUTPUT_SRT, output_bbox=OUTPUT_BBOX_JSON):
    """Two-pass subtitle extraction pipeline."""
    total_start = time.time()
    
    # Clean outputs
    for f in [output_srt, output_bbox]:
        if os.path.exists(f):
            os.remove(f)
    
    # Init models
    print("Initializing models...")
    model = init_yolo()
    engine = init_ocr()
    
    # ===== PASS 1: YOLO Detection Scan =====
    detections, video_info = scan_yolo_detections(model, video_path)
    
    # ===== GAP INTERPOLATION =====
    filled = interpolate_bbox_gaps(detections)
    
    # ===== PASS 2: OCR Extraction =====
    all_subs, bbox_timeline = extract_text_from_detections(
        filled, video_info, video_path, engine
    )
    
    # ===== POST-PROCESSING =====
    print(f"\n  POST-PROCESSING")
    print(f"  {'='*45}")
    filtered_subs = post_process_subs(all_subs)
    print(f"  Raw subs: {len(all_subs)} → Filtered: {len(filtered_subs)}")
    
    # ===== WRITE OUTPUTS =====
    write_srt(filtered_subs, output_srt)
    write_bbox_json(bbox_timeline, video_info, video_path, output_bbox)
    
    total_elapsed = time.time() - total_start
    
    print(f"\n{'='*55}")
    print(f"  ALL DONE in {total_elapsed:.1f}s ({total_elapsed/60:.1f} min)")
    print(f"  Final subtitles: {len(filtered_subs)}")
    print(f"  SRT output:  {output_srt}")
    print(f"  Bbox output: {output_bbox}")
    print(f"{'='*55}")


if __name__ == "__main__":
    video_file = VIDEO_FILE
    if len(sys.argv) > 1:
        video_file = sys.argv[1]

    if not os.path.exists(video_file):
        print(f"Error: File not found: {video_file}")
        sys.exit(1)

    os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

    print(f"=== Subtitle Extraction V3 (Two-Pass) ===")
    print(f"  PASS 1: YOLO scan → collect bboxes")
    print(f"  GAP:    Interpolate missing bboxes")
    print(f"  PASS 2: Binarized diff → RapidOCR")
    print()
    process_video_v3(video_file)

    if os.path.exists(OUTPUT_SRT):
        print(f"\nSRT Preview (first 30 lines):")
        with open(OUTPUT_SRT, "r", encoding="utf-8") as f:
            lines = f.read().strip().split('\n')
        print('\n'.join(lines[:30]))

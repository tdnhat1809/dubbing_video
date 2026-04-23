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
  - Constrained bbox smoothing: reduce YOLO flicker without widening across subtitles
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
FRAME_SKIP_SECONDS = 0.05

# YOLO settings
YOLO_CONF = 0.25
YOLO_IMGSZ = 640
# Auto-detect: use GPU if CUDA available, otherwise CPU
try:
    import torch
    YOLO_DEVICE = 0 if torch.cuda.is_available() else 'cpu'
    YOLO_HALF = torch.cuda.is_available()  # FP16 only works on GPU
except ImportError:
    YOLO_DEVICE = 'cpu'
    YOLO_HALF = False

# Bottom zone: only accept YOLO boxes whose bottom edge (y2) > this fraction
BOTTOM_ZONE_FRAC = 0.82  # y2 must be in bottom 18% of frame

# Max subtitle height as fraction of frame height
MAX_SUB_HEIGHT_FRAC = 0.15

# Multi-sub settings (for detecting subtitles at multiple positions)
MULTI_SUB_IMGSZ = 640       # Higher resolution for multi-position detection
MULTI_SUB_CONF = 0.10       # Lower confidence to catch more subs
MULTI_SUB_MIN_AREA = 300    # Min box area to filter noise
MULTI_SUB_Y_MERGE = 60      # Y-distance threshold to merge into same track (pixels)

# Gap interpolation: max consecutive YOLO misses to interpolate (in sampled frames)
# e.g., 30 = up to 3 seconds at 0.1s skip
MAX_INTERPOLATE_GAP = 50

# OCR / text processing
TEXT_DIFF_THRESHOLD = 12    # Lower = treat small OCR changes as new subtitles
MIN_SUB_DURATION = 0.15     # Keep short dialogue beats instead of dropping them
DEDUP_LOOKBACK = 3          # Recent subs to check for A-B-A-B pattern

# Binarized diff sensitivity
CHANGE_THRESHOLD = 0.01     # Lower = OCR more subtitle transitions
GOOGLE_CHANGE_THRESHOLD = 0.02
OCR_EVERY_BBOX_FRAME = False

# Google OCR fallback: if the first frame of a new crop group returns empty,
# OCR up to N additional early frames from that same group before giving up.
GOOGLE_EMPTY_GROUP_RETRY_FRAMES = 2


# ========================
# INITIALIZATION
# ========================
def init_yolo():
    """Initialize YOLO model for subtitle region detection."""
    from ultralytics import YOLO
    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model_last_train", "best (3).pt")
    if not os.path.exists(model_path):
        print(f"Error: YOLO model not found at {model_path}")
        sys.exit(1)
    model = YOLO(model_path)
    print(f"  YOLO model loaded: {model_path}")
    return model


def init_ocr(ocr_engine='google'):
    """Initialize OCR engine.
    
    Args:
        ocr_engine: 'google' for Google Drive OCR, 'rapidocr' for local RapidOCR
    
    Returns:
        engine object (or 'google' string for Google Drive OCR)
    """
    if ocr_engine == 'google':
        # Validate Google credentials exist
        root_dir = os.path.dirname(os.path.abspath(__file__))
        creds_path = os.path.join(root_dir, 'credentials.json')
        token_path = os.path.join(root_dir, 'token.json')
        if not os.path.exists(creds_path):
            print(f"  WARNING: credentials.json not found, falling back to RapidOCR")
            return init_ocr('rapidocr')
        if not os.path.exists(token_path):
            print(f"  WARNING: token.json not found, falling back to RapidOCR")
            return init_ocr('rapidocr')
        print(f"  Google Drive OCR initialized")
        return 'google'
    else:
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


def seconds_to_timecode(sec):
    """Convert seconds to SRT timecode (HH:MM:SS,mmm)."""
    sec = max(0, sec)
    hours = int(sec // 3600)
    minutes = int((sec % 3600) // 60)
    secs = int(sec % 60)
    millis = int((sec - int(sec)) * 1000)
    return f'{hours:02}:{minutes:02}:{secs:02},{millis:03}'


def binarize_crop(crop_bgr):
    """Convert crop to binary for fast comparison.
    
    Uses adaptive threshold + Otsu to handle varied backgrounds.
    """
    gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
    # Use Otsu's method for dynamic threshold
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return binary


def crop_changed(prev_bin, curr_bin, threshold=None):
    """Compare two binarized crops to detect text changes."""
    if threshold is None:
        threshold = CHANGE_THRESHOLD
    if prev_bin is None:
        return True
    if prev_bin.shape != curr_bin.shape:
        return True
    try:
        diff = cv2.absdiff(prev_bin, curr_bin)
        changed_pixels = np.sum(diff > 0)
        change_ratio = changed_pixels / diff.size
        return change_ratio > threshold
    except Exception:
        return True


def should_ocr_bbox_frame(prev_bin, curr_bin, threshold=None):
    """Decide whether a bbox frame should be sent to OCR."""
    if OCR_EVERY_BBOX_FRAME:
        return True
    return crop_changed(prev_bin, curr_bin, threshold=threshold)


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
    """Clean OCR output text (handles both RapidOCR and Google Docs output)."""
    if not text:
        return ""
    # Remove BOM
    text = text.replace('\ufeff', '')
    # Remove Google Docs artifacts: lines of underscores, horizontal rules
    text = re.sub(r'_+', '', text)
    text = re.sub(r'-{3,}', '', text)
    # Collapse whitespace
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

    best = select_best_bottom_box(data, frame_height, frame_width)
    if best is None:
        return None

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


def select_best_bottom_box(boxes, frame_height, frame_width):
    """Pick the most subtitle-like bottom box from a YOLO result set.

    The local YOLO preview generally gets the correct centered hardsub box, but
    the pipeline previously picked "lowest then widest", which over-selected
    false positives touching the left/right edges. This scorer still prefers
    low boxes, but penalizes edge-hugging and off-center candidates.
    """
    bottom_zone = frame_height * BOTTOM_ZONE_FRAC
    center_x = frame_width / 2
    edge_margin = frame_width * 0.03
    scored = []

    for box in boxes:
        x1, y1, x2, y2, conf, cls = box.tolist()
        if y2 <= bottom_zone:
            continue

        width = max(x2 - x1, 1)
        height = max(y2 - y1, 1)
        width_frac = width / frame_width
        box_center_x = (x1 + x2) / 2
        center_offset = abs(box_center_x - center_x) / max(center_x, 1)
        touches_left = x1 <= edge_margin
        touches_right = x2 >= (frame_width - edge_margin)

        bottom_score = (y2 / frame_height) * 2.0
        conf_score = conf * 1.5
        center_score = max(0.0, 1.0 - center_offset) * 1.6

        width_score = 0.0
        if 0.15 <= width_frac <= 0.58:
            width_score += 0.45
        elif width_frac > 0.70:
            width_score -= (width_frac - 0.70) * 3.5

        edge_penalty = 0.0
        if touches_left:
            edge_penalty += 0.9
        if touches_right:
            edge_penalty += 0.9
        if touches_left or touches_right:
            edge_penalty += max(width_frac - 0.45, 0) * 2.5

        shape_penalty = 0.0
        if height / max(width, 1) > 0.35:
            shape_penalty += 0.4

        score = bottom_score + conf_score + center_score + width_score - edge_penalty - shape_penalty
        scored.append((score, box))

    if not scored:
        return None

    scored.sort(key=lambda item: item[0], reverse=True)
    return scored[0][1]


def detect_all_subtitle_boxes(model, frame, frame_height, frame_width):
    """Run YOLO on a single frame. Returns ALL detected subtitle boxes.
    
    Used for multi-sub mode: detects subtitles at any position.
    Returns: list of (x1, y1, x2, y2, conf) or empty list.
    """
    results = model.predict(
        source=frame, show=False, save=False, verbose=False,
        imgsz=MULTI_SUB_IMGSZ, conf=MULTI_SUB_CONF, device=YOLO_DEVICE, half=YOLO_HALF,
    )
    data = results[0].boxes.data.cpu().numpy()
    if len(data) == 0:
        return []

    boxes = []
    for box in data:
        x1, y1, x2, y2, conf, cls = box.tolist()
        
        # Add padding
        x1 = max(int(x1) - 10, 0)
        y1 = max(int(y1) - 5, 0)
        x2 = min(int(x2) + 10, frame_width)
        y2 = min(int(y2) + 5, frame_height)
        
        # Filter tiny boxes (noise)
        area = (x2 - x1) * (y2 - y1)
        if area < MULTI_SUB_MIN_AREA:
            continue
        
        # Clamp height
        max_h = int(frame_height * MAX_SUB_HEIGHT_FRAC)
        if (y2 - y1) > max_h:
            y1 = y2 - max_h
        
        if (y2 - y1) < 5 or (x2 - x1) < 10:
            continue
        
        boxes.append((x1, y1, x2, y2, conf))
    
    return boxes


def smooth_bbox_with_previous(curr_bbox, last_bbox):
    """Lightly smooth bbox jitter when two consecutive detections are truly similar.

    The previous implementation unioned x1/x2 whenever the Y ranges overlapped.
    That was too aggressive: different subtitles usually sit on the same Y band,
    so the box could keep expanding left/right over time until it touched frame
    edges. Here we only smooth when the boxes overlap in both X and Y and their
    centers stay close; otherwise we trust the current YOLO detection as-is.
    """
    if curr_bbox is None or last_bbox is None:
        return curr_bbox

    x1, y1, x2, y2 = curr_bbox
    lx1, ly1, lx2, ly2 = last_bbox

    curr_w = max(x2 - x1, 1)
    curr_h = max(y2 - y1, 1)
    last_w = max(lx2 - lx1, 1)
    last_h = max(ly2 - ly1, 1)

    overlap_x = max(0, min(x2, lx2) - max(x1, lx1))
    overlap_y = max(0, min(y2, ly2) - max(y1, ly1))
    union_x = max(x2, lx2) - min(x1, lx1)
    union_y = max(y2, ly2) - min(y1, ly1)

    if union_x <= 0 or union_y <= 0:
        return curr_bbox

    overlap_x_ratio = overlap_x / union_x
    overlap_y_ratio = overlap_y / union_y
    center_x = (x1 + x2) / 2
    last_center_x = (lx1 + lx2) / 2
    center_shift = abs(center_x - last_center_x)
    max_w = max(curr_w, last_w)
    width_ratio = max(curr_w, last_w) / max(min(curr_w, last_w), 1)
    height_ratio = max(curr_h, last_h) / max(min(curr_h, last_h), 1)

    similar_position = center_shift <= max_w * 0.18
    similar_shape = width_ratio <= 1.25 and height_ratio <= 1.2
    if overlap_x_ratio < 0.45 or overlap_y_ratio < 0.65 or not similar_position or not similar_shape:
        return curr_bbox

    alpha = 0.85  # keep current YOLO box dominant, only damp small jitter
    return (
        int(round(lx1 * (1 - alpha) + x1 * alpha)),
        int(round(ly1 * (1 - alpha) + y1 * alpha)),
        int(round(lx2 * (1 - alpha) + x2 * alpha)),
        int(round(ly2 * (1 - alpha) + y2 * alpha)),
    )


def can_interpolate_between_bboxes(prev_bbox, next_bbox):
    """Return True only when two anchor boxes plausibly describe the same subtitle."""
    if prev_bbox is None or next_bbox is None:
        return True

    x1, y1, x2, y2 = prev_bbox
    nx1, ny1, nx2, ny2 = next_bbox

    prev_w = max(x2 - x1, 1)
    prev_h = max(y2 - y1, 1)
    next_w = max(nx2 - nx1, 1)
    next_h = max(ny2 - ny1, 1)

    overlap_x = max(0, min(x2, nx2) - max(x1, nx1))
    overlap_y = max(0, min(y2, ny2) - max(y1, ny1))
    union_x = max(x2, nx2) - min(x1, nx1)
    union_y = max(y2, ny2) - min(y1, ny1)
    if union_x <= 0 or union_y <= 0:
        return False

    overlap_x_ratio = overlap_x / union_x
    overlap_y_ratio = overlap_y / union_y
    center_x = (x1 + x2) / 2
    next_center_x = (nx1 + nx2) / 2
    center_shift = abs(center_x - next_center_x)
    max_w = max(prev_w, next_w)
    width_ratio = max(prev_w, next_w) / max(min(prev_w, next_w), 1)
    height_ratio = max(prev_h, next_h) / max(min(prev_h, next_h), 1)

    similar_position = center_shift <= max_w * 0.25
    similar_shape = width_ratio <= 1.45 and height_ratio <= 1.3
    return (
        overlap_x_ratio >= 0.35
        and overlap_y_ratio >= 0.55
        and similar_position
        and similar_shape
    )


def scan_yolo_detections(model, video_path, multi_sub=False):
    """PASS 1: Scan all sampled frames with YOLO. Returns detection timeline.
    
    Args:
        multi_sub: If True, detect ALL subtitle boxes (multi-position).
                   If False, detect single best bottom box (default).
    
    Returns:
        detections: list of (frame_num, bbox_or_None) for single mode
                    list of (frame_num, [box1, box2, ...]) for multi mode
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

    mode_label = "Multi-Sub" if multi_sub else "Single-Sub"
    print(f"\n  PASS 1: YOLO Detection Scan ({mode_label})")
    print(f"  {'='*45}")
    print(f"  Resolution: {frame_width}x{frame_height}, FPS: {fps:.1f}")
    device_label = f"cuda:{YOLO_DEVICE}" if YOLO_DEVICE != 'cpu' else 'cpu'
    print(f"  Total frames: {total_frames}, Sampling every {frame_skip} frames")
    print(f"  Inference device: {device_label}")
    print(f"  Frames to scan: ~{num_samples}")

    detections = []  # list of (frame_num, bbox_or_None) or (frame_num, [boxes])
    detected_count = 0
    t0 = time.time()

    scanned = 0
    last_bbox = None  # For constrained bbox smoothing between similar frames

    frame_number = 0
    while frame_number < total_frames:
        ret, frame = cap.read()
        if not ret:
            break

        scanned += 1
        
        if multi_sub:
            # Multi-sub mode: detect ALL boxes
            boxes = detect_all_subtitle_boxes(model, frame, frame_height, frame_width)
            if boxes:
                detected_count += 1
            detections.append((frame_number, boxes))  # list of boxes
        else:
            # Single-sub mode: detect best bottom box (default)
            raw = detect_subtitle_box_raw(model, frame, frame_height, frame_width)

            if raw is not None:
                x1, y1, x2, y2, conf = raw
                bbox = smooth_bbox_with_previous((x1, y1, x2, y2), last_bbox)
                last_bbox = bbox
                detected_count += 1
            else:
                bbox = None
                last_bbox = None

            detections.append((frame_number, bbox))

        # Progress every 100 frames
        if scanned % 100 == 0:
            elapsed = time.time() - t0
            pct = scanned / num_samples * 100
            eta = (elapsed / scanned) * (num_samples - scanned) if scanned > 0 else 0
            print(f"  [{pct:5.1f}%] Frame {frame_number}/{total_frames} "
                  f"| Detected: {detected_count}/{scanned} "
                  f"| ETA: {eta:.0f}s")

        for _ in range(frame_skip - 1):
            if not cap.grab():
                frame_number = total_frames
                break
        frame_number += frame_skip

    cap.release()
    elapsed = time.time() - t0

    detect_rate = detected_count / max(scanned, 1) * 100
    print(f"\n  PASS 1 DONE in {elapsed:.1f}s")
    print(f"  Scanned: {scanned} frames, Detected: {detected_count} ({detect_rate:.1f}%)")
    print(f"  Missed: {scanned - detected_count} frames")

    return detections, video_info


# ========================
# FAST YOLO: GPU BATCH + THREADED PREFETCH
# ========================
def _probe_best_bottom_box(result, frame_height, frame_width):
    """Return a finite best subtitle box for probe comparisons, or None."""
    data = result.boxes.data.detach().cpu().numpy()
    if len(data) == 0:
        return None

    best = select_best_bottom_box(data, frame_height, frame_width)
    if best is None:
        return None

    box = np.asarray(best[:4], dtype=np.float32)
    if not np.isfinite(box).all():
        return None
    return tuple(float(v) for v in box.tolist())


def _bbox_iou(box_a, box_b):
    """Simple IoU for probe validation."""
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b
    inter_x1 = max(ax1, bx1)
    inter_y1 = max(ay1, by1)
    inter_x2 = min(ax2, bx2)
    inter_y2 = min(ay2, by2)
    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h
    if inter_area <= 0:
        return 0.0

    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    denom = area_a + area_b - inter_area
    if denom <= 0:
        return 0.0
    return inter_area / denom


def _resolve_safe_batch_size(model, video_path, requested_batch_size, frame_height, frame_width):
    """Pick the largest stable fast-scan batch size for this runtime/video.

    Some Windows/CUDA runtimes misbehave only at larger batch sizes. We compare
    batched predictions against single-frame predictions on real consecutive
    frames from the target video, then keep the largest batch size whose bottom
    subtitle boxes stay consistent.
    """
    if requested_batch_size <= 1:
        return requested_batch_size

    probe_cap = cv2.VideoCapture(video_path)
    if not probe_cap.isOpened():
        return requested_batch_size

    try:
        total_frames = int(probe_cap.get(cv2.CAP_PROP_FRAME_COUNT))
        sample_positions = sorted(set([
            0,
            max(total_frames // 8, 0),
            max(total_frames // 4, 0),
            max(total_frames // 2, 0),
            max((total_frames * 3) // 4, 0),
        ]))
        candidate_batch_sizes = []
        for candidate in [requested_batch_size, 6, 5, 4, 3, 2]:
            candidate = min(candidate, requested_batch_size)
            if candidate >= 2 and candidate not in candidate_batch_sizes:
                candidate_batch_sizes.append(candidate)

        for candidate in candidate_batch_sizes:
            tested_positive_sample = False
            candidate_ok = True

            for pos in sample_positions:
                probe_cap.set(cv2.CAP_PROP_POS_FRAMES, pos)
                batch_frames = []
                for _ in range(candidate):
                    ret, frame = probe_cap.read()
                    if not ret or frame is None:
                        break
                    batch_frames.append(np.ascontiguousarray(frame.copy()))

                if len(batch_frames) < candidate:
                    continue

                single_results = []
                for frame in batch_frames:
                    result = model.predict(
                        source=[frame], show=False, save=False, verbose=False,
                        imgsz=YOLO_IMGSZ, conf=YOLO_CONF, device=YOLO_DEVICE, half=YOLO_HALF,
                    )[0]
                    single_results.append(_probe_best_bottom_box(result, frame_height, frame_width))

                if not any(box is not None for box in single_results):
                    continue

                tested_positive_sample = True
                batch_results = model.predict(
                    source=batch_frames, show=False, save=False, verbose=False,
                    imgsz=YOLO_IMGSZ, conf=YOLO_CONF, device=YOLO_DEVICE, half=YOLO_HALF,
                )
                batch_boxes = [
                    _probe_best_bottom_box(result, frame_height, frame_width)
                    for result in batch_results
                ]

                for single_box, batch_box in zip(single_results, batch_boxes):
                    if single_box is None:
                        continue
                    if batch_box is None or _bbox_iou(single_box, batch_box) < 0.5:
                        candidate_ok = False
                        break

                if not candidate_ok:
                    break

            if tested_positive_sample and candidate_ok:
                return candidate

        # Inconclusive probe: keep a conservative fast batch size instead of
        # disabling fast mode entirely.
        return min(requested_batch_size, 4)
    finally:
        probe_cap.release()


def scan_yolo_fast(model, video_path, batch_size=None, multi_sub=False):
    """Optimized YOLO detection using GPU batch inference + threaded frame prefetch.
    
    Strategy:
    - Background thread reads frames into a buffer (I/O bound)
    - Main thread sends batches to GPU YOLO (compute bound)
    - Overlap I/O and compute for maximum throughput
    
    Args:
        model: YOLO model
        video_path: Path to video file
        batch_size: Frames per batch (None=auto: 8 for GPU, 1 for CPU)
        multi_sub: If True, falls back to sequential (batch not supported)
    
    Returns:
        detections, video_info (same format as scan_yolo_detections)
    """
    import threading
    from queue import Queue
    
    # Multi-sub not supported in batch mode
    if multi_sub:
        return scan_yolo_detections(model, video_path, multi_sub=True)
    
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
    
    # Auto batch size
    if batch_size is None:
        if YOLO_DEVICE != 'cpu':
            batch_size = 8  # GPU: process 8 frames at once
        else:
            batch_size = 1  # CPU: no benefit from batching
    
    # Short video or batch=1: use sequential
    video_duration = total_frames / fps
    if batch_size <= 1 or video_duration < 10:
        cap.release()
        return scan_yolo_detections(model, video_path, multi_sub=False)

    resolved_batch_size = _resolve_safe_batch_size(
        model, video_path, batch_size, frame_height, frame_width
    )
    if resolved_batch_size != batch_size:
        print(f"\n  PASS 1: FAST YOLO Detection (batch={batch_size}, GPU)")
        print(f"  {'='*50}")
        print(f"  Adjusted batch size for runtime stability: {batch_size} -> {resolved_batch_size}")
        batch_size = resolved_batch_size

    print(f"\n  PASS 1: FAST YOLO Detection (batch={batch_size}, GPU)")
    print(f"  {'='*50}")
    print(f"  Resolution: {frame_width}x{frame_height}, FPS: {fps:.1f}")
    print(f"  Total frames: {total_frames}, Duration: {video_duration:.1f}s")
    print(f"  Frames to scan: ~{num_samples} (skip every {frame_skip})")
    print(f"  Batch size: {batch_size}")
    
    # Threaded frame reader
    frame_queue = Queue(maxsize=batch_size * 3)  # Buffer 3 batches ahead
    read_done = threading.Event()
    
    def frame_reader():
        """Background thread: read frames into queue.
        Uses sequential read (fast) when frame_skip=1, seek only when skipping.
        """
        fn = 0
        if frame_skip == 1:
            # Sequential read - much faster than seeking every frame
            while fn < total_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                # Detach from OpenCV's internal decode buffer before handing
                # frames to another thread / batched predictor. Without this,
                # some Windows + CUDA setups intermittently batch-infer on
                # reused frame memory and return zero detections.
                frame_queue.put((fn, np.ascontiguousarray(frame.copy())))
                fn += 1
        else:
            # Skip frames - need to seek or skip-read
            while fn < total_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                frame_queue.put((fn, np.ascontiguousarray(frame.copy())))
                fn += frame_skip
                # Skip intermediate frames by reading and discarding
                for _ in range(frame_skip - 1):
                    cap.read()
        read_done.set()
    
    reader_thread = threading.Thread(target=frame_reader, daemon=True)
    reader_thread.start()
    
    detections = []
    detected_count = 0
    scanned = 0
    last_bbox = None
    t0 = time.time()
    
    while True:
        # Collect a batch of frames
        batch_frames = []
        batch_frame_nums = []
        
        while len(batch_frames) < batch_size:
            if read_done.is_set() and frame_queue.empty():
                break
            try:
                fn, frame = frame_queue.get(timeout=0.5)
                batch_frames.append(frame)
                batch_frame_nums.append(fn)
            except:
                if read_done.is_set():
                    break
        
        if not batch_frames:
            break
        
        # Batch YOLO inference
        results = model.predict(
            source=batch_frames, show=False, save=False, verbose=False,
            imgsz=YOLO_IMGSZ, conf=YOLO_CONF, device=YOLO_DEVICE, half=YOLO_HALF,
        )
        
        # Process each result
        for i, (frame_num, result) in enumerate(zip(batch_frame_nums, results)):
            scanned += 1
            data = result.boxes.data.cpu().numpy()
            
            bbox = None
            if len(data) > 0:
                best = select_best_bottom_box(data, frame_height, frame_width)
                if best is not None:
                    x1, y1, x2, y2, conf_val, cls = best.tolist()
                    
                    x1 = max(int(x1) - 10, 0)
                    y1 = max(int(y1) - 10, 0)
                    x2 = min(int(x2) + 10, frame_width)
                    y2 = min(int(y2) + 10, frame_height)
                    
                    max_h = int(frame_height * MAX_SUB_HEIGHT_FRAC)
                    if (y2 - y1) > max_h:
                        y1 = y2 - max_h
                    
                    if (y2 - y1) >= 5 and (x2 - x1) >= 10:
                        bbox = smooth_bbox_with_previous((x1, y1, x2, y2), last_bbox)
                        last_bbox = bbox
                        detected_count += 1
                    else:
                        last_bbox = None
                else:
                    last_bbox = None
            else:
                last_bbox = None
            
            detections.append((frame_num, bbox))
        
        # Progress
        if scanned % 100 < batch_size:
            elapsed = time.time() - t0
            pct = scanned / num_samples * 100
            fps_rate = scanned / max(elapsed, 0.01)
            eta = (num_samples - scanned) / max(fps_rate, 0.01)
            print(f"  [{pct:5.1f}%] Frame {batch_frame_nums[-1]}/{total_frames} "
                  f"| Detected: {detected_count}/{scanned} "
                  f"| {fps_rate:.0f} fr/s | ETA: {eta:.0f}s")
    
    reader_thread.join(timeout=5)
    cap.release()
    elapsed = time.time() - t0
    
    detect_rate = detected_count / max(scanned, 1) * 100
    fps_rate = scanned / max(elapsed, 0.01)
    print(f"\n  PASS 1 DONE (FAST) in {elapsed:.1f}s ({fps_rate:.0f} frames/sec)")
    print(f"  Scanned: {scanned} frames, Detected: {detected_count} ({detect_rate:.1f}%)")

    # Safety fallback: on some Windows/CUDA setups, batch inference can
    # silently return zero detections for the entire video even though the
    # same model detects correctly frame-by-frame. In that case, rerun the
    # reliable sequential scan instead of continuing to OCR with empty bboxes.
    if scanned > 0 and detected_count == 0:
        print(f"  WARNING: Fast batch scan returned 0 detections.")
        print(f"  Falling back to sequential YOLO scan for verification...")
        return scan_yolo_detections(model, video_path, multi_sub=False)

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
    
    i = 0
    while i < n:
        if bboxes[i] is not None:
            filled.append((frames[i], bboxes[i], 'yolo'))
            i += 1
            continue

        gap_start = i
        while i < n and bboxes[i] is None:
            i += 1
        gap_end = i - 1
        gap_len = gap_end - gap_start + 1

        prev_idx = gap_start - 1
        next_idx = i if i < n else None
        prev_bbox = bboxes[prev_idx] if prev_idx >= 0 else None
        next_bbox = bboxes[next_idx] if next_idx is not None else None

        can_fill_gap = gap_len <= MAX_INTERPOLATE_GAP
        if can_fill_gap and prev_bbox is not None and next_bbox is not None:
            can_fill_gap = can_interpolate_between_bboxes(prev_bbox, next_bbox)
        elif can_fill_gap and prev_bbox is None and next_bbox is None:
            can_fill_gap = False

        for k in range(gap_start, gap_end + 1):
            if not can_fill_gap:
                filled.append((frames[k], None, 'none'))
                continue

            prev_dist = (k - prev_idx) if prev_bbox is not None else None
            next_dist = (next_idx - k) if next_bbox is not None else None
            if prev_bbox is not None and next_bbox is not None:
                chosen_bbox = prev_bbox if prev_dist <= next_dist else next_bbox
            elif prev_bbox is not None:
                chosen_bbox = prev_bbox
            else:
                chosen_bbox = next_bbox
            filled.append((frames[k], chosen_bbox, 'interpolated'))

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
    
    Supports two modes:
    - Google Drive OCR: batch-collect all changed crops, then OCR concurrently
    - RapidOCR: sequential OCR (original behavior)
    
    Returns:
        all_subs: list of {'text', 'start', 'end'}
        bbox_timeline: list of {'frame', 'time', 'bbox', 'source'} for JSON output
    """
    use_google = (engine == 'google')
    
    if use_google:
        return _extract_with_google_ocr(filled_detections, video_info, video_path)
    else:
        return _extract_with_rapidocr(filled_detections, video_info, video_path, engine)


def _extract_with_google_ocr(filled_detections, video_info, video_path):
    """PASS 2 (Google Drive OCR): Batch collect crops → concurrent OCR."""
    from google_drive_ocr import MAX_WORKERS_PER_ACCOUNT, batch_ocr_cv2_images
    
    fps = video_info['fps']
    frame_skip = video_info['frame_skip']
    total_to_scan = len(filled_detections)
    
    print(f"\n  PASS 2: OCR Extraction (Google Drive OCR)")
    print(f"  {'='*45}")
    
    # ---- PASS 2a: Collect changed crops ----
    print(f"  Phase A: Collecting changed crops...")
    cap = cv2.VideoCapture(video_path)
    
    prev_crop_bin = None
    crops_to_ocr = []      # List of (idx, crop_bgr)
    crop_metadata = []     # Parallel list: (idx, frame_num, bbox, source, start_tc, end_tc)
    bbox_timeline = []
    skipped_same = 0
    current_group_idx = None
    group_retry_candidates = {}  # changed_idx -> [early_same_crop_1, early_same_crop_2]
    
    for idx, (frame_num, bbox, source) in enumerate(filled_detections):
        frame_time = frame_num / fps
        new_start = frame_to_timecode(frame_num, fps)
        new_end = frame_to_timecode(frame_num + frame_skip, fps)
        
        bbox_entry = {
            'frame': frame_num,
            'time': round(frame_time, 3),
            'bbox': list(bbox) if bbox is not None else None,
            'source': source,
        }
        bbox_timeline.append(bbox_entry)
        
        if bbox is None:
            # Mark as gap
            crop_metadata.append((idx, frame_num, None, source, new_start, new_end))
            prev_crop_bin = None
            current_group_idx = None
            continue
        
        x1, y1, x2, y2 = bbox
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
        ret, frame = cap.read()
        if not ret:
            crop_metadata.append((idx, frame_num, None, source, new_start, new_end))
            current_group_idx = None
            continue
        
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            crop_metadata.append((idx, frame_num, None, source, new_start, new_end))
            prev_crop_bin = None
            current_group_idx = None
            continue
        
        crop_bin = binarize_crop(crop)
        
        if not should_ocr_bbox_frame(prev_crop_bin, crop_bin, threshold=GOOGLE_CHANGE_THRESHOLD):
            skipped_same += 1
            # Mark as "same as previous" - will extend timing later
            crop_metadata.append((idx, frame_num, 'same', source, new_start, new_end))
            if current_group_idx is not None:
                retries = group_retry_candidates.setdefault(current_group_idx, [])
                if len(retries) < GOOGLE_EMPTY_GROUP_RETRY_FRAMES:
                    retries.append(crop.copy())
            continue
        
        prev_crop_bin = crop_bin.copy()
        crops_to_ocr.append((idx, crop.copy()))
        crop_metadata.append((idx, frame_num, 'changed', source, new_start, new_end))
        current_group_idx = idx
        group_retry_candidates[current_group_idx] = []
        
        if (idx + 1) % 200 == 0:
            pct = (idx + 1) / total_to_scan * 100
            print(f"  [{pct:5.1f}%] Crops collected: {len(crops_to_ocr)} | Skipped: {skipped_same}")
    
    cap.release()
    print(f"  Collected: {len(crops_to_ocr)} changed crops, skipped {skipped_same} same")
    
    # ---- PASS 2b: Batch Google OCR ----
    print(f"  Phase B: Google Drive OCR ({len(crops_to_ocr)} images, {MAX_WORKERS_PER_ACCOUNT} workers/account)...")
    t0 = time.time()
    
    ocr_results = {}  # idx → text
    if crops_to_ocr:
        ocr_results = batch_ocr_cv2_images(crops_to_ocr, workers=MAX_WORKERS_PER_ACCOUNT, cleanup=True)
        empty_first_groups = {
            group_idx: candidate_frames
            for group_idx, candidate_frames in group_retry_candidates.items()
            if candidate_frames and not clean_text(ocr_results.get(group_idx, ""))
        }
    else:
        empty_first_groups = {}

    group_retry_texts = {}
    empty_group_retry_calls = 0
    empty_group_recovered = 0
    if empty_first_groups:
        group_retry_texts, empty_group_retry_calls, empty_group_recovered = _run_google_empty_group_retry(
            empty_first_groups, batch_ocr_cv2_images, MAX_WORKERS_PER_ACCOUNT
        )
    
    elapsed = time.time() - t0
    print(f"  Google OCR done in {elapsed:.1f}s")
    
    # ---- PASS 2c: Assemble subtitles ----
    print(f"  Phase C: Assembling subtitles...")
    
    current_text = ""
    start_time_srt = ""
    end_time_srt = ""
    recent_subs = []
    all_subs = []
    skipped_dedup = 0
    pending_empty_group = False
    
    def save_current_sub():
        nonlocal current_text, start_time_srt, end_time_srt
        if current_text and start_time_srt and end_time_srt:
            all_subs.append({'text': current_text, 'start': start_time_srt, 'end': end_time_srt})
            recent_subs.append(current_text)
            if len(recent_subs) > DEDUP_LOOKBACK:
                recent_subs.pop(0)
        current_text = ""
        start_time_srt = ""
        end_time_srt = ""
    
    for meta in crop_metadata:
        idx, frame_num, status, source, new_start, new_end = meta
        
        if status is None:
            # No bbox / no frame
            pending_empty_group = False
            save_current_sub()
            continue
        
        if status == 'same':
            # Same crop as previous → extend
            if current_text and not pending_empty_group:
                end_time_srt = new_end
            continue
        
        # status == 'changed' → get OCR result
        raw_text = ocr_results.get(idx, "")
        newtext = clean_text(raw_text)
        if not newtext:
            retry_text = group_retry_texts.get(idx, "")
            if retry_text:
                newtext = retry_text
                print(f"  [Google OCR] Recovered group start @ {new_start}: {newtext[:40]}")
        
        if newtext:
            if pending_empty_group and current_text and not is_text_different(newtext, current_text, TEXT_DIFF_THRESHOLD):
                end_time_srt = new_end
                pending_empty_group = False
                continue

            pending_empty_group = False
            if is_text_different(newtext, current_text, TEXT_DIFF_THRESHOLD):
                if is_duplicate_of_recent(newtext, recent_subs, TEXT_DIFF_THRESHOLD):
                    skipped_dedup += 1
                    if current_text:
                        end_time_srt = new_end
                    continue
                
                save_current_sub()
                current_text = newtext
                start_time_srt = new_start
                end_time_srt = new_end
                tag = "(interp)" if source == 'interpolated' else ""
                print(f"  [{len(all_subs)+1}] {new_start} {tag} {current_text}")
            else:
                end_time_srt = new_end
        else:
            # New bbox group still produced no text after retry; keep the old
            # subtitle frozen at its last confirmed end instead of dragging it
            # through blank / false-positive subtitle regions.
            pending_empty_group = True
    
    save_current_sub()
    
    print(f"\n  PASS 2 DONE (Google OCR)")
    print(f"  OCR calls:       {len(crops_to_ocr)}")
    print(f"  Empty retries:   {empty_group_retry_calls} frames, {empty_group_recovered} groups recovered")
    print(f"  Skipped (same):  {skipped_same}")
    print(f"  Skipped (dedup): {skipped_dedup}")
    print(f"  Raw subs:        {len(all_subs)}")
    
    return all_subs, bbox_timeline


def _extract_with_rapidocr(filled_detections, video_info, video_path, engine):
    """PASS 2 (RapidOCR): Sequential OCR — original behavior."""
    fps = video_info['fps']
    frame_skip = video_info['frame_skip']
    frame_height = video_info['frame_height']
    frame_width = video_info['frame_width']
    total_frames = video_info['total_frames']
    
    print(f"\n  PASS 2: OCR Extraction (RapidOCR)")
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
        
        if not should_ocr_bbox_frame(prev_crop_bin, crop_bin, threshold=CHANGE_THRESHOLD):
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
    print(f"\n  PASS 2 DONE (RapidOCR) in {elapsed:.1f}s")
    print(f"  OCR calls:      {ocr_calls}")
    print(f"  Skipped (same):  {skipped_same}")
    print(f"  Skipped (dedup): {skipped_dedup}")
    print(f"  Raw subs:        {len(all_subs)}")
    
    return all_subs, bbox_timeline


# ========================
# POST-PROCESSING
# ========================
def post_process_subs(all_subs, video_duration=None):
    """Filter short subs, merge duplicates, and adjust timing to match hardsub."""
    PADDING_START = 0.15   # Extend start 0.15s earlier (hardsub appears before detection)
    PADDING_END = 0.2      # Extend end 0.2s later (hardsub lingers after last detection)
    
    filtered = []
    for sub in all_subs:
        # Apply timing padding to better match actual hardsub
        start_sec = max(0, timecode_to_seconds(sub['start']) - PADDING_START)
        end_sec = timecode_to_seconds(sub['end']) + PADDING_END
        if video_duration:
            end_sec = min(end_sec, video_duration)
        
        sub['start'] = seconds_to_timecode(start_sec)
        sub['end'] = seconds_to_timecode(end_sec)
        
        dur = end_sec - start_sec
        if dur < MIN_SUB_DURATION:
            continue
        
        if filtered and not is_text_different(sub['text'], filtered[-1]['text'], TEXT_DIFF_THRESHOLD):
            filtered[-1]['end'] = sub['end']
        else:
            filtered.append(sub)
    
    # Fix overlaps: ensure sub[i].end <= sub[i+1].start
    for i in range(len(filtered) - 1):
        end_i = timecode_to_seconds(filtered[i]['end'])
        start_next = timecode_to_seconds(filtered[i+1]['start'])
        if end_i > start_next:
            # Split the difference
            mid = (end_i + start_next) / 2
            filtered[i]['end'] = seconds_to_timecode(mid)
            filtered[i+1]['start'] = seconds_to_timecode(mid)
    
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


def get_video_info(video_path, frame_skip=None):
    """Read video metadata for extraction/retry flows."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    cap.release()

    if frame_skip is None:
        frame_skip = max(int(fps * FRAME_SKIP_SECONDS), 1)

    return {
        'fps': fps,
        'total_frames': total_frames,
        'frame_width': frame_width,
        'frame_height': frame_height,
        'frame_skip': max(int(frame_skip), 1),
    }


def build_single_sub_bbox_timeline(filled_detections, fps):
    """Convert single-sub detections into subtitle_bboxes.json entries."""
    timeline = []
    for frame_num, bbox, source in filled_detections:
        timeline.append({
            'frame': int(frame_num),
            'time': round(frame_num / fps, 3),
            'bbox': list(bbox) if bbox is not None else None,
            'source': source,
        })
    return timeline


def build_multi_sub_bbox_timeline(detections, fps):
    """Convert multi-sub raw detections into retryable bbox entries."""
    timeline = []
    for frame_num, boxes in detections:
        if not boxes:
            continue
        for box in boxes:
            x1, y1, x2, y2 = box[:4]
            timeline.append({
                'frame': int(frame_num),
                'time': round(frame_num / fps, 3),
                'x1': int(x1),
                'y1': int(y1),
                'x2': int(x2),
                'y2': int(y2),
                'source': 'yolo',
            })
    return timeline


def load_retry_data_from_bbox_json(bbox_path, video_path, multi_sub=False):
    """Load existing bbox data so OCR can be retried without rerunning YOLO."""
    with open(bbox_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    entries = sorted(data.get('bboxes', []), key=lambda e: int(e.get('frame', 0)))
    if not entries:
        raise ValueError(f"No bbox entries found in {bbox_path}")

    frame_skip = data.get('frame_skip')
    video_info = get_video_info(video_path, frame_skip=frame_skip)
    resolution = data.get('resolution') or []
    if len(resolution) >= 2:
        video_info['frame_width'] = int(resolution[0] or video_info['frame_width'])
        video_info['frame_height'] = int(resolution[1] or video_info['frame_height'])
    if data.get('fps'):
        video_info['fps'] = float(data['fps'])
    if frame_skip:
        video_info['frame_skip'] = max(int(frame_skip), 1)

    if multi_sub:
        frame_map = {}
        for entry in entries:
            if entry.get('bbox') is not None:
                x1, y1, x2, y2 = entry['bbox']
            elif all(k in entry for k in ('x1', 'y1', 'x2', 'y2')):
                x1, y1, x2, y2 = entry['x1'], entry['y1'], entry['x2'], entry['y2']
            else:
                continue
            frame_num = int(entry.get('frame', 0))
            frame_map.setdefault(frame_num, []).append((int(x1), int(y1), int(x2), int(y2), 1.0))

        detections = [(frame_num, frame_map[frame_num]) for frame_num in sorted(frame_map)]
        if not detections:
            raise ValueError(f"No multi-sub detections found in {bbox_path}")
        return detections, video_info

    filled_detections = []
    for entry in entries:
        frame_num = int(entry.get('frame', 0))
        raw_bbox = entry.get('bbox')
        bbox = tuple(int(v) for v in raw_bbox) if raw_bbox is not None else None
        source = entry.get('source', 'yolo' if bbox is not None else 'none')
        filled_detections.append((frame_num, bbox, source))

    return filled_detections, video_info


def _run_google_empty_group_retry(group_retry_candidates, batch_ocr_fn, workers):
    """Retry 1-2 early frames for groups whose first OCR result was empty."""
    if not group_retry_candidates:
        return {}, 0, 0

    retry_tasks = []
    retry_lookup = {}
    for group_idx, candidate_frames in group_retry_candidates.items():
        retry_ids = []
        for retry_no, crop in enumerate(candidate_frames[:GOOGLE_EMPTY_GROUP_RETRY_FRAMES], start=1):
            retry_id = f"g{group_idx}_r{retry_no}"
            retry_tasks.append((retry_id, crop))
            retry_ids.append(retry_id)
        if retry_ids:
            retry_lookup[group_idx] = retry_ids

    if not retry_tasks:
        return {}, 0, 0

    print(f"  [Google OCR] Empty-first-frame retry: {len(retry_tasks)} frames from {len(retry_lookup)} groups")
    retry_results = batch_ocr_fn(retry_tasks, workers=workers, cleanup=True)

    recovered_texts = {}
    recovered_count = 0
    for group_idx, retry_ids in retry_lookup.items():
        for retry_id in retry_ids:
            text = clean_text(retry_results.get(retry_id, ""))
            if text:
                recovered_texts[group_idx] = text
                recovered_count += 1
                break

    print(f"  [Google OCR] Empty-first-frame recovered: {recovered_count}/{len(retry_lookup)} groups")
    return recovered_texts, len(retry_tasks), recovered_count


# ========================
# MULTI-SUB: Track Clustering + Multi-Track OCR
# ========================
def _cluster_boxes_to_tracks(detections, video_info):
    """Group multi-sub detections into position-based tracks."""
    y_merge = MULTI_SUB_Y_MERGE
    all_entries = []
    for frame_num, boxes in detections:
        if not boxes:
            continue
        for box in boxes:
            x1, y1, x2, y2, conf = box
            y_center = (y1 + y2) / 2
            all_entries.append((y_center, frame_num, (x1, y1, x2, y2)))
    
    if not all_entries:
        return {}
    
    all_entries.sort(key=lambda e: e[0])
    tracks = {}
    track_id = 0
    
    for y_center, frame_num, bbox in all_entries:
        matched = None
        for tid, track in tracks.items():
            if abs(track['y_center'] - y_center) < y_merge:
                matched = tid
                break
        
        if matched is not None:
            tracks[matched]['detections'].append((frame_num, bbox))
            n = len(tracks[matched]['detections'])
            tracks[matched]['y_center'] = (tracks[matched]['y_center'] * (n-1) + y_center) / n
        else:
            tracks[track_id] = {'y_center': y_center, 'detections': [(frame_num, bbox)]}
            track_id += 1
    
    # Filter tracks with too few detections (noise)
    tracks = {tid: t for tid, t in tracks.items() if len(t['detections']) >= 3}
    
    # Per-track gap interpolation: fill missing frames within each track
    frame_skip = video_info.get('frame_skip', 3)
    max_gap = MAX_INTERPOLATE_GAP  # max gap in sampled frames
    for tid, track in tracks.items():
        dets = sorted(track['detections'], key=lambda d: d[0])
        if len(dets) < 2:
            continue
        filled = []
        for i in range(len(dets)):
            filled.append(dets[i])
            if i < len(dets) - 1:
                gap = (dets[i+1][0] - dets[i][0]) // frame_skip
                if 0 < gap <= max_gap:
                    # Fill gap frames with interpolated bbox
                    bbox_a = dets[i][1]  # (x1, y1, x2, y2)
                    bbox_b = dets[i+1][1]
                    for g in range(1, int(gap)):
                        t_ratio = g / gap
                        interp_bbox = (
                            int(bbox_a[0] + (bbox_b[0] - bbox_a[0]) * t_ratio),
                            int(bbox_a[1] + (bbox_b[1] - bbox_a[1]) * t_ratio),
                            int(bbox_a[2] + (bbox_b[2] - bbox_a[2]) * t_ratio),
                            int(bbox_a[3] + (bbox_b[3] - bbox_a[3]) * t_ratio),
                        )
                        interp_frame = dets[i][0] + g * frame_skip
                        filled.append((interp_frame, interp_bbox))
        track['detections'] = sorted(filled, key=lambda d: d[0])
    
    print(f"  Clustered into {len(tracks)} tracks:")
    for tid, track in sorted(tracks.items(), key=lambda x: x[1]['y_center']):
        y_pct = track['y_center'] / video_info['frame_height'] * 100
        print(f"    Track {tid}: y={track['y_center']:.0f} ({y_pct:.0f}%) | {len(track['detections'])} frames")
    
    return tracks


def _extract_multi_track_google_ocr(detections, video_info, video_path):
    """PASS 2 (Multi-Sub): OCR each track separately."""
    from google_drive_ocr import MAX_WORKERS_PER_ACCOUNT, batch_ocr_cv2_images
    
    fps = video_info['fps']
    frame_skip = video_info['frame_skip']
    frame_height = video_info['frame_height']
    
    print(f"\n  PASS 2: Multi-Track OCR (Google Drive OCR)")
    print(f"  {'='*45}")
    
    tracks = _cluster_boxes_to_tracks(detections, video_info)
    if not tracks:
        print("  No tracks found!")
        return [], []
    
    cap = cv2.VideoCapture(video_path)
    all_subs = []
    all_track_subs = {}  # tid → list of subs per track
    all_bbox_timeline = []
    
    for tid, track in sorted(tracks.items(), key=lambda x: x[1]['y_center']):
        print(f"\n  --- Track {tid} (y={track['y_center']:.0f}) ---")
        
        crops_to_ocr = []
        crop_metadata = []
        prev_crop_bin = None
        skipped_same = 0
        idx = 0
        current_group_idx = None
        group_retry_candidates = {}
        
        for frame_num, bbox in track['detections']:
            x1, y1, x2, y2 = bbox
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            if not ret:
                current_group_idx = None
                continue
            
            crop = frame[y1:y2, x1:x2]
            if crop.size == 0:
                current_group_idx = None
                continue
            
            start_tc = frame_to_timecode(frame_num, fps)
            end_tc = frame_to_timecode(min(frame_num + frame_skip, video_info['total_frames']), fps)
            crop_bin = binarize_crop(crop)
            
            # Add ALL detection frames to bbox_timeline for blur coverage
            all_bbox_timeline.append({'frame': frame_num, 'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2, 'track': tid})
            
            if not should_ocr_bbox_frame(prev_crop_bin, crop_bin, threshold=GOOGLE_CHANGE_THRESHOLD):
                skipped_same += 1
                crop_metadata.append((idx, frame_num, 'same', bbox, start_tc, end_tc))
                if current_group_idx is not None:
                    retries = group_retry_candidates.setdefault(current_group_idx, [])
                    if len(retries) < GOOGLE_EMPTY_GROUP_RETRY_FRAMES:
                        retries.append(crop.copy())
                idx += 1
                continue
            
            prev_crop_bin = crop_bin.copy()
            crops_to_ocr.append((idx, crop))
            crop_metadata.append((idx, frame_num, 'changed', bbox, start_tc, end_tc))
            current_group_idx = idx
            group_retry_candidates[current_group_idx] = []
            idx += 1
        
        print(f"  Crops: {len(crops_to_ocr)} changed, {skipped_same} same")
        if not crops_to_ocr:
            continue
        
        ocr_results = batch_ocr_cv2_images(crops_to_ocr, workers=MAX_WORKERS_PER_ACCOUNT, cleanup=True)
        empty_first_groups = {
            group_idx: candidate_frames
            for group_idx, candidate_frames in group_retry_candidates.items()
            if candidate_frames and not clean_text(ocr_results.get(group_idx, ""))
        }
        group_retry_texts = {}
        empty_group_retry_calls = 0
        empty_group_recovered = 0
        if empty_first_groups:
            group_retry_texts, empty_group_retry_calls, empty_group_recovered = _run_google_empty_group_retry(
                empty_first_groups, batch_ocr_cv2_images, MAX_WORKERS_PER_ACCOUNT
            )
        
        # Assemble subtitles for this track
        current_text = ""
        start_tc = ""
        end_tc = ""
        track_subs = []
        pending_empty_group = False
        
        def save_sub():
            nonlocal current_text, start_tc, end_tc
            if current_text and start_tc and end_tc:
                track_subs.append({
                    'text': current_text, 'start': start_tc, 'end': end_tc,
                    'track': tid,
                    'position': {'y_center': int(track['y_center']),
                                 'y_pct': round(track['y_center'] / frame_height * 100, 1)},
                })
            current_text = ""
            start_tc = ""
            end_tc = ""
        
        for meta in crop_metadata:
            i, fn, status, bbox, s_tc, e_tc = meta
            if status == 'same':
                if current_text and not pending_empty_group:
                    end_tc = e_tc
                continue
            raw = ocr_results.get(i, "")
            text = clean_text(raw)
            if not text:
                retry_text = group_retry_texts.get(i, "")
                if retry_text:
                    text = retry_text
                    print(f"  [Google OCR] Track {tid} recovered group start @ {s_tc}: {text[:40]}")
            if text:
                if pending_empty_group and current_text and not is_text_different(text, current_text, TEXT_DIFF_THRESHOLD):
                    end_tc = e_tc
                    pending_empty_group = False
                    continue

                pending_empty_group = False
                if is_text_different(text, current_text, TEXT_DIFF_THRESHOLD):
                    save_sub()
                    current_text = text
                    start_tc = s_tc
                    end_tc = e_tc
                else:
                    end_tc = e_tc
            else:
                pending_empty_group = True
        save_sub()
        
        print(f"  Track {tid}: {len(track_subs)} subtitles")
        print(f"    Empty retries: {empty_group_retry_calls} frames, {empty_group_recovered} groups recovered")
        for i, s in enumerate(track_subs[:3]):
            print(f"    [{i+1}] {s['start']} {s['text'][:40]}")
        all_track_subs[tid] = track_subs
        all_subs.extend(track_subs)
    
    cap.release()
    
    # Strategy: use DOMINANT track (most subs) as main SRT output
    # All tracks still contribute bbox data for blur
    if all_track_subs:
        dominant_tid = max(all_track_subs, key=lambda t: len(all_track_subs[t]))
        dominant_subs = all_track_subs[dominant_tid]
        dominant_count = len(dominant_subs)
        total_count = len(all_subs)
        
        print(f"\n  Dominant track: {dominant_tid} ({dominant_count} subs, "
              f"{dominant_count*100//max(total_count,1)}% of {total_count} total)")
        print(f"  Using dominant track for SRT, all tracks for blur")
        
        # Sort dominant track subs by start time
        dominant_subs.sort(key=lambda s: timecode_to_seconds(s['start']))
        final_subs = dominant_subs
    else:
        final_subs = []
    
    print(f"\n  PASS 2 DONE (Multi-Track): {len(tracks)} tracks, {len(final_subs)} subs (SRT)")
    return final_subs, all_bbox_timeline


# ========================
# MAIN PIPELINE
# ========================
def process_video_v3(video_path, output_srt=OUTPUT_SRT, output_bbox=OUTPUT_BBOX_JSON,
                     ocr_engine='google', multi_sub=False, batch_size=None,
                     retry_from='full', reuse_bbox_path=None,
                     detect_zone_top=None, ocr_every_bbox_frame=False,
                     crop_change_threshold=None, text_diff_threshold=None,
                     min_sub_duration=None):
    """Two-pass subtitle extraction pipeline.
    
    Args:
        video_path: Path to the video file
        output_srt: Output SRT file path
        output_bbox: Output bbox JSON file path
        ocr_engine: 'google' for Google Drive OCR (default), 'rapidocr' for local OCR
        multi_sub: If True, detect subtitles at multiple positions
        batch_size: GPU batch size for YOLO detection (None=auto, 1=sequential)
        retry_from: 'full' (YOLO + OCR) or 'ocr' (reuse existing bbox + OCR only)
        reuse_bbox_path: Existing subtitle_bboxes.json path for OCR-only retry
        detect_zone_top: Custom detection zone top boundary (0-1 fraction, default 0.82).
                         Lower value = detect subtitles higher in frame.
    """
    total_start = time.time()

    # Override detection zone if custom value provided
    global BOTTOM_ZONE_FRAC, OCR_EVERY_BBOX_FRAME, CHANGE_THRESHOLD
    global GOOGLE_CHANGE_THRESHOLD, TEXT_DIFF_THRESHOLD, MIN_SUB_DURATION
    if detect_zone_top is not None:
        BOTTOM_ZONE_FRAC = detect_zone_top
        print(f"  Custom detection zone: top={detect_zone_top:.0%} (detect bottom {(1-detect_zone_top)*100:.0f}% of frame)")
    if ocr_every_bbox_frame:
        OCR_EVERY_BBOX_FRAME = True
        print(f"  Debug OCR mode: OCR every frame that has a bbox")
    if crop_change_threshold is not None:
        CHANGE_THRESHOLD = crop_change_threshold
        GOOGLE_CHANGE_THRESHOLD = crop_change_threshold
        print(f"  OCR crop-change threshold: {crop_change_threshold:.4f}")
    if text_diff_threshold is not None:
        TEXT_DIFF_THRESHOLD = text_diff_threshold
        print(f"  Text diff threshold: {text_diff_threshold}")
    if min_sub_duration is not None:
        MIN_SUB_DURATION = min_sub_duration
        print(f"  Minimum subtitle duration: {min_sub_duration:.3f}s")

    if retry_from not in ('full', 'ocr'):
        raise ValueError("retry_from must be 'full' or 'ocr'")

    clear_paths = [output_srt]
    same_bbox_path = (
        reuse_bbox_path and
        os.path.abspath(reuse_bbox_path) == os.path.abspath(output_bbox)
    )
    if retry_from != 'ocr' or not same_bbox_path:
        clear_paths.append(output_bbox)

    for f in clear_paths:
        if os.path.exists(f):
            os.remove(f)
    
    mode_label = "Multi-Sub" if multi_sub else "Single-Sub"
    batch_label = f", Batch: {batch_size or 'auto'}" if not multi_sub else ""
    retry_label = ", Retry: OCR-Only" if retry_from == 'ocr' else ""
    print(f"Initializing models (OCR: {ocr_engine}, Mode: {mode_label}{batch_label}{retry_label})...")
    engine = init_ocr(ocr_engine)

    if retry_from == 'ocr':
        bbox_source = reuse_bbox_path or output_bbox
        if not bbox_source or not os.path.exists(bbox_source):
            raise FileNotFoundError(f"Existing bbox file not found: {bbox_source}")

        print(f"\n  RETRY: OCR ONLY")
        print(f"  {'='*45}")
        print(f"  Reusing bbox data from: {bbox_source}")

        retry_data, video_info = load_retry_data_from_bbox_json(
            bbox_source, video_path, multi_sub=multi_sub
        )
        if multi_sub:
            total_boxes = sum(len(boxes) for _, boxes in retry_data)
            print(f"  Loaded {total_boxes} boxes across {len(retry_data)} frames")
            all_subs, bbox_timeline = _extract_multi_track_google_ocr(
                retry_data, video_info, video_path
            )
        else:
            print(f"  Loaded {len(retry_data)} bbox frames")
            all_subs, bbox_timeline = extract_text_from_detections(
                retry_data, video_info, video_path, engine
            )
    else:
        model = init_yolo()

        # ===== PASS 1: YOLO Detection Scan =====
        use_fast = (not multi_sub) and (batch_size is None or batch_size > 1)
        if use_fast:
            detections, video_info = scan_yolo_fast(
                model, video_path, batch_size=batch_size, multi_sub=multi_sub
            )
        else:
            detections, video_info = scan_yolo_detections(model, video_path, multi_sub=multi_sub)

        if multi_sub:
            bbox_timeline = build_multi_sub_bbox_timeline(detections, video_info['fps'])
            write_bbox_json(bbox_timeline, video_info, video_path, output_bbox)
            print(f"  Saved bbox timeline for retry: {output_bbox}")

            # Multi-Sub: skip gap interpolation, do multi-track OCR
            all_subs, bbox_timeline = _extract_multi_track_google_ocr(
                detections, video_info, video_path
            )
        else:
            # Single-Sub: original pipeline
            filled = interpolate_bbox_gaps(detections)
            bbox_timeline = build_single_sub_bbox_timeline(filled, video_info['fps'])
            write_bbox_json(bbox_timeline, video_info, video_path, output_bbox)
            print(f"  Saved bbox timeline for retry: {output_bbox}")

            all_subs, bbox_timeline = extract_text_from_detections(
                filled, video_info, video_path, engine
            )
    
    # ===== POST-PROCESSING =====
    print(f"\n  POST-PROCESSING")
    print(f"  {'='*45}")
    video_duration = video_info['total_frames'] / video_info['fps']
    filtered_subs = post_process_subs(all_subs, video_duration=video_duration)
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


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Subtitle Extraction V3')
    parser.add_argument('video', nargs='?', default=VIDEO_FILE, help='Video file path')
    parser.add_argument('--ocr-engine', choices=['google', 'rapidocr'], default='google',
                        help='OCR engine: google (default) or rapidocr')
    parser.add_argument('--multi-sub', action='store_true', default=False,
                        help='Detect subtitles at multiple positions (default: single bottom sub)')
    parser.add_argument('--batch-size', type=int, default=None,
                        help='GPU batch size for YOLO detection (default: auto=8, 1=sequential)')
    parser.add_argument('--output-srt', default=OUTPUT_SRT,
                        help='Output SRT file path')
    parser.add_argument('--output-bbox', default=OUTPUT_BBOX_JSON,
                        help='Output subtitle_bboxes.json file path')
    parser.add_argument('--retry-from', choices=['full', 'ocr'], default='full',
                        help="Retry mode: 'full' reruns YOLO + OCR, 'ocr' reuses existing bbox data")
    parser.add_argument('--reuse-bbox', default=None,
                        help='Existing subtitle_bboxes.json path for OCR-only retry')
    parser.add_argument('--detect-zone-top', type=float, default=None,
                        help='Detection zone top boundary (0-1 fraction, default 0.82). '
                             'Lower = detect higher in frame. E.g. 0.5 detects bottom 50%%.')
    parser.add_argument('--ocr-every-bbox-frame', action='store_true', default=False,
                        help='Debug mode: OCR every frame that has a bbox, do not skip "same" crops')
    parser.add_argument('--crop-change-threshold', type=float, default=None,
                        help='Override crop diff threshold. Lower = OCR more frame-to-frame changes')
    parser.add_argument('--text-diff-threshold', type=float, default=None,
                        help='Override text dedup threshold. Lower = keep more near-duplicate short changes')
    parser.add_argument('--min-sub-duration', type=float, default=None,
                        help='Override minimum subtitle duration in seconds')
    args = parser.parse_args()
    
    video_file = args.video
    if not os.path.exists(video_file):
        print(f"Error: File not found: {video_file}")
        sys.exit(1)

    os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

    ocr_label = 'Google Drive OCR' if args.ocr_engine == 'google' else 'RapidOCR'
    mode_label = 'Multi-Sub' if args.multi_sub else 'Single-Sub'
    batch_label = f", Batch: {args.batch_size or 'auto'}" if not args.multi_sub else ""
    print(f"=== Subtitle Extraction V3 ({mode_label}{batch_label}) ===")
    if args.retry_from == 'ocr':
        print(f"  RETRY:  Reuse existing bbox timeline")
    else:
        print(f"  PASS 1: YOLO scan -> collect bboxes")
        if not args.multi_sub:
            print(f"  GAP:    Interpolate missing bboxes")
    print(f"  PASS 2: Binarized diff -> {ocr_label}")
    print()
    process_video_v3(
        video_file,
        output_srt=args.output_srt,
        output_bbox=args.output_bbox,
        ocr_engine=args.ocr_engine,
        multi_sub=args.multi_sub,
        batch_size=args.batch_size,
        retry_from=args.retry_from,
        reuse_bbox_path=args.reuse_bbox,
        detect_zone_top=args.detect_zone_top,
        ocr_every_bbox_frame=args.ocr_every_bbox_frame,
        crop_change_threshold=args.crop_change_threshold,
        text_diff_threshold=args.text_diff_threshold,
        min_sub_duration=args.min_sub_duration,
    )

    if os.path.exists(OUTPUT_SRT):
        print(f"\nSRT Preview (first 30 lines):")
        with open(OUTPUT_SRT, "r", encoding="utf-8") as f:
            lines = f.read().strip().split('\n')
        print('\n'.join(lines[:30]))

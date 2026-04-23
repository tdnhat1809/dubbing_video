"""
Extract hardcoded subtitles from video - V2 ULTRA FAST
Approach inspired by video-subtitle-extractor & RapidVideOCR:
  1. NO YOLO - use fixed ROI (bottom 25% of frame)
  2. Pixel diff on ROI to detect subtitle changes (~2ms/frame)
  3. RapidOCR (ONNX) instead of PaddleOCR (~100-200ms vs ~700ms)
  4. Only OCR when subtitle region actually changes
"""
import os
import sys
import cv2
import numpy as np
import re
import time
from rapidfuzz import fuzz

# ========================
# CONFIG
# ========================
VIDEO_FILE = "1.mp4"
OUTPUT_SRT = "text_ocr.srt"
# Subtitle region: bottom X% of frame
SUBTITLE_REGION_RATIO = 0.12  # bottom 12% (just the subtitle strip)
# Frame skip: process every N-th frame
FRAME_SKIP_SECONDS = 0.5  # check every 0.5 seconds
# Similarity threshold for binarized diff (0-1, higher = more sensitive)
CHANGE_THRESHOLD = 0.95
# Text similarity threshold for dedup
TEXT_DIFF_THRESHOLD = 25
# Min white pixel ratio to consider frame has subtitle
MIN_WHITE_RATIO = 0.005


def init_ocr():
    """Initialize RapidOCR (ONNX-based, much faster than PaddleOCR on CPU)"""
    from rapidocr_onnxruntime import RapidOCR
    engine = RapidOCR()
    print("RapidOCR engine initialized (ONNX runtime)")
    return engine


def get_subtitle_roi(frame, ratio=0.25):
    """Crop bottom portion of frame where subtitles appear"""
    h, w = frame.shape[:2]
    y_start = int(h * (1 - ratio))
    return frame[y_start:h, 0:w]


def has_text_pixels(roi, min_ratio=0.005):
    """Quick check if ROI has bright text-like pixels (white/near-white).
    Much faster than running OCR on empty frames (~0.5ms).
    """
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    # Threshold for white/bright text
    _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
    white_ratio = np.sum(binary > 0) / binary.size
    return white_ratio > min_ratio


def binarize_roi(gray_roi):
    """Convert grayscale ROI to binary (white text only).
    This isolates subtitle text from background, making comparison
    robust to background video changes."""
    _, binary = cv2.threshold(gray_roi, 200, 255, cv2.THRESH_BINARY)
    return binary


def roi_changed(prev_bin, curr_bin, threshold=0.95):
    """Compare two BINARIZED ROIs. Only detects text pixel changes,
    ignores background video changes completely."""
    if prev_bin is None:
        return True
    if prev_bin.shape != curr_bin.shape:
        return True
    try:
        # Count different pixels
        diff = cv2.absdiff(prev_bin, curr_bin)
        changed_pixels = np.sum(diff > 0)
        total_pixels = diff.size
        change_ratio = changed_pixels / total_pixels
        # If less than 0.5% of pixels changed, subtitle is the same
        return change_ratio > (1 - threshold)
    except Exception:
        return True


def is_text_different(text1, text2, threshold=25):
    """Check if two texts are different enough to be separate subtitles"""
    if not text1 or not text2:
        return True
    similarity = fuzz.partial_ratio(text1, text2)
    return (100 - similarity) >= threshold


def clean_text(text):
    """Clean OCR output text"""
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


def frame_to_timecode(frame_number, fps):
    """Convert frame number to SRT timecode"""
    total_seconds = frame_number / fps
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)
    milliseconds = int((total_seconds - int(total_seconds)) * 1000)
    return f'{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}'


def ocr_image(engine, roi):
    """Run RapidOCR on an image region. Returns extracted text."""
    try:
        result, _ = engine(roi)
        if result is None:
            return ""
        # RapidOCR returns list of [bbox, text, confidence]
        texts = [item[1] for item in result if item[2] > 0.5]  # filter low confidence
        if not texts:
            return ""
        # Take the last text (usually the actual subtitle, not watermarks)
        if len(texts) >= 2:
            return texts[-1]
        return texts[0]
    except Exception as e:
        print(f"  OCR error: {e}")
        return ""


def process_video_v2(video_path, output_srt=OUTPUT_SRT):
    """Ultra-fast subtitle extraction pipeline."""
    start_wall = time.time()

    # Clean output
    if os.path.exists(output_srt):
        os.remove(output_srt)

    # Init OCR
    engine = init_ocr()

    # Open video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Cannot open video {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps

    # Frame skip in frames
    frame_skip = max(int(fps * FRAME_SKIP_SECONDS), 1)

    print(f"Video: {video_path}")
    print(f"  Resolution: {frame_width}x{frame_height}")
    print(f"  FPS: {fps:.1f}, Total frames: {total_frames}")
    print(f"  Duration: {duration:.1f}s ({duration/60:.1f} min)")
    print(f"  Frame skip: {frame_skip} (every {FRAME_SKIP_SECONDS}s)")
    print(f"  Subtitle ROI: bottom {int(SUBTITLE_REGION_RATIO*100)}%")
    print(f"  Frames to scan: ~{total_frames // frame_skip}")
    print()

    # State
    current_text = ""
    start_time_srt = ""
    end_time_srt = ""
    sub_index = 1
    prev_roi_bin = None

    # Stats
    frames_scanned = 0
    frames_with_text = 0
    frames_changed = 0
    ocr_calls = 0
    skipped_no_text = 0
    skipped_same = 0

    frame_number = 0

    try:
        while frame_number < total_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
            ret, frame = cap.read()
            if not ret:
                break

            frames_scanned += 1

            # Step 1: Crop subtitle ROI (< 0.1ms)
            roi = get_subtitle_roi(frame, SUBTITLE_REGION_RATIO)

            # Step 2: Quick check - does ROI have bright text pixels? (~0.5ms)
            if not has_text_pixels(roi, MIN_WHITE_RATIO):
                # No text visible - if we had a subtitle, save it
                if current_text and start_time_srt and end_time_srt:
                    with open(output_srt, "a", encoding="utf-8") as f:
                        f.write(f"{sub_index}\n{start_time_srt} --> {end_time_srt}\n{current_text}\n\n")
                        sub_index += 1
                    current_text = ""
                    start_time_srt = ""
                    end_time_srt = ""
                    prev_roi_bin = None

                skipped_no_text += 1
                frame_number += frame_skip
                if frames_scanned % 50 == 0:
                    print(f"  Frame {frame_number}/{total_frames} - no text | OCR: {ocr_calls}")
                continue

            frames_with_text += 1

            # Step 3: Binarize ROI and compare (only text pixels, ~1ms)
            roi_gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            roi_bin = binarize_roi(roi_gray)

            if not roi_changed(prev_roi_bin, roi_bin, CHANGE_THRESHOLD):
                # Same subtitle text - just extend end time
                skipped_same += 1
                if current_text:
                    end_time_srt = frame_to_timecode(frame_number + frame_skip, fps)
                frame_number += frame_skip
                if frames_scanned % 50 == 0:
                    print(f"  Frame {frame_number}/{total_frames} - unchanged | OCR: {ocr_calls}")
                continue

            frames_changed += 1
            prev_roi_bin = roi_bin.copy()

            # Step 4: OCR only on changed frames (~100-200ms with RapidOCR)
            ocr_calls += 1
            raw_text = ocr_image(engine, roi)
            newtext = clean_text(raw_text)

            new_start = frame_to_timecode(frame_number, fps)
            new_end = frame_to_timecode(frame_number + frame_skip, fps)

            if newtext:
                if is_text_different(newtext, current_text, TEXT_DIFF_THRESHOLD):
                    # Save previous subtitle
                    if current_text and start_time_srt and end_time_srt:
                        with open(output_srt, "a", encoding="utf-8") as f:
                            f.write(f"{sub_index}\n{start_time_srt} --> {end_time_srt}\n{current_text}\n\n")
                            sub_index += 1

                    current_text = newtext
                    start_time_srt = new_start
                    end_time_srt = new_end
                    print(f"  [{sub_index}] {new_start} NEW: {current_text}")
                else:
                    # Same text, extend duration
                    end_time_srt = new_end
            else:
                # OCR returned empty - subtitle might have vanished
                if current_text and start_time_srt and end_time_srt:
                    with open(output_srt, "a", encoding="utf-8") as f:
                        f.write(f"{sub_index}\n{start_time_srt} --> {end_time_srt}\n{current_text}\n\n")
                        sub_index += 1
                    current_text = ""
                    start_time_srt = ""
                    end_time_srt = ""

            frame_number += frame_skip

        # Save last subtitle
        if current_text and start_time_srt and end_time_srt:
            with open(output_srt, "a", encoding="utf-8") as f:
                f.write(f"{sub_index}\n{start_time_srt} --> {end_time_srt}\n{current_text}\n\n")

    finally:
        cap.release()
        elapsed = time.time() - start_wall
        print(f"\n{'='*55}")
        print(f"  DONE in {elapsed:.1f}s ({elapsed/60:.1f} min)")
        print(f"  Frames scanned:     {frames_scanned}")
        print(f"  Skipped (no text):  {skipped_no_text}")
        print(f"  Skipped (same):     {skipped_same}")
        print(f"  Changed (OCR ran):  {ocr_calls}")
        print(f"  Subtitles found:    {sub_index - 1}")
        print(f"  Speed: {frames_scanned / max(elapsed, 1):.1f} frames/sec")
        print(f"{'='*55}")


if __name__ == "__main__":
    video_file = VIDEO_FILE
    if len(sys.argv) > 1:
        video_file = sys.argv[1]

    if not os.path.exists(video_file):
        print(f"Error: File not found: {video_file}")
        sys.exit(1)

    print(f"=== Subtitle Extraction V2 (Ultra Fast) ===")
    print(f"  No YOLO, RapidOCR + ROI + PixelDiff")
    print()
    process_video_v2(video_file)

    if os.path.exists(OUTPUT_SRT):
        print(f"\nOutput saved to: {OUTPUT_SRT}")
        with open(OUTPUT_SRT, "r", encoding="utf-8") as f:
            content = f.read()
        lines = content.strip().split('\n')
        print(f"Preview (first 20 lines):")
        print('\n'.join(lines[:20]))

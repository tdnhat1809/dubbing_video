"""
Blur hardcoded subtitles on video using YOLO bbox data.
========================================================
Reads subtitle_bboxes.json (from extract_subtitle_v3.py) and applies
Gaussian blur on the detected subtitle regions to remove hardsubs.

Usage:
    python blur_hardsub.py [input_video] [bbox_json] [output_video]
    
Defaults:
    input:  1.mp4
    bbox:   subtitle_bboxes.json
    output: 1_blurred.mp4
"""
import os
import sys
import cv2
import json
import numpy as np
import time


# ========================
# CONFIG
# ========================
DEFAULT_VIDEO = "1.mp4"
DEFAULT_BBOX_JSON = "subtitle_bboxes.json"
DEFAULT_OUTPUT = "1_blurred.mp4"

# Blur settings
BLUR_KERNEL_SIZE = 51      # Gaussian blur kernel (must be odd, larger = more blur)
BLUR_SIGMA = 30            # Gaussian sigma (larger = smoother blur)
BLUR_ITERATIONS = 2        # Apply blur multiple times for stronger effect
FEATHER_PIXELS = 5         # Feathering at mask edges for smooth transition
BBOX_PADDING = 3           # Extra padding around bbox for complete coverage


def load_bbox_data(json_path):
    """Load bbox timeline from JSON file."""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Build frame→bbox lookup dict for fast access
    bbox_map = {}
    for entry in data["bboxes"]:
        if entry["bbox"] is not None:
            bbox_map[entry["frame"]] = entry["bbox"]
    
    return data, bbox_map


def interpolate_bbox_for_frame(frame_num, bbox_map, frame_skip):
    """Get bbox for any frame number, interpolating from nearest sampled frame."""
    # Direct hit
    if frame_num in bbox_map:
        return bbox_map[frame_num]
    
    # Find nearest sampled frame (round to nearest multiple of frame_skip)
    nearest = round(frame_num / frame_skip) * frame_skip
    if nearest in bbox_map:
        return bbox_map[nearest]
    
    # Search nearby frames
    for offset in range(1, frame_skip + 1):
        for candidate in [frame_num - offset, frame_num + offset]:
            if candidate in bbox_map:
                return bbox_map[candidate]
    
    return None


def create_blur_mask(frame_shape, bbox, feather=FEATHER_PIXELS, padding=BBOX_PADDING):
    """Create a soft-edged mask for the blur region.
    
    Returns a float mask (0.0 to 1.0) where 1.0 = fully blurred.
    """
    h, w = frame_shape[:2]
    mask = np.zeros((h, w), dtype=np.float32)
    
    x1, y1, x2, y2 = bbox
    # Apply padding
    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(w, x2 + padding)
    y2 = min(h, y2 + padding)
    
    # Fill the bbox region
    mask[y1:y2, x1:x2] = 1.0
    
    # Feather the edges with Gaussian blur on the mask itself
    if feather > 0:
        ksize = feather * 2 + 1
        mask = cv2.GaussianBlur(mask, (ksize, ksize), feather)
        # Re-normalize so center is still 1.0
        if mask.max() > 0:
            mask = np.clip(mask / mask.max(), 0, 1)
    
    return mask


def blur_subtitle_region(frame, bbox):
    """Apply strong Gaussian blur to the subtitle region with feathered edges."""
    # Create blurred version of full frame
    blurred = frame.copy()
    for _ in range(BLUR_ITERATIONS):
        blurred = cv2.GaussianBlur(blurred, (BLUR_KERNEL_SIZE, BLUR_KERNEL_SIZE), BLUR_SIGMA)
    
    # Create soft mask
    mask = create_blur_mask(frame.shape, bbox)
    mask_3ch = mask[:, :, np.newaxis]  # Expand to 3 channels
    
    # Blend: original where mask=0, blurred where mask=1
    result = (frame * (1 - mask_3ch) + blurred * mask_3ch).astype(np.uint8)
    
    return result


def process_video(input_path, bbox_json_path, output_path):
    """Process video: blur hardsub regions frame by frame."""
    start_time = time.time()
    
    # Load bbox data
    print(f"Loading bbox data from: {bbox_json_path}")
    data, bbox_map = load_bbox_data(bbox_json_path)
    frame_skip = data["frame_skip"]
    total_bbox_frames = len(bbox_map)
    print(f"  Loaded {total_bbox_frames} bbox entries (frame_skip={frame_skip})")
    
    # Open input video
    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        print(f"Error: Cannot open video {input_path}")
        return
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / fps
    
    print(f"\nInput video: {input_path}")
    print(f"  Resolution: {frame_width}x{frame_height}")
    print(f"  FPS: {fps:.1f}, Total frames: {total_frames}")
    print(f"  Duration: {duration:.1f}s ({duration/60:.1f} min)")
    
    # Setup output video writer
    # Use mp4v codec for .mp4 output
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
    
    if not out.isOpened():
        print(f"Error: Cannot create output video {output_path}")
        cap.release()
        return
    
    print(f"\nOutput: {output_path}")
    print(f"  Blur kernel: {BLUR_KERNEL_SIZE}x{BLUR_KERNEL_SIZE}, sigma={BLUR_SIGMA}")
    print(f"  Blur iterations: {BLUR_ITERATIONS}")
    print(f"  Feathering: {FEATHER_PIXELS}px")
    print(f"\nProcessing...")
    
    frames_processed = 0
    frames_blurred = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_num = frames_processed
        
        # Get bbox for this frame (interpolate from sampled frames)
        bbox = interpolate_bbox_for_frame(frame_num, bbox_map, frame_skip)
        
        if bbox is not None:
            # Apply blur to subtitle region
            frame = blur_subtitle_region(frame, bbox)
            frames_blurred += 1
        
        out.write(frame)
        frames_processed += 1
        
        # Progress every 300 frames (~10 seconds of video)
        if frames_processed % 300 == 0:
            elapsed = time.time() - start_time
            pct = frames_processed / total_frames * 100
            fps_proc = frames_processed / max(elapsed, 0.001)
            eta = (total_frames - frames_processed) / max(fps_proc, 0.001)
            print(f"  [{pct:5.1f}%] Frame {frames_processed}/{total_frames} "
                  f"| Blurred: {frames_blurred} "
                  f"| Speed: {fps_proc:.0f} fps "
                  f"| ETA: {eta:.0f}s")
    
    cap.release()
    out.release()
    
    elapsed = time.time() - start_time
    blur_pct = frames_blurred / max(frames_processed, 1) * 100
    
    print(f"\n{'='*55}")
    print(f"  DONE in {elapsed:.1f}s ({elapsed/60:.1f} min)")
    print(f"  Frames processed: {frames_processed}")
    print(f"  Frames blurred:   {frames_blurred} ({blur_pct:.1f}%)")
    print(f"  Output: {output_path}")
    print(f"  Size: {os.path.getsize(output_path) / 1024 / 1024:.1f} MB")
    print(f"{'='*55}")


if __name__ == "__main__":
    input_video = DEFAULT_VIDEO
    bbox_json = DEFAULT_BBOX_JSON
    output_video = DEFAULT_OUTPUT
    
    if len(sys.argv) > 1:
        input_video = sys.argv[1]
    if len(sys.argv) > 2:
        bbox_json = sys.argv[2]
    if len(sys.argv) > 3:
        output_video = sys.argv[3]
    
    # Auto-generate output name from input
    if len(sys.argv) <= 3 and input_video != DEFAULT_VIDEO:
        base, ext = os.path.splitext(input_video)
        output_video = f"{base}_blurred{ext}"
    
    if not os.path.exists(input_video):
        print(f"Error: Video not found: {input_video}")
        sys.exit(1)
    
    if not os.path.exists(bbox_json):
        print(f"Error: Bbox JSON not found: {bbox_json}")
        print(f"Run extract_subtitle_v3.py first to generate it.")
        sys.exit(1)
    
    os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
    
    print(f"=== Hardsub Blur Tool ===")
    print(f"  Input:  {input_video}")
    print(f"  Bbox:   {bbox_json}")
    print(f"  Output: {output_video}")
    print()
    
    process_video(input_video, bbox_json, output_video)

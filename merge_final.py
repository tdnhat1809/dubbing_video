"""
Merge Final Video
=================
Combines:
  1. Blurred video (1_blurred.mp4) - hardsub area already blurred
  2. Voiceover audio (voiceover_combined.wav) - Vietnamese TTS
  3. Vietnamese subtitles (text_ocr_vi.srt) - burned into the blurred region

Subtitle is positioned at the same Y as the original hardsub (~bottom of video).

Usage:
    python merge_final.py
    python merge_final.py --video 1_blurred.mp4 --audio voiceover_combined.wav --srt text_ocr_vi.srt --output 1_final.mp4
"""

import os
import sys
import subprocess
import argparse
import json

# ========================
# CONFIG
# ========================
DEFAULT_VIDEO = "1_blurred.mp4"
DEFAULT_AUDIO = "voiceover_combined.wav"
DEFAULT_SRT = "text_ocr_vi.srt"
DEFAULT_OUTPUT = "1_final.mp4"
DEFAULT_BBOX_JSON = "subtitle_bboxes.json"
FFMPEG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ffmpeg.exe")

# Video dimensions (will be auto-detected)
VIDEO_WIDTH = 640
VIDEO_HEIGHT = 360


def get_video_info(video_path):
    """Get video dimensions and fps using ffprobe."""
    ffprobe = FFMPEG.replace("ffmpeg.exe", "ffprobe.exe")
    cmd = [
        ffprobe, "-v", "quiet",
        "-print_format", "json",
        "-show_streams",
        video_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        data = json.loads(result.stdout)
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video":
                return {
                    "width": int(stream["width"]),
                    "height": int(stream["height"]),
                    "fps": eval(stream.get("r_frame_rate", "30/1")),
                    "duration": float(stream.get("duration", 0)),
                }
    except Exception as e:
        print(f"  Warning: ffprobe failed: {e}")
    return {"width": VIDEO_WIDTH, "height": VIDEO_HEIGHT, "fps": 30, "duration": 0}


def get_hardsub_y_position(bbox_json):
    """Get average Y position of original hardsub from bbox data."""
    if not os.path.exists(bbox_json):
        return None
    
    try:
        with open(bbox_json, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        y1_values = []
        y2_values = []
        for entry in data["bboxes"]:
            if entry["bbox"] is not None:
                y1_values.append(entry["bbox"][1])
                y2_values.append(entry["bbox"][3])
        
        if y1_values:
            avg_y1 = sum(y1_values) / len(y1_values)
            avg_y2 = sum(y2_values) / len(y2_values)
            return avg_y1, avg_y2
    except Exception as e:
        print(f"  Warning: Could not read bbox data: {e}")
    
    return None


def create_srt_with_bom(srt_path, output_path):
    """Ensure SRT file has UTF-8 BOM for ffmpeg subtitle filter compatibility."""
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Remove any existing BOM
    content = content.lstrip('\ufeff')
    
    with open(output_path, "w", encoding="utf-8-sig") as f:
        f.write(content)
    
    return output_path


def merge_video(video_path, audio_path, srt_path, output_path, bbox_json):
    """Merge blurred video + voiceover audio + burned Vietnamese subtitles."""
    
    print(f"\n{'='*60}")
    print(f"  FINAL VIDEO MERGE")
    print(f"{'='*60}")
    print(f"  Video:  {video_path}")
    print(f"  Audio:  {audio_path}")
    print(f"  SRT:    {srt_path}")
    print(f"  Output: {output_path}")
    
    # Get video info
    info = get_video_info(video_path)
    print(f"\n  Video: {info['width']}x{info['height']} @ {info['fps']:.1f}fps, {info['duration']:.1f}s")
    
    # Determine subtitle Y position from hardsub bbox data
    hardsub_pos = get_hardsub_y_position(bbox_json)
    
    if hardsub_pos:
        avg_y1, avg_y2 = hardsub_pos
        # Place Vietnamese sub at the same vertical position as original hardsub
        # MarginV in ASS is from bottom of video
        # hardsub avg_y1 ~ 313, avg_y2 ~ 359, video height = 360
        # So hardsub is about (360 - 313) = 47px from bottom
        # We want sub at same height or slightly higher
        margin_from_bottom = int(info['height'] - avg_y1)
        # Slightly higher = add a few px margin
        margin_v = margin_from_bottom + 5
        print(f"  Hardsub position: Y1={avg_y1:.0f}, Y2={avg_y2:.0f}")
        print(f"  Vietnamese sub margin from bottom: {margin_v}px")
    else:
        # Default: near bottom
        margin_v = 50
        print(f"  No bbox data, using default margin: {margin_v}px")
    
    # Prepare SRT file (ensure UTF-8 BOM for ffmpeg)
    srt_prepared = srt_path + ".prepared.srt"
    create_srt_with_bom(srt_path, srt_prepared)
    
    # Escape path for ffmpeg subtitles filter (Windows needs special escaping)
    srt_escaped = srt_prepared.replace("\\", "/").replace(":", "\\:")
    
    # Calculate font size based on video height
    # For 360p, font size ~18 is good. Scale proportionally.
    font_size = max(14, int(info['height'] * 18 / 360))
    
    # Build ffmpeg command
    # Strategy: burn subtitles into video + mix audio
    # Use subtitles filter with force_style to position at hardsub location
    subtitle_style = (
        f"FontName=Arial,"
        f"FontSize={font_size},"
        f"PrimaryColour=&H00FFFFFF,"     # White text
        f"OutlineColour=&H00000000,"     # Black outline
        f"BackColour=&H80000000,"        # Semi-transparent black background
        f"Bold=1,"
        f"Outline=2,"                     # 2px outline
        f"Shadow=1,"                      # Subtle shadow
        f"MarginV={margin_v},"           # Vertical margin from bottom
        f"Alignment=2"                    # Bottom center alignment
    )
    
    cmd = [
        FFMPEG,
        "-y",                            # Overwrite output
        "-i", video_path,                # Input 1: blurred video
        "-i", audio_path,                # Input 2: voiceover audio
        "-filter_complex",
        f"[0:v]subtitles='{srt_escaped}':force_style='{subtitle_style}'[v]",
        "-map", "[v]",                   # Use filtered video
        "-map", "1:a",                   # Use voiceover audio
        "-c:v", "libx264",              # H.264 video codec
        "-preset", "medium",             # Encoding speed/quality balance
        "-crf", "20",                    # Quality (lower = better, 18-23 is good)
        "-c:a", "aac",                   # AAC audio codec
        "-b:a", "192k",                 # Audio bitrate
        "-shortest",                     # Stop when shortest stream ends
        "-movflags", "+faststart",       # Web-optimized MP4
        output_path
    ]
    
    print(f"\n  Font size: {font_size}")
    print(f"  Encoding: H.264 CRF=20, AAC 192k")
    print(f"\n  Running ffmpeg...")
    print(f"  Command: {' '.join(cmd[:6])} ... {output_path}")
    print()
    
    # Run ffmpeg
    process = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )
    
    # Clean up prepared SRT
    if os.path.exists(srt_prepared):
        os.remove(srt_prepared)
    
    if process.returncode != 0:
        print(f"  ✗ ffmpeg FAILED (exit code {process.returncode})")
        print(f"\n  STDERR:\n{process.stderr[-2000:]}")
        
        # Try fallback without subtitle burning (just audio merge)
        print(f"\n  Trying fallback: merge without burned subtitles...")
        cmd_fallback = [
            FFMPEG, "-y",
            "-i", video_path,
            "-i", audio_path,
            "-map", "0:v",
            "-map", "1:a",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            "-movflags", "+faststart",
            output_path
        ]
        
        process2 = subprocess.run(cmd_fallback, capture_output=True, text=True,
                                   encoding="utf-8", errors="replace")
        
        if process2.returncode == 0:
            size_mb = os.path.getsize(output_path) / 1024 / 1024
            print(f"  ✓ Fallback OK (no burned subs): {output_path} ({size_mb:.1f} MB)")
            print(f"  Note: Use VLC/MPC to load {srt_path} as external subtitle")
        else:
            print(f"  ✗ Fallback also failed!")
            print(process2.stderr[-1000:])
        return
    
    size_mb = os.path.getsize(output_path) / 1024 / 1024
    
    print(f"\n{'='*60}")
    print(f"  ✓ FINAL VIDEO CREATED SUCCESSFULLY")
    print(f"  Output: {output_path}")
    print(f"  Size:   {size_mb:.1f} MB")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Merge blurred video + voiceover + Vietnamese subtitles")
    parser.add_argument("--video", default=DEFAULT_VIDEO, help="Blurred video input")
    parser.add_argument("--audio", default=DEFAULT_AUDIO, help="Voiceover WAV audio")
    parser.add_argument("--srt", default=DEFAULT_SRT, help="Vietnamese SRT file")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Final output video")
    parser.add_argument("--bbox", default=DEFAULT_BBOX_JSON, help="Bbox JSON for subtitle positioning")
    args = parser.parse_args()
    
    # Validate inputs
    for path, label in [(args.video, "Video"), (args.audio, "Audio"), (args.srt, "SRT")]:
        if not os.path.exists(path):
            print(f"Error: {label} not found: {path}")
            sys.exit(1)
    
    if not os.path.exists(FFMPEG):
        print(f"Error: ffmpeg not found: {FFMPEG}")
        sys.exit(1)
    
    merge_video(args.video, args.audio, args.srt, args.output, args.bbox)

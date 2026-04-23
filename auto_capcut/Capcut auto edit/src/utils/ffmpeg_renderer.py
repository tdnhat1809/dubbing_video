"""
FFmpeg-based video renderer for CapCut drafts.

Reads draft_content.json and renders the final video using FFmpeg,
bypassing the need for CapCut desktop UI automation.
Works with any CapCut version (English or Chinese).
"""

import json
import os
import subprocess
import shutil
import tempfile
from typing import Optional, List, Dict, Any, Tuple
from src.utils.logger import logger


def render_draft_with_ffmpeg(
    draft_dir: str,
    output_path: str,
    resolution: Optional[str] = None,
    framerate: int = 30,
) -> bool:
    """
    Render a CapCut draft using FFmpeg.
    
    Includes:
    - Video scaling to target resolution
    - Blur on bottom hardsub region (15% of height)
    - Subtitle burn-in with correct positioning
    - Audio mixing with volume controls
    
    Args:
        draft_dir: Path to the draft directory (contains draft_content.json)
        output_path: Path for the output video file
        resolution: Optional resolution string like "1920x1080"
        framerate: Output framerate (default 30)
        
    Returns:
        True if rendering succeeded, False otherwise
    """
    try:
        # 1. Read draft_content.json
        content_path = os.path.join(draft_dir, "draft_content.json")
        if not os.path.exists(content_path):
            logger.error(f"draft_content.json not found in {draft_dir}")
            return False
            
        with open(content_path, "r", encoding="utf-8") as f:
            draft = json.load(f)
        
        # 2. Extract canvas info
        canvas = draft.get("canvas_config", {})
        width = canvas.get("width", 1920)
        height = canvas.get("height", 1080)
        
        if resolution:
            parts = resolution.split("x")
            if len(parts) == 2:
                width, height = int(parts[0]), int(parts[1])
        
        # 3. Extract materials
        materials = draft.get("materials", {})
        videos_mat = materials.get("videos", [])
        audios_mat = materials.get("audios", [])
        texts_mat = materials.get("texts", [])
        
        # 4. Extract tracks to determine timeline
        tracks = draft.get("tracks", [])
        
        # Find video, audio, and text segments
        video_segments = []
        audio_segments = []
        text_segments = []
        # Extract text transform_y for subtitle positioning
        text_transform_y = 0
        
        for track in tracks:
            track_type = track.get("type", "")
            segments = track.get("segments", [])
            
            for seg in segments:
                material_id = seg.get("material_id", "")
                target_range = seg.get("target_timerange", {})
                source_range = seg.get("source_timerange", {})
                start_us = target_range.get("start", 0)
                duration_us = target_range.get("duration", 0)
                volume = seg.get("volume", 1.0)
                
                if track_type == "video":
                    # Find the material
                    mat = _find_material(videos_mat, material_id)
                    if mat and mat.get("path"):
                        video_segments.append({
                            "path": mat["path"],
                            "start_us": start_us,
                            "duration_us": duration_us,
                            "source_start_us": source_range.get("start", 0) if source_range else 0,
                            "source_duration_us": source_range.get("duration", duration_us) if source_range else duration_us,
                            "volume": volume,
                            "width": mat.get("width", width),
                            "height": mat.get("height", height),
                        })
                elif track_type == "audio":
                    mat = _find_material(audios_mat, material_id)
                    if mat and mat.get("path"):
                        audio_segments.append({
                            "path": mat["path"],
                            "start_us": start_us,
                            "duration_us": duration_us,
                            "source_start_us": source_range.get("start", 0) if source_range else 0,
                            "source_duration_us": source_range.get("duration", duration_us) if source_range else duration_us,
                            "volume": volume,
                        })
                elif track_type == "text":
                    mat = _find_material(texts_mat, material_id)
                    if mat:
                        content_data = mat.get("content", "{}")
                        try:
                            content = json.loads(content_data) if isinstance(content_data, str) else content_data
                        except json.JSONDecodeError:
                            content = {}
                        
                        # Extract text from content structure
                        text = _extract_text_from_content(content)
                        if text:
                            text_segments.append({
                                "text": text,
                                "start_us": start_us,
                                "duration_us": duration_us,
                            })
                        
                        # Extract transform_y for subtitle positioning
                        clip_settings = seg.get("clip", {}).get("clip_settings", {})
                        ty = clip_settings.get("transform", {}).get("y", 0)
                        if ty != 0:
                            text_transform_y = ty
        
        logger.info(
            f"Draft analysis: {len(video_segments)} videos, "
            f"{len(audio_segments)} audios, {len(text_segments)} texts, "
            f"text_transform_y={text_transform_y}"
        )
        
        if not video_segments:
            logger.error("No video segments found in draft")
            return False
        
        # 5. Calculate total duration
        total_duration_us = 0
        for seg in video_segments + audio_segments + text_segments:
            end = seg["start_us"] + seg["duration_us"]
            if end > total_duration_us:
                total_duration_us = end
        
        total_duration_s = total_duration_us / 1_000_000
        logger.info(f"Total duration: {total_duration_s:.2f}s")
        
        # 6. Generate SRT subtitle file if we have text segments
        srt_path = None
        if text_segments:
            srt_path = os.path.join(draft_dir, "_subtitles.srt")
            _generate_srt(text_segments, srt_path)
            logger.info(f"Generated SRT with {len(text_segments)} subtitles")
        
        # 7. Calculate subtitle MarginV from text_transform_y
        # transform_y in CapCut: fraction of height (0=center, 0.5=bottom)
        # For bottom placement: MarginV = height - (0.5 + transform_y) * height
        # Default: place at bottom ~8% from edge
        margin_v = 30  # default margin from bottom
        if text_transform_y > 0:
            # Positive transform_y = below center
            # Position from bottom = height/2 - transform_y * height
            bottom_pos = (0.5 - text_transform_y) * height
            margin_v = max(10, int(bottom_pos))
        
        # 8. Build FFmpeg command
        success = _run_ffmpeg(
            video_segments=video_segments,
            audio_segments=audio_segments,
            srt_path=srt_path,
            output_path=output_path,
            width=width,
            height=height,
            framerate=framerate,
            total_duration_s=total_duration_s,
            blur_bottom_pct=15,  # Always blur bottom 15% for hardsub
            margin_v=margin_v,
        )
        
        # Cleanup temp SRT
        if srt_path and os.path.exists(srt_path):
            os.remove(srt_path)
        
        return success
        
    except Exception as e:
        logger.exception(f"FFmpeg render failed: {e}")
        return False


def _find_material(materials: List[Dict], material_id: str) -> Optional[Dict]:
    """Find a material by ID."""
    for mat in materials:
        if mat.get("id") == material_id:
            return mat
    return None


def _extract_text_from_content(content: Any) -> str:
    """Extract plain text from CapCut text content structure."""
    if isinstance(content, str):
        return content
    if isinstance(content, dict):
        # CapCut text content format: { "text": "...", "styles": [...] }
        text = content.get("text", "")
        if text:
            return text
        # Alternative format with nested structure
        texts = content.get("texts", [])
        if texts:
            return " ".join(t.get("text", "") for t in texts if isinstance(t, dict))
    return ""


def _wrap_subtitle_text(text: str, max_chars: int = 30) -> str:
    """Wrap long subtitle text into 2 lines, splitting at word/char boundary.
    
    Mimics CapCut preview behavior where long subtitles are split into
    2 lines so they fit within the blur region width.
    
    Args:
        text: The subtitle text
        max_chars: Maximum characters per line before wrapping
    """
    text = text.strip()
    if len(text) <= max_chars:
        return text
    
    # Try to split at a natural boundary near the middle
    mid = len(text) // 2
    
    # Look for space, comma, period near middle to split naturally
    best_split = mid
    for offset in range(min(10, mid)):
        for pos in [mid + offset, mid - offset]:
            if 0 < pos < len(text) and text[pos] in ' ,，。、.!?！？':
                best_split = pos + 1
                break
        else:
            continue
        break
    
    line1 = text[:best_split].strip()
    line2 = text[best_split:].strip()
    
    if line1 and line2:
        return f"{line1}\n{line2}"
    return text


def _generate_srt(text_segments: List[Dict], output_path: str) -> None:
    """Generate an SRT subtitle file from text segments.
    
    Long text is automatically wrapped to 2 lines to match CapCut preview.
    """
    with open(output_path, "w", encoding="utf-8") as f:
        for i, seg in enumerate(text_segments, 1):
            start_s = seg["start_us"] / 1_000_000
            end_s = (seg["start_us"] + seg["duration_us"]) / 1_000_000
            
            start_str = _format_srt_time(start_s)
            end_str = _format_srt_time(end_s)
            
            # Wrap long text to 2 lines like CapCut preview
            wrapped_text = _wrap_subtitle_text(seg['text'])
            
            f.write(f"{i}\n")
            f.write(f"{start_str} --> {end_str}\n")
            f.write(f"{wrapped_text}\n\n")


def _format_srt_time(seconds: float) -> str:
    """Format seconds as SRT timestamp HH:MM:SS,mmm."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def _run_ffmpeg(
    video_segments: List[Dict],
    audio_segments: List[Dict],
    srt_path: Optional[str],
    output_path: str,
    width: int,
    height: int,
    framerate: int,
    total_duration_s: float,
    blur_bottom_pct: int = 15,
    margin_v: int = 30,
) -> bool:
    """
    Build and run the FFmpeg command to render the video.
    
    Strategy:
    - Use the first/main video as the base
    - Scale to target resolution
    - Blur bottom hardsub region (bottom N% of frame)
    - Burn in subtitles positioned over the blurred area
    - Mix in all audio tracks with their volumes
    """
    try:
        # Find the main video (longest or first)
        main_video = max(video_segments, key=lambda s: s["duration_us"])
        
        cmd = ["ffmpeg", "-y"]
        
        # Input: main video
        video_path = main_video["path"]
        if not os.path.exists(video_path):
            logger.error(f"Video file not found: {video_path}")
            return False
        
        cmd.extend(["-i", video_path])
        
        # Input: audio files
        audio_input_indices = []
        for i, audio_seg in enumerate(audio_segments):
            audio_path = audio_seg["path"]
            if os.path.exists(audio_path):
                cmd.extend(["-i", audio_path])
                audio_input_indices.append((i + 1, audio_seg))  # +1 because video is input 0
            else:
                logger.warning(f"Audio file not found: {audio_path}")
        
        # Build filter complex
        filter_parts = []
        
        # Step 1: Scale video to target resolution
        filter_parts.append(
            f"[0:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2[vscaled]"
        )
        
        # Step 2: Apply blur on bottom hardsub region
        # Split → crop bottom strip → boxblur → overlay back
        blur_h_frac = blur_bottom_pct / 100
        blur_start_frac = 1 - blur_h_frac
        filter_parts.append(
            f"[vscaled]split[vmain][vblur];"
            f"[vblur]crop=iw:ih*{blur_h_frac:.4f}:0:ih*{blur_start_frac:.4f},"
            f"boxblur=20:20[vblurred];"
            f"[vmain][vblurred]overlay=0:H*{blur_start_frac:.4f}[vwithblur]"
        )
        
        current_video = "[vwithblur]"

        # Step 3: Add subtitles
        if srt_path and os.path.exists(srt_path):
            # Use drawtext for each subtitle instead of subtitles filter (more reliable on Windows)
            # But first try the subtitles filter with proper escaping
            srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")
            # Dark background text for readability on blurred region
            # PrimaryColour: &HAABBGGRR format (ASS style)
            subtitle_style = (
                f"FontName=Arial,FontSize=22,Bold=1,"
                f"PrimaryColour=&H00000000,"
                f"BackColour=&H80FFFFFF,"
                f"OutlineColour=&H00FFFFFF,Outline=0,"
                f"BorderStyle=4,Shadow=0,"
                f"WrapStyle=0,"
                f"MarginV={margin_v}"
            )
            filter_parts.append(
                f"{current_video}subtitles='{srt_escaped}':force_style='{subtitle_style}'[vsub]"
            )
            current_video = "[vsub]"
        
        # Handle audio mixing
        final_audio = None
        if audio_input_indices:
            audio_labels = []
            
            # Video's own audio (if exists) - use volume from segment
            video_volume = main_video.get("volume", 1.0)
            filter_parts.append(f"[0:a]volume={video_volume}[va]")
            audio_labels.append("[va]")
            
            # Additional audio tracks
            for idx, (input_idx, audio_seg) in enumerate(audio_input_indices):
                vol = audio_seg.get("volume", 1.0)
                label = f"a{idx}"
                filter_parts.append(f"[{input_idx}:a]volume={vol}[{label}]")
                audio_labels.append(f"[{label}]")
            
            # Mix all audio
            n_audio = len(audio_labels)
            audio_inputs_str = "".join(audio_labels)
            filter_parts.append(f"{audio_inputs_str}amix=inputs={n_audio}:duration=longest:dropout_transition=2[amixed]")
            
            final_audio = "[amixed]"
        
        # Build the filter_complex string
        if filter_parts:
            filter_complex = ";".join(filter_parts)
            cmd.extend(["-filter_complex", filter_complex])
            
            # Map outputs
            cmd.extend(["-map", current_video])
            if final_audio:
                cmd.extend(["-map", final_audio])
        
        # Output settings
        cmd.extend([
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "20",
            "-c:a", "aac",
            "-b:a", "192k",
            "-r", str(framerate),
            "-t", str(total_duration_s),
            "-movflags", "+faststart",
            output_path,
        ])
        
        logger.info(f"FFmpeg command: {' '.join(cmd)}")
        
        # Run FFmpeg
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 minute timeout
            encoding="utf-8",
            errors="replace",
        )
        
        if result.returncode != 0:
            logger.error(f"FFmpeg failed (exit {result.returncode}): {result.stderr[-2000:]}")
            
            # Retry: blur without subtitle filter (subtitle path escaping may fail)
            if srt_path:
                logger.info("Retrying with blur but without subtitles...")
                return _run_ffmpeg_blur_only(
                    video_segments, audio_segments,
                    output_path, width, height, framerate, total_duration_s,
                    blur_bottom_pct,
                )
            return False
        
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            logger.info(f"FFmpeg render successful (blur+sub): {output_path}")
            return True
        else:
            logger.error("FFmpeg produced no output file")
            return False
            
    except subprocess.TimeoutExpired:
        logger.error("FFmpeg timed out after 600s")
        return False
    except Exception as e:
        logger.exception(f"FFmpeg execution error: {e}")
        return False


def _run_ffmpeg_blur_only(
    video_segments: List[Dict],
    audio_segments: List[Dict],
    output_path: str,
    width: int,
    height: int,
    framerate: int,
    total_duration_s: float,
    blur_bottom_pct: int = 15,
) -> bool:
    """Fallback render: blur hardsub region + audio mix, but NO subtitle burn-in."""
    try:
        main_video = max(video_segments, key=lambda s: s["duration_us"])
        video_path = main_video["path"]
        
        cmd = ["ffmpeg", "-y", "-i", video_path]
        
        # Add audio inputs
        audio_inputs = []
        for audio_seg in audio_segments:
            if os.path.exists(audio_seg["path"]):
                cmd.extend(["-i", audio_seg["path"]])
                audio_inputs.append(audio_seg)
        
        filter_parts = []
        
        # Scale
        filter_parts.append(
            f"[0:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
            f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2[vscaled]"
        )
        
        # Blur bottom hardsub region
        blur_h_frac = blur_bottom_pct / 100
        blur_start_frac = 1 - blur_h_frac
        filter_parts.append(
            f"[vscaled]split[vmain][vblur];"
            f"[vblur]crop=iw:ih*{blur_h_frac:.4f}:0:ih*{blur_start_frac:.4f},"
            f"boxblur=20:20[vblurred];"
            f"[vmain][vblurred]overlay=0:H*{blur_start_frac:.4f}[vout]"
        )
        
        current_video = "[vout]"
        
        # Audio mix
        final_audio = None
        if audio_inputs:
            labels = []
            vol = main_video.get("volume", 1.0)
            filter_parts.append(f"[0:a]volume={vol}[va]")
            labels.append("[va]")
            
            for i, seg in enumerate(audio_inputs):
                v = seg.get("volume", 1.0)
                filter_parts.append(f"[{i+1}:a]volume={v}[a{i}]")
                labels.append(f"[a{i}]")
            
            n = len(labels)
            mix_input = "".join(labels)
            filter_parts.append(f"{mix_input}amix=inputs={n}:duration=longest:dropout_transition=2[amixed]")
            final_audio = "[amixed]"
        
        filter_str = ";".join(filter_parts)
        cmd.extend(["-filter_complex", filter_str])
        cmd.extend(["-map", current_video])
        if final_audio:
            cmd.extend(["-map", final_audio])
        
        cmd.extend([
            "-c:v", "libx264", "-preset", "fast", "-crf", "22",
            "-c:a", "aac", "-b:a", "192k",
            "-r", str(framerate),
            "-t", str(total_duration_s),
            "-movflags", "+faststart",
            output_path,
        ])
        
        logger.info(f"FFmpeg blur-only command: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=600,
            encoding="utf-8", errors="replace",
        )
        
        if result.returncode == 0 and os.path.exists(output_path):
            logger.info(f"FFmpeg blur-only render successful: {output_path}")
            return True
        
        logger.error(f"FFmpeg blur-only render failed: {result.stderr[-1000:]}")
        return False
        
    except Exception as e:
        logger.exception(f"FFmpeg blur-only render error: {e}")
        return False


def post_process_blur_subtitles(
    input_video: str,
    draft_dir: str,
    output_path: str,
    blur_bottom_pct: int = 15,
) -> bool:
    """Post-process a CapCut-exported video to add blur + subtitle overlay.
    
    Takes a video already exported by CapCut Mate and adds:
    - Gaussian blur on the bottom X% (hardsub region)
    - Subtitle burn-in on top of the blurred region
    
    Args:
        input_video: Path to the CapCut-exported video
        draft_dir: Path to the draft directory (for reading text segments)
        output_path: Path for the final output video
        blur_bottom_pct: Percentage of video height to blur from bottom
        
    Returns:
        True if post-processing succeeded
    """
    try:
        if not os.path.exists(input_video):
            logger.error(f"Input video not found: {input_video}")
            return False
        
        # 1. Read draft to extract text segments for subtitles
        content_path = os.path.join(draft_dir, "draft_content.json")
        text_segments = []
        
        if os.path.exists(content_path):
            with open(content_path, "r", encoding="utf-8") as f:
                draft = json.load(f)
            
            materials = draft.get("materials", {})
            texts_mat = materials.get("texts", [])
            tracks = draft.get("tracks", [])
            
            for track in tracks:
                if track.get("type") != "text":
                    continue
                for seg in track.get("segments", []):
                    material_id = seg.get("material_id", "")
                    target_range = seg.get("target_timerange", {})
                    start_us = target_range.get("start", 0)
                    duration_us = target_range.get("duration", 0)
                    
                    mat = _find_material(texts_mat, material_id)
                    if mat:
                        content_data = mat.get("content", "{}")
                        try:
                            content = json.loads(content_data) if isinstance(content_data, str) else content_data
                        except json.JSONDecodeError:
                            content = {}
                        text = _extract_text_from_content(content)
                        if text:
                            text_segments.append({
                                "text": text,
                                "start_us": start_us,
                                "duration_us": duration_us,
                            })
        
        # 2. Use pre-generated SRT if available (text tracks may have been stripped)
        srt_path = os.path.join(draft_dir, "_subtitles.srt")
        if os.path.exists(srt_path):
            logger.info(f"Post-process: using pre-generated SRT: {srt_path}")
        elif text_segments:
            _generate_srt(text_segments, srt_path)
            logger.info(f"Post-process: generated SRT with {len(text_segments)} subtitles")
        else:
            srt_path = None
        
        # 3. Build FFmpeg command: blur bottom + subtitle burn-in
        cmd = ["ffmpeg", "-y", "-i", input_video]
        
        filter_parts = []
        blur_h_frac = blur_bottom_pct / 100
        blur_start_frac = 1 - blur_h_frac
        
        # Blur bottom region
        filter_parts.append(
            f"[0:v]split[vmain][vblur];"
            f"[vblur]crop=iw:ih*{blur_h_frac:.4f}:0:ih*{blur_start_frac:.4f},"
            f"boxblur=20:20[vblurred];"
            f"[vmain][vblurred]overlay=0:H*{blur_start_frac:.4f}[vwithblur]"
        )
        
        current_video = "[vwithblur]"
        
        # Add subtitle burn-in on top of blur
        if srt_path and os.path.exists(srt_path):
            srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")
            # MarginV=30 places subtitles near bottom, on the blurred region
            subtitle_style = (
                "FontName=Arial,FontSize=22,Bold=1,"
                "PrimaryColour=&H00FFFFFF,"
                "BackColour=&H80000000,"
                "OutlineColour=&H00000000,"
                "Outline=2,BorderStyle=1,"
                "Shadow=0,WrapStyle=0,MarginV=30"
            )
            filter_parts.append(
                f"{current_video}subtitles='{srt_escaped}'"
                f":force_style='{subtitle_style}'[vsub]"
            )
            current_video = "[vsub]"
        
        filter_str = ";".join(filter_parts)
        cmd.extend(["-filter_complex", filter_str])
        cmd.extend(["-map", current_video])
        cmd.extend(["-map", "0:a", "-c:a", "copy"])  # Copy audio as-is
        
        cmd.extend([
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "18",  # High quality
            "-r", "30",
            "-movflags", "+faststart",
            output_path,
        ])
        
        logger.info(f"Post-process FFmpeg: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=600,
            encoding="utf-8", errors="replace",
        )
        
        if result.returncode != 0:
            logger.error(f"Post-process FFmpeg failed: {result.stderr[-2000:]}")
            return False
        
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            logger.info(f"Post-process successful: {output_path}")
            return True
        
        logger.error("Post-process produced no output")
        return False
        
    except Exception as e:
        logger.exception(f"Post-process error: {e}")
        return False

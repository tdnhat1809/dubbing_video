"""
render_video.py - Render final video with FFmpeg
=================================================
  1. Blur hardsub (bottom strip OR YOLO bbox)
  2. Burn translated subtitles (ASS format with background)
  3. Mix audio (original + voiceover)
  4. Logo overlay
  5. Frame borders (drawtext)

Usage:
  python render_video.py --video input.mp4 --srt subs.srt --output out.mp4
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from typing import List

# Windows encoding fix
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def parse_srt(srt_path):
    """Parse SRT file into list of {index, start, end, text}."""
    entries = []
    with open(srt_path, 'r', encoding='utf-8') as f:
        content = f.read()
    blocks = re.split(r'\n\s*\n', content.strip())
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
        try:
            index = int(lines[0].strip())
        except ValueError:
            continue
        time_match = re.match(
            r'(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})',
            lines[1]
        )
        if not time_match:
            continue
        start = time_match.group(1).replace(',', '.')
        end = time_match.group(2).replace(',', '.')
        text = '\n'.join(lines[2:])
        entries.append({'index': index, 'start': start, 'end': end, 'text': text})
    return entries


def hex_to_ass_color(hex_color, alpha=0):
    """Convert #RRGGBB to ASS &HAABBGGRR."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) >= 6:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
    else:
        r, g, b = 255, 255, 255
    return f'&H{alpha:02X}{b:02X}{g:02X}{r:02X}'


def time_to_ass(t):
    """Convert HH:MM:SS.mmm to ASS format H:MM:SS.CC"""
    t = t.replace(',', '.')
    parts = t.split(':')
    h = int(parts[0])
    m = parts[1]
    sec_parts = parts[2].split('.')
    s = sec_parts[0]
    ms = sec_parts[1] if len(sec_parts) > 1 else '000'
    cs = ms[:2]  # centiseconds (first 2 digits of ms)
    return f'{h}:{m}:{s}.{cs}'


def split_ass_color(ass_color, default_color='FFFFFF'):
    """Split ASS color &HAABBGGRR into alpha and fill color parts."""
    cleaned = str(ass_color or '').replace('&H', '').replace('&h', '').strip('&')
    if len(cleaned) >= 8:
        return cleaned[:2], cleaned[2:8]
    if len(cleaned) >= 6:
        return '00', cleaned[:6]
    return '00', default_color


def rounded_rect_ass_path(width, height, radius):
    """Create an ASS vector path for a rounded rectangle."""
    w = max(2, int(width))
    h = max(2, int(height))
    r = max(1, min(int(radius), w // 2, h // 2))
    k = int(round(r * 0.55228475))
    return (
        f"m {r} 0 "
        f"l {w - r} 0 "
        f"b {w - r + k} 0 {w} {r - k} {w} {r} "
        f"l {w} {h - r} "
        f"b {w} {h - r + k} {w - r + k} {h} {w - r} {h} "
        f"l {r} {h} "
        f"b {r - k} {h} 0 {h - r + k} 0 {h - r} "
        f"l 0 {r} "
        f"b 0 {r - k} {r - k} 0 {r} 0"
    )


def _normalize_text_lines(text: str) -> List[str]:
    return [line.strip() for line in str(text or '').splitlines() if line.strip()] or ['']


def _measure_text_block(lines, fontsize):
    try:
        from PIL import Image, ImageDraw, ImageFont

        try:
            font = ImageFont.truetype('arial.ttf', fontsize)
        except Exception:
            font = ImageFont.load_default()

        draw = ImageDraw.Draw(Image.new('RGB', (16, 16)))
        widths = []
        for line in lines:
            try:
                left, _, right, _ = draw.textbbox((0, 0), line, font=font)
                widths.append(max(1, right - left))
            except Exception:
                widths.append(max(1, int(len(line) * fontsize * 0.58)))
        return widths
    except Exception:
        return [max(1, int(len(line) * fontsize * 0.58)) for line in lines]


def wrap_text_for_width(text, fontsize, max_width):
    """Wrap subtitle text to fit within a target width."""
    if not text:
        return ''

    wrapped_lines = []
    for source_line in str(text).replace('\r', '').split('\n'):
        source_line = source_line.strip()
        if not source_line:
            continue

        words = source_line.split()
        if not words:
            wrapped_lines.append(source_line)
            continue

        current = words[0]
        for word in words[1:]:
            candidate = f"{current} {word}"
            width = _measure_text_block([candidate], fontsize)[0]
            if width <= max_width or not current:
                current = candidate
            else:
                wrapped_lines.append(current)
                current = word
        if current:
            wrapped_lines.append(current)

    return '\n'.join(wrapped_lines or [''])


def generate_ass(entries, output_path, font='Arial', fontsize=28,
                 text_color='&H00000000', bg_color='&H80FFFFFF',
                 video_width=1920, video_height=1080, blur_height_pct=15,
                 sub_center_y_pct=None, sub_bbox_x=None,
                 sub_bbox_w=None, sub_bbox_h=None):
    """Generate ASS subtitle file.
    
    If sub_center_y_pct is given (from YOLO bbox), position subtitle at that
    exact Y percentage. Otherwise fall back to bottom-aligned with MarginV.
    """
    # Font fallback - ensure font exists
    import subprocess as _sp
    try:
        _fc = _sp.run(['fc-list', font], capture_output=True, text=True, timeout=5)
        if not _fc.stdout.strip():
            font = 'Arial'
    except Exception:
        pass
    
    # Scale fontsize: preview uses CSS px on a container, we need to match
    # Preview font: Math.max(fontSize / 6, 12) px on a ~videoDisplayRect.height container
    # The editor passes the raw fontSize (e.g. 93), preview shows it as max(93/6, 12) = 15.5px
    # on a container of ~350-500px height. So visual ratio = 15.5 / 400 ≈ 3.9%
    # For video: fontsize_px = video_height * (fontSize / 6) / preview_container_height
    # Since we don't know preview container height, use a reasonable scale:
    # The editor fontSize slider goes 14-120, displayed as fontSize/6 ≈ 2-20px on ~400px container
    # So ratio = (fontSize/6) / 400. For video: scaled = ratio * video_height
    # = fontSize * video_height / 2400
    # But we also need to ensure it's readable, so use a reasonable minimum
    # Use the SMALLER dimension for scaling so subtitles stay proportional
    # in both landscape (16:9) and portrait (9:16) videos
    # Preview formula: fontSize/6 px on a ~400px container (≈ 2.6% for fontSize=93)
    # For video: scaled = fontSize * scale_dim / divisor
    # ASS fontsize at PlayRes=1080: size 28 ≈ 2.6% → divisor = 93*1080/28 ≈ 3580
    scale_dim = min(video_width, video_height)
    scaled_fontsize = max(18, int(fontsize * scale_dim / 3000))
    if fontsize <= 28:  # Small font override for readability
        scaled_fontsize = max(18, int(fontsize * scale_dim / 1800))
    
    if sub_center_y_pct is not None:
        sub_y_px = int(video_height * sub_center_y_pct / 100)
    else:
        blur_h = int(video_height * blur_height_pct / 100)
        if blur_h > 0:
            sub_y_px = int(video_height - (blur_h / 2))
        else:
            sub_y_px = int(video_height - max(52, scaled_fontsize * 2.2))

    content = f"""[Script Info]
Title: Rendered Subtitles
ScriptType: v4.00+
PlayResX: {video_width}
PlayResY: {video_height}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font},{scaled_fontsize},{text_color},&H000000FF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,0,0,5,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    bg_alpha, bg_fill_color = split_ass_color(bg_color)
    for entry in entries:
        start_ass = time_to_ass(entry['start'])
        end_ass = time_to_ass(entry['end'])
        text = entry['text']
        if sub_bbox_w is not None and sub_bbox_w > 0:
            available_width = int(sub_bbox_w * 0.82)
        elif blur_height_pct > 0:
            available_width = int(video_width * 0.78)
        else:
            available_width = int(video_width * 0.85)

        text = wrap_text_for_width(text, scaled_fontsize, max(120, available_width))
        lines = _normalize_text_lines(text)
        line_widths = _measure_text_block(lines, scaled_fontsize)
        text_w = max(line_widths) if line_widths else scaled_fontsize
        line_height = int(round(scaled_fontsize * 1.35))
        text_h = max(line_height, len(lines) * line_height)
        pad_x = max(18, int(round(scaled_fontsize * 0.95)))
        pad_y = max(10, int(round(scaled_fontsize * 0.5)))
        box_w = min(video_width - 32, text_w + pad_x * 2)
        box_h = text_h + pad_y * 2
        radius = max(14, min(26, int(round(scaled_fontsize * 0.75))))
        pos_x = sub_bbox_x if sub_bbox_x is not None else video_width // 2
        box_left = max(16, min(video_width - box_w - 16, int(round(pos_x - (box_w / 2)))))
        box_top = max(16, min(video_height - box_h - 16, int(round(sub_y_px - (box_h / 2)))))
        draw_path = rounded_rect_ass_path(box_w, box_h, radius)
        ass_text = '\\N'.join(lines)

        content += (
            f"Dialogue: 0,{start_ass},{end_ass},Default,,0,0,0,,"
            f"{{\\an7\\p1\\bord0\\shad0\\1c&H{bg_fill_color}&\\1a&H{bg_alpha}&"
            f"\\pos({box_left},{box_top})}}{draw_path}{{\\p0}}\n"
        )
        content += (
            f"Dialogue: 1,{start_ass},{end_ass},Default,,0,0,0,,"
            f"{{\\an5\\bord0\\shad0\\pos({pos_x},{sub_y_px})}}{ass_text}\n"
        )

    with open(output_path, 'w', encoding='utf-8-sig') as f:
        f.write(content)
    return output_path


def get_video_info(video_path):
    """Get video resolution and duration using ffprobe."""
    cmd = [
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-show_entries', 'format=duration',
        '-of', 'json', video_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        info = json.loads(result.stdout)
        stream = info.get('streams', [{}])[0]
        w = int(stream.get('width', 1920))
        h = int(stream.get('height', 1080))
        dur = float(info.get('format', {}).get('duration', 0))
        return w, h, dur
    except Exception as e:
        print(f"[Render] Warning: ffprobe failed ({e}), using defaults")
        return 1920, 1080, 0


def create_rounded_rect_mask(h, w, radius):
    """Create a float mask (0.0-1.0) with rounded corners for blur blending."""
    import cv2
    import numpy as np
    mask = np.zeros((h, w), dtype=np.uint8)
    r = max(1, min(radius, h // 2, w // 2))
    # Fill center rectangles
    cv2.rectangle(mask, (r, 0), (w - r, h), 255, -1)
    cv2.rectangle(mask, (0, r), (w, h - r), 255, -1)
    # Fill corner circles
    cv2.circle(mask, (r, r), r, 255, -1)
    cv2.circle(mask, (w - r - 1, r), r, 255, -1)
    cv2.circle(mask, (r, h - r - 1), r, 255, -1)
    cv2.circle(mask, (w - r - 1, h - r - 1), r, 255, -1)
    # Smooth edges slightly for anti-aliasing
    mask_f = mask.astype(np.float32) / 255.0
    mask_f = cv2.GaussianBlur(mask_f, (3, 3), 0.8)
    return mask_f


def wrap_text_for_bbox(text, fontsize, bbox_width):
    """Wrap subtitle text to fit within blur bbox width.

    Splits long text into multiple lines so it doesn't exceed the
    hardsub blur region width. Returns text with newlines inserted.
    """
    if not text or bbox_width <= 0:
        return text

    # Leave margin on each side (85% usable width)
    available_width = bbox_width * 0.85

    # Estimate char width: Vietnamese/Latin ~0.55*fontsize
    avg_char_width = max(1, fontsize * 0.55)
    max_chars = max(5, int(available_width / avg_char_width))

    # Flatten existing newlines
    text = text.replace('\n', ' ').strip()

    if len(text) <= max_chars:
        return text

    # Wrap at word/space boundaries
    words = text.split(' ')
    lines = []
    current_line = ''
    for word in words:
        test_line = current_line + (' ' if current_line else '') + word
        if len(test_line) > max_chars and current_line:
            lines.append(current_line)
            current_line = word
        else:
            current_line = test_line
    if current_line:
        lines.append(current_line)

    return '\n'.join(lines)


def build_ffmpeg_cmd(args, vw, vh, duration):
    """Build FFmpeg command with proper filter_complex."""
    cmd = ['ffmpeg', '-y', '-i', args.video]
    input_count = 1

    # Add separated background audio input
    bg_idx = None
    if args.background_audio and os.path.exists(args.background_audio):
        cmd.extend(['-i', args.background_audio])
        bg_idx = input_count
        input_count += 1

    # Add voiceover input
    vo_idx = None
    if args.voiceover and os.path.exists(args.voiceover):
        cmd.extend(['-i', args.voiceover])
        vo_idx = input_count
        input_count += 1

    # Add logo input
    logo_idx = None
    if args.logo and os.path.exists(args.logo):
        cmd.extend(['-i', args.logo])
        logo_idx = input_count
        input_count += 1

    # ---- Build video filter chain ----
    vf_parts = []

    # 1. BLUR HARDSUB
    yolo_blurred_video = None  # Track if we made a pre-blurred video
    if args.blur_hardsub:
        if args.blur_data and os.path.exists(args.blur_data):
            # YOLO mode: per-frame blur using OpenCV
            try:
                import cv2
                import numpy as np
                with open(args.blur_data, 'r') as f:
                    bbox_data = json.load(f)

                all_bboxes = bbox_data.get('bboxes', [])
                det_w, det_h = bbox_data.get('resolution', [vw, vh])
                scale_x = vw / det_w
                scale_y = vh / det_h

                # Detect multi-sub mode: bbox entries have 'track' field
                is_multi_track = any(isinstance(b, dict) and 'track' in b for b in all_bboxes)

                if is_multi_track:
                    print(f"  YOLO multi-track mode: {len(all_bboxes)} detections")
                    # Multi-sub: group by frame, each frame has MULTIPLE bboxes
                    frame_multi_bboxes = {}  # frame → list of [x1,y1,x2,y2]
                    for b in all_bboxes:
                        f = b.get('frame', 0)
                        bbox = [b.get('x1', 0), b.get('y1', 0), b.get('x2', 0), b.get('y2', 0)]
                        if f not in frame_multi_bboxes:
                            frame_multi_bboxes[f] = []
                        frame_multi_bboxes[f].append(bbox)
                    
                    # Interpolate: fill gaps between detections per-position
                    if frame_multi_bboxes:
                        sorted_frames = sorted(frame_multi_bboxes.keys())
                        first_f, last_f = sorted_frames[0], sorted_frames[-1]
                        last_known = frame_multi_bboxes[first_f]
                        for f in range(first_f, last_f + 1):
                            if f in frame_multi_bboxes:
                                last_known = frame_multi_bboxes[f]
                            else:
                                frame_multi_bboxes[f] = last_known
                    
                    print(f"  YOLO multi-track: {len(frame_multi_bboxes)} frames to blur")
                    
                    # Convert to unified format: frame → list of bboxes
                    frame_bboxes = {}
                    for f, boxes in frame_multi_bboxes.items():
                        frame_bboxes[f] = boxes  # list of [x1,y1,x2,y2]

                else:
                    # Single-sub mode: Y-consistency filtering + merge into one bbox
                    # ---- Y-CONSISTENCY FILTERING (MODE/CLUSTERING) ----
                    if all_bboxes:
                        y_centers = []
                        for b in all_bboxes:
                            if b.get('bbox'):
                                y1, y2 = b['bbox'][1], b['bbox'][3]
                                y_centers.append((y1 + y2) / 2)
                        
                        if y_centers:
                            bin_size = 30
                            bins = {}
                            for yc in y_centers:
                                key = int(yc / bin_size) * bin_size
                                bins[key] = bins.get(key, 0) + 1
                            
                            dominant_bin = max(bins, key=bins.get)
                            dominant_y = dominant_bin + bin_size / 2
                            y_tolerance = bin_size
                            
                            filtered_bboxes = []
                            rejected_count = 0
                            for b in all_bboxes:
                                if b.get('bbox'):
                                    y_center = (b['bbox'][1] + b['bbox'][3]) / 2
                                    if abs(y_center - dominant_y) <= y_tolerance:
                                        filtered_bboxes.append(b)
                                    else:
                                        rejected_count += 1
                                else:
                                    filtered_bboxes.append(b)
                            
                            print(f"  YOLO Y-filter: bands={dict(sorted(bins.items()))}")
                            print(f"  YOLO Y-filter: dominant_y={dominant_y:.0f}, rejected={rejected_count}")
                            all_bboxes = filtered_bboxes

                    # Build frame→bbox lookup, MERGE into one encompassing rect
                    frame_bboxes_single = {}
                    for b in all_bboxes:
                        if b.get('bbox'):
                            x1, y1, x2, y2 = b['bbox']
                            f = b['frame']
                            if f in frame_bboxes_single:
                                prev = frame_bboxes_single[f]
                                frame_bboxes_single[f] = [
                                    min(prev[0], x1), min(prev[1], y1),
                                    max(prev[2], x2), max(prev[3], y2),
                                ]
                            else:
                                frame_bboxes_single[f] = [x1, y1, x2, y2]

                    if frame_bboxes_single:
                        sorted_frames = sorted(frame_bboxes_single.keys())
                        first_f, last_f = sorted_frames[0], sorted_frames[-1]
                        last_known_bbox = frame_bboxes_single[first_f]
                        for f in range(first_f, last_f + 1):
                            if f in frame_bboxes_single:
                                last_known_bbox = frame_bboxes_single[f]
                            else:
                                frame_bboxes_single[f] = last_known_bbox

                    print(f"  YOLO single-track: {len(all_bboxes)} dets, {len(frame_bboxes_single)} frames")
                    
                    # Wrap single bbox in list for unified processing
                    frame_bboxes = {}
                    for f, bbox in frame_bboxes_single.items():
                        frame_bboxes[f] = [bbox]

                # Process video with OpenCV - blur all bboxes per frame
                cap = cv2.VideoCapture(args.video)
                fps = cap.get(cv2.CAP_PROP_FPS)
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')

                yolo_blurred_video = os.path.join(tempfile.gettempdir(), 'yolo_blurred.mp4')
                out = cv2.VideoWriter(yolo_blurred_video, fourcc, fps, (vw, vh))

                frame_idx = 0
                blur_ksize = max(31, min(args.blur_intensity * 3, 151))
                blur_ksize = blur_ksize if blur_ksize % 2 == 1 else blur_ksize + 1
                
                bbox_pad_x = int(vw * 0.03)
                bbox_pad_y = int(vh * 0.03)

                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break

                    if frame_idx in frame_bboxes:
                        for bbox in frame_bboxes[frame_idx]:
                            x1 = max(0, int(bbox[0] * scale_x) - bbox_pad_x)
                            y1 = max(0, int(bbox[1] * scale_y) - bbox_pad_y)
                            x2 = min(vw, int(bbox[2] * scale_x) + bbox_pad_x)
                            y2 = min(vh, int(bbox[3] * scale_y) + bbox_pad_y)
                            if x2 > x1 and y2 > y1:
                                roi = frame[y1:y2, x1:x2].copy()
                                roi_h, roi_w = roi.shape[:2]
                                k = min(blur_ksize, max(31, min(roi_h, roi_w)))
                                k = k if k % 2 == 1 else k + 1
                                blurred_roi = roi.copy()
                                for _ in range(5):
                                    blurred_roi = cv2.GaussianBlur(blurred_roi, (k, k), 0)
                                # Rounded corner blur mask
                                radius = max(8, min(roi_h, roi_w) // 6)
                                mask = create_rounded_rect_mask(roi_h, roi_w, radius)
                                mask_3ch = mask[:, :, np.newaxis]
                                frame[y1:y2, x1:x2] = (roi * (1 - mask_3ch) + blurred_roi * mask_3ch).astype(np.uint8)

                    out.write(frame)
                    frame_idx += 1

                    if frame_idx % 500 == 0:
                        print(f"  YOLO blur: {frame_idx}/{total_frames} frames ({100*frame_idx//total_frames}%%)")

                cap.release()
                out.release()
                print(f"  YOLO blur complete: {frame_idx} frames")

                # Use the blurred video as input instead of original
                # We'll swap the input in the FFmpeg command later

            except Exception as e:
                print(f"  Warning: YOLO blur failed: {e}, falling back to strip blur")
                yolo_blurred_video = None
                blur_y = int(vh * 0.82)
                blur_y = blur_y if blur_y % 2 == 0 else blur_y - 1
                vf_parts.append(
                    f"split=2[_orig][_copy];"
                    f"[_copy]boxblur=20:2[_blurred];"
                    f"[_orig]crop={vw}:{blur_y}:0:0[_top];"
                    f"[_blurred][_top]overlay=0:0"
                )
        else:
            # Manual mode: blur bottom strip using FFmpeg
            blur_pct = args.blur_height / 100.0
            clear_h = int(vh * (1.0 - blur_pct))
            clear_h = clear_h if clear_h % 2 == 0 else clear_h - 1
            vf_parts.append(
                f"split=2[_orig][_copy];"
                f"[_copy]boxblur=20:2[_blurred];"
                f"[_orig]crop={vw}:{clear_h}:0:0[_top];"
                f"[_blurred][_top]overlay=0:0"
            )
            print(f"  Manual blur: clear_h={clear_h}, blur bottom {args.blur_height}%%")

    # 2. ASS SUBTITLES
    sub_center_y_pct = None  # Will be set from YOLO data if available
    sub_bbox_x = None        # Center X in video pixels
    sub_bbox_w = None        # Bbox width in video pixels
    sub_bbox_h = None        # Bbox height in video pixels
    if args.blur_hardsub and args.blur_data and os.path.exists(args.blur_data):
        try:
            with open(args.blur_data, 'r') as f:
                _bbox_data = json.load(f)
            _all_bboxes = _bbox_data.get('bboxes', [])
            _det_w, _det_h = _bbox_data.get('resolution', [vw, vh])
            _scale_x = vw / _det_w
            _scale_y = vh / _det_h
            
            # Check if multi-track data
            _is_multi = any(isinstance(b, dict) and 'track' in b for b in _all_bboxes)
            
            if _is_multi:
                # Multi-sub: don't try to position at YOLO Y, use default bottom
                print(f"  Subtitle Y: multi-track mode, using default bottom position")
                sub_center_y_pct = None
            elif _all_bboxes:
                # Single-sub: find dominant Y band and extract full bbox dimensions
                _valid = [b for b in _all_bboxes if b.get('bbox')]
                if _valid:
                    _y_centers = [(b['bbox'][1] + b['bbox'][3]) / 2 for b in _valid]
                    _bin_size = 30
                    _bins = {}
                    for yc in _y_centers:
                        band = int(yc // _bin_size) * _bin_size
                        _bins[band] = _bins.get(band, 0) + 1
                    _dominant_bin = max(_bins, key=_bins.get)
                    _dominant_y = _dominant_bin + _bin_size / 2
                    _y_tolerance = _bin_size
                    
                    # Filter to dominant Y band for consistent bbox stats
                    _band = [b for b in _valid
                             if abs((b['bbox'][1] + b['bbox'][3]) / 2 - _dominant_y) <= _y_tolerance]
                    
                    if _band:
                        import statistics
                        _x1s = [b['bbox'][0] * _scale_x for b in _band]
                        _y1s = [b['bbox'][1] * _scale_y for b in _band]
                        _x2s = [b['bbox'][2] * _scale_x for b in _band]
                        _y2s = [b['bbox'][3] * _scale_y for b in _band]
                        _mx1 = statistics.median(_x1s)
                        _my1 = statistics.median(_y1s)
                        _mx2 = statistics.median(_x2s)
                        _my2 = statistics.median(_y2s)
                        
                        sub_center_y_pct = ((_my1 + _my2) / 2 / vh) * 100
                        sub_bbox_x = int((_mx1 + _mx2) / 2)
                        sub_bbox_w = int(_mx2 - _mx1)
                        sub_bbox_h = int(_my2 - _my1)
                        print(f"  Subtitle YOLO bbox: center=({sub_bbox_x},{int(vh*sub_center_y_pct/100)}), "
                              f"size={sub_bbox_w}x{sub_bbox_h}, Y={sub_center_y_pct:.1f}%")
                    else:
                        sub_center_y_pct = (_dominant_y / _det_h) * 100
                        print(f"  Subtitle Y position: {sub_center_y_pct:.1f}% (from YOLO dominant band)")
        except Exception as e:
            print(f"  Warning: Could not extract subtitle Y from bbox data: {e}")
    
    if args.srt and os.path.exists(args.srt):
        entries = parse_srt(args.srt)
        if entries:
            ass_path = os.path.join(tempfile.gettempdir(), 'render_subs.ass')
            bg_alpha = 255 - int(args.sub_bg_opacity * 255 / 100)
            text_ass = hex_to_ass_color(args.sub_color, 0)
            bg_ass = hex_to_ass_color(args.sub_bg, bg_alpha)
            generate_ass(entries, ass_path,
                         font=args.sub_font, fontsize=args.sub_fontsize,
                         text_color=text_ass, bg_color=bg_ass,
                         video_width=vw, video_height=vh,
                         blur_height_pct=args.blur_height if args.blur_hardsub else 0,
                         sub_center_y_pct=sub_center_y_pct,
                         sub_bbox_x=sub_bbox_x, sub_bbox_w=sub_bbox_w,
                         sub_bbox_h=sub_bbox_h)
            # Escape Windows path for FFmpeg filter
            ass_escaped = ass_path.replace('\\', '/').replace(':', '\\:')
            vf_parts.append(f"ass='{ass_escaped}'")
            print(f"  Subtitles: {len(entries)} entries, font={args.sub_font}, fontsize={args.sub_fontsize}")

    # 3. LOGO
    if logo_idx is not None:
        logo_x = args.logo_x
        logo_y = args.logo_y
        logo_size = args.logo_size
        # Logo will be handled via overlay after main filter
        pass  # handled below

    # 4. BORDERS — solid color bars (matching preview editor)
    # Preview renders borders as separate colored divs above/below the video,
    # so we replicate this with FFmpeg pad + drawtext.
    font_file = "C\\:/Windows/Fonts/arial.ttf"
    has_top_border = bool(args.border_top)
    has_bottom_border = bool(args.border_bottom)
    # Scale border height from preview px to video resolution
    # Preview: frameBorderHeight px on ~400px container → scale to vh
    border_bar_h = max(20, int(args.border_height * vh / 400))
    border_fontsize = max(12, int(border_bar_h * 0.5))
    # Convert border color hex to FFmpeg hex format
    border_bg_hex = args.border_color.lstrip('#')

    if has_top_border or has_bottom_border:
        top_pad = border_bar_h if has_top_border else 0
        bottom_pad = border_bar_h if has_bottom_border else 0
        vf_parts.append(
            f"pad=w=iw:h=ih+{top_pad + bottom_pad}:x=0:y={top_pad}:color=0x{border_bg_hex}"
        )

    if has_top_border:
        safe_text = args.border_top.replace("'", "\\'").replace(":", "\\:")
        vf_parts.append(
            f"drawtext=text='{safe_text}'"
            f":fontfile='{font_file}'"
            f":fontsize={border_fontsize}:fontcolor={args.border_text_color}"
            f":x=(w-text_w)/2:y=({border_bar_h}-text_h)/2"
        )
    if has_bottom_border:
        safe_text = args.border_bottom.replace("'", "\\'").replace(":", "\\:")
        vf_parts.append(
            f"drawtext=text='{safe_text}'"
            f":fontfile='{font_file}'"
            f":fontsize={border_fontsize}:fontcolor={args.border_text_color}"
            f":x=(w-text_w)/2:y=h-{border_bar_h}+({border_bar_h}-text_h)/2"
        )

    # ---- Build filter_complex ----
    filter_parts = []
    audio_source_idx = bg_idx if bg_idx is not None else 0

    # If YOLO blur was done via OpenCV, swap video input
    if yolo_blurred_video and os.path.exists(yolo_blurred_video):
        # Rebuild cmd: blurred video (video) + original (audio only) + optional background + voiceover + logo
        cmd = ['ffmpeg', '-y', '-i', yolo_blurred_video, '-i', args.video]
        input_count = 2
        bg_idx = None
        if args.background_audio and os.path.exists(args.background_audio):
            cmd.extend(['-i', args.background_audio])
            bg_idx = input_count
            input_count += 1
        # Re-add voiceover
        vo_idx = None
        if args.voiceover and os.path.exists(args.voiceover):
            cmd.extend(['-i', args.voiceover])
            vo_idx = input_count
            input_count += 1
        # Re-add logo
        logo_idx = None
        if args.logo and os.path.exists(args.logo):
            cmd.extend(['-i', args.logo])
            logo_idx = input_count
            input_count += 1

        audio_source_idx = bg_idx if bg_idx is not None else 1

        # Video from input 0 (blurred), audio from input 1 (original)
        if vf_parts:
            video_chain = f"[0:v]" + ','.join(vf_parts) + "[vout]"
        else:
            video_chain = "[0:v]null[vout]"
        filter_parts.append(video_chain)

        # Audio from separated background if present, else original video track
        if vo_idx is not None:
            orig_vol = args.original_volume
            vo_vol = args.voiceover_volume
            filter_parts.append(
                f"[{audio_source_idx}:a]volume={orig_vol}[_a0];"
                f"[{vo_idx}:a]volume={vo_vol}[_a1];"
                f"[_a0][_a1]amix=inputs=2:duration=longest[aout]"
            )
        elif args.original_volume != 1.0:
            filter_parts.append(f"[{audio_source_idx}:a]volume={args.original_volume}[aout]")

    else:
        # Normal path (no YOLO pre-processing)

        # Video chain: need to handle the split/overlay carefully
        if vf_parts:
            # First part might contain split=2 blur chain (multi-stream with ;)
            if len(vf_parts) > 0 and 'split=' in vf_parts[0]:
                blur_filter = vf_parts[0]
                rest_filters = ','.join(vf_parts[1:]) if len(vf_parts) > 1 else ''
                if rest_filters:
                    video_chain = f"[0:v]{blur_filter}," + rest_filters + "[vout]"
                else:
                    video_chain = f"[0:v]{blur_filter}[vout]"
            else:
                video_chain = f"[0:v]" + ','.join(vf_parts) + "[vout]"
        else:
            video_chain = "[0:v]null[vout]"

        filter_parts.append(video_chain)

    # Logo overlay (if present, chain after vout)
    if logo_idx is not None:
        filter_parts[0] = filter_parts[0].replace('[vout]', '[vpre]')
        filter_parts.append(
            f"[{logo_idx}:v]scale={args.logo_size}:-1[_logo];"
            f"[vpre][_logo]overlay={args.logo_x}:{args.logo_y}[vout]"
        )

    # Audio chain (skip if YOLO path already handled it)
    if not (yolo_blurred_video and os.path.exists(yolo_blurred_video)):
        if vo_idx is not None:
            orig_vol = args.original_volume
            vo_vol = args.voiceover_volume
            filter_parts.append(
                f"[{audio_source_idx}:a]volume={orig_vol}[_a0];"
                f"[{vo_idx}:a]volume={vo_vol}[_a1];"
                f"[_a0][_a1]amix=inputs=2:duration=longest[aout]"
            )
        elif args.original_volume != 1.0:
            filter_parts.append(f"[{audio_source_idx}:a]volume={args.original_volume}[aout]")

    # Apply quality scale if not native resolution
    target_w, target_h = getattr(args, '_target_w', 0), getattr(args, '_target_h', 0)
    if target_w and target_h and (target_w != vw or target_h != vh):
        # Insert scale before [vout] in filter chain
        filter_parts[0] = filter_parts[0].replace('[vout]', f',scale={target_w}:{target_h}:flags=lanczos[vout]')
        print(f"  Quality scale: {vw}x{vh} → {target_w}x{target_h}")

    full_filter = ';'.join(filter_parts)

    cmd.extend(['-filter_complex', full_filter])
    cmd.extend(['-map', '[vout]'])

    # Audio mapping
    has_audio_filter = '[aout]' in full_filter
    if has_audio_filter:
        cmd.extend(['-map', '[aout]'])
    else:
        cmd.extend(['-map', f'{audio_source_idx}:a?'])

    # Output encoding
    cmd.extend([
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
        '-profile:v', 'high', '-level', '4.1',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '256k',
        '-movflags', '+faststart',
        '-progress', 'pipe:1',
        args.output
    ])

    return cmd


def main():
    parser = argparse.ArgumentParser(description='Render video with blur + subtitles')
    parser.add_argument('--video', required=True)
    parser.add_argument('--srt', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--blur-hardsub', action='store_true', default=True)
    parser.add_argument('--no-blur', dest='blur_hardsub', action='store_false')
    parser.add_argument('--blur-data', default=None, help='YOLO bbox JSON')
    parser.add_argument('--blur-height', type=int, default=15, help='Blur height (pct)')
    parser.add_argument('--blur-width', type=int, default=100, help='Blur width (pct)')
    parser.add_argument('--blur-intensity', type=int, default=31, help='Blur kernel size for YOLO')
    parser.add_argument('--voiceover', default=None)
    parser.add_argument('--background-audio', default=None)
    parser.add_argument('--logo', default=None)
    parser.add_argument('--logo-x', type=int, default=10)
    parser.add_argument('--logo-y', type=int, default=10)
    parser.add_argument('--logo-size', type=int, default=80)
    parser.add_argument('--sub-color', default='#000000')
    parser.add_argument('--sub-bg', default='#ffffff')
    parser.add_argument('--sub-bg-opacity', type=int, default=85)
    parser.add_argument('--sub-font', default='Arial')
    parser.add_argument('--sub-fontsize', type=int, default=28)
    parser.add_argument('--border-top', default='')
    parser.add_argument('--border-bottom', default='')
    parser.add_argument('--border-color', default='#000000')
    parser.add_argument('--border-text-color', default='#ffffff')
    parser.add_argument('--border-height', type=int, default=40, help='Border bar height in preview px')
    parser.add_argument('--original-volume', type=float, default=1.0)
    parser.add_argument('--voiceover-volume', type=float, default=1.0)
    parser.add_argument('--quality', default='1080p', choices=['1080p', '720p', '480p'])

    args = parser.parse_args()

    if not os.path.exists(args.video):
        print(f"[Render] ERROR: Video not found: {args.video}")
        sys.exit(1)

    print(f"[Render] Starting video render...")
    print(f"  Input: {args.video}")
    print(f"  SRT: {args.srt}")
    print(f"  Output: {args.output}")

    vw, vh, duration = get_video_info(args.video)
    print(f"  Resolution: {vw}x{vh}, Duration: {duration:.1f}s")

    # Apply quality scaling - respect original aspect ratio
    quality_map = {'1080p': 1080, '720p': 720, '480p': 480}
    target_short = quality_map.get(args.quality, 0)
    if target_short:
        if vw >= vh:  # Landscape
            args._target_w = int(target_short * vw / vh)
            args._target_h = target_short
        else:  # Portrait
            args._target_w = target_short
            args._target_h = int(target_short * vh / vw)
        # Ensure even dimensions
        args._target_w = args._target_w if args._target_w % 2 == 0 else args._target_w - 1
        args._target_h = args._target_h if args._target_h % 2 == 0 else args._target_h - 1
    else:
        args._target_w, args._target_h = 0, 0

    cmd = build_ffmpeg_cmd(args, vw, vh, duration)
    print(f"  FFmpeg: {' '.join(cmd[:6])}...")
    print(f"  Filter: {cmd[cmd.index('-filter_complex')+1][:200]}...")

    # Run FFmpeg with progress parsing
    process = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, encoding='utf-8', errors='replace'
    )

    # Read stderr for progress (ffmpeg outputs to stderr)
    stdout_data, stderr_data = process.communicate()

    # Print progress output
    if stdout_data:
        for line in stdout_data.strip().split('\n'):
            if line.startswith('out_time=') or line.startswith('progress=') or line.startswith('frame='):
                print(f"PROGRESS: {line}", flush=True)

    if process.returncode != 0:
        print(f"[Render] ERROR: FFmpeg failed (code {process.returncode})")
        # Print last 1500 chars of stderr for debugging
        print(stderr_data[-1500:] if len(stderr_data) > 1500 else stderr_data)
        sys.exit(1)

    output_size = os.path.getsize(args.output) / (1024 * 1024)
    print(f"[Render] SUCCESS! Output: {args.output} ({output_size:.1f} MB)")


if __name__ == '__main__':
    main()

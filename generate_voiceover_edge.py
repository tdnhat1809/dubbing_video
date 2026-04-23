"""
Edge TTS Voiceover Generator
=============================
Generates voiceover audio for each subtitle line using Microsoft Edge TTS.
No GPU required, runs entirely on CPU via cloud API.
"""

import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import re
import time
import argparse
import asyncio
import struct
import tempfile
import numpy as np

try:
    import edge_tts
except ImportError:
    print("ERROR: edge-tts not installed. Run: pip install edge-tts")
    sys.exit(1)

# =========================
# CONFIGURATION
# =========================
DEFAULT_SRT = "text_ocr_vi.srt"
OUTPUT_COMBINED = "voiceover_combined.wav"
SAMPLE_RATE = 24000
INITIAL_TIMELINE_SPEEDUP = 1.2
PREV_VOICE_BLOCK_SPEEDUP = 1.4
MAX_TIMELINE_SPEEDUP = 1.7
TAIL_FADE_SECONDS = 0.06

# Voice presets by language
VOICE_PRESETS = {
    'vi-female': 'vi-VN-HoaiMyNeural',
    'vi-male': 'vi-VN-NamMinhNeural',
    'zh-female': 'zh-CN-XiaoxiaoNeural',
    'zh-male': 'zh-CN-YunxiNeural',
    'en-female': 'en-US-EmmaNeural',
    'en-male': 'en-US-BrianNeural',
    'ja-female': 'ja-JP-NanamiNeural',
    'ja-male': 'ja-JP-KeitaNeural',
    'ko-female': 'ko-KR-SunHiNeural',
    'ko-male': 'ko-KR-InJoonNeural',
}


# =========================
# SRT PARSER
# =========================
def parse_srt(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    content = content.replace('\r\n', '\n').replace('\r', '\n')
    blocks = re.split(r'\n\n+', content.strip())
    entries = []
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
        try:
            index = int(lines[0].strip())
        except ValueError:
            continue
        tc = re.match(r'(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})', lines[1].strip())
        if not tc:
            continue
        text = '\n'.join(lines[2:]).strip()
        entries.append({
            'index': index,
            'start': tc.group(1),
            'end': tc.group(2),
            'text': text,
        })
    return entries


def timecode_to_seconds(tc):
    h, m, rest = tc.split(':')
    s, ms = rest.split(',')
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0


def read_wav_data(filepath):
    """Read WAV file and return (samples_np_float32, sample_rate)."""
    with open(filepath, 'rb') as f:
        data = f.read()
    
    # Parse WAV header
    if data[:4] != b'RIFF' or data[8:12] != b'WAVE':
        raise ValueError("Not a valid WAV file")
    
    # Find fmt chunk
    pos = 12
    fmt_found = False
    channels = 1
    sr = 24000
    bits = 16
    while pos < len(data) - 8:
        chunk_id = data[pos:pos+4]
        chunk_size = struct.unpack('<I', data[pos+4:pos+8])[0]
        if chunk_id == b'fmt ':
            fmt_found = True
            audio_fmt = struct.unpack('<H', data[pos+8:pos+10])[0]
            channels = struct.unpack('<H', data[pos+10:pos+12])[0]
            sr = struct.unpack('<I', data[pos+12:pos+16])[0]
            bits = struct.unpack('<H', data[pos+22:pos+24])[0]
        elif chunk_id == b'data':
            audio_bytes = data[pos+8:pos+8+chunk_size]
            break
        pos += 8 + chunk_size
    else:
        raise ValueError("No data chunk found")
    
    if bits == 16:
        samples = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    elif bits == 8:
        samples = (np.frombuffer(audio_bytes, dtype=np.uint8).astype(np.float32) - 128) / 128.0
    else:
        samples = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    
    # Mix to mono
    if channels > 1:
        samples = samples.reshape(-1, channels).mean(axis=1)
    
    return samples, sr


def write_wav(filepath, audio_np, sample_rate=24000):
    """Write float32 numpy array to WAV file."""
    max_val = max(abs(audio_np.max()), abs(audio_np.min()), 1e-8)
    if max_val > 0:
        audio_np = audio_np / max_val * 0.95
    int_data = (audio_np * 32767).astype(np.int16)
    
    channels = 1
    bits = 16
    with open(filepath, 'wb') as f:
        data_size = len(int_data) * channels * (bits // 8)
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + data_size))
        f.write(b'WAVE')
        f.write(b'fmt ')
        f.write(struct.pack('<I', 16))
        f.write(struct.pack('<H', 1))  # PCM
        f.write(struct.pack('<H', channels))
        f.write(struct.pack('<I', sample_rate))
        f.write(struct.pack('<I', sample_rate * channels * (bits // 8)))
        f.write(struct.pack('<H', channels * (bits // 8)))
        f.write(struct.pack('<H', bits))
        f.write(b'data')
        f.write(struct.pack('<I', data_size))
        f.write(int_data.tobytes())


def speed_adjust(audio_np, speed_factor):
    """Simple speed adjustment via linear interpolation."""
    if abs(speed_factor - 1.0) < 0.05:
        return audio_np
    original_len = len(audio_np)
    new_len = int(original_len / speed_factor)
    if new_len < 100:
        return audio_np
    x_old = np.linspace(0, 1, original_len)
    x_new = np.linspace(0, 1, new_len)
    return np.interp(x_new, x_old, audio_np)


def resample(audio_np, from_sr, to_sr):
    """Simple resample via linear interpolation."""
    if from_sr == to_sr:
        return audio_np
    ratio = to_sr / from_sr
    new_len = int(len(audio_np) * ratio)
    x_old = np.linspace(0, 1, len(audio_np))
    x_new = np.linspace(0, 1, new_len)
    return np.interp(x_new, x_old, audio_np)


def apply_tail_fade(audio_np, sample_rate, fade_seconds=TAIL_FADE_SECONDS):
    if len(audio_np) == 0:
        return audio_np
    fade_len = min(int(sample_rate * fade_seconds), len(audio_np))
    if fade_len <= 1:
        return audio_np
    faded = audio_np.copy()
    faded[-fade_len:] *= np.linspace(1.0, 0.0, fade_len, dtype=np.float32)
    return faded


def prepare_clip_for_timeline(audio_np, entry, prev_sub_end_sec, prev_voice_end_sec,
                              next_sub_start_sec, sample_rate):
    start_sec = timecode_to_seconds(entry['start'])
    end_sec = timecode_to_seconds(entry['end'])
    slot_duration = max(0.0, end_sec - start_sec)
    clip_duration = len(audio_np) / sample_rate if len(audio_np) > 0 else 0.0
    speed_applied = 1.0

    if clip_duration > slot_duration and INITIAL_TIMELINE_SPEEDUP > 1.0:
        audio_np = speed_adjust(audio_np, INITIAL_TIMELINE_SPEEDUP)
        clip_duration = len(audio_np) / sample_rate if len(audio_np) > 0 else 0.0
        speed_applied = INITIAL_TIMELINE_SPEEDUP

    earliest_start = max(prev_voice_end_sec, prev_sub_end_sec)
    before_gap = max(0.0, start_sec - earliest_start)
    after_gap = max(0.0, next_sub_start_sec - end_sec) if next_sub_start_sec is not None else 0.0
    blocked_before_gap = max(0.0, prev_voice_end_sec - prev_sub_end_sec)

    if (
        clip_duration > slot_duration
        and blocked_before_gap > 0.01
        and speed_applied < PREV_VOICE_BLOCK_SPEEDUP
    ):
        extra_speed = PREV_VOICE_BLOCK_SPEEDUP / max(speed_applied, 1.0)
        audio_np = speed_adjust(audio_np, extra_speed)
        clip_duration = len(audio_np) / sample_rate if len(audio_np) > 0 else 0.0
        speed_applied *= extra_speed

    planned_start = start_sec
    latest_end = end_sec

    if clip_duration > slot_duration:
        extra_needed = clip_duration - slot_duration
        borrow_before = min(before_gap, extra_needed / 2.0)
        borrow_after = min(after_gap, extra_needed - borrow_before)
        remaining = extra_needed - borrow_before - borrow_after

        if remaining > 0:
            extra_before = min(before_gap - borrow_before, remaining)
            borrow_before += extra_before
            remaining -= extra_before

        if remaining > 0:
            extra_after = min(after_gap - borrow_after, remaining)
            borrow_after += extra_after
            remaining -= extra_after

        planned_start = start_sec - borrow_before
        latest_end = end_sec + borrow_after
    elif next_sub_start_sec is not None:
        latest_end = min(end_sec, next_sub_start_sec)

    if next_sub_start_sec is None:
        latest_end = max(latest_end, planned_start + clip_duration)
    else:
        latest_end = min(latest_end, next_sub_start_sec)

    available_duration = max(0.05, latest_end - planned_start)

    if clip_duration > available_duration:
        required_speed = clip_duration / available_duration
        max_additional_speed = max(1.0, MAX_TIMELINE_SPEEDUP / max(speed_applied, 1.0))
        additional_speed = min(required_speed, max_additional_speed)
        if additional_speed > 1.05:
            audio_np = speed_adjust(audio_np, additional_speed)
            clip_duration = len(audio_np) / sample_rate
            speed_applied *= additional_speed

    trimmed = False
    if clip_duration > available_duration:
        max_samples = max(1, int(available_duration * sample_rate))
        audio_np = apply_tail_fade(audio_np[:max_samples], sample_rate)
        clip_duration = len(audio_np) / sample_rate
        trimmed = True

    actual_end = planned_start + clip_duration
    if next_sub_start_sec is not None and actual_end > next_sub_start_sec:
        max_samples = max(1, int((next_sub_start_sec - planned_start) * sample_rate))
        audio_np = apply_tail_fade(audio_np[:max_samples], sample_rate)
        clip_duration = len(audio_np) / sample_rate
        actual_end = planned_start + clip_duration
        trimmed = True

    return {
        'audio': audio_np,
        'start_sec': planned_start,
        'end_sec': actual_end,
        'speed_applied': speed_applied,
        'borrow_before': max(0.0, start_sec - planned_start),
        'borrow_after': max(0.0, actual_end - end_sec),
        'trimmed': trimmed,
    }


async def generate_clip_edge(text, voice, output_path, rate='+0%', retries=3):
    """Generate a single TTS clip using edge-tts with retry."""
    for attempt in range(retries):
        try:
            communicate = edge_tts.Communicate(text, voice, rate=rate)
            await communicate.save(output_path)
            if os.path.exists(output_path) and os.path.getsize(output_path) > 100:
                return True
        except Exception as e:
            if attempt < retries - 1:
                await asyncio.sleep(1.0 * (attempt + 1))  # backoff
            else:
                raise e
    return False


async def generate_all_clips(entries, voice, clips_dir, speed=1.0, rate_str='+0%'):
    """Generate all TTS clips SEQUENTIALLY with retry, progress, and rate limiting."""
    total = len(entries)
    results = []
    error_count = 0
    max_errors = max(20, total // 5)  # Allow up to 20% failures
    
    for i, entry in enumerate(entries):
        text = entry['text'].strip()
        if not text or len(text) < 2:
            results.append(None)
            continue
        
        clip_path = os.path.join(clips_dir, f"clip_{i:04d}.mp3")
        try:
            await generate_clip_edge(text, voice, clip_path, rate=rate_str)
            pct = (i + 1) * 100 // total
            print(f"  [{i+1}/{total}] {pct}% | {text[:40]}")
            sys.stdout.flush()
            results.append(clip_path)
        except Exception as e:
            error_count += 1
            print(f"  [{i+1}/{total}] ERROR ({error_count}): {str(e)[:60]} | {text[:30]}")
            sys.stdout.flush()
            results.append(None)
            
            # Abort if too many errors (likely rate limited or auth issue)
            if error_count >= max_errors:
                print(f"\n  ABORT: Too many errors ({error_count}/{total}). Stopping.")
                break
            
            # Extra delay after error
            await asyncio.sleep(2.0)
        
        # Rate limiting delays
        if (i + 1) % 5 == 0:
            await asyncio.sleep(0.5)  # 500ms every 5 clips
        if (i + 1) % 50 == 0:
            await asyncio.sleep(2.0)  # Extra 2s every 50 clips
            print(f"  ... Rate limit pause ({i+1}/{total}) ...")
            sys.stdout.flush()
    
    success = sum(1 for r in results if r is not None)
    print(f"\n  Generated {success}/{total} clips ({error_count} errors)")
    sys.stdout.flush()
    
    return results


def main():
    parser = argparse.ArgumentParser(description="Generate voiceover from SRT using Edge TTS")
    parser.add_argument('--srt', default=DEFAULT_SRT, help="Input SRT file")
    parser.add_argument('--voice', default=None, help="Edge TTS voice name (e.g. vi-VN-HoaiMyNeural)")
    parser.add_argument('--output', default=OUTPUT_COMBINED, help="Output WAV file")
    parser.add_argument('--speed', type=float, default=1.0, help="Speech speed multiplier")
    parser.add_argument('--language', default='Vietnamese', help="Language for voice preset")
    parser.add_argument('--gender', default='female', choices=['female', 'male'], help="Voice gender")
    args = parser.parse_args()
    
    # Resolve voice
    if args.voice:
        voice = args.voice
    else:
        # Map language + gender to preset
        lang_map = {
            'Vietnamese': 'vi', 'English': 'en', 'Chinese': 'zh',
            'Japanese': 'ja', 'Korean': 'ko',
        }
        lang_code = lang_map.get(args.language, 'vi')
        preset_key = f"{lang_code}-{args.gender}"
        voice = VOICE_PRESETS.get(preset_key, 'vi-VN-HoaiMyNeural')
    
    print(f"\n{'='*60}")
    print(f"  EDGE TTS VOICEOVER GENERATOR")
    print(f"{'='*60}")
    print(f"  SRT:    {args.srt}")
    print(f"  Voice:  {voice}")
    print(f"  Speed:  {args.speed}x")
    print(f"  Output: {args.output}")
    
    # Parse SRT
    entries = parse_srt(args.srt)
    total = len(entries)
    print(f"  Subtitles: {total}")
    
    if total == 0:
        print("  ERROR: No subtitles found!")
        return
    
    last_end = max(timecode_to_seconds(e['end']) for e in entries)
    print(f"  Duration: {last_end:.1f}s")
    
    # Filter garbage
    valid_entries = []
    for e in entries:
        text = e['text'].strip()
        if text and len(text) > 1:
            valid_entries.append(e)
    
    print(f"  Valid entries: {len(valid_entries)}/{total}")
    print(f"{'='*60}\n")
    
    # Speed to rate string
    rate_pct = int((args.speed - 1.0) * 100)
    rate_str = f"+{rate_pct}%" if rate_pct >= 0 else f"{rate_pct}%"
    
    # Generate clips
    clips_dir = tempfile.mkdtemp(prefix="edge_tts_clips_")
    print(f"  Generating {len(valid_entries)} clips...")
    
    t0 = time.time()
    clip_paths = asyncio.run(generate_all_clips(valid_entries, voice, clips_dir, args.speed, rate_str))
    gen_time = time.time() - t0
    
    success_count = sum(1 for p in clip_paths if p is not None)
    print(f"\n  Generated {success_count}/{len(valid_entries)} clips in {gen_time:.1f}s")
    
    # Load and combine clips into timeline
    print(f"\n  Combining into timeline...")
    
    total_samples = int(last_end * SAMPLE_RATE) + SAMPLE_RATE  # +1s buffer
    combined = np.zeros(total_samples, dtype=np.float32)
    prev_voice_end_sec = 0.0
    
    for i, (entry, clip_path) in enumerate(zip(valid_entries, clip_paths)):
        if clip_path is None or not os.path.exists(clip_path):
            continue
        
        prev_sub_end_sec = timecode_to_seconds(valid_entries[i - 1]['end']) if i > 0 else 0.0
        next_start_sec = None
        for j in range(i + 1, len(valid_entries)):
            ns = timecode_to_seconds(valid_entries[j]['start'])
            if ns > timecode_to_seconds(entry['start']):
                next_start_sec = ns
                break
        
        try:
            # Read MP3 clip - convert to WAV first using ffmpeg
            wav_path = clip_path.replace('.mp3', '.wav')
            
            import subprocess
            result = subprocess.run(
                ['ffmpeg', '-y', '-i', clip_path, '-ar', str(SAMPLE_RATE), '-ac', '1', '-f', 'wav', wav_path],
                capture_output=True, timeout=10
            )
            
            if result.returncode == 0 and os.path.exists(wav_path):
                clip_audio, clip_sr = read_wav_data(wav_path)
            else:
                continue
            
            # Resample if needed
            if clip_sr != SAMPLE_RATE:
                clip_audio = resample(clip_audio, clip_sr, SAMPLE_RATE)
            
            placement = prepare_clip_for_timeline(
                clip_audio, entry, prev_sub_end_sec, prev_voice_end_sec, next_start_sec, SAMPLE_RATE
            )
            clip_audio = placement['audio']
            prev_voice_end_sec = placement['end_sec']

            start_sample = max(0, int(round(placement['start_sec'] * SAMPLE_RATE)))
            end_sample = start_sample + len(clip_audio)
            
            if end_sample > len(combined):
                combined = np.pad(combined, (0, end_sample - len(combined) + 1000))
            
            combined[start_sample:end_sample] = clip_audio

            if placement['borrow_before'] > 0.01 or placement['borrow_after'] > 0.01 or placement['speed_applied'] > 1.05 or placement['trimmed']:
                print(
                    f"    [{entry['index']}] window "
                    f"-{placement['borrow_before']:.2f}s/+{placement['borrow_after']:.2f}s "
                    f"| speed {placement['speed_applied']:.2f}x"
                    f"{' | trimmed' if placement['trimmed'] else ''}"
                )
            
        except Exception as e:
            print(f"  Warning: clip {i} error: {e}")
            continue
    
    # Cleanup temp files
    import shutil
    shutil.rmtree(clips_dir, ignore_errors=True)
    
    # Trim trailing silence
    last_nonzero = np.max(np.nonzero(combined)) if np.any(combined) else len(combined)
    combined = combined[:last_nonzero + SAMPLE_RATE]
    
    # Write output
    write_wav(args.output, combined, SAMPLE_RATE)
    
    file_size = os.path.getsize(args.output) / 1024 / 1024
    total_time = time.time() - t0
    
    print(f"\n{'='*60}")
    print(f"  DONE in {total_time:.1f}s")
    print(f"  Output: {args.output} ({file_size:.1f} MB)")
    print(f"  Clips: {success_count}/{len(valid_entries)}")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()

"""
SRT Voiceover Generator using OmniVoice
========================================
Generates voice-cloned audio for each subtitle line in an SRT file,
time-aligned to match the subtitle timeline.
"""

import os
import sys
import re
import time
import argparse
import struct
import math
import numpy as np

# =========================
# CONFIGURATION
# =========================
DEFAULT_SRT = "text_ocr_vi.srt"
DEFAULT_REF_AUDIO = "2_out (mp3cut.net).wav"
DEFAULT_MODEL = "k2-fsa/OmniVoice"
OUTPUT_DIR = "voiceover_clips"
OUTPUT_COMBINED = "voiceover_combined.wav"
SAMPLE_RATE = 24000  # OmniVoice default

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


def write_wav(filepath, audio_data, sample_rate=24000, channels=1, bits=16):
    import torch as _torch
    if isinstance(audio_data, _torch.Tensor):
        audio_np = audio_data.squeeze().cpu().float().numpy()
    elif isinstance(audio_data, np.ndarray):
        audio_np = audio_data.astype(np.float32)
    else:
        audio_np = np.array(audio_data, dtype=np.float32)
    
    max_val = max(abs(audio_np.max()), abs(audio_np.min()), 1e-8)
    if max_val > 0:
        audio_np = audio_np / max_val * 0.95
    int_data = (audio_np * 32767).astype(np.int16)
    
    with open(filepath, 'wb') as f:
        num_samples = len(int_data)
        data_size = num_samples * channels * (bits // 8)
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + data_size))
        f.write(b'WAVE')
        f.write(b'fmt ')
        f.write(struct.pack('<I', 16))
        f.write(struct.pack('<H', 1))
        f.write(struct.pack('<H', channels))
        f.write(struct.pack('<I', sample_rate))
        f.write(struct.pack('<I', sample_rate * channels * (bits // 8)))
        f.write(struct.pack('<H', channels * (bits // 8)))
        f.write(struct.pack('<H', bits))
        f.write(b'data')
        f.write(struct.pack('<I', data_size))
        f.write(int_data.tobytes())


def speed_adjust_numpy(audio_np, speed_factor, sr):
    """Simple speed adjustment via linear interpolation (no sox needed)."""
    if abs(speed_factor - 1.0) < 0.05:
        return audio_np
    
    original_len = len(audio_np)
    new_len = int(original_len / speed_factor)
    if new_len < 100:
        return audio_np
    
    x_old = np.linspace(0, 1, original_len)
    x_new = np.linspace(0, 1, new_len)
    return np.interp(x_new, x_old, audio_np)


# =========================
# MAIN
# =========================
def main():
    parser = argparse.ArgumentParser(description="Generate voiceover from SRT using OmniVoice")
    parser.add_argument('--srt', default=DEFAULT_SRT)
    parser.add_argument('--ref', default=DEFAULT_REF_AUDIO)
    parser.add_argument('--model', default=DEFAULT_MODEL)
    parser.add_argument('--output', default=OUTPUT_COMBINED)
    parser.add_argument('--skip-existing', action='store_true', help="Skip clips that already exist")
    args = parser.parse_args()
    
    print(f"\n{'='*60}")
    print(f"  OMNIVOICE SRT VOICEOVER GENERATOR")
    print(f"{'='*60}")
    print(f"  SRT:    {args.srt}")
    print(f"  Voice:  {args.ref}")
    print(f"  Model:  {args.model}")
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
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Filter OCR garbage
    valid_entries = []
    for e in entries:
        text = e['text'].strip()
        if text and not re.match(r'^[A-Z]{5,}$', text):
            valid_entries.append(e)
        else:
            print(f"  ⚠ Skipping OCR artifact: [{e['index']}] {text}")
    
    print(f"  Valid entries: {len(valid_entries)}/{total}")
    print(f"{'='*60}\n")
    
    # ===== LOAD MODEL =====
    print("  Loading OmniVoice model...")
    t0 = time.time()
    
    import torch
    import torchaudio
    from omnivoice import OmniVoice
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"  Device: {device}")
    
    model = OmniVoice.from_pretrained(
        args.model,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32,
        device_map=device,
    )
    
    model_sr = model.sampling_rate or SAMPLE_RATE
    print(f"  Sample rate: {model_sr}")
    print(f"  Model loaded in {time.time()-t0:.1f}s")
    
    # ===== VOICE CLONE PROMPT =====
    print(f"\n  Creating voice clone from: {args.ref}")
    voice_prompt = model.create_voice_clone_prompt(ref_audio=args.ref)
    print(f"  ✓ Voice clone prompt ready")
    
    # ===== GENERATE ALL CLIPS =====
    print(f"\n  Generating {len(valid_entries)} voice clips...\n")
    
    generated_clips = []
    failed_entries = []
    
    for i, entry in enumerate(valid_entries):
        idx = entry['index']
        text = entry['text']
        start_sec = timecode_to_seconds(entry['start'])
        end_sec = timecode_to_seconds(entry['end'])
        target_duration = end_sec - start_sec
        
        clip_path = os.path.join(OUTPUT_DIR, f"clip_{idx:04d}.wav")
        
        if args.skip_existing and os.path.exists(clip_path):
            print(f"  [{i+1}/{len(valid_entries)}] #{idx} SKIP (exists)")
            generated_clips.append((start_sec, end_sec, clip_path))
            continue
        
        display_text = text[:45] + "..." if len(text) > 45 else text
        print(f"  [{i+1}/{len(valid_entries)}] #{idx} ({target_duration:.1f}s) {display_text}", end="", flush=True)
        
        try:
            # Strategy 1: Generate WITHOUT duration constraint (more reliable)
            # Then speed-adjust to fit subtitle window
            audios = model.generate(
                text=text,
                language="Vietnamese",
                voice_clone_prompt=voice_prompt,
            )
            
            audio = audios[0]  # (1, T) tensor
            audio_np = audio.squeeze().cpu().float().numpy()
            actual_duration = len(audio_np) / model_sr
            
            # Speed-adjust to fit subtitle window
            if target_duration > 0.1 and actual_duration > 0.1:
                speed_factor = actual_duration / target_duration
                if speed_factor > 1.05 or speed_factor < 0.7:
                    audio_np = speed_adjust_numpy(audio_np, speed_factor, model_sr)
                    new_duration = len(audio_np) / model_sr
                    print(f" → {actual_duration:.1f}s→{new_duration:.1f}s", end="")
            
            # Trim if still too long
            max_samples = int(target_duration * model_sr)
            if len(audio_np) > max_samples:
                audio_np = audio_np[:max_samples]
            
            write_wav(clip_path, audio_np, model_sr)
            generated_clips.append((start_sec, end_sec, clip_path))
            print(" ✓")
            
        except Exception as e:
            err_msg = str(e)[:60]
            print(f" ✗ {err_msg}")
            failed_entries.append((i, entry, err_msg))
    
    # ===== RETRY FAILED WITH speed= parameter =====
    if failed_entries:
        print(f"\n  Retrying {len(failed_entries)} failed entries with speed adjustment...")
        still_failed = []
        
        for retry_i, (orig_i, entry, prev_err) in enumerate(failed_entries):
            idx = entry['index']
            text = entry['text']
            start_sec = timecode_to_seconds(entry['start'])
            end_sec = timecode_to_seconds(entry['end'])
            target_duration = end_sec - start_sec
            
            clip_path = os.path.join(OUTPUT_DIR, f"clip_{idx:04d}.wav")
            display_text = text[:35] + "..." if len(text) > 35 else text
            print(f"  RETRY [{retry_i+1}/{len(failed_entries)}] #{idx} {display_text}", end="", flush=True)
            
            try:
                # Try with faster speed for short segments
                speed = max(1.0, 2.5 / max(target_duration, 0.3))
                audios = model.generate(
                    text=text,
                    language="Vietnamese",
                    voice_clone_prompt=voice_prompt,
                    speed=speed,
                )
                
                audio = audios[0]
                audio_np = audio.squeeze().cpu().float().numpy()
                actual_duration = len(audio_np) / model_sr
                
                # Speed-adjust
                if target_duration > 0.1 and actual_duration > 0.1:
                    speed_factor = actual_duration / target_duration
                    if speed_factor > 1.05:
                        audio_np = speed_adjust_numpy(audio_np, speed_factor, model_sr)
                
                max_samples = int(target_duration * model_sr)
                if len(audio_np) > max_samples:
                    audio_np = audio_np[:max_samples]
                
                write_wav(clip_path, audio_np, model_sr)
                generated_clips.append((start_sec, end_sec, clip_path))
                print(" ✓ (retry)")
                
            except Exception as e2:
                err2 = str(e2)[:50]
                print(f" ✗✗ {err2}")
                still_failed.append((entry, err2))
        
        # ===== LAST RESORT: generate silent placeholder for failures =====
        if still_failed:
            print(f"\n  Creating silent placeholders for {len(still_failed)} remaining entries...")
            for entry, err in still_failed:
                idx = entry['index']
                start_sec = timecode_to_seconds(entry['start'])
                end_sec = timecode_to_seconds(entry['end'])
                target_duration = end_sec - start_sec
                
                clip_path = os.path.join(OUTPUT_DIR, f"clip_{idx:04d}.wav")
                # Create a short silence placeholder
                silence = np.zeros(int(target_duration * model_sr), dtype=np.float32)
                write_wav(clip_path, silence, model_sr)
                generated_clips.append((start_sec, end_sec, clip_path))
                print(f"  [{idx}] silent placeholder ({target_duration:.1f}s)")
    
    # ===== COMBINE INTO TIMELINE =====
    print(f"\n  Combining {len(generated_clips)} clips into timeline...")
    
    total_samples = int(math.ceil(last_end * model_sr)) + model_sr
    combined = np.zeros(total_samples, dtype=np.float32)
    
    for start_sec, end_sec, clip_path in sorted(generated_clips, key=lambda x: x[0]):
        if not os.path.exists(clip_path):
            continue
        
        try:
            clip_audio, clip_sr = torchaudio.load(clip_path)
            clip_np = clip_audio.squeeze().numpy()
            
            if clip_sr != model_sr:
                clip_audio = torchaudio.functional.resample(clip_audio, clip_sr, model_sr)
                clip_np = clip_audio.squeeze().numpy()
            
            start_sample = int(start_sec * model_sr)
            end_sample = start_sample + len(clip_np)
            
            if end_sample > len(combined):
                combined = np.pad(combined, (0, end_sample - len(combined)))
            
            combined[start_sample:start_sample + len(clip_np)] += clip_np
        except Exception as e:
            print(f"    Warning: Could not load {clip_path}: {e}")
    
    peak = np.abs(combined).max()
    if peak > 0:
        combined = combined / peak * 0.95
    
    write_wav(args.output, combined, model_sr)
    
    success_count = len([c for c in generated_clips if os.path.exists(c[2]) and os.path.getsize(c[2]) > 1000])
    
    print(f"\n{'='*60}")
    print(f"  ✓ VOICEOVER COMPLETE")
    print(f"  Output: {args.output}")
    print(f"  Duration: {last_end:.1f}s")
    print(f"  Voiced clips: {success_count}/{len(valid_entries)}")
    print(f"  Total clips: {len(generated_clips)}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()

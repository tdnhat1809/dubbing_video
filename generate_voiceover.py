"""
SRT Voiceover Generator using OmniVoice
========================================
Generates voice-cloned audio for each subtitle line in an SRT file,
time-aligned to match the subtitle timeline.
"""

import os
import sys

# Fix Windows console encoding for Vietnamese/Chinese text
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    os.environ['PYTHONIOENCODING'] = 'utf-8'
import re
import time
import argparse
import struct
import math
import random
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
DEFAULT_SEED = 12345
INITIAL_TIMELINE_SPEEDUP = 1.2
PREV_VOICE_BLOCK_SPEEDUP = 1.4
MAX_TIMELINE_SPEEDUP = 1.7
TAIL_FADE_SECONDS = 0.06

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


def apply_tail_fade(audio_np, sample_rate, fade_seconds=TAIL_FADE_SECONDS):
    if len(audio_np) == 0:
        return audio_np
    fade_len = min(int(sample_rate * fade_seconds), len(audio_np))
    if fade_len <= 1:
        return audio_np
    faded = audio_np.copy()
    faded[-fade_len:] *= np.linspace(1.0, 0.0, fade_len, dtype=np.float32)
    return faded


def make_clip_record(entry, clip_path):
    return {
        'index': entry['index'],
        'start_sec': timecode_to_seconds(entry['start']),
        'end_sec': timecode_to_seconds(entry['end']),
        'clip_path': clip_path,
    }


def prepare_clip_for_timeline(audio_np, entry, prev_sub_end_sec, prev_voice_end_sec,
                              next_sub_start_sec, sample_rate):
    start_sec = timecode_to_seconds(entry['start'])
    end_sec = timecode_to_seconds(entry['end'])
    slot_duration = max(0.0, end_sec - start_sec)
    clip_duration = len(audio_np) / sample_rate if len(audio_np) > 0 else 0.0
    speed_applied = 1.0

    if clip_duration > slot_duration and INITIAL_TIMELINE_SPEEDUP > 1.0:
        audio_np = speed_adjust_numpy(audio_np, INITIAL_TIMELINE_SPEEDUP, sample_rate)
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
        audio_np = speed_adjust_numpy(audio_np, extra_speed, sample_rate)
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
            audio_np = speed_adjust_numpy(audio_np, additional_speed, sample_rate)
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


def set_generation_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    try:
        import torch
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed(seed)
            torch.cuda.manual_seed_all(seed)
        try:
            torch.backends.cudnn.deterministic = True
            torch.backends.cudnn.benchmark = False
        except Exception:
            pass
    except Exception:
        pass


def resolve_model_source(model_arg):
    """
    Supports:
    - Hugging Face repo id
    - full local HF model directory
    - local directory containing only model.safetensors
    - direct .safetensors file path
    """
    if not model_arg:
        return DEFAULT_MODEL, None

    if os.path.isfile(model_arg) and model_arg.endswith(".safetensors"):
        return DEFAULT_MODEL, model_arg

    if os.path.isdir(model_arg):
        config_path = os.path.join(model_arg, "config.json")
        weights_path = os.path.join(model_arg, "model.safetensors")
        if os.path.exists(config_path):
            return model_arg, None
        if os.path.exists(weights_path):
            return DEFAULT_MODEL, weights_path

    return model_arg, None


def load_finetuned_weights(model, weights_path, device):
    from safetensors.torch import load_file

    print(f"  Loading fine-tuned weights: {weights_path}")
    state_dict = load_file(weights_path, device=device)
    missing_keys, unexpected_keys = model.load_state_dict(state_dict, strict=False)
    if unexpected_keys:
        print(f"  ! Unexpected keys: {len(unexpected_keys)}")
    if missing_keys:
        print(f"  ! Missing keys: {len(missing_keys)}")
    print("  âœ“ Fine-tuned weights loaded")


# =========================
# MAIN
# =========================
def main():
    parser = argparse.ArgumentParser(description="Generate voiceover from SRT using OmniVoice")
    parser.add_argument('--srt', default=DEFAULT_SRT)
    parser.add_argument('--ref', default=None, help="Reference audio for voice cloning (optional)")
    parser.add_argument('--voice', default='female', choices=['female', 'male'], help="Built-in TTS voice (used when no --ref is provided)")
    parser.add_argument('--model', default=DEFAULT_MODEL)
    parser.add_argument('--output', default=OUTPUT_COMBINED)
    parser.add_argument('--speed', type=float, default=1.0, help="Speech speed multiplier (e.g. 1.2 = faster)")
    parser.add_argument('--skip-existing', action='store_true', help="Skip clips that already exist")
    parser.add_argument('--seed', type=int, default=DEFAULT_SEED, help="Fixed seed for stable voice generation across all subtitle clips")
    args = parser.parse_args()
    
    use_voice_clone = args.ref is not None and os.path.exists(args.ref)
    
    print(f"\n{'='*60}")
    print(f"  OMNIVOICE SRT VOICEOVER GENERATOR")
    print(f"{'='*60}")
    print(f"  SRT:    {args.srt}")
    if use_voice_clone:
        print(f"  Mode:   Voice Clone (ref: {args.ref})")
    else:
        print(f"  Mode:   TTS ({args.voice})")
    print(f"  Model:  {args.model}")
    print(f"  Output: {args.output}")
    print(f"  Seed:   {args.seed}")
    
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
            print(f"  âš  Skipping OCR artifact: [{e['index']}] {text}")
    
    print(f"  Valid entries: {len(valid_entries)}/{total}")
    print(f"{'='*60}\n")

    set_generation_seed(args.seed)
    
    # ===== LOAD MODEL =====
    print("  Loading OmniVoice model...")
    t0 = time.time()
    
    import torch
    import torchaudio
    
    # Try direct import first, fallback to AutoModel
    try:
        from omnivoice import OmniVoice
        print("  Using omnivoice package")
    except (ImportError, ModuleNotFoundError) as e:
        print(f"  Direct import failed ({e}), using AutoModel fallback...")
        from transformers import AutoModel, AutoConfig
        OmniVoice = None
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"  Device: {device}")
    
    if device == "cpu":
        print("  âš  WARNING: Running on CPU. OmniVoice requires GPU (CUDA) for optimal performance.")
        print("  âš  Please install torch with CUDA support: pip install torch --index-url https://download.pytorch.org/whl/cu121")
    
    base_model_source, finetuned_weights_path = resolve_model_source(args.model)
    if finetuned_weights_path:
        print(f"  Base model: {base_model_source}")
        print(f"  Fine-tuned: {finetuned_weights_path}")

    try:
        if OmniVoice is not None:
            model = OmniVoice.from_pretrained(
                base_model_source,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32,
                device_map=device,
            )
        else:
            config = AutoConfig.from_pretrained(base_model_source, trust_remote_code=True)
            model = AutoModel.from_pretrained(
                base_model_source,
                config=config,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32,
                device_map=device,
                trust_remote_code=True,
            )
        if finetuned_weights_path:
            load_finetuned_weights(model, finetuned_weights_path, device)
    except Exception as e:
        print(f"\n  âœ— ERROR loading model: {e}")
        print(f"  Make sure you have:")
        print(f"    1. GPU with CUDA support")
        print(f"    2. pip install omnivoice torch torchaudio transformers")
        print(f"    3. Internet connection to download model from HuggingFace")
        sys.exit(1)
    
    model_sr = model.sampling_rate or SAMPLE_RATE
    print(f"  Sample rate: {model_sr}")
    print(f"  Model loaded in {time.time()-t0:.1f}s")
    
    # ===== VOICE SETUP =====
    voice_prompt = None
    if use_voice_clone:
        print(f"\n  Creating voice clone from: {args.ref}")
        voice_prompt = model.create_voice_clone_prompt(ref_audio=args.ref)
        print(f"  âœ“ Voice clone prompt ready")
    else:
        print(f"\n  Using built-in TTS voice: {args.voice}")
    
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
            generated_clips.append(make_clip_record(entry, clip_path))
            continue
        
        display_text = text[:45] + "..." if len(text) > 45 else text
        print(f"  [{i+1}/{len(valid_entries)}] #{idx} ({target_duration:.1f}s) {display_text}", end="", flush=True)
        
        try:
            set_generation_seed(args.seed)
            # Generate audio: voice clone or TTS
            gen_kwargs = {
                'text': text,
                'language': 'Vietnamese',
            }
            if voice_prompt is not None:
                gen_kwargs['voice_clone_prompt'] = voice_prompt
            else:
                gen_kwargs['voice'] = args.voice
            audios = model.generate(**gen_kwargs)
            audio = audios[0]  # (1, T) tensor
            audio_np = audio.squeeze().cpu().float().numpy()
            write_wav(clip_path, audio_np, model_sr)
            generated_clips.append(make_clip_record(entry, clip_path))
            print(" âœ“")
            
        except Exception as e:
            err_msg = str(e)[:60]
            print(f" âœ— {err_msg}")
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
                set_generation_seed(args.seed)
                # Try with faster speed for short segments
                speed = max(1.0, 2.5 / max(target_duration, 0.3))
                gen_kwargs = {
                    'text': text,
                    'language': 'Vietnamese',
                    'speed': speed,
                }
                if voice_prompt is not None:
                    gen_kwargs['voice_clone_prompt'] = voice_prompt
                else:
                    gen_kwargs['voice'] = args.voice
                audios = model.generate(**gen_kwargs)
                audio = audios[0]
                audio_np = audio.squeeze().cpu().float().numpy()
                write_wav(clip_path, audio_np, model_sr)
                generated_clips.append(make_clip_record(entry, clip_path))
                print(" ✓ (retry)")
                
            except Exception as e2:
                err2 = str(e2)[:50]
                print(f" âœ—âœ— {err2}")
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
                generated_clips.append(make_clip_record(entry, clip_path))
                print(f"  [{idx}] silent placeholder ({target_duration:.1f}s)")
    
    # ===== COMBINE INTO TIMELINE =====
    print(f"\n  Combining {len(generated_clips)} clips into timeline...")
    
    total_samples = int(math.ceil(last_end * model_sr)) + model_sr
    combined = np.zeros(total_samples, dtype=np.float32)

    valid_entries_by_index = {entry['index']: entry for entry in valid_entries}
    sorted_clips = sorted(generated_clips, key=lambda x: x['start_sec'])
    prev_voice_end_sec = 0.0

    for clip_idx, clip_info in enumerate(sorted_clips):
        clip_path = clip_info['clip_path']
        if not os.path.exists(clip_path):
            continue

        entry = valid_entries_by_index.get(clip_info['index'])
        if entry is None:
            continue

        next_sub_start_sec = None
        if clip_idx + 1 < len(sorted_clips):
            next_sub_start_sec = sorted_clips[clip_idx + 1]['start_sec']

        prev_sub_end_sec = 0.0
        if clip_idx > 0:
            prev_sub_end_sec = sorted_clips[clip_idx - 1]['end_sec']

        try:
            clip_audio, clip_sr = torchaudio.load(clip_path)
            clip_np = clip_audio.squeeze().numpy()

            if clip_sr != model_sr:
                clip_audio = torchaudio.functional.resample(clip_audio, clip_sr, model_sr)
                clip_np = clip_audio.squeeze().numpy()

            placement = prepare_clip_for_timeline(
                clip_np, entry, prev_sub_end_sec, prev_voice_end_sec, next_sub_start_sec, model_sr
            )
            clip_np = placement['audio']
            start_sec = placement['start_sec']
            end_sec = placement['end_sec']
            prev_voice_end_sec = end_sec

            start_sample = max(0, int(round(start_sec * model_sr)))
            end_sample = start_sample + len(clip_np)

            if end_sample > len(combined):
                combined = np.pad(combined, (0, end_sample - len(combined)))

            combined[start_sample:end_sample] = clip_np

            if placement['borrow_before'] > 0.01 or placement['borrow_after'] > 0.01 or placement['speed_applied'] > 1.05 or placement['trimmed']:
                print(
                    f"    [{clip_info['index']}] window "
                    f"-{placement['borrow_before']:.2f}s/+{placement['borrow_after']:.2f}s "
                    f"| speed {placement['speed_applied']:.2f}x"
                    f"{' | trimmed' if placement['trimmed'] else ''}"
                )
        except Exception as e:
            print(f"    Warning: Could not load {clip_path}: {e}")
    
    peak = np.abs(combined).max()
    if peak > 0:
        combined = combined / peak * 0.95
    
    write_wav(args.output, combined, model_sr)
    
    success_count = len([c for c in generated_clips if os.path.exists(c['clip_path']) and os.path.getsize(c['clip_path']) > 1000])
    
    print(f"\n{'='*60}")
    print(f"  âœ“ VOICEOVER COMPLETE")
    print(f"  Output: {args.output}")
    print(f"  Duration: {last_end:.1f}s")
    print(f"  Voiced clips: {success_count}/{len(valid_entries)}")
    print(f"  Total clips: {len(generated_clips)}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()


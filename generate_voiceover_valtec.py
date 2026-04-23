"""
Valtec Vietnamese TTS Voiceover Generator
==========================================
Generates voiceover audio for each subtitle line using Valtec Vietnamese TTS.
Uses pre-extracted voice embeddings (.pt) from models/valtec/voices/.
Leverages the valtec_tts pip package (ZeroShotTTS engine).

Fixes:
- Replaced vinorm (Linux binary) with vietnormalizer (pure Python) for Windows.
- Patched phonemizer to use viphoneme T2IPA directly with vietnormalizer.
"""

import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    os.environ['PYTHONUTF8'] = '1'

import re
import time
import argparse
import struct
import math
import tempfile
import unicodedata
import numpy as np

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

VOICES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "valtec", "voices")
ZEROSHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "valtec", "models", "zeroshot")


# =========================
# PHONEMIZER FIX
# =========================
# vinorm requires a Linux binary and fails on Windows with:
#   [WinError 193] %1 is not a valid Win32 application
# Fix: Use vietnormalizer (pure Python) + viphoneme T2IPA directly.

_PHONEMIZER_PATCHED = False

def _patch_phonemizer():
    """Patch valtec_tts phonemizer to use vietnormalizer instead of vinorm."""
    global _PHONEMIZER_PATCHED
    if _PHONEMIZER_PATCHED:
        return

    try:
        from vietnormalizer import VietnameseNormalizer
        from viphoneme import T2IPA
        try:
            from underthesea import word_tokenize
            _has_underthesea = True
        except ImportError:
            _has_underthesea = False

        _normalizer = VietnameseNormalizer()

        def vi2IPA_fixed(text):
            """Vietnamese to IPA using vietnormalizer (pure Python)."""
            normalized = _normalizer.normalize(text)
            if _has_underthesea:
                TK = word_tokenize(normalized)
            else:
                TK = normalized.split()
            IPA = ""
            for tk in TK:
                ipa = T2IPA(tk).replace(" ", "_")
                if ipa == "":
                    IPA += tk + " "
                elif ipa[0] == "[" and ipa[-1] == "]":
                    IPA += tk + " "
                else:
                    IPA += ipa + " "
            return re.sub(' +', ' ', IPA).strip()

        import src.vietnamese.phonemizer as phonemizer_mod

        VIPHONEME_TONE_MAP = {1: 0, 2: 2, 3: 3, 4: 4, 5: 1, 6: 5}
        PUNCT = set(',.!?;:\'"--\u2014\u2026()[]{}')

        def text_to_phonemes_vietnorm(text):
            ipa_text = vi2IPA_fixed(text)
            if not ipa_text or ipa_text.strip() in ['', '.', '..', '...']:
                return phonemizer_mod.text_to_phonemes_charbased(text)
            phones, tones, word2ph = [], [], []
            tokens = ipa_text.strip().split()
            for token in tokens:
                if all(c in PUNCT or c == '.' for c in token):
                    for c in token:
                        if c in PUNCT:
                            phones.append(c); tones.append(0); word2ph.append(1)
                    continue
                for syllable in token.split('_'):
                    if not syllable:
                        continue
                    syl_phones, syl_tone, i = [], 0, 0
                    while i < len(syllable):
                        ch = syllable[i]
                        if ch.isdigit():
                            syl_tone = VIPHONEME_TONE_MAP.get(int(ch), 0)
                        elif unicodedata.combining(ch):
                            pass
                        elif ch in {'\u02b7', '\u02b0', '\u02d0'}:  # ʷ ʰ ː
                            if syl_phones:
                                syl_phones[-1] += ch
                        elif ch in {'\u0361', '\u035c'}:
                            pass
                        elif ch not in PUNCT:
                            syl_phones.append(ch)
                        i += 1
                    if syl_phones:
                        phones.extend(syl_phones)
                        tones.extend([syl_tone] * len(syl_phones))
                        word2ph.append(len(syl_phones))
            return phones, tones, word2ph

        def text_to_phonemes_patched(text, use_viphoneme=True):
            phones, tones, word2ph = text_to_phonemes_vietnorm(text)
            return ["_"] + phones + ["_"], [0] + tones + [0], [1] + word2ph + [1]

        phonemizer_mod.text_to_phonemes = text_to_phonemes_patched
        _PHONEMIZER_PATCHED = True
        print("  \u2713 Phonemizer patched (vietnormalizer)")

    except ImportError as e:
        print(f"  [WARN] vietnormalizer not available ({e}), using default phonemizer")


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


def write_wav(filepath, audio_np, sample_rate=24000):
    """Write float32 numpy array to WAV file."""
    if hasattr(audio_np, 'cpu'):
        audio_np = audio_np.squeeze().cpu().float().numpy()
    audio_np = np.asarray(audio_np, dtype=np.float32).flatten()
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


def read_wav_data(filepath):
    """Read WAV file and return (samples_np_float32, sample_rate)."""
    with open(filepath, 'rb') as f:
        data = f.read()

    if data[:4] != b'RIFF' or data[8:12] != b'WAVE':
        raise ValueError("Not a valid WAV file")

    pos = 12
    channels = 1
    sr = 24000
    bits = 16
    audio_bytes = b''
    while pos < len(data) - 8:
        chunk_id = data[pos:pos+4]
        chunk_size = struct.unpack('<I', data[pos+4:pos+8])[0]
        if chunk_id == b'fmt ':
            channels = struct.unpack('<H', data[pos+10:pos+12])[0]
            sr = struct.unpack('<I', data[pos+12:pos+16])[0]
            bits = struct.unpack('<H', data[pos+22:pos+24])[0]
        elif chunk_id == b'data':
            audio_bytes = data[pos+8:pos+8+chunk_size]
            break
        pos += 8 + chunk_size

    if bits == 16:
        samples = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
    else:
        samples = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0

    if channels > 1:
        samples = samples.reshape(-1, channels).mean(axis=1)

    return samples, sr


def speed_adjust(audio_np, speed_factor):
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

    if (clip_duration > slot_duration and blocked_before_gap > 0.01 and speed_applied < PREV_VOICE_BLOCK_SPEEDUP):
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


def synthesize_with_embeddings(tts_engine, text, speaker_emb, prosody_emb, length_scale=1.0):
    """
    Synthesize speech using pre-extracted speaker + prosody embeddings.
    This bypasses extract_embeddings() and directly injects the embeddings.
    """
    import torch
    from src.text import cleaned_text_to_sequence
    from src.vietnamese.text_processor import process_vietnamese_text
    from src.vietnamese.phonemizer import text_to_phonemes
    from src.nn import commons

    device = tts_engine.device

    processed = process_vietnamese_text(text)
    phones, tones_raw, word2ph = text_to_phonemes(processed)
    phone_ids, tone_ids, language_ids = cleaned_text_to_sequence(phones, tones_raw, "VI")

    if getattr(tts_engine.hps.data, 'add_blank', True):
        phone_ids = commons.intersperse(phone_ids, 0)
        tone_ids = commons.intersperse(tone_ids, 0)
        language_ids = commons.intersperse(language_ids, 0)

    phone_t = torch.LongTensor(phone_ids).unsqueeze(0).to(device)
    tone_t = torch.LongTensor(tone_ids).unsqueeze(0).to(device)
    lang_t = torch.LongTensor(language_ids).unsqueeze(0).to(device)
    phone_len = torch.LongTensor([phone_t.shape[1]]).to(device)
    bert = torch.zeros(1, 1024, phone_t.shape[1]).to(device)
    ja_bert = torch.zeros(1, 768, phone_t.shape[1]).to(device)

    # Ensure embeddings are on the right device
    if hasattr(speaker_emb, 'to'):
        speaker_emb = speaker_emb.to(device)
    if hasattr(prosody_emb, 'to'):
        prosody_emb = prosody_emb.to(device)

    g = speaker_emb.unsqueeze(-1) if speaker_emb.dim() == 2 else speaker_emb

    with torch.no_grad():
        o, *_ = tts_engine.model.infer(
            phone_t, phone_len, sid=None,
            tone=tone_t, language=lang_t,
            bert=bert, ja_bert=ja_bert,
            g=g, prosody=prosody_emb,
            prosody_predictor=tts_engine.prosody_predictor,
            noise_scale=0.667,
            noise_scale_w=0.8,
            length_scale=length_scale,
        )

    audio = o[0, 0].cpu().numpy()
    return audio, tts_engine.sampling_rate


def main():
    parser = argparse.ArgumentParser(description="Generate voiceover from SRT using Valtec Vietnamese TTS")
    parser.add_argument('--srt', default=DEFAULT_SRT, help="Input SRT file")
    parser.add_argument('--voice', default='Vietnam_hoa-mai (woman).pt', help="Valtec voice embedding file name")
    parser.add_argument('--ref-audio', default=None, help="Reference audio file for voice cloning (OmmiVoice Clone)")
    parser.add_argument('--output', default=OUTPUT_COMBINED, help="Output WAV file")
    parser.add_argument('--speed', type=float, default=1.0, help="Speech speed multiplier (length_scale)")
    args = parser.parse_args()

    is_clone = args.ref_audio is not None
    voice_name = 'OmmiVoice Clone' if is_clone else args.voice.split('(')[0].replace('Vietnam_', '').replace('-', ' ').strip().title()
    gender = 'clone' if is_clone else ('woman' if '(woman)' in args.voice else ('child' if '(child)' in args.voice else 'man'))

    print(f"\n{'='*60}")
    print(f"  VALTEC VIETNAMESE TTS VOICEOVER GENERATOR")
    print(f"{'='*60}")
    print(f"  SRT:    {args.srt}")
    if is_clone:
        print(f"  Mode:   OmmiVoice Clone")
        print(f"  Ref:    {args.ref_audio}")
    else:
        print(f"  Voice:  {voice_name} ({gender})")
        print(f"  File:   {args.voice}")
    print(f"  Speed:  {args.speed}x")
    print(f"  Output: {args.output}")

    # Parse SRT
    entries = parse_srt(args.srt)
    total = len(entries)
    print(f"  Subtitles: {total}")

    if total == 0:
        print("  ERROR: No subtitles found!")
        sys.exit(1)

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

    # Load voice embedding
    import torch

    if is_clone:
        # Clone mode: extract embeddings from reference audio
        print(f"  OmmiVoice Clone: extracting embeddings from {args.ref_audio}")
        if not os.path.exists(args.ref_audio):
            print(f"  ERROR: Reference audio not found: {args.ref_audio}")
            sys.exit(1)
        # Will extract after loading TTS engine
        speaker_emb, prosody_emb = None, None
    else:
        voice_path = os.path.join(VOICES_DIR, args.voice)
        if not os.path.exists(voice_path):
            print(f"  ERROR: Voice file not found: {voice_path}")
            sys.exit(1)

        print(f"  Loading voice embedding: {args.voice}")
        voice_data = torch.load(voice_path, map_location='cpu', weights_only=True)

        # voice_data is a tuple: (speaker_embedding, prosody_embedding)
        if isinstance(voice_data, tuple) and len(voice_data) == 2:
            speaker_emb, prosody_emb = voice_data
            print(f"  ✓ Speaker embedding: {speaker_emb.shape}")
            print(f"  ✓ Prosody embedding: {prosody_emb.shape}")
        else:
            print(f"  ERROR: Unexpected embedding format: {type(voice_data)}")
            sys.exit(1)

    # Patch phonemizer to use vietnormalizer (fixes vinorm Linux binary issue)
    _patch_phonemizer()

    # Load ZeroShotTTS engine (auto-downloads model if needed)
    print(f"\n  Loading Valtec ZeroShotTTS engine...")
    t_load = time.time()

    # Use local zeroshot model if available
    ckpt_path = None
    config_path = None
    if os.path.exists(ZEROSHOT_DIR):
        ckpts = sorted([f for f in os.listdir(ZEROSHOT_DIR) if f.startswith('G_') and f.endswith('.pth')])
        configs = [f for f in os.listdir(ZEROSHOT_DIR) if f == 'config.json']
        if ckpts and configs:
            ckpt_path = os.path.join(ZEROSHOT_DIR, ckpts[-1])
            config_path = os.path.join(ZEROSHOT_DIR, configs[0])
            print(f"  Using local model: {ckpts[-1]}")

    from valtec_tts import ZeroShotTTS
    tts = ZeroShotTTS(checkpoint_path=ckpt_path, config_path=config_path)
    model_sr = tts.sampling_rate
    print(f"  ✓ Engine loaded in {time.time()-t_load:.1f}s (SR={model_sr}Hz)")

    # Extract embeddings for clone mode
    if is_clone and speaker_emb is None:
        print(f"  Extracting voice embeddings from: {args.ref_audio}")
        speaker_emb, prosody_emb = tts.extract_embeddings(args.ref_audio)
        print(f"  ✓ Speaker embedding: {speaker_emb.shape}")
        print(f"  ✓ Prosody embedding: {prosody_emb.shape}")

    # Compute length_scale from speed (length_scale < 1.0 = faster)
    length_scale = 1.0 / args.speed if args.speed != 1.0 else 1.0

    # Generate clips
    clips_dir = tempfile.mkdtemp(prefix="valtec_tts_clips_")
    print(f"\n  Generating {len(valid_entries)} clips...\n")

    t0 = time.time()
    clip_paths = []
    error_count = 0

    for i, entry in enumerate(valid_entries):
        text = entry['text'].strip()
        if not text or len(text) < 2:
            clip_paths.append(None)
            continue

        clip_path = os.path.join(clips_dir, f"clip_{i:04d}.wav")

        try:
            audio_np, sr = synthesize_with_embeddings(
                tts, text, speaker_emb, prosody_emb, length_scale=length_scale
            )

            # Resample if model SR differs from target
            if sr != SAMPLE_RATE:
                audio_np = resample(audio_np, sr, SAMPLE_RATE)

            write_wav(clip_path, audio_np, SAMPLE_RATE)

            pct = (i + 1) * 100 // len(valid_entries)
            display = text[:40] + '...' if len(text) > 40 else text
            print(f"  [{i+1}/{len(valid_entries)}] {pct}% | {display}")
            sys.stdout.flush()
            clip_paths.append(clip_path)

        except Exception as e:
            error_count += 1
            print(f"  [{i+1}/{len(valid_entries)}] ERROR: {str(e)[:80]} | {text[:30]}")
            sys.stdout.flush()
            clip_paths.append(None)

            if error_count > max(20, len(valid_entries) // 5):
                print(f"\n  ABORT: Too many errors ({error_count})")
                break

    gen_time = time.time() - t0
    success_count = sum(1 for p in clip_paths if p is not None)
    print(f"\n  Generated {success_count}/{len(valid_entries)} clips in {gen_time:.1f}s")

    # Combine into timeline
    print(f"\n  Combining into timeline...")

    total_samples = int(last_end * SAMPLE_RATE) + SAMPLE_RATE
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
            clip_audio, clip_sr = read_wav_data(clip_path)

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
    if np.any(combined):
        last_nonzero = np.max(np.nonzero(combined))
        combined = combined[:last_nonzero + SAMPLE_RATE]

    # Write output
    write_wav(args.output, combined, SAMPLE_RATE)

    file_size = os.path.getsize(args.output) / 1024 / 1024
    total_time = time.time() - t0

    print(f"\n{'='*60}")
    print(f"  ✓ VALTEC VOICEOVER COMPLETE")
    print(f"  Output: {args.output} ({file_size:.1f} MB)")
    print(f"  Voice: {voice_name} ({gender})")
    print(f"  Clips: {success_count}/{len(valid_entries)}")
    print(f"  Time: {total_time:.1f}s")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()

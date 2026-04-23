#!/usr/bin/env python3
"""Generate preview audio clips for all Valtec voices (one-time batch).
Uses the same synthesize_with_embeddings() from generate_voiceover_valtec.py."""
import os, sys, time

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    os.environ['PYTHONUTF8'] = '1'

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VOICES_DIR = os.path.join(SCRIPT_DIR, 'models', 'valtec', 'voices')
PREVIEW_DIR = os.path.join(SCRIPT_DIR, 'models', 'valtec', 'previews')
ZEROSHOT_DIR = os.path.join(SCRIPT_DIR, 'models', 'valtec', 'models', 'zeroshot')

PREVIEW_TEXT = "Xin chao, toi la tro ly ao. Rat vui duoc gap ban hom nay."


def _patch_phonemizer():
    try:
        from vietnormalizer import VietnameseNormalizer
        from viphoneme import T2IPA
        from underthesea import word_tokenize
        import src.vietnamese.phonemizer as phon
        normalizer = VietnameseNormalizer()
        def patched_vi2IPA(text, vn_normalizer=None, unknown=''):
            normalized = normalizer.normalize(text)
            tokens = word_tokenize(normalized)
            ipa_parts = []
            for token in tokens:
                try:
                    ipa = T2IPA(token)
                    ipa_parts.append(ipa if ipa else token)
                except:
                    ipa_parts.append(token)
            return ' '.join(ipa_parts)
        phon.vi2IPA = patched_vi2IPA
        if hasattr(phon, 'viphoneme'):
            phon.viphoneme.vi2IPA = patched_vi2IPA
        print("  [OK] Phonemizer patched")
    except Exception as e:
        print(f"  [WARN] Patch failed: {e}")


def main():
    os.makedirs(PREVIEW_DIR, exist_ok=True)

    voices = sorted([f for f in os.listdir(VOICES_DIR) if f.endswith('.pt')])
    print(f"Found {len(voices)} voices. Output: {PREVIEW_DIR}")

    import torch
    import numpy as np

    # Patch phonemizer first
    _patch_phonemizer()

    # Load model once
    print("Loading Valtec ZeroShotTTS engine...")
    t0 = time.time()
    ckpt_path, config_path = None, None
    if os.path.exists(ZEROSHOT_DIR):
        ckpts = sorted([f for f in os.listdir(ZEROSHOT_DIR) if f.startswith('G_') and f.endswith('.pth')])
        configs = [f for f in os.listdir(ZEROSHOT_DIR) if f == 'config.json']
        if ckpts and configs:
            ckpt_path = os.path.join(ZEROSHOT_DIR, ckpts[-1])
            config_path = os.path.join(ZEROSHOT_DIR, configs[0])
            print(f"  Using: {ckpts[-1]}")

    from valtec_tts import ZeroShotTTS
    tts = ZeroShotTTS(checkpoint_path=ckpt_path, config_path=config_path)
    sr = tts.sampling_rate
    print(f"  Engine loaded in {time.time()-t0:.1f}s (SR={sr}Hz)\n")

    # Import the exact synthesize function from the working script
    from generate_voiceover_valtec import synthesize_with_embeddings

    success = 0
    for i, voice_file in enumerate(voices):
        safe_name = voice_file.replace(' ', '_').replace('(', '').replace(')', '')
        out_path = os.path.join(PREVIEW_DIR, f"{safe_name}.wav")

        if os.path.exists(out_path):
            print(f"  [{i+1}/{len(voices)}] SKIP (cached): {voice_file}")
            success += 1
            continue

        print(f"  [{i+1}/{len(voices)}] Generating: {voice_file} ... ", end='', flush=True)
        try:
            voice_data = torch.load(os.path.join(VOICES_DIR, voice_file), map_location='cpu', weights_only=True)
            speaker_emb, prosody_emb = voice_data

            audio_np, audio_sr = synthesize_with_embeddings(
                tts, PREVIEW_TEXT, speaker_emb, prosody_emb, length_scale=1.0
            )

            # Write WAV manually (no soundfile dependency needed)
            import wave
            audio_int16 = (audio_np * 32767).astype(np.int16)
            with wave.open(out_path, 'w') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(audio_sr)
                wf.writeframes(audio_int16.tobytes())

            dur = len(audio_np) / audio_sr
            print(f"OK ({dur:.1f}s)")
            success += 1
        except Exception as e:
            print(f"FAILED: {e}")

    print(f"\nDone! {success}/{len(voices)} previews in {PREVIEW_DIR}")


if __name__ == '__main__':
    main()

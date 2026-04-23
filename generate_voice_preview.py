#!/usr/bin/env python3
"""Generate a short voice preview clip using Valtec TTS."""
import os, sys, argparse, time

# === Paths ===
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VOICES_DIR = os.path.join(SCRIPT_DIR, 'models', 'valtec', 'voices')
ZEROSHOT_DIR = os.path.join(SCRIPT_DIR, 'models', 'valtec', 'zeroshot')

def _patch_phonemizer():
    """Same patch as generate_voiceover_valtec.py"""
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
        print("  [OK] Phonemizer patched (vietnormalizer)")
    except Exception as e:
        print(f"  [WARN] Patch failed: {e}")


def main():
    parser = argparse.ArgumentParser(description="Generate voice preview")
    parser.add_argument('--voice', required=True, help="Voice file name")
    parser.add_argument('--text', default='Xin chào, tôi là trợ lý ảo.', help="Preview text")
    parser.add_argument('--output', required=True, help="Output WAV file")
    args = parser.parse_args()

    import torch
    import numpy as np
    import soundfile as sf

    voice_path = os.path.join(VOICES_DIR, args.voice)
    if not os.path.exists(voice_path):
        print(f"ERROR: Voice not found: {voice_path}")
        sys.exit(1)

    print(f"Loading voice: {args.voice}")
    voice_data = torch.load(voice_path, map_location='cpu', weights_only=True)
    if isinstance(voice_data, tuple) and len(voice_data) == 2:
        speaker_emb, prosody_emb = voice_data
    else:
        print(f"ERROR: Unexpected format: {type(voice_data)}")
        sys.exit(1)

    _patch_phonemizer()

    # Load model
    ckpt_path, config_path = None, None
    if os.path.exists(ZEROSHOT_DIR):
        ckpts = sorted([f for f in os.listdir(ZEROSHOT_DIR) if f.startswith('G_') and f.endswith('.pth')])
        configs = [f for f in os.listdir(ZEROSHOT_DIR) if f == 'config.json']
        if ckpts and configs:
            ckpt_path = os.path.join(ZEROSHOT_DIR, ckpts[-1])
            config_path = os.path.join(ZEROSHOT_DIR, configs[0])

    from valtec_tts import ZeroShotTTS
    tts = ZeroShotTTS(checkpoint_path=ckpt_path, config_path=config_path)
    sr = tts.sampling_rate

    # Synthesize
    print(f"Generating: {args.text}")
    o = tts.synthesize(
        text=args.text,
        speaker_embedding=speaker_emb,
        prosody_embedding=prosody_emb,
        length_scale=1.0,
    )
    audio = o[0, 0].cpu().numpy()

    sf.write(args.output, audio, sr)
    print(f"[OK] Saved: {args.output} ({len(audio)/sr:.1f}s)")


if __name__ == '__main__':
    main()

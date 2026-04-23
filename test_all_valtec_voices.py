"""
Test All 15 Valtec Vietnamese Voices
=====================================
Generates a personalized greeting for each voice and saves to test_voices/ folder.
"""

import os
import sys
import time

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import torch
import numpy as np
import struct

VOICES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "valtec", "voices")
ZEROSHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "valtec", "models", "zeroshot")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_voices")

VOICES = [
    ("Vietnam_hoa-mai (woman).pt",    "Hoa Mai",        "Xin chào, đây là giọng nói của Hoa Mai, rất vui được gặp các bạn."),
    ("Vietnam_my-huyen (woman).pt",   "Mỹ Huyền",      "Xin chào, đây là giọng nói của Mỹ Huyền, chúc các bạn một ngày tốt lành."),
    ("Vietnam_ngoc-anh (woman).pt",   "Ngọc Anh",       "Xin chào, đây là giọng nói của Ngọc Anh, cảm ơn các bạn đã lắng nghe."),
    ("Vietnam_ngoc-duyen (woman).pt", "Ngọc Duyên",     "Xin chào, đây là giọng nói của Ngọc Duyên, rất hân hạnh được phục vụ."),
    ("Vietnam_quynh-nhu (woman).pt",  "Quỳnh Như",      "Xin chào, đây là giọng nói của Quỳnh Như, chào mừng đến với chương trình."),
    ("Vietnam_thao-van (woman).pt",   "Thảo Vân",       "Xin chào, đây là giọng nói của Thảo Vân, mời các bạn cùng theo dõi."),
    ("Vietnam_thuy-linh (woman).pt",  "Thùy Linh",      "Xin chào, đây là giọng nói của Thùy Linh, chúc mọi người luôn vui vẻ."),
    ("Vietnam_hoang-son (man).pt",    "Hoàng Sơn",      "Xin chào, đây là giọng nói của Hoàng Sơn, rất vui được đồng hành cùng bạn."),
    ("Vietnam_le-nam (man).pt",       "Lê Nam",         "Xin chào, đây là giọng nói của Lê Nam, chào mừng các bạn đến đây."),
    ("Vietnam_nguyen-thang (man).pt", "Nguyễn Thắng",   "Xin chào, đây là giọng nói của Nguyễn Thắng, xin hân hạnh được giới thiệu."),
    ("Vietnam_nguyen-tung (man).pt",  "Nguyễn Tùng",    "Xin chào, đây là giọng nói của Nguyễn Tùng, cảm ơn các bạn đã theo dõi."),
    ("Vietnam_tran-binh (man).pt",    "Trần Bình",      "Xin chào, đây là giọng nói của Trần Bình, chúc các bạn sức khỏe."),
    ("Vietnam_trung-anh (man).pt",    "Trung Anh",      "Xin chào, đây là giọng nói của Trung Anh, rất vui được gặp các bạn."),
    ("Vietnam_tung-lam (man).pt",     "Tùng Lâm",       "Xin chào, đây là giọng nói của Tùng Lâm, mời các bạn cùng lắng nghe."),
    ("Vietnam_binh-an (child).pt",    "Bình An",        "Xin chào, đây là giọng nói của Bình An, em chào các anh chị."),
]


def write_wav(filepath, audio_np, sample_rate=24000):
    audio_np = np.asarray(audio_np, dtype=np.float32).flatten()
    mx = max(abs(audio_np.max()), abs(audio_np.min()), 1e-8)
    if mx > 0:
        audio_np = audio_np / mx * 0.95
    pcm = (audio_np * 32767).astype(np.int16)
    with open(filepath, 'wb') as f:
        data_size = len(pcm) * 2
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + data_size))
        f.write(b'WAVE')
        f.write(b'fmt ')
        f.write(struct.pack('<IHHIIHH', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
        f.write(b'data')
        f.write(struct.pack('<I', data_size))
        f.write(pcm.tobytes())


def synthesize_with_embeddings(tts, text, speaker_emb, prosody_emb):
    from src.text import cleaned_text_to_sequence
    from src.vietnamese.text_processor import process_vietnamese_text
    from src.vietnamese.phonemizer import text_to_phonemes
    from src.nn import commons

    device = tts.device
    processed = process_vietnamese_text(text)
    phones, tones_raw, word2ph = text_to_phonemes(processed)
    phone_ids, tone_ids, language_ids = cleaned_text_to_sequence(phones, tones_raw, "VI")

    if getattr(tts.hps.data, 'add_blank', True):
        phone_ids = commons.intersperse(phone_ids, 0)
        tone_ids = commons.intersperse(tone_ids, 0)
        language_ids = commons.intersperse(language_ids, 0)

    phone_t = torch.LongTensor(phone_ids).unsqueeze(0).to(device)
    tone_t = torch.LongTensor(tone_ids).unsqueeze(0).to(device)
    lang_t = torch.LongTensor(language_ids).unsqueeze(0).to(device)
    phone_len = torch.LongTensor([phone_t.shape[1]]).to(device)
    bert = torch.zeros(1, 1024, phone_t.shape[1]).to(device)
    ja_bert = torch.zeros(1, 768, phone_t.shape[1]).to(device)

    spk = speaker_emb.to(device)
    pro = prosody_emb.to(device)
    g = spk.unsqueeze(-1) if spk.dim() == 2 else spk

    with torch.no_grad():
        o, *_ = tts.model.infer(
            phone_t, phone_len, sid=None,
            tone=tone_t, language=lang_t,
            bert=bert, ja_bert=ja_bert,
            g=g, prosody=pro,
            prosody_predictor=tts.prosody_predictor,
            noise_scale=0.667, noise_scale_w=0.8, length_scale=1.0,
        )
    return o[0, 0].cpu().numpy(), tts.sampling_rate


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  VALTEC - TEST ALL 15 VIETNAMESE VOICES")
    print(f"{'='*60}")
    print(f"  Output: {OUTPUT_DIR}/")
    print(f"  Voices: {len(VOICES)}")
    print(f"{'='*60}\n")

    # Load engine once
    print("  Loading Valtec ZeroShotTTS engine...")
    t0 = time.time()

    ckpt_path = None
    config_path = None
    if os.path.exists(ZEROSHOT_DIR):
        ckpts = sorted([f for f in os.listdir(ZEROSHOT_DIR) if f.startswith('G_') and f.endswith('.pth')])
        if ckpts and os.path.exists(os.path.join(ZEROSHOT_DIR, 'config.json')):
            ckpt_path = os.path.join(ZEROSHOT_DIR, ckpts[-1])
            config_path = os.path.join(ZEROSHOT_DIR, 'config.json')

    from valtec_tts import ZeroShotTTS
    tts = ZeroShotTTS(checkpoint_path=ckpt_path, config_path=config_path)
    print(f"  ✓ Engine loaded in {time.time()-t0:.1f}s (SR={tts.sampling_rate}Hz)\n")

    results = []
    total_time = 0

    for i, (voice_file, name, text) in enumerate(VOICES):
        voice_path = os.path.join(VOICES_DIR, voice_file)
        gender = "Nữ" if "(woman)" in voice_file else ("Trẻ em" if "(child)" in voice_file else "Nam")
        out_file = os.path.join(OUTPUT_DIR, f"{i+1:02d}_{name.replace(' ', '_')}.wav")

        print(f"  [{i+1:2d}/15] {name:12s} ({gender:5s}) | {text[:50]}...", end="", flush=True)

        if not os.path.exists(voice_path):
            print(f" ✗ FILE NOT FOUND")
            results.append((name, "MISSING", 0))
            continue

        try:
            t1 = time.time()
            emb = torch.load(voice_path, map_location='cpu', weights_only=True)
            speaker_emb, prosody_emb = emb

            audio, sr = synthesize_with_embeddings(tts, text, speaker_emb, prosody_emb)
            write_wav(out_file, audio, sr)

            dur = time.time() - t1
            total_time += dur
            audio_len = len(audio) / sr
            size_kb = os.path.getsize(out_file) / 1024

            print(f" ✓ {dur:.1f}s | {audio_len:.1f}s audio | {size_kb:.0f}KB")
            results.append((name, "OK", dur))

        except Exception as e:
            print(f" ✗ {str(e)[:60]}")
            results.append((name, "ERROR", 0))

    # Summary
    ok = sum(1 for _, s, _ in results if s == "OK")
    print(f"\n{'='*60}")
    print(f"  ✓ COMPLETE: {ok}/15 voices generated")
    print(f"  Total time: {total_time:.1f}s")
    print(f"  Output dir: {OUTPUT_DIR}/")
    print(f"{'='*60}")
    print(f"\n  Files:")
    for i, (name, status, dur) in enumerate(results):
        icon = "✓" if status == "OK" else "✗"
        fname = f"{i+1:02d}_{name.replace(' ', '_')}.wav"
        print(f"    {icon} {fname}")
    print()


if __name__ == '__main__':
    main()

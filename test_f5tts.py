"""
TEST 8: F5-TTS Zalopay with REAL WAV reference (not .pt files)
==============================================================
Goal: Verify if F5-TTS zalopay model works AT ALL for Vietnamese
by using a clean wav reference from edge-tts instead of .pt files
"""
import sys, os, time, asyncio
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

OUTPUT_DIR = r"C:\python\ommivoice\test_voices_f5tts"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================
# Step 1: Generate clean reference audio with edge-tts
# ============================================
print("="*60)
print("  Step 1: Generate clean Vietnamese ref with edge-tts")
print("="*60)

import edge_tts

REF_TEXT = "Xin chào các bạn, hôm nay thời tiết rất đẹp."
REF_WAV = os.path.join(OUTPUT_DIR, "edge_ref_vi.wav")

async def gen_ref():
    communicate = edge_tts.Communicate(REF_TEXT, "vi-VN-HoaiMyNeural")
    await communicate.save(REF_WAV)

asyncio.run(gen_ref())
print(f"  Ref audio saved: {REF_WAV}")
print(f"  Ref text: '{REF_TEXT}'")

# ============================================
# Step 2: F5-TTS with zalopay model + edge-tts ref
# ============================================
print(f"\n{'='*60}")
print("  Step 2: F5-TTS Zalopay with edge-tts reference")
print("="*60)

from f5_tts.infer.utils_infer import (
    preprocess_ref_audio_text,
    load_vocoder,
    load_model,
    infer_process,
)
from f5_tts.model import DiT

ZALOPAY_CKPT = r"C:\Users\Admin\.cache\huggingface\hub\models--zalopay--vietnamese-tts\snapshots\1dc4967edb4549e40d820429e487eeeacee8bc08\model_1290000.pt"
ZALOPAY_VOCAB = r"C:\Users\Admin\.cache\huggingface\hub\models--zalopay--vietnamese-tts\snapshots\1dc4967edb4549e40d820429e487eeeacee8bc08\vocab.txt"

vocoder = load_vocoder()
print("  Loading Zalopay model...")
t0 = time.time()
model = load_model(
    DiT,
    dict(dim=1024, depth=22, heads=16, ff_mult=2, text_dim=512, conv_layers=4),
    ckpt_path=ZALOPAY_CKPT,
    mel_spec_type="vocos",
    vocab_file=ZALOPAY_VOCAB,
)
print(f"  Loaded in {time.time()-t0:.1f}s")

# Preprocess
ref_audio, ref_text_proc = preprocess_ref_audio_text(REF_WAV, REF_TEXT)
print(f"  Processed ref_text: '{ref_text_proc}'")

# Test texts
tests = [
    "Hôm nay tôi đi làm ở công ty, trời nắng rất đẹp và tôi cảm thấy vui.",
    "Việt Nam là một đất nước xinh đẹp với nhiều danh lam thắng cảnh nổi tiếng.",
    "Chào mừng các bạn đến với chương trình của chúng tôi, chúc các bạn một ngày tốt lành.",
]

for i, gen_text in enumerate(tests):
    try:
        t1 = time.time()
        wave, sr, _ = infer_process(
            ref_audio, ref_text_proc, gen_text,
            model, vocoder,
            cross_fade_duration=0.15,
            nfe_step=32,
            speed=1.0,
        )
        
        out = os.path.join(OUTPUT_DIR, f"t8_edgeref_{i+1}.wav")
        import soundfile as sf
        sf.write(out, wave, sr)
        dur = time.time() - t1
        print(f"\n  [{i+1}] {dur:.1f}s | {len(wave)/sr:.1f}s audio")
        print(f"      Text: {gen_text[:60]}...")
        print(f"      -> {out}")
    except Exception as e:
        print(f"\n  [{i+1}] FAIL: {e}")

print(f"\n{'='*60}")
print("  DONE. Listen to t8_edgeref_*.wav files")
print(f"{'='*60}")

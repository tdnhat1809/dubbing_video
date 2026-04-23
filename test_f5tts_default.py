"""
TEST: Verify F5-TTS pipeline works with DEFAULT model (English)
If this works -> problem is Vietnamese models
If this fails -> problem is F5-TTS installation
"""
import sys, os, time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import torch
import soundfile as sf
import numpy as np

OUTPUT_DIR = r"C:\python\ommivoice\test_voices_f5tts"
RESOURCES = r"C:\Bankme Auto Media\tv_engine\data\resources"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ===============================================
# Test 1: Default F5-TTS model with English text
# ===============================================
print("="*60)
print("  TEST A: Default F5-TTS model (English)")
print("="*60)

from f5_tts.api import F5TTS

# Use a reference voice from resources 
voice_data = torch.load(os.path.join(RESOURCES, "hoa-mai (woman).pt"), map_location='cpu', weights_only=False)
ref_audio = voice_data['audio'].numpy().squeeze()
ref_tmp = os.path.join(OUTPUT_DIR, "_test_ref.wav")
sf.write(ref_tmp, ref_audio, 24000)

print("  Loading DEFAULT F5-TTS model...")
t0 = time.time()
tts = F5TTS()  # Default model, downloads from HF
print(f"  Loaded in {time.time()-t0:.1f}s")

gen_text = "Hello everyone, this is a test of the text to speech system. The quality should be very good."
ref_text = "Hello, how are you today?"

print(f"  Generating English speech...")
t1 = time.time()
wav, sr, _ = tts.infer(
    ref_file=ref_tmp,
    ref_text=ref_text,
    gen_text=gen_text,
    nfe_step=32,
)
out = os.path.join(OUTPUT_DIR, "test_default_english.wav")
sf.write(out, wav, sr)
print(f"  OK: {time.time()-t1:.1f}s gen | {len(wav)/sr:.1f}s audio -> {out}")

# Cleanup
del tts
torch.cuda.empty_cache()

print(f"\n{'='*60}")
print("  Output: test_default_english.wav")
print("  Listen to verify F5-TTS pipeline works")
print(f"{'='*60}")

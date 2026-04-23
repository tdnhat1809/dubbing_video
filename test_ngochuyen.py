"""Test OmniVoice Ngoc Huyen fine-tuned model."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import torch
import torchaudio
import time

print("Loading OmniVoice base model...")
t0 = time.time()

from omnivoice import OmniVoice

device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = OmniVoice.from_pretrained(
    'k2-fsa/OmniVoice',
    torch_dtype=torch.float16 if device == 'cuda' else torch.float32,
    device_map=device,
)
print(f"Base model loaded in {time.time()-t0:.1f}s")

# Load fine-tuned weights
print("Loading Ngoc Huyen fine-tuned checkpoint...")
from safetensors.torch import load_file
weights_path = r'C:\python\ommivoice\ngochuyen_checkpoint3000\model.safetensors'
state_dict = load_file(weights_path, device=device)
missing, unexpected = model.load_state_dict(state_dict, strict=False)
print(f"Fine-tuned loaded (missing: {len(missing)}, unexpected: {len(unexpected)})")

sr = getattr(model, 'sampling_rate', 24000) or 24000
print(f"Sample rate: {sr}")

os.makedirs("test_voices", exist_ok=True)

text = "Xin chào, đây là giọng nói của Ngọc Huyền, rất vui được gặp các bạn."
print(f"\nGenerating: {text}")

t1 = time.time()
result = model.generate(text=text, language='Vietnamese')

# Handle different output formats
if isinstance(result, list):
    audio = result[0]
elif isinstance(result, tuple):
    audio = result[0]
else:
    audio = result

if isinstance(audio, torch.Tensor):
    print(f"Audio tensor: shape={audio.shape}, dtype={audio.dtype}")
    if audio.dim() == 1:
        audio = audio.unsqueeze(0)
    out_path = "test_voices/ngochuyen_omnivoice_test.wav"
    torchaudio.save(out_path, audio.cpu().float(), sr)
    duration = audio.shape[-1] / sr
    size_kb = os.path.getsize(out_path) / 1024
    print(f"Generated in {time.time()-t1:.1f}s")
    print(f"Saved: {out_path} ({duration:.1f}s, {size_kb:.0f}KB)")
else:
    print(f"Unexpected audio type: {type(audio)}")
    print(f"Value: {str(audio)[:200]}")

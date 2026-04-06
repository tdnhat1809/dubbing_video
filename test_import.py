import traceback
import torch
print(f"PyTorch: {torch.__version__}")
print(f"CUDA: {torch.cuda.is_available()}")

try:
    import torchaudio
    print(f"Torchaudio: {torchaudio.__version__}")
except Exception as e:
    print(f"Torchaudio FAILED: {e}")
    traceback.print_exc()
    print("\nTrying without torchaudio...")

try:
    import transformers
    print(f"Transformers: {transformers.__version__}")
except Exception as e:
    print(f"Transformers FAILED: {e}")

try:
    from omnivoice.models.omnivoice import OmniVoice, OmniVoiceConfig, OmniVoiceGenerationConfig
    print("OmniVoice imported OK!")
except Exception as e:
    print(f"OmniVoice FAILED: {e}")
    traceback.print_exc()

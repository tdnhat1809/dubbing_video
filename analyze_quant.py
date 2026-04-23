"""Analyze quantization format in model_bmtts_vi.pt"""
import sys, torch
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ckpt = torch.load(r'C:\python\ommivoice\models\tts\model_bmtts_vi.pt', map_location='cpu', weights_only=False)

tensor_ct = dict_ct = tuple_ct = other_ct = 0
for k, v in ckpt.items():
    if isinstance(v, torch.Tensor):
        tensor_ct += 1
    elif isinstance(v, dict) and 'quantized' in v:
        dict_ct += 1
    elif isinstance(v, tuple):
        tuple_ct += 1
    else:
        other_ct += 1

print(f'Raw fp16 tensors: {tensor_ct}')
print(f'Dict-quantized: {dict_ct}')
print(f'Tuple-quantized: {tuple_ct}')
print(f'Other: {other_ct}')

# Dict example
for k, v in ckpt.items():
    if isinstance(v, dict) and 'quantized' in v:
        q = v['quantized']
        mn = v['min']
        sc = v['scale']
        print(f'\nDict example: {k}')
        print(f'  quantized: dtype={q.dtype}, shape={q.shape}')
        print(f'  min: type={type(mn).__name__}, val={mn if not isinstance(mn, torch.Tensor) else (mn.dtype, mn.shape)}')
        print(f'  scale: type={type(sc).__name__}, val={sc if not isinstance(sc, torch.Tensor) else (sc.dtype, sc.shape)}')
        print(f'  dtype: {v.get("dtype", "N/A")}')
        print(f'  shape: {v.get("shape", "N/A")}')
        # Dequant and compare if original dtype is available
        orig_dtype = v.get('dtype', None)
        if orig_dtype:
            print(f'  Original dtype: {orig_dtype}')
        break

# Tuple example
for k, v in ckpt.items():
    if isinstance(v, tuple) and len(v) >= 3:
        print(f'\nTuple example: {k}')
        for i, x in enumerate(v):
            if isinstance(x, torch.Tensor):
                print(f'  [{i}]: dtype={x.dtype}, shape={x.shape}')
            elif isinstance(x, (list, tuple)):
                print(f'  [{i}]: {type(x).__name__}, len={len(x)}, val={x}')
            else:
                print(f'  [{i}]: {type(x).__name__} = {x}')
        break

# Check if there are keys that look like ema_model or model_state_dict
special = [k for k in ckpt.keys() if 'ema' in k.lower() or 'state_dict' in k.lower() or 'step' in k.lower()]
if special:
    print(f'\nSpecial keys: {special}')
else:
    print(f'\nNo ema/state_dict keys found. This is a raw state dict.')

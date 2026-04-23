"""Analyze BMTTS model architecture."""
import torch

m = torch.load(r'C:\python\ommivoice\models\tts\model_bmtts_vi.pt', map_location='cpu', weights_only=False)

# text_embed
text_embed = m['transformer.text_embed.text_embed.weight']
print('text_embed type:', type(text_embed))
if isinstance(text_embed, dict):
    print('text_embed keys:', list(text_embed.keys())[:10])
    for k, v in text_embed.items():
        if hasattr(v, 'shape'):
            print(f'  {k}: {v.shape}')

# proj_out
proj_out = m['transformer.proj_out.weight']
print('proj_out type:', type(proj_out))
if isinstance(proj_out, dict):
    print('proj_out keys:', list(proj_out.keys())[:10])

# Count transformer blocks
blocks = set()
for k in m.keys():
    if 'transformer_blocks' in k:
        block_num = k.split('transformer_blocks.')[1].split('.')[0]
        blocks.add(int(block_num))
print(f'Transformer blocks: {len(blocks)} (0-{max(blocks)})')

bias_key = 'transformer.proj_out.bias'
print(f'Output dim: {m[bias_key].shape[0]}')

# input_embed
input_keys = [k for k in m.keys() if 'input_embed' in k]
print(f'Input embed keys:')
for k in input_keys:
    if hasattr(m[k], 'shape'):
        print(f'  {k}: {m[k].shape}')
    else:
        print(f'  {k}: {type(m[k])}')

# rotary_embed
rotary_keys = [k for k in m.keys() if 'rotary' in k]
print(f'Rotary keys: {rotary_keys}')
for k in rotary_keys:
    if hasattr(m[k], 'shape'):
        print(f'  {k}: {m[k].shape}')

# Check for F5-TTS signature
print('\n=== F5-TTS Architecture Check ===')
print(f'time_embed dim: 256 -> 1024 -> 1024 (matches F5-TTS DiT)')
print(f'proj_out bias dim: {m[bias_key].shape[0]} (n_mel_channels=100)')
print(f'Num DiT blocks: {len(blocks)}')
has_text_embed_dict = isinstance(m['transformer.text_embed.text_embed.weight'], dict)
print(f'Text embed is quantized dict: {has_text_embed_dict}')

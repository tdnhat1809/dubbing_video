"""List all F5-TTS reference voices in resources."""
import torch, sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

res_dir = r'C:\Bankme Auto Media\tv_engine\data\resources'
files = sorted([f for f in os.listdir(res_dir) if f.endswith('.pt')])

print(f'Total voices: {len(files)}')
print(f'{"Name":40s} | {"Audio Shape":20s} | {"Dur":7s} | {"Ref Text"}')
print('-' * 130)

for f in files:
    data = torch.load(os.path.join(res_dir, f), map_location='cpu', weights_only=False)
    audio = data['audio']
    ref = data.get('ref_text', 'N/A')
    dur = audio.shape[-1] / 24000.0
    print(f'{f:40s} | {str(audio.shape):20s} | {dur:5.2f}s | {ref[:60]}')

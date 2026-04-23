"""Extract context around key TTS functions in compiled tv_engine.pyc"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open(r'C:\python\ommivoice\tv_engine.exe_extracted\tv_engine.pyc', 'rb') as f:
    data = f.read()

for kw in [b'load_from_checkpoint', b'quantize_dynamic', b'clone_voice', b'nfe_step', b'model_bmtts']:
    idx = data.find(kw)
    while idx > 0:
        start = max(0, idx - 200)
        end = min(len(data), idx + 200)
        context = data[start:end]
        strs = re.findall(rb'[\x20-\x7e]{3,}', context)
        print(f'=== Found {kw.decode()} at {idx} ===')
        for s in strs:
            decoded = s.decode("ascii", errors="replace")
            print(f'  {decoded}')
        print()
        idx = data.find(kw, idx + 1)

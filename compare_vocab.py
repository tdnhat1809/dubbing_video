"""Compare vocabs and find correct model approach."""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

zalopay = r'C:\Users\Admin\.cache\huggingface\hub\models--zalopay--vietnamese-tts\snapshots\1dc4967edb4549e40d820429e487eeeacee8bc08\vocab.txt'
local = r'C:\python\ommivoice\models\tts\vocab_vi.txt'

with open(zalopay, 'r', encoding='utf-8') as f:
    z_lines = [l.strip() for l in f]
with open(local, 'r', encoding='utf-8') as f:
    l_lines = [l.strip() for l in f]

print(f'Zalopay vocab: {len(z_lines)} tokens')
print(f'Local vocab:   {len(l_lines)} tokens')
print(f'Match: {z_lines == l_lines}')

if z_lines != l_lines:
    diffs = [(i,z,l) for i,(z,l) in enumerate(zip(z_lines, l_lines)) if z != l]
    diff_count = len(diffs)
    print(f'Diff count: {diff_count}')
    if diffs:
        for idx, z, l in diffs[:5]:
            print(f'  [{idx}] zalopay="{z}" local="{l}"')
else:
    print('Vocabs are IDENTICAL -> same model family confirmed')

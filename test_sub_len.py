import json

with open(r'tasks\9a5621db-ee70-4f67-8e6c-693fc611ae37\subtitles.json', 'r', encoding='utf-8') as f:
    subs = json.load(f)

print(f"Total subs: {len(subs)}")
for i, s in enumerate(subs[:5]):
    orig = str(s.get('original', ''))
    start = s.get('start', '?')
    end = s.get('end', '?')
    print(f"[{i+1}] len={len(orig)} chars  |  {start} -> {end}")
    print(f"  {orig[:80]}...")
    print()

# Stats
lens = [len(str(s.get('original', ''))) for s in subs]
print(f"Avg chars/sub: {sum(lens)/len(lens):.0f}")
print(f"Max chars/sub: {max(lens)}")
print(f"Min chars/sub: {min(lens)}")

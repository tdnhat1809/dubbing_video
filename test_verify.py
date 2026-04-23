import requests
r = requests.get('http://localhost:3000/api/subtitles?taskId=9a5621db-ee70-4f67-8e6c-693fc611ae37', timeout=5)
d = r.json()
print(f"Total: {d.get('count', 0)} subs, source: {d.get('source', '?')}")
for i, s in enumerate(list(d.get('subtitles', []))[:5]):
    print(f"  [{i+1}] {s.get('start','?')} | ({len(str(s.get('original','')))}) {str(s.get('original',''))[:30]}")

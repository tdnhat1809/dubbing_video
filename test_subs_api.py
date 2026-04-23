import requests, json

# List tasks
r = requests.get('http://localhost:3000/api/tasks', timeout=5)
data = r.json()
tasks = data if isinstance(data, list) else data.get('tasks', [])
print(f"Tasks found: {len(tasks)}")

for t in list(tasks)[:3]:
    tid = t.get('id', '?')
    title = str(t.get('title', '?'))[:30]
    print(f"  {tid} -> {title}")
    
    sr = requests.get(f'http://localhost:3000/api/subtitles?taskId={tid}', timeout=5)
    sd = sr.json()
    cnt = sd.get('count', 0)
    src = sd.get('source', '?')
    if cnt > 0:
        first = sd['subtitles'][0]
        orig = str(first.get('original', ''))[:40]
        trans = str(first.get('translation', ''))[:40]
        has_trans = trans != orig
        print(f"    Subs: {cnt}, source: {src}, has_translation: {has_trans}")
        print(f"    Original:    {orig}")
        print(f"    Translation: {trans}")
    else:
        print(f"    No subtitles")

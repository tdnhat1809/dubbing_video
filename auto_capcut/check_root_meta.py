import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r'C:\Users\Admin\AppData\Local\JianyingPro\User Data\Projects\com.lveditor.draft\root_meta_info.json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

print('Keys:', list(data.keys()))
if 'all_draft_store' in data:
    drafts = data['all_draft_store']
    print(f'Draft count: {len(drafts)}')
    for d in drafts[:5]:
        name = d.get('draft_name', '?')
        folder = d.get('draft_fold_path', '?')
        print(f'  Name: {name}')
        print(f'  Folder: {folder}')
        print()

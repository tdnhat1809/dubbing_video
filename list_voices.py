import asyncio, edge_tts
async def main():
    voices = await edge_tts.list_voices()
    vi = [v for v in voices if v['Locale'].startswith('vi')]
    print("=== Vietnamese ===")
    for v in vi:
        print(f"  {v['ShortName']:40} {v['Gender']:8} {v['Locale']}")
    zh = [v for v in voices if v['Locale'].startswith('zh')]
    print("\n=== Chinese ===")
    for v in zh[:10]:
        print(f"  {v['ShortName']:40} {v['Gender']:8} {v['Locale']}")
    en = [v for v in voices if v['Locale'].startswith('en-US')]
    print("\n=== English US ===")
    for v in en[:6]:
        print(f"  {v['ShortName']:40} {v['Gender']:8} {v['Locale']}")
asyncio.run(main())

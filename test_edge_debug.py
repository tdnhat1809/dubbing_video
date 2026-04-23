import edge_tts, asyncio, os

async def test():
    tests = [
        ("vi-VN-HoaiMyNeural", "Xin chao"),
        ("vi-VN-HoaiMyNeural", "Xin chao ban"),
        ("vi-VN-HoaiMyNeural", "Xin ch\u00e0o b\u1ea1n"),
        ("vi-VN-NamMinhNeural", "Xin chao ban"),
        ("vi-VN-NamMinhNeural", "Xin ch\u00e0o b\u1ea1n"),
    ]
    for i, (voice, text) in enumerate(tests):
        out = f"test_vi_{i}.mp3"
        try:
            c = edge_tts.Communicate(text, voice)
            await c.save(out)
            sz = os.path.getsize(out)
            print(f"OK: {voice} | '{text}' -> {sz} bytes")
        except Exception as e:
            print(f"FAIL: {voice} | '{text}' -> {e}")

asyncio.run(test())

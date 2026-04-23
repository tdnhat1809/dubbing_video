import asyncio, edge_tts, os

async def test():
    try:
        c = edge_tts.Communicate("Xin chào bạn, đây là thử nghiệm", "vi-VN-HoaiMyNeural")
        await c.save("test_edge_quick.mp3")
        size = os.path.getsize("test_edge_quick.mp3")
        print(f"OK: {size} bytes")
    except Exception as e:
        print(f"ERROR: {e}")

asyncio.run(test())

import argparse
import sys
from pathlib import Path

import requests


def synthesize(base_url, text, voice_type, pitch, speed, volume, method, output):
    base_url = base_url.rstrip("/")
    url = f"{base_url}/v1/synthesize"
    params = {
        "text": text,
        "type": voice_type,
        "pitch": pitch,
        "speed": speed,
        "volume": volume,
        "method": method,
    }

    response = requests.get(url, params=params, timeout=120, stream=(method == "stream"))

    content_type = response.headers.get("content-type", "")
    if response.status_code != 200:
        raise RuntimeError(
            f"HTTP {response.status_code} from {response.url}\n"
            f"content-type={content_type}\n"
            f"body={response.text[:500]}"
        )

    if "audio" not in content_type and not output:
        print(f"Warning: unexpected content-type: {content_type}", file=sys.stderr)

    output_path = Path(output)
    with output_path.open("wb") as f:
        if method == "stream":
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        else:
            f.write(response.content)

    return output_path, response.url, content_type


def main():
    parser = argparse.ArgumentParser(
        description="Test a self-hosted CapCut-TTS server based on kuwacom/CapCut-TTS."
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:8080",
        help="Base URL of the CapCut-TTS server. Default: http://localhost:8080",
    )
    parser.add_argument(
        "--text",
        default="Xin chao, day la bai test giong noi CapCut TTS.",
        help="Text to synthesize.",
    )
    parser.add_argument(
        "--type",
        type=int,
        default=10,
        dest="voice_type",
        help="Voice type from the repo voice list. Example: 10 = male announcer, 3 = female older sister.",
    )
    parser.add_argument("--pitch", type=int, default=10, help="Pitch parameter.")
    parser.add_argument("--speed", type=int, default=10, help="Speed parameter.")
    parser.add_argument("--volume", type=int, default=10, help="Volume parameter.")
    parser.add_argument(
        "--method",
        choices=["buffer", "stream"],
        default="buffer",
        help="Response mode supported by the wrapper API.",
    )
    parser.add_argument(
        "--output",
        default="capcut_tts_test.wav",
        help="Output WAV file path.",
    )
    args = parser.parse_args()

    try:
        output_path, final_url, content_type = synthesize(
            base_url=args.base_url,
            text=args.text,
            voice_type=args.voice_type,
            pitch=args.pitch,
            speed=args.speed,
            volume=args.volume,
            method=args.method,
            output=args.output,
        )
    except Exception as exc:
        print("CapCut TTS test failed.")
        print(str(exc))
        print(
            "\nChecklist:\n"
            "1. Start the CapCut-TTS server from the repo.\n"
            "2. Create its .env from .env.example.\n"
            "3. Fill DEVICE_TIME and SIGN from CapCut DevTools as described in the README.\n"
            "4. Then rerun this script."
        )
        sys.exit(1)

    print("CapCut TTS test succeeded.")
    print(f"URL: {final_url}")
    print(f"Content-Type: {content_type}")
    print(f"Saved: {output_path.resolve()}")


if __name__ == "__main__":
    main()

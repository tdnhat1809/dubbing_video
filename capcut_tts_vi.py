import argparse
from pathlib import Path

import requests


FALLBACK_TYPE_OPTIONS = {
    0: "labebe - Ms. Labebe",
    1: "cool_lady - Cool Lady",
    2: "happy_dino - Happy Dino",
    3: "puppet - Funny Puppet",
    4: "popular_guy - Popular Guy",
    5: "bratty_witch - Bratty Witch",
    6: "game_host - Game Host",
    7: "calm_dubbing - Calm Dubbing",
    8: "gruff_uncle - Gruff Uncle",
    9: "witch_granny - Witch Granny",
    10: "high_tension - High Tension",
    11: "serious_man - Serious Man",
    12: "manager - Manager",
    13: "little_sister - Little Sister",
    14: "young_girl - Young Girl",
    15: "peaceful_woman - Peaceful Woman",
}


def get_models(base_url):
    url = f"{base_url.rstrip('/')}/v1/models"
    response = requests.get(url, timeout=120)
    if response.status_code != 200:
        raise RuntimeError(
            f"Khong lay duoc danh sach voice.\nHTTP {response.status_code}\nBody: {response.text[:500]}"
        )
    data = response.json()
    return data.get("data", [])


def score_model(model, keyword):
    text = " ".join(
        [
            str(model.get("title", "")),
            str(model.get("description", "")),
            str(model.get("speaker", "")),
            str(model.get("effectId", "")),
            str(model.get("resourceId", "")),
        ]
    ).lower()
    keyword = keyword.lower()
    if keyword in text:
        return 0
    return 1


def filter_models(models, keyword):
    if not keyword:
        return models
    ranked = sorted(models, key=lambda model: score_model(model, keyword))
    return [model for model in ranked if score_model(model, keyword) == 0]


def print_models(models, limit=None):
    if not models:
        print("Khong co voice nao phu hop.")
        return

    print("Danh sach voice tu server CapCut:")
    items = models[:limit] if limit else models
    for i, model in enumerate(items, start=1):
        title = model.get("title", "")
        desc = model.get("description", "")
        speaker = model.get("speaker", "")
        effect_id = model.get("effectId", "")
        resource_id = model.get("resourceId", "")
        print(f"[{i}] {title}")
        print(f"    description: {desc}")
        print(f"    speaker:     {speaker}")
        print(f"    effectId:    {effect_id}")
        print(f"    resourceId:  {resource_id}")


def choose_voice(models, voice_id=None, voice_keyword=None):
    if voice_id:
        target = voice_id.lower()
        for model in models:
            candidates = [
                str(model.get("title", "")),
                str(model.get("speaker", "")),
                str(model.get("effectId", "")),
                str(model.get("resourceId", "")),
            ]
            if any(target == item.lower() for item in candidates if item):
                return model
        raise RuntimeError(f"Khong tim thay voice_id: {voice_id}")

    matches = filter_models(models, voice_keyword)
    if not matches:
        raise RuntimeError(
            "Khong tim thay voice khop voi tu khoa. "
            "Hay chay --list-voices hoac doi --voice-keyword."
        )
    return matches[0]


def synthesize(base_url, text, speed, output_path, voice=None, voice_type=None):
    url = f"{base_url.rstrip('/')}/v1/synthesize"
    params = {
        "text": text,
        "speed": speed,
        "method": "buffer",
    }
    if voice:
        params["voice"] = voice
    elif voice_type is not None:
        params["type"] = voice_type

    response = requests.get(url, params=params, timeout=120)
    if response.status_code != 200:
        raise RuntimeError(
            f"HTTP {response.status_code}\n"
            f"URL: {response.url}\n"
            f"Body: {response.text[:500]}"
        )

    output = Path(output_path)
    output.write_bytes(response.content)
    return output, response.url


def main():
    parser = argparse.ArgumentParser(description="Test CapCut TTS voi voice catalog that su.")
    parser.add_argument(
        "--text",
        default="Xin chao cac ban, day la bai test giong doc tieng Viet.",
        help="Noi dung can tao giong doc.",
    )
    parser.add_argument(
        "--voice-id",
        default=None,
        help="Chon voice bang title, speaker, effectId, hoac resourceId.",
    )
    parser.add_argument(
        "--voice-keyword",
        default="vi",
        help="Tu khoa de tim voice. Vi du: vi, vietnam, female, male. Mac dinh: vi",
    )
    parser.add_argument(
        "--type",
        type=int,
        default=None,
        dest="voice_type",
        help="Fallback voice type cu. Chi dung neu khong muon dung voice catalog.",
    )
    parser.add_argument(
        "--speed",
        type=int,
        default=10,
        help="Toc do doc. 10 la binh thuong.",
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:8080",
        help="Dia chi server CapCut-TTS.",
    )
    parser.add_argument(
        "--output",
        default="capcut_vi_test.mp3",
        help="File mp3 dau ra.",
    )
    parser.add_argument(
        "--list-voices",
        action="store_true",
        help="In danh sach voice dang co tren server roi thoat.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=30,
        help="So voice toi da khi list.",
    )
    args = parser.parse_args()

    models = get_models(args.base_url)

    if args.list_voices:
        filtered = filter_models(models, args.voice_keyword)
        print_models(filtered if filtered else models, limit=args.limit)
        return

    chosen_model = None
    used_voice = None
    used_type = None

    if args.voice_type is not None:
        used_type = args.voice_type
    else:
        chosen_model = choose_voice(
            models=models,
            voice_id=args.voice_id,
            voice_keyword=args.voice_keyword,
        )
        used_voice = chosen_model.get("resourceId") or chosen_model.get("effectId") or chosen_model.get("speaker") or chosen_model.get("title")

    output, final_url = synthesize(
        base_url=args.base_url,
        text=args.text,
        speed=args.speed,
        output_path=args.output,
        voice=used_voice,
        voice_type=used_type,
    )

    print("Tao voice thanh cong.")
    if chosen_model:
        print(f"Voice title: {chosen_model.get('title', '')}")
        print(f"Voice desc:  {chosen_model.get('description', '')}")
        print(f"Speaker:     {chosen_model.get('speaker', '')}")
        print(f"resourceId:  {chosen_model.get('resourceId', '')}")
    else:
        print(f"Fallback type: {used_type} - {FALLBACK_TYPE_OPTIONS.get(used_type, 'unknown')}")
    print(f"URL: {final_url}")
    print(f"File: {output.resolve()}")


if __name__ == "__main__":
    main()

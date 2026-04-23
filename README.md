# 🎬 DichTuDong.com - AI Video Translation Platform

> Nền tảng dịch thuật video tự động bằng trí tuệ nhân tạo. Dịch văn bản, nhận diện giọng nói, lồng tiếng AI đa kênh.

## 🌟 Tính năng chính

- **OCR Technology** - Nhận diện và trích xuất phụ đề từ video bằng AI
- **ChatGPT+ Translation** - Dịch thuật chính xác với ngữ cảnh bằng LLM
- **AI Voice Cloning** - Lồng tiếng tự nhiên, đa nhân vật
- **Multi-format Export** - Xuất MP4 1080P, SRT/ASS subtitles

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Styling:** TailwindCSS 3 + Custom Design System ("Lumina Gloss")
- **Typography:** Be Vietnam Pro (Google Fonts)
- **Icons:** Material Symbols Outlined

### Backend (Python)
- **Video Processing:** FFmpeg, OpenCV
- **OCR Engine:** RapidOCR (GPU-accelerated)
- **Translation:** OpenAI GPT API
- **Voice Synthesis:** OmniVoice (Voice Cloning)
- **Subtitle Detection:** YOLO v8 + Frame Differencing

## 📁 Project Structure

```
ommivoice/
├── website/                    # Next.js Frontend
│   ├── app/
│   │   ├── page.js            # Homepage
│   │   ├── gia-ca/            # Pricing
│   │   ├── dich-vu/           # Services
│   │   ├── dang-nhap/         # Login
│   │   ├── lien-he/           # Contact
│   │   ├── thu-vien/          # Library/Gallery
│   │   ├── huong-dan/         # Guide/FAQ
│   │   ├── components/        # Header, Footer
│   │   ├── globals.css        # Tailwind + Design tokens
│   │   └── layout.js          # Root layout
│   ├── tailwind.config.js     # Lumina Gloss tokens
│   └── package.json
├── extract_subtitle_v3.py     # Main OCR pipeline
├── translate_subtitle.py      # GPT Translation
├── merge_final.py             # Audio/video merge
├── video_subtitle_api.py      # FastAPI backend
└── stitch_dichtudong_clone/   # Stitch design assets
```

## 🚀 Getting Started

### Frontend
```bash
cd website
npm install
npm run dev
# Open http://localhost:3000
```

### Backend
```bash
# Activate virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Run API server
python video_subtitle_api.py
```

## 🎨 Design System: Lumina Gloss

The UI follows the **"Cinematic Canvas"** design philosophy:
- **No-Line Rule:** Structure through tonal shifts, not borders
- **Color Palette:** Deep Indigo (#4544dc) + Lavender spectrum
- **Glassmorphism:** Frosted glass panels with backdrop-blur
- **Surface Hierarchy:** 5-tier elevation system

## 🌐 Pages

| Page | Route | Description |
|------|-------|-------------|
| Trang chủ | `/` | Homepage with hero, features |
| Dịch Vụ | `/dich-vu` | Services overview |
| Giá Cả | `/gia-ca` | Pricing plans |
| Đăng Nhập | `/dang-nhap` | Login/Register |
| Liên Hệ | `/lien-he` | Contact form |
| Thư Viện | `/thu-vien` | Video gallery |
| Hướng Dẫn | `/huong-dan` | Tutorials & FAQ |

## 📝 License

© 2024-2026 DichTuDong.com. All rights reserved.

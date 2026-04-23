# ⚙️ Log Chức Năng Chính - DichTuDong Clone

## Pipeline (đã có scripts Python sẵn)
| Bước | Script | Status |
|------|--------|--------|
| OCR Subtitle Extraction | `extract_subtitle_v3.py` | ✅ Hoàn thành |
| Translation (Trung → Việt) | `translate_srt.py` | ✅ Hoàn thành |
| Blur Hard Subtitles | `blur_hardsub.py` | ✅ Hoàn thành |
| Voice Generation (OmniVoice) | `generate_voiceover.py` | ✅ Hoàn thành |
| Merge Final Video | `merge_final.py` | ✅ Hoàn thành |

## Web Integration (Chưa làm)
- [ ] Video upload API endpoint
- [ ] Drag & drop upload UI (dashboard)
- [ ] Processing queue / job system
- [ ] Real-time progress tracking (WebSocket)
- [ ] Download API (MP4, SRT, ASS)
- [ ] Processing history / video library

## Supported Languages (planned)
- Trung → Việt (primary, đã test)
- Hàn → Việt
- Nhật → Việt
- Anh → Việt
- + 100 ngôn ngữ khác

## Notes
- Tất cả scripts nằm tại `c:\python\ommivoice\`
- Input: Video MP4
- Output: `{name}_final.mp4` + `.srt` files
- Dependencies: YOLO, RapidOCR, OmniVoice, FFmpeg

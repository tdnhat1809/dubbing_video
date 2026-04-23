# Website Stack Requirements

This website is not frontend-only.
Several `app/api/*` routes spawn Python scripts from the repo root, so a working setup needs:

1. Node.js + npm packages for `./website`
2. Python packages for OCR / render / TTS scripts in repo root
3. External binaries such as `ffmpeg`
4. Optional local services for some routes

## 1. Node.js runtime

Minimum Node.js version:

- `>= 20.9.0`

Exact website package versions already pinned in the repo:

- `next@16.2.2`
- `react@19.2.4`
- `react-dom@19.2.4`
- `uuid@13.0.0`
- `@tailwindcss/forms@0.5.11`
- `autoprefixer@10.4.27`
- `postcss@8.5.8`
- `tailwindcss@3.4.19`

Install command:

```bash
cd website
npm ci
```

The exact dependency tree is already locked by:

- `website/package-lock.json`

## 2. Python runtime used by website routes

Website API routes call these root scripts:

- `extract_subtitle_v3.py`
- `extract_subtitle_whisper.py`
- `render_video.py`
- `generate_voiceover.py`
- `generate_voiceover_edge.py`
- `generate_voiceover_capcut.py`
- `generate_voiceover_valtec.py`
- `google_drive_ocr.py`

Install command from repo root:

```bash
pip install -r requirements.website.txt
```

Pinned Python package list:

- `requirements.website.txt`

Important note:

- The `torch`, `torchaudio`, `torchvision`, and `onnxruntime-gpu` pins in `requirements.website.txt` match the current local GPU environment.
- If you run CPU-only, replace them with CPU-compatible wheels and use `onnxruntime==1.24.4` instead of `onnxruntime-gpu==1.24.4`.

## 3. System binaries required

Required:

- `python` available on `PATH`
- `ffmpeg` available on `PATH`, or bundled as `ffmpeg.exe` in repo root
- `ffprobe` available on `PATH`, or bundled as `ffprobe.exe` in repo root

Optional by feature:

- `audio-separator` CLI, or set `AUDIO_SEPARATOR_BIN`

## 4. Optional local services / env vars

Some routes depend on local services instead of pure npm/pip packages:

- `TRANSLATE_API_URL`
- `TRANSLATE_API_KEY`
- `FLASK_API_URL`
- `CAPCUT_MATE_URL`
- `MBBANK_PAYMENT_API`
- `AUDIO_SEPARATOR_BIN`

Feature mapping:

- Translation route uses `TRANSLATE_API_URL`
- Upload route can call `FLASK_API_URL`, otherwise it falls back to local Python subprocesses
- CapCut export / render routes use `CAPCUT_MATE_URL`
- Payment check route uses `MBBANK_PAYMENT_API`
- Audio separation route can use `AUDIO_SEPARATOR_BIN`

## 5. Repo-specific caveats

- `app/api/prompts/route.js` and `app/api/translate/route.js` use a hardcoded path:
  - `C:/python/ommivoice/prompts.json`
- Several routes spawn `python ...` directly, so having Python installed but not on `PATH` is not enough.
- Whisper and Valtec code paths reference extra Python packages that are not pinned anywhere reliable in this repo:
  - `faster-whisper`
  - `stable-ts`
  - `openai-whisper`
  - `valtec-tts`
  - `vietnormalizer`
  - `viphoneme`
  - `underthesea`

If you need those optional paths, pin and freeze them after confirming which versions your local environment actually uses.

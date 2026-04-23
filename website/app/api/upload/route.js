import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync, copyFileSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { saveTask, loadTask, saveTaskSubtitles, getTaskDir } from '../../../lib/taskStore.js';
import { incrementUserStats, upsertUser } from '../../../lib/userStore.js';
import { getPythonRuntime } from '../../../lib/pythonRuntime.js';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const video = formData.get('video');
    const srtFile = formData.get('srt'); // Optional pre-existing SRT
    const mode = formData.get('mode') || 'Dịch sub cứng';
    const skipExtract = formData.get('skipExtract') === 'true';

    if (!video) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const taskId = uuidv4();
    const taskDir = getTaskDir(taskId);
    if (!existsSync(taskDir)) await mkdir(taskDir, { recursive: true });

    // Save video to task directory
    const ext = path.extname(video.name) || '.mp4';
    const filename = `${taskId}${ext}`;
    const filepath = path.join(taskDir, filename);
    const bytes = await video.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Also save to uploads/ for video API compatibility
    const uploadsDir = path.join(process.cwd(), '..', 'uploads');
    if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });
    const uploadsPath = path.join(uploadsDir, filename);
    copyFileSync(filepath, uploadsPath);

    const sourceLang = formData.get('source_lang') || 'Tiếng Trung';
    const targetLang = formData.get('target_lang') || 'Tiếng Việt';
    const engine = formData.get('engine') || 'GPT 4mini';
    const ocrEngine = formData.get('ocr_engine') || 'google';
    const multiSub = formData.get('multi_sub') === 'true';
    const extractionMethod = formData.get('extraction_method') || 'yolo';
    const whisperModel = formData.get('whisper_model') || 'large-v3';
    const userEmail = formData.get('userEmail') || '';
    const detectZoneTop = formData.get('detect_zone_top') ? parseFloat(formData.get('detect_zone_top')) : null;
    const ocrEveryBboxFrame = formData.get('ocr_every_bbox_frame') === 'true';
    const cropChangeThreshold = formData.get('crop_change_threshold') ? parseFloat(formData.get('crop_change_threshold')) : null;
    const textDiffThreshold = formData.get('text_diff_threshold') ? parseFloat(formData.get('text_diff_threshold')) : null;
    const minSubDuration = formData.get('min_sub_duration') ? parseFloat(formData.get('min_sub_duration')) : null;

    // Create persistent task
    const task = saveTask(taskId, {
      status: skipExtract && srtFile ? 'extracted' : 'uploaded',
      progress: skipExtract && srtFile ? 100 : 0,
      step: skipExtract && srtFile ? 'done' : 'upload',
      message: skipExtract && srtFile ? 'Video + phụ đề đã tải lên' : 'Video uploaded successfully',
      filename: video.name,
      filepath,
      videoUrl: `/api/video/${filename}`,
      sourceLang,
      targetLang,
      engine,
      mode,
      ocrEngine,
      multiSub,
      extractionMethod,
      whisperModel,
      userEmail,
      detectZoneTop,
      ocrEveryBboxFrame,
      cropChangeThreshold: Number.isFinite(cropChangeThreshold) ? cropChangeThreshold : null,
      textDiffThreshold: Number.isFinite(textDiffThreshold) ? textDiffThreshold : null,
      minSubDuration: Number.isFinite(minSubDuration) ? minSubDuration : null,
      createdAt: new Date().toISOString(),
    });

    // Track user stats
    if (userEmail) {
      try {
        upsertUser(userEmail);
        incrementUserStats(userEmail, { tasksCreated: 1, videosUploaded: 1 });
      } catch { }
    }

    // Handle pre-existing SRT file
    if (srtFile && srtFile.size > 0) {
      const srtBytes = await srtFile.arrayBuffer();
      const srtContent = Buffer.from(srtBytes).toString('utf-8');

      // Save to task directory
      const srtPath = path.join(taskDir, 'text_ocr.srt');
      await writeFile(srtPath, srtContent, 'utf-8');

      // Parse SRT and save as subtitles.json
      const subtitles = parseSRT(srtContent);
      saveTaskSubtitles(taskId, subtitles);

      // Also copy to root for compatibility
      const rootSrt = path.join(process.cwd(), '..', 'text_ocr.srt');
      await writeFile(rootSrt, srtContent, 'utf-8');

      saveTask(taskId, {
        status: 'extracted',
        progress: 100,
        step: 'done',
        message: 'Video + phụ đề đã sẵn sàng',
        srtPath,
      });
    } else if (!skipExtract) {
      // Auto-start extraction based on method
      if (extractionMethod === 'whisper') {
        runWhisperSubprocess(taskId, filepath, whisperModel, sourceLang);
      } else {
        startExtraction(taskId, filepath, ocrEngine, multiSub, {
          detectZoneTop,
          ocrEveryBboxFrame,
          cropChangeThreshold,
          textDiffThreshold,
          minSubDuration,
        });
      }
    }

    return NextResponse.json({
      taskId,
      status: task.status,
      videoUrl: `/api/video/${filename}`,
      message: task.message,
    });

  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function parseSRT(content) {
  const blocks = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split(/\n\n+/);
  return blocks.map(block => {
    const lines = block.trim().split('\n');
    if (lines.length < 3) return null;
    const index = parseInt(lines[0]);
    const tc = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
    if (!tc) return null;
    const start = tc[1].replace(',', '.');
    const end = tc[2].replace(',', '.');
    const text = lines.slice(2).join('\n').trim();
    return { id: index, index, start, end, original: text, translation: text, text, checked: false };
  }).filter(Boolean);
}

function persistExtractionOutputs(taskId, srtPath, bboxPath) {
  if (existsSync(srtPath)) {
    const content = readFileSync(srtPath, 'utf-8');
    const subtitles = parseSRT(content);
    saveTaskSubtitles(taskId, subtitles);
    const rootSrt = path.join(process.cwd(), '..', 'text_ocr.srt');
    copyFileSync(srtPath, rootSrt);
  }

  if (existsSync(bboxPath)) {
    const rootBbox = path.join(process.cwd(), '..', 'subtitle_bboxes.json');
    copyFileSync(bboxPath, rootBbox);
  }
}

async function startExtraction(taskId, filepath, ocrEngine = 'google', multiSub = false, options = {}) {
  const task = saveTask(taskId, {
    status: 'extracting',
    step: 'extract',
    progress: 0,
    message: `Starting subtitle extraction (V3, OCR: ${ocrEngine})...`,
    extractionStage: 'detect_bbox',
    errorStage: '',
    retryMode: 'full',
    bboxReady: false,
  });

  try {
    const flaskUrl = process.env.FLASK_API_URL || 'http://localhost:5000';
    const formData = new FormData();
    const fs = await import('fs');
    const videoBuffer = fs.readFileSync(filepath);
    const blob = new Blob([videoBuffer]);
    formData.append('video', blob, path.basename(filepath));

    const res = await fetch(`${flaskUrl}/process-video`, { method: 'POST', body: formData });

    if (res.ok) {
      const data = await res.json();
      saveTask(taskId, { flaskTaskId: data.task_id, message: 'Extraction in progress...' });
      pollFlaskStatus(taskId, data.task_id);
    } else {
      saveTask(taskId, { message: 'Flask API not available. Running standalone...' });
      runExtractSubprocess(taskId, filepath, ocrEngine, multiSub, options);
    }
  } catch (err) {
    saveTask(taskId, { message: 'Flask API not available. Running standalone...' });
    runExtractSubprocess(taskId, filepath, ocrEngine, multiSub, options);
  }
}

async function runExtractSubprocess(taskId, filepath, ocrEngine = 'google', multiSub = false, options = {}) {
  const { spawn } = await import('child_process');
  const pythonScript = path.join(process.cwd(), '..', 'extract_subtitle_v3.py');
  const pythonRuntime = getPythonRuntime();
  const taskDir = getTaskDir(taskId);
  const srtOutput = path.join(taskDir, 'text_ocr.srt');
  const bboxOutput = path.join(taskDir, 'subtitle_bboxes.json');
  const retryMode = options.retryMode || 'full';
  const reuseBboxPath = options.reuseBboxPath || bboxOutput;

  const ocrLabel = ocrEngine === 'google' ? 'Google Drive OCR' : 'RapidOCR';
  const modeLabel = multiSub ? 'Multi-Sub' : 'Single-Sub';
  saveTask(taskId, {
    message: retryMode === 'ocr'
      ? `Retrying OCR only (${ocrLabel}, ${modeLabel})...`
      : `Extracting V3 (${ocrLabel}, ${modeLabel})...`,
    extractionStage: retryMode === 'ocr' ? 'extract_ocr' : 'detect_bbox',
    errorStage: '',
    retryMode,
    bboxPath: bboxOutput,
    bboxReady: existsSync(bboxOutput),
  });

  const args = [
    pythonScript,
    filepath,
    '--ocr-engine', ocrEngine,
    '--output-srt', srtOutput,
    '--output-bbox', bboxOutput,
  ];
  if (multiSub) args.push('--multi-sub');
  if (options.detectZoneTop != null && !isNaN(options.detectZoneTop)) {
    args.push('--detect-zone-top', String(options.detectZoneTop));
  }
  if (options.ocrEveryBboxFrame) {
    args.push('--ocr-every-bbox-frame');
  }
  if (options.cropChangeThreshold != null && !isNaN(options.cropChangeThreshold)) {
    args.push('--crop-change-threshold', String(options.cropChangeThreshold));
  }
  if (options.textDiffThreshold != null && !isNaN(options.textDiffThreshold)) {
    args.push('--text-diff-threshold', String(options.textDiffThreshold));
  }
  if (options.minSubDuration != null && !isNaN(options.minSubDuration)) {
    args.push('--min-sub-duration', String(options.minSubDuration));
  }
  if (retryMode === 'ocr') {
    args.push('--retry-from', 'ocr', '--reuse-bbox', reuseBboxPath);
  }

  console.log('[Extract] Python runtime:', pythonRuntime);
  const child = spawn(pythonRuntime, args, {
    cwd: path.join(process.cwd(), '..'),
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderrTail = '';  // Keep only last 2KB of stderr to avoid OOM
  let currentStage = retryMode === 'ocr' ? 'extract_ocr' : 'detect_bbox';
  let completed = false;

  child.stdout?.on('data', (data) => {
    const lines = data.toString('utf-8').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    for (const line of lines) {
      console.log('[Extract]', line);
      const pctMatch = line.match(/\[\s*(\d+\.?\d*)%\]/);
      if (pctMatch) {
        saveTask(taskId, { progress: Math.round(parseFloat(pctMatch[1])) });
      }
      if (line.includes('PASS 1')) {
        currentStage = 'detect_bbox';
        saveTask(taskId, {
          step: 'ai_scan',
          message: 'AI Detection Scan...',
          extractionStage: 'detect_bbox',
          errorStage: '',
        });
      }
      if (line.includes('Saved bbox timeline for retry:')) {
        saveTask(taskId, {
          bboxPath: bboxOutput,
          bboxReady: true,
          extractionStage: 'detect_bbox',
          message: retryMode === 'ocr'
            ? 'Loaded bbox timeline, preparing OCR...'
            : 'YOLO detect bbox xong, đang chuyển sang OCR...',
        });
      }
      if (line.includes('PASS 2')) {
        currentStage = 'extract_ocr';
        saveTask(taskId, {
          step: 'ocr',
          message: retryMode === 'ocr' ? 'Retrying OCR from existing bbox...' : 'OCR Extraction...',
          extractionStage: 'extract_ocr',
          errorStage: '',
        });
      }
      if (line.includes('POST-PROCESSING')) {
        saveTask(taskId, {
          step: 'post_process',
          message: 'Post-processing subtitles...',
          extractionStage: 'extract_ocr',
          errorStage: '',
        });
      }
      if (line.includes('ALL DONE')) {
        persistExtractionOutputs(taskId, srtOutput, bboxOutput);
        completed = true;
        saveTask(taskId, {
          progress: 100,
          status: 'extracted',
          step: 'done',
          message: retryMode === 'ocr' ? 'OCR retry complete' : 'Extraction complete',
          srtPath: srtOutput,
          bboxPath: bboxOutput,
          bboxReady: existsSync(bboxOutput),
          extractionStage: 'completed',
          errorStage: '',
          retryMode,
        });
      }
    }
  });

  child.stderr?.on('data', (data) => {
    const chunk = data.toString('utf-8');
    stderrTail = (stderrTail + chunk).slice(-2048);  // Keep only last 2KB
  });

  // Timeout: kill after 60 minutes
  const timeoutId = setTimeout(() => {
    console.log('[Extract] Timeout after 60 minutes, killing process...');
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 5000);
  }, 3600000);

  child.on('close', (code) => {
    clearTimeout(timeoutId);
    if (code === 0) {
      if (!completed) {
        persistExtractionOutputs(taskId, srtOutput, bboxOutput);
      }
      saveTask(taskId, {
        status: 'extracted',
        progress: 100,
        step: 'done',
        message: retryMode === 'ocr' ? 'OCR retry complete' : 'Subtitles extracted successfully',
        srtPath: srtOutput,
        bboxPath: bboxOutput,
        bboxReady: existsSync(bboxOutput),
        extractionStage: 'completed',
        errorStage: '',
        retryMode,
      });
    } else {
      const moduleName = stderrTail.match(/No module named '([^']+)'/)?.[1];
      let errorMsg;
      if (moduleName) {
        errorMsg = `Missing: ${moduleName}. Run: pip install ${moduleName}`;
      } else if (code === null) {
        errorMsg = 'Process timed out or ran out of memory. Try a shorter video or reduce resolution.';
      } else {
        errorMsg = `Extraction failed (code ${code}). ${stderrTail.slice(-200)}`;
      }
      saveTask(taskId, {
        status: 'error',
        step: currentStage === 'extract_ocr' ? 'ocr' : 'ai_scan',
        progress: loadTask(taskId)?.progress || 0,
        message: errorMsg,
        extractionStage: currentStage,
        errorStage: currentStage,
        bboxPath: existsSync(bboxOutput) ? bboxOutput : '',
        bboxReady: existsSync(bboxOutput),
        retryMode,
      });
    }
  });
}

async function runWhisperSubprocess(taskId, filepath, whisperModel = 'large-v3', sourceLang = '') {
  const { spawn } = await import('child_process');
  const pythonScript = path.join(process.cwd(), '..', 'extract_subtitle_whisper.py');
  const pythonRuntime = getPythonRuntime();

  // Map source language name to whisper code
  const langMap = {
    'Tiếng Trung': 'zh', 'Tiếng Việt': 'vi', 'Tiếng Anh': 'en',
    'Tiếng Nhật': 'ja', 'Tiếng Hàn': 'ko', 'Tiếng Tây Ban Nha': 'es',
  };
  const langCode = langMap[sourceLang] || '';

  saveTask(taskId, {
    status: 'extracting',
    step: 'whisper',
    progress: 0,
    message: `Whisper extraction (${whisperModel})...`,
  });

  const args = [pythonScript, filepath, '--engine', 'stable', '--model', whisperModel];
  if (langCode) args.push('--language', langCode);

  // Output SRT to task directory
  const taskDir = getTaskDir(taskId);
  const srtOutput = path.join(taskDir, 'text_ocr.srt');
  args.push('--output', srtOutput);

  console.log('[Whisper] Python runtime:', pythonRuntime);
  const child = spawn(pythonRuntime, args, {
    cwd: path.join(process.cwd(), '..'),
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1', KMP_DUPLICATE_LIB_OK: 'TRUE' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderrTail = '';

  child.stdout?.on('data', (data) => {
    const line = data.toString('utf-8');
    console.log('[Whisper]', line.trim());
    const pctMatch = line.match(/\[\s*(\d+\.?\d*)%\]/);
    if (pctMatch) {
      saveTask(taskId, { progress: Math.round(parseFloat(pctMatch[1])) });
    }
    if (line.includes('Loading')) saveTask(taskId, { message: 'Loading Whisper model...' });
    if (line.includes('Transcribing')) saveTask(taskId, { message: 'Transcribing audio...' });
    if (line.includes('Detected language')) {
      const langMatch = line.match(/Detected language: (\w+)/);
      if (langMatch) saveTask(taskId, { message: `Transcribing (${langMatch[1]})...` });
    }
    if (line.includes('DONE')) {
      if (existsSync(srtOutput)) {
        const content = readFileSync(srtOutput, 'utf-8');
        const subtitles = parseSRT(content);
        saveTaskSubtitles(taskId, subtitles);
        // Copy to root for compatibility
        const rootSrt = path.join(process.cwd(), '..', 'text_ocr.srt');
        copyFileSync(srtOutput, rootSrt);
      }
      saveTask(taskId, { progress: 100, status: 'extracted', message: 'Whisper extraction complete', srtPath: srtOutput });
    }
  });

  child.stderr?.on('data', (data) => {
    stderrTail = (stderrTail + data.toString('utf-8')).slice(-2048);
  });

  const timeoutId = setTimeout(() => {
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 5000);
  }, 3600000);

  child.on('close', (code) => {
    clearTimeout(timeoutId);
    if (code === 0) {
      saveTask(taskId, { status: 'extracted', progress: 100, message: 'Whisper extraction complete' });
    } else {
      const moduleName = stderrTail.match(/No module named '([^']+)'/)?.[1];
      let errorMsg = moduleName
        ? `Missing: ${moduleName}. Run: pip install ${moduleName}`
        : `Whisper failed (code ${code}). ${stderrTail.slice(-200)}`;
      saveTask(taskId, { status: 'error', message: errorMsg });
    }
  });
}

async function pollFlaskStatus(taskId, flaskTaskId) {
  const flaskUrl = process.env.FLASK_API_URL || 'http://localhost:5000';
  const poll = async () => {
    try {
      const res = await fetch(`${flaskUrl}/status/${flaskTaskId}`);
      if (res.ok) {
        const data = await res.json();
        saveTask(taskId, { progress: data.progress || 0, message: data.message || 'Processing...' });
        if (data.status === 'completed') {
          saveTask(taskId, { status: 'extracted', srtPath: data.srt_file });
          return;
        } else if (data.status === 'error') {
          saveTask(taskId, { status: 'error', message: data.message });
          return;
        }
      }
    } catch { /* continue */ }
    setTimeout(poll, 2000);
  };
  poll();
}

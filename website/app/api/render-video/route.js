import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { getPythonRuntime } from '../../../lib/pythonRuntime.js';

const rootDir = path.resolve(process.cwd(), '..');

function resolveAudioFile(audioPath, taskId) {
  if (!audioPath) return null;

  const rawPath = String(audioPath).trim();
  const basename = path.basename(rawPath);
  const candidates = [
    path.isAbsolute(rawPath) ? rawPath : null,
    taskId ? path.join(rootDir, 'tasks', taskId, basename) : null,
    taskId ? path.join(rootDir, 'tasks', taskId, 'dubbed_audio.wav') : null,
    taskId ? path.join(rootDir, 'tasks', taskId, 'dubbed_audio.mp3') : null,
    taskId ? path.join(rootDir, 'tasks', taskId, 'separated', basename) : null,
    rawPath.startsWith('/api/audio/') ? null : path.join(rootDir, rawPath),
    path.join(rootDir, basename),
    path.join(rootDir, 'voiceover_clips', basename),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function POST(req) {
  try {
    const pythonRuntime = getPythonRuntime();
    const body = await req.json();
    const {
      videoPath,      // URL like /api/video/xxx.mp4 OR filename
      subtitles,      // array of {start, end, original, translation}
      settings = {},  // {subColor, subBg, subBgOpacity, subFont, subFontsize}
      voiceoverPath,
      backgroundAudioPath,
      logoPath,
      logoX = 10, logoY = 10, logoSize = 80,
      borderTop = '', borderBottom = '',
      borderColor = '#000000', borderTextColor = '#ffffff',
      borderHeight = 40,
      originalVolume = 1.0, voiceoverVolume = 1.0,
      quality = '1080p',
      blurHardsub = true,
      blurMode = 'manual',   // 'manual' or 'yolo'
      blurHeight = 15,
      blurWidth = 100,
      blurIntensity = 15,
      taskId,
    } = body;

    // Resolve actual video file path
    let fullVideoPath = null;

    // Try multiple resolution strategies
    const candidates = [
      // Direct filename in root
      videoPath ? path.join(rootDir, path.basename(videoPath)) : null,
      // Task-based video in task directory
      taskId ? path.join(rootDir, 'tasks', taskId, `${taskId}.mp4`) : null,
      // Task-based video in root
      taskId ? path.join(rootDir, `${taskId}.mp4`) : null,
      // In uploads directory
      taskId ? path.join(rootDir, 'uploads', `${taskId}.mp4`) : null,
      // Extract taskId from URL like /api/video/xxx.mp4
      videoPath?.match(/([a-f0-9-]{36})\.mp4/) ? path.join(rootDir, 'uploads', videoPath.match(/([a-f0-9-]{36})\.mp4/)[1] + '.mp4') : null,
      videoPath?.match(/([a-f0-9-]{36})\.mp4/) ? path.join(rootDir, videoPath.match(/([a-f0-9-]{36})\.mp4/)[1] + '.mp4') : null,
      // videos/ subfolder
      videoPath ? path.join(rootDir, 'videos', path.basename(videoPath)) : null,
      // Fallbacks
      path.join(rootDir, '1.mp4'),
      path.join(rootDir, '2.mp4'),
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        fullVideoPath = candidate;
        break;
      }
    }

    if (!fullVideoPath) {
      console.error('[Render] Video not found. Tried:', candidates);
      return NextResponse.json({
        error: 'Video file not found',
        tried: candidates.map(c => path.basename(c)),
      }, { status: 400 });
    }

    console.log(`[Render] Resolved video: ${fullVideoPath}`);

    // Generate SRT from subtitles
    const srtPath = path.join(rootDir, 'render_subtitles.srt');
    let srtContent = '';
    (subtitles || []).forEach((sub, i) => {
      const start = (sub.start || '00:00:00.000').replace('.', ',');
      const end = (sub.end || '00:00:00.000').replace('.', ',');
      const text = sub.translation || sub.original || '';
      srtContent += `${i + 1}\n${start} --> ${end}\n${text}\n\n`;
    });
    fs.writeFileSync(srtPath, srtContent, 'utf-8');

    // Output path
    const timestamp = Date.now();
    const outputDir = path.join(rootDir, 'rendered_videos');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `rendered_${timestamp}.mp4`);

    // Build command args
    const pythonScript = path.join(rootDir, 'render_video.py');
    const cmdArgs = [
      pythonScript,
      '--video', fullVideoPath,
      '--srt', srtPath,
      '--output', outputPath,
      '--sub-color', settings.subColor || '#000000',
      '--sub-bg', settings.subBg || '#ffffff',
      '--sub-bg-opacity', String(settings.subBgOpacity ?? 85),
      '--sub-font', settings.subFont || 'Arial',
      '--sub-fontsize', String(settings.subFontsize || 28),
      '--original-volume', String(originalVolume),
      '--voiceover-volume', String(voiceoverVolume),
      '--quality', quality,
      '--blur-height', String(blurHeight),
      '--blur-width', String(blurWidth),
      '--blur-intensity', String(blurIntensity || 15),
    ];

    // Blur control
    if (!blurHardsub) {
      cmdArgs.push('--no-blur');
    }

    // YOLO bbox data - check multiple locations
    const bboxCandidates = [
      taskId ? path.join(rootDir, 'tasks', taskId, 'subtitle_bboxes.json') : null,
      path.join(rootDir, 'subtitle_bboxes.json'),
    ].filter(Boolean);

    let bboxPath = null;
    for (const bp of bboxCandidates) {
      if (fs.existsSync(bp)) {
        bboxPath = bp;
        break;
      }
    }

    // Auto-use YOLO if bbox data exists (even if mode is 'manual' - YOLO is more accurate)
    if (bboxPath && blurHardsub) {
      cmdArgs.push('--blur-data', bboxPath);
      console.log(`[Render] Using YOLO bbox data: ${bboxPath}`);
    }

    if (borderTop) cmdArgs.push('--border-top', borderTop);
    if (borderBottom) cmdArgs.push('--border-bottom', borderBottom);
    if (borderColor) cmdArgs.push('--border-color', borderColor);
    if (borderTextColor) cmdArgs.push('--border-text-color', borderTextColor);
    if (borderHeight) cmdArgs.push('--border-height', String(borderHeight));

    if (voiceoverPath) {
      const fullVoiceover = resolveAudioFile(voiceoverPath, taskId);
      if (fullVoiceover) {
        cmdArgs.push('--voiceover', fullVoiceover);
      } else {
        console.warn(`[Render] Voiceover not found: ${voiceoverPath}`);
      }
    }

    if (backgroundAudioPath) {
      const fullBackgroundAudio = resolveAudioFile(backgroundAudioPath, taskId);
      if (fullBackgroundAudio) {
        cmdArgs.push('--background-audio', fullBackgroundAudio);
      } else {
        console.warn(`[Render] Background audio not found: ${backgroundAudioPath}`);
      }
    }

    if (logoPath) {
      // logoPath might be absolute (from upload-logo API) or relative
      const candidates = [
        logoPath,  // Already absolute path from upload API
        path.join(rootDir, logoPath),  // Relative to root
        path.join(rootDir, 'logos', path.basename(logoPath)),  // In logos/ dir
      ];
      const fullLogo = candidates.find(p => fs.existsSync(p));
      if (fullLogo) {
        cmdArgs.push('--logo', fullLogo, '--logo-x', String(logoX), '--logo-y', String(logoY), '--logo-size', String(logoSize));
        console.log(`[Render] Logo: ${fullLogo} at (${logoX},${logoY}) size=${logoSize}`);
      } else {
        console.warn(`[Render] Logo not found: ${logoPath}`);
      }
    }

    // Create task
    const renderTaskId = `render-${timestamp}`;
    if (!globalThis.__renderTasks) globalThis.__renderTasks = {};
    globalThis.__renderTasks[renderTaskId] = {
      status: 'processing',
      progress: 0,
      outputPath: null,
      error: null,
      startedAt: Date.now(),
    };

    // Run in background
    console.log(`[Render] Starting: python ${path.basename(pythonScript)} --video ${path.basename(fullVideoPath)}`);

    const proc = spawn(pythonRuntime, cmdArgs, {
      cwd: rootDir,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', KMP_DUPLICATE_LIB_OK: 'TRUE' },
    });

    let lastError = '';
    let lastOutput = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      lastOutput += text;
      console.log(`[Render:stdout] ${text.trim()}`);
      // Parse progress from -progress pipe:1 output
      const timeMatch = text.match(/out_time_ms=(\d+)/);
      if (timeMatch) {
        const elapsedMs = parseInt(timeMatch[1]) / 1000000;
        // Estimate ~3 min video → progress
        globalThis.__renderTasks[renderTaskId].progress = Math.min(95, Math.round(elapsedMs / 2));
      }
      // Parse PROGRESS lines from our script
      const progressLine = text.match(/PROGRESS:.*out_time=(\d{2}):(\d{2}):(\d{2})/);
      if (progressLine) {
        const secs = parseInt(progressLine[1]) * 3600 + parseInt(progressLine[2]) * 60 + parseInt(progressLine[3]);
        globalThis.__renderTasks[renderTaskId].progress = Math.min(95, secs * 2);
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      lastError += text;
      // FFmpeg outputs progress to stderr
      const timeMatch = text.match(/time=(\d{2}):(\d{2}):(\d{2})/);
      if (timeMatch) {
        const elapsed = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
        globalThis.__renderTasks[renderTaskId].progress = Math.min(95, elapsed * 2);
      }
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        const sizeBytes = fs.statSync(outputPath).size;
        globalThis.__renderTasks[renderTaskId].status = 'completed';
        globalThis.__renderTasks[renderTaskId].progress = 100;
        globalThis.__renderTasks[renderTaskId].outputPath = outputPath;
        globalThis.__renderTasks[renderTaskId].outputUrl = `/api/download/${path.basename(outputPath)}`;
        globalThis.__renderTasks[renderTaskId].fileSize = (sizeBytes / 1024 / 1024).toFixed(1) + ' MB';
        console.log(`[Render] ✅ Completed: ${path.basename(outputPath)} (${(sizeBytes / 1024 / 1024).toFixed(1)} MB)`);
      } else {
        globalThis.__renderTasks[renderTaskId].status = 'failed';
        // Provide useful error message
        const errMsg = lastError.split('\n').filter(l => l.trim() && !l.includes('frame=') && !l.includes('size=')).slice(-5).join('\n');
        globalThis.__renderTasks[renderTaskId].error = errMsg || lastOutput.slice(-500) || `Process exited with code ${code}`;
        console.error(`[Render] ❌ Failed (code ${code})`);
        console.error(errMsg.slice(0, 500));
      }
    });

    return NextResponse.json({ taskId: renderTaskId, message: 'Render started' });
  } catch (err) {
    console.error('[Render] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: Check render progress
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId');

  if (!taskId || !globalThis.__renderTasks?.[taskId]) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json(globalThis.__renderTasks[taskId]);
}

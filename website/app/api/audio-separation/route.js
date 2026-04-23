import { NextResponse } from 'next/server';
import path from 'path';
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { spawn } from 'child_process';
import { getTaskDir, loadTask, saveTask } from '../../../lib/taskStore.js';

const rootDir = path.join(process.cwd(), '..');

const DEFAULT_PROFILE = 'model_bs_roformer_ep_317_sdr_12.9755.ckpt';

function resolveTaskVideo(taskId, task) {
  const taskDir = getTaskDir(taskId);
  const candidates = [
    task?.filepath,
    task?.videoUrl ? path.join(rootDir, 'uploads', path.basename(task.videoUrl)) : null,
    task?.videoUrl ? path.join(taskDir, path.basename(task.videoUrl)) : null,
    taskId ? path.join(taskDir, `${taskId}.mp4`) : null,
    taskId ? path.join(rootDir, 'uploads', `${taskId}.mp4`) : null,
    taskId ? path.join(rootDir, `${taskId}.mp4`) : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveFfmpegBinary() {
  const bundled = path.join(rootDir, 'ffmpeg.exe');
  return existsSync(bundled) ? bundled : 'ffmpeg';
}

function resolveSeparatorBinary() {
  const localEnvBinary = path.join(rootDir, 'env', 'Scripts', 'audio-separator.exe');
  if (existsSync(localEnvBinary)) {
    return localEnvBinary;
  }

  return process.env.AUDIO_SEPARATOR_BIN || 'audio-separator';
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || rootDir,
      env: { ...process.env, ...(options.env || {}) },
      shell: true,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      options.onStdout?.(text);
    });

    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      options.onStderr?.(text);
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error((stderr || stdout || `Process exited with code ${code}`).trim()));
      }
    });
  });
}

function findStemFile(taskId, matcher) {
  const separatedDir = path.join(getTaskDir(taskId), 'separated');
  if (!existsSync(separatedDir)) return null;

  const files = readdirSync(separatedDir)
    .map((name) => path.join(separatedDir, name))
    .filter((filePath) => statSync(filePath).isFile())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  return files.find((filePath) => matcher(path.basename(filePath).toLowerCase())) || null;
}

function buildTaskAudioUrl(taskId, filePath) {
  return `/api/task-audio/${taskId}/${encodeURIComponent(path.basename(filePath))}`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const taskId = body.taskId;
    const profile = body.profile || DEFAULT_PROFILE;
    const force = body.force === true;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 });
    }

    const task = loadTask(taskId);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const cachedVocalsOk = task.separationVocalsFile && existsSync(task.separationVocalsFile);
    const cachedInstrumentalOk = task.separationInstrumentalFile && existsSync(task.separationInstrumentalFile);
    const sameProfile = (task.separationProfile || DEFAULT_PROFILE) === profile;

    if (!force && sameProfile && task.separationStatus === 'completed' && (cachedVocalsOk || cachedInstrumentalOk)) {
      return NextResponse.json({
        status: 'completed',
        taskId,
        message: task.separationMessage || 'Audio da duoc tach truoc do.',
        vocalsUrl: task.separationVocalsUrl || null,
        instrumentalUrl: task.separationInstrumentalUrl || null,
        cached: true,
      });
    }

    if (!force && sameProfile && task.separationStatus === 'processing') {
      return NextResponse.json({
        status: 'processing',
        taskId,
        message: task.separationMessage || 'Audio dang duoc tach.',
      }, { status: 202 });
    }

    const taskDir = getTaskDir(taskId);
    const separatedDir = path.join(taskDir, 'separated');
    if (!existsSync(separatedDir)) {
      mkdirSync(separatedDir, { recursive: true });
    }

    const fullVideoPath = resolveTaskVideo(taskId, task);
    if (!fullVideoPath) {
      return NextResponse.json({ error: 'Video source not found for this task' }, { status: 400 });
    }

    const sourceAudioPath = path.join(taskDir, 'source_audio.wav');
    const ffmpegBinary = resolveFfmpegBinary();
    const separatorBinary = resolveSeparatorBinary();

    saveTask(taskId, {
      separationStatus: 'processing',
      separationProgress: 2,
      separationMessage: 'Dang chuan bi audio nguon...',
      separationProfile: profile,
      separationRequestedAt: new Date().toISOString(),
    });

    if (force || !existsSync(sourceAudioPath)) {
      await runProcess(ffmpegBinary, [
        '-y',
        '-i',
        fullVideoPath,
        '-vn',
        '-acodec',
        'pcm_s16le',
        '-ar',
        '44100',
        '-ac',
        '2',
        sourceAudioPath,
      ]);
    }

    saveTask(taskId, {
      separationStatus: 'processing',
      separationProgress: 15,
      separationMessage: 'Dang tach vocals va instrumental...',
      separationProfile: profile,
    });

    const cliArgs = [
      sourceAudioPath,
      '--output_dir',
      separatedDir,
      '--output_format',
      'WAV',
    ];

    if (profile.startsWith('preset:')) {
      cliArgs.push('--ensemble_preset', profile.slice('preset:'.length));
    } else {
      cliArgs.push('--model_filename', profile);
    }

    runProcess(separatorBinary, cliArgs, {
      onStdout: (text) => {
        if (text.toLowerCase().includes('download')) {
          saveTask(taskId, {
            separationStatus: 'processing',
            separationProgress: 30,
            separationMessage: 'Dang tai model tach stem...',
          });
        } else if (text.toLowerCase().includes('separat')) {
          saveTask(taskId, {
            separationStatus: 'processing',
            separationProgress: 70,
            separationMessage: 'Model dang xu ly audio...',
          });
        }
      },
    })
      .then(() => {
        const vocalsPath =
          findStemFile(taskId, (name) => name.includes('vocals') || name.includes('vocal')) ||
          findStemFile(taskId, (name) => name.includes('voice'));
        const instrumentalPath =
          findStemFile(taskId, (name) => name.includes('instrumental')) ||
          findStemFile(taskId, (name) => name.includes('karaoke')) ||
          findStemFile(taskId, (name) => name.includes('no_vocals'));

        if (!vocalsPath && !instrumentalPath) {
          saveTask(taskId, {
            separationStatus: 'error',
            separationProgress: 0,
            separationMessage: 'Khong tim thay stem dau ra sau khi xu ly.',
            separationUpdatedAt: new Date().toISOString(),
          });
          return;
        }

        saveTask(taskId, {
          separationStatus: 'completed',
          separationProgress: 100,
          separationMessage: 'Tach audio hoan thanh.',
          separationProfile: profile,
          separationVocalsFile: vocalsPath,
          separationInstrumentalFile: instrumentalPath,
          separationVocalsUrl: vocalsPath ? buildTaskAudioUrl(taskId, vocalsPath) : null,
          separationInstrumentalUrl: instrumentalPath ? buildTaskAudioUrl(taskId, instrumentalPath) : null,
          separationUpdatedAt: new Date().toISOString(),
        });
      })
      .catch((error) => {
        saveTask(taskId, {
          separationStatus: 'error',
          separationProgress: 0,
          separationMessage: `Tach audio that bai: ${error.message.slice(0, 400)}`,
          separationUpdatedAt: new Date().toISOString(),
        });
      });

    return NextResponse.json(
      {
        status: 'processing',
        taskId,
        message: 'Dang tach audio bang UVR/Demucs models...',
      },
      { status: 202 },
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 });
  }

  const task = loadTask(taskId);
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: task.separationStatus || 'idle',
    progress: task.separationProgress || 0,
    message: task.separationMessage || '',
    profile: task.separationProfile || null,
    vocalsUrl: task.separationVocalsUrl || null,
    instrumentalUrl: task.separationInstrumentalUrl || null,
    vocalsFile: task.separationVocalsFile || null,
    instrumentalFile: task.separationInstrumentalFile || null,
  });
}

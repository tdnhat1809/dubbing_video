import { NextResponse } from 'next/server';
import path from 'path';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { getTaskDir, loadTask, saveTask } from '../../../lib/taskStore.js';

function formatSubtitleTime(value) {
  if (!value) return '00:00:00,000';

  const parts = String(value).split(':');
  const h = String(parts[0] || '0').padStart(2, '0');
  const m = String(parts[1] || '0').padStart(2, '0');
  const sAndMs = String(parts[2] || '0').split(/[.,]/);
  const s = String(sAndMs[0] || '0').padStart(2, '0');
  let ms = String(sAndMs[1] || '0');

  if (ms.length === 1) ms += '00';
  else if (ms.length === 2) ms += '0';
  else ms = ms.substring(0, 3);

  return `${h}:${m}:${s},${ms}`;
}

function buildSrt(subtitles = []) {
  return subtitles
    .map((sub, index) => {
      const text = sub.translation || sub.original || '';
      return `${index + 1}\n${formatSubtitleTime(sub.start)} --> ${formatSubtitleTime(sub.end)}\n${text}`;
    })
    .join('\n\n');
}

function buildStartMessage(engine) {
  if (engine === 'edge') return 'Dang khoi tao Edge TTS...';
  if (engine === 'capcut') return 'Dang khoi tao CapCut TTS...';
  if (engine === 'valtec') return 'Dang khoi tao Valtec TTS...';
  return 'Dang khoi tao OmniVoice...';
}

function buildQueuedMessage(engine) {
  if (engine === 'edge') return 'Dang tao long tieng Edge TTS...';
  if (engine === 'capcut') return 'Dang tao long tieng CapCut TTS...';
  if (engine === 'valtec') return 'Dang tao long tieng Valtec...';
  return 'Dang tao long tieng OmniVoice...';
}

function saveParentVoiceoverState(taskId, data) {
  if (!taskId) return;
  saveTask(taskId, data);
}

function resolveReferenceAudio(rootDir, taskId, rawPath) {
  if (!rawPath) return null;

  const basename = path.basename(String(rawPath));
  const candidates = [
    path.isAbsolute(rawPath) ? rawPath : null,
    path.join(rootDir, basename),
    path.join(rootDir, 'uploads', basename),
    taskId ? path.join(getTaskDir(taskId), basename) : null,
    taskId ? path.join(getTaskDir(taskId), 'separated', basename) : null,
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) || null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      taskId,
      subtitles,
      refAudioPath,
      speed,
      language,
      voiceType,
      engine,
      edgeVoice,
      capcutVoiceType,
      capcutVoiceId,
      omnivoiceModel,
      valtecVoice,
    } = body;

    const rootDir = path.join(process.cwd(), '..');
    const uploadsDir = path.join(rootDir, 'uploads');
    const taskDir = taskId ? getTaskDir(taskId) : null;

    if (taskDir && !existsSync(taskDir)) {
      mkdirSync(taskDir, { recursive: true });
    }

    const omniVoiceModels = {
      default: {
        label: 'OmniVoice mac dinh',
        model: 'k2-fsa/OmniVoice',
      },
      ngochuyen_ft_3000: {
        label: 'Ngoc Huyen FT 3000',
        model: path.join(rootDir, 'ngochuyen_checkpoint3000', 'model.safetensors'),
      },
    };

    let srtPath;
    if (subtitles && subtitles.length > 0) {
      srtPath = taskDir
        ? path.join(taskDir, 'voiceover.srt')
        : path.join(rootDir, `voiceover_${taskId || 'temp'}.srt`);
      writeFileSync(srtPath, buildSrt(subtitles), 'utf-8');
    } else {
      srtPath = path.join(rootDir, 'text_ocr_vi.srt');
      if (!existsSync(srtPath)) {
        return NextResponse.json({ error: 'No subtitles provided and no SRT file found' }, { status: 400 });
      }
    }

    const ttsEngine = engine || 'edge';
    const isEdge = ttsEngine === 'edge';
    const isCapcut = ttsEngine === 'capcut';
    const isValtec = ttsEngine === 'valtec';
    const selectedOmniVoiceModel = omniVoiceModels[omnivoiceModel] || omniVoiceModels.default;

    if (!isEdge && !isCapcut && !isValtec) {
      const customModelPath = selectedOmniVoiceModel.model;
      const isLocalOmniVoiceModel = customModelPath.endsWith('.safetensors') || path.isAbsolute(customModelPath);
      if (isLocalOmniVoiceModel && !existsSync(customModelPath)) {
        return NextResponse.json({ error: `Khong tim thay model OmniVoice: ${selectedOmniVoiceModel.label}` }, { status: 400 });
      }
    }

    const parentTask = taskId ? loadTask(taskId) : null;
    let refAudio = null;
    if ((!isEdge && !isCapcut && !isValtec && voiceType === 'clone') || (isValtec && valtecVoice === '__clone__')) {
      refAudio = resolveReferenceAudio(rootDir, taskId, refAudioPath);
      if ((!refAudio || !existsSync(refAudio)) && parentTask?.separationVocalsFile && existsSync(parentTask.separationVocalsFile)) {
        refAudio = parentTask.separationVocalsFile;
      }
      if ((!refAudio || !existsSync(refAudio)) && parentTask?.separationVocalsUrl) {
        refAudio = resolveReferenceAudio(rootDir, taskId, parentTask.separationVocalsUrl);
      }
      if (!refAudio || !existsSync(refAudio)) {
        refAudio = path.join(rootDir, '2_out (mp3cut.net).wav');
        if (!existsSync(refAudio)) {
          const { readdirSync } = await import('fs');
          const wavFiles = readdirSync(uploadsDir).filter((file) => file.endsWith('.wav'));
          if (wavFiles.length > 0) {
            refAudio = path.join(uploadsDir, wavFiles[0]);
          } else {
            return NextResponse.json({ error: 'Voice clone yeu cau file tham chieu .wav.' }, { status: 400 });
          }
        }
      }
    }

    const voiceTaskId = taskId ? `voice_${taskId}` : `voice_${Date.now()}`;
    const outputFilename = taskId ? `voiceover_${taskId}.wav` : `voiceover_${voiceTaskId}.wav`;
    const outputFile = path.join(rootDir, outputFilename);
    const audioUrl = `/api/audio/${outputFilename}`;
    const startMessage = buildStartMessage(ttsEngine);

    globalThis.__tasks = globalThis.__tasks || {};
    globalThis.__tasks[voiceTaskId] = {
      id: voiceTaskId,
      type: 'voiceover',
      status: 'dubbing',
      progress: 0,
      message: startMessage,
      createdAt: new Date().toISOString(),
      srtPath,
      refAudio,
      outputFile,
      parentTaskId: taskId,
      engine: ttsEngine,
      model: selectedOmniVoiceModel.label,
    };

    saveParentVoiceoverState(taskId, {
      voiceoverTaskId: voiceTaskId,
      voiceoverStatus: 'processing',
      voiceoverProgress: 0,
      voiceoverMessage: startMessage,
      voiceoverEngine: ttsEngine,
      voiceoverModel: selectedOmniVoiceModel.label,
      voiceoverRequestedAt: new Date().toISOString(),
    });

    const { exec } = await import('child_process');
    let cmd;

    if (isEdge) {
      const pythonScript = path.join(rootDir, 'generate_voiceover_edge.py');
      const speedArg = speed && speed !== 1.0 ? ` --speed ${speed}` : '';
      const langArg = language ? ` --language "${language}"` : '';
      const genderArg = voiceType === 'male' ? ' --gender male' : ' --gender female';
      const voiceArg = edgeVoice ? ` --voice "${edgeVoice}"` : '';
      cmd = `python "${pythonScript}" --srt "${srtPath}"${voiceArg || (genderArg + langArg)} --output "${outputFile}"${speedArg}`;
    } else if (isCapcut) {
      const pythonScript = path.join(rootDir, 'generate_voiceover_capcut.py');
      const vtArg = capcutVoiceType !== undefined ? ` --voice-type ${capcutVoiceType}` : ' --voice-type 14';
      const vidArg = capcutVoiceId ? ` --voice-id "${capcutVoiceId}"` : '';
      const speedArg = speed && speed !== 1.0 ? ` --speed ${Math.round(speed * 10)}` : '';
      cmd = `python "${pythonScript}" --srt "${srtPath}"${vtArg}${vidArg} --output "${outputFile}"${speedArg}`;
    } else if (isValtec) {
      const pythonScript = path.join(rootDir, 'generate_voiceover_valtec.py');
      const isClone = valtecVoice === '__clone__' && refAudio;
      const voiceFileArg = isClone ? ` --ref-audio "${refAudio}"` : (valtecVoice ? ` --voice "${valtecVoice}"` : ' --voice "Vietnam_hoa-mai (woman).pt"');
      const speedArg = speed && speed !== 1.0 ? ` --speed ${speed}` : '';
      cmd = `python "${pythonScript}" --srt "${srtPath}"${voiceFileArg} --output "${outputFile}"${speedArg}`;
    } else {
      const pythonScript = path.join(rootDir, 'generate_voiceover.py');
      const speedArg = speed && speed !== 1.0 ? ` --speed ${speed}` : '';
      const refArg = refAudio ? ` --ref "${refAudio}"` : '';
      const voiceArg = !refAudio ? ` --voice ${voiceType === 'male' ? 'male' : 'female'}` : '';
      const modelArg = selectedOmniVoiceModel?.model ? ` --model "${selectedOmniVoiceModel.model}"` : '';
      cmd = `python "${pythonScript}" --srt "${srtPath}"${refArg}${voiceArg}${modelArg} --output "${outputFile}"${speedArg}`;
    }

    console.log(`[Voiceover] Starting (${ttsEngine}): ${cmd}`);

    const child = exec(cmd, {
      cwd: rootDir,
      timeout: 3600000,
      maxBuffer: 50 * 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let lastOutput = '';
    let lastError = '';

    child.stdout?.on('data', (data) => {
      const line = data.toString();
      lastOutput = line.trim();

      const match = line.match(/\[(\d+)\/(\d+)\]/);
      if (match) {
        const current = parseInt(match[1], 10);
        const total = parseInt(match[2], 10);
        const pct = Math.round((current / total) * 100);
        globalThis.__tasks[voiceTaskId].progress = pct;
        globalThis.__tasks[voiceTaskId].message = `Dang tao giong noi... (${current}/${total})`;
      }

      if (line.includes('Generating')) {
        globalThis.__tasks[voiceTaskId].message = 'Dang tao clips Edge TTS...';
        globalThis.__tasks[voiceTaskId].progress = 10;
      }
      if (line.includes('Combining')) {
        globalThis.__tasks[voiceTaskId].message = 'Dang ghep audio timeline...';
        globalThis.__tasks[voiceTaskId].progress = 95;
      }
      if (line.includes('Loading OmniVoice')) {
        globalThis.__tasks[voiceTaskId].message = 'Dang tai model OmniVoice...';
        globalThis.__tasks[voiceTaskId].progress = 5;
      }
      if (line.includes('Voice clone prompt ready')) {
        globalThis.__tasks[voiceTaskId].message = 'Da clone giong noi, bat dau tao audio...';
        globalThis.__tasks[voiceTaskId].progress = 10;
      }
      if (line.includes('CAPCUT TTS')) {
        globalThis.__tasks[voiceTaskId].message = 'Khoi tao CapCut TTS...';
        globalThis.__tasks[voiceTaskId].progress = 5;
      }
      if (line.includes('Combining into timeline')) {
        globalThis.__tasks[voiceTaskId].message = 'Dang ghep audio CapCut...';
        globalThis.__tasks[voiceTaskId].progress = 90;
      }
      if (line.includes('VALTEC')) {
        globalThis.__tasks[voiceTaskId].message = 'Khoi tao Valtec TTS...';
        globalThis.__tasks[voiceTaskId].progress = 5;
      }
      if (line.includes('Loading Valtec') || line.includes('Loading voice embedding')) {
        globalThis.__tasks[voiceTaskId].message = 'Dang tai model Valtec...';
        globalThis.__tasks[voiceTaskId].progress = 8;
      }
      if (line.includes('Falling back to Edge TTS')) {
        globalThis.__tasks[voiceTaskId].message = 'Valtec fallback -> Edge TTS...';
        globalThis.__tasks[voiceTaskId].progress = 10;
      }
    });

    child.stderr?.on('data', (data) => {
      const line = data.toString();
      lastError = line.trim();
      if (!line.includes('UserWarning') && !line.includes('FutureWarning')) {
        console.log(`[Voiceover stderr] ${line.trim()}`);
      }
    });

    child.on('close', (code) => {
      if (code === 0 && existsSync(outputFile)) {
        globalThis.__tasks[voiceTaskId].status = 'completed';
        globalThis.__tasks[voiceTaskId].progress = 100;
        globalThis.__tasks[voiceTaskId].message = 'Long tieng hoan thanh!';
        globalThis.__tasks[voiceTaskId].audioUrl = audioUrl;

        const taskAudioCopy = taskDir ? path.join(taskDir, 'dubbed_audio.wav') : null;
        if (taskAudioCopy) {
          try {
            copyFileSync(outputFile, taskAudioCopy);
          } catch (copyErr) {
            console.warn(`[Voiceover] Could not copy task audio: ${copyErr.message}`);
          }
        }

        saveParentVoiceoverState(taskId, {
          audioUrl,
          voiceoverPath: outputFilename,
          voiceoverTaskId: voiceTaskId,
          voiceoverStatus: 'completed',
          voiceoverProgress: 100,
          voiceoverMessage: 'Long tieng hoan thanh!',
          voiceoverEngine: ttsEngine,
          voiceoverModel: selectedOmniVoiceModel.label,
          dubbedAudioPath: taskAudioCopy || outputFile,
          voiceoverUpdatedAt: new Date().toISOString(),
        });

        console.log(`[Voiceover] Completed: ${outputFile}`);
      } else {
        const errDetail = (lastError || lastOutput || 'Unknown error').substring(0, 200);
        const errorMessage = `Long tieng that bai (code ${code}): ${errDetail}`;
        globalThis.__tasks[voiceTaskId].status = 'error';
        globalThis.__tasks[voiceTaskId].message = errorMessage;

        saveParentVoiceoverState(taskId, {
          voiceoverTaskId: voiceTaskId,
          voiceoverStatus: 'error',
          voiceoverMessage: errorMessage,
          voiceoverUpdatedAt: new Date().toISOString(),
        });

        console.error(`[Voiceover] Failed with code ${code}`);
      }
    });

    child.on('error', (err) => {
      const errorMessage = `Loi: ${err.message}`;
      globalThis.__tasks[voiceTaskId].status = 'error';
      globalThis.__tasks[voiceTaskId].message = errorMessage;

      saveParentVoiceoverState(taskId, {
        voiceoverTaskId: voiceTaskId,
        voiceoverStatus: 'error',
        voiceoverMessage: errorMessage,
        voiceoverUpdatedAt: new Date().toISOString(),
      });
    });

    return NextResponse.json(
      {
        status: 'processing',
        taskId: voiceTaskId,
        message: buildQueuedMessage(ttsEngine),
      },
      { status: 202 },
    );
  } catch (err) {
    console.error('Voiceover error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 });
  }

  const task = globalThis.__tasks?.[taskId];
  if (task) {
    return NextResponse.json({
      status: task.status,
      progress: task.progress,
      message: task.message,
      audioUrl: task.audioUrl,
    });
  }

  if (taskId.startsWith('voice_')) {
    const parentTaskId = taskId.slice('voice_'.length);
    const parentTask = loadTask(parentTaskId);

    if (parentTask?.voiceoverTaskId === taskId || parentTask?.audioUrl) {
      return NextResponse.json({
        status: parentTask?.voiceoverStatus || (parentTask?.audioUrl ? 'completed' : 'processing'),
        progress: parentTask?.voiceoverProgress ?? (parentTask?.audioUrl ? 100 : 0),
        message: parentTask?.voiceoverMessage || (parentTask?.audioUrl ? 'Long tieng hoan thanh!' : ''),
        audioUrl: parentTask?.audioUrl || null,
      });
    }
  }

  return NextResponse.json({ error: 'Task not found' }, { status: 404 });
}

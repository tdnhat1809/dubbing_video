import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);
const CAPCUT_MATE_BASE = process.env.CAPCUT_MATE_URL || 'http://localhost:30000';
const PREPROCESS_DIR = path.join(process.cwd(), 'public', 'preprocessed');

// Store render tasks
if (!globalThis.__capcutRenderTasks) globalThis.__capcutRenderTasks = {};

async function capcutPost(endpoint, body) {
  const url = `${CAPCUT_MATE_BASE}/openapi/capcut-mate/v1${endpoint}`;
  console.log(`[CapCut] POST ${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CapCut API error (${res.status}): ${err}`);
  }
  return res.json();
}

function parseTimeToSeconds(timeStr) {
  if (typeof timeStr === 'number') return timeStr;
  if (!timeStr) return 0;
  const parts = timeStr.replace(',', '.').split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return parseFloat(timeStr) || 0;
}

/**
 * Pre-blur video using FFmpeg (bottom/top strip)
 * Returns the URL of the blurred video
 */
async function preBlurVideo(videoPath, { blurRegion = 'bottom', blurHeight = 15, blurIntensity = 20, taskId = '' }) {
  // Ensure preprocess directory exists
  if (!fs.existsSync(PREPROCESS_DIR)) {
    fs.mkdirSync(PREPROCESS_DIR, { recursive: true });
  }

  // Resolve input path
  let inputPath;
  if (videoPath.startsWith('http://') || videoPath.startsWith('https://')) {
    // Remote URL - download first
    const tempName = `input_${taskId || Date.now()}.mp4`;
    const tempPath = path.join(PREPROCESS_DIR, tempName);
    console.log(`[CapCut] Downloading video from: ${videoPath}`);
    const downloadCmd = `ffmpeg -y -i "${videoPath}" -c copy "${tempPath}"`;
    await execAsync(downloadCmd, { timeout: 120000 });
    inputPath = tempPath;
  } else if (videoPath.startsWith('/')) {
    const publicPath = path.join(process.cwd(), 'public', videoPath);
    inputPath = fs.existsSync(publicPath) ? publicPath : videoPath;
  } else {
    inputPath = path.join(process.cwd(), 'public', videoPath);
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Video not found for blur: ${inputPath}`);
  }

  const outputName = `blurred_${taskId || Date.now()}.mp4`;
  const outputPath = path.join(PREPROCESS_DIR, outputName);

  // Build FFmpeg filter
  const heightFrac = (blurHeight / 100).toFixed(4);
  const startFrac = blurRegion === 'bottom' ? (1 - blurHeight / 100).toFixed(4) : '0';
  const blurRadius = Math.max(5, Math.min(50, blurIntensity));

  const filter = blurRegion === 'bottom'
    ? `split[main][blur];[blur]crop=iw:ih*${heightFrac}:0:ih*${startFrac},boxblur=${blurRadius}:${blurRadius}[blurred];[main][blurred]overlay=0:H*${startFrac}`
    : `split[main][blur];[blur]crop=iw:ih*${heightFrac}:0:0,boxblur=${blurRadius}:${blurRadius}[blurred];[main][blurred]overlay=0:0`;

  const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -vf "${filter}" -c:a copy -movflags +faststart "${outputPath}"`;
  console.log(`[CapCut] Pre-blur FFmpeg: ${ffmpegCmd}`);

  await execAsync(ffmpegCmd, { timeout: 300000 });

  if (!fs.existsSync(outputPath)) {
    throw new Error('FFmpeg pre-blur failed');
  }

  console.log(`[CapCut] Pre-blurred video: ${outputPath}`);
  return {
    localPath: outputPath,
    localUrl: `/preprocessed/${outputName}`,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      videoUrl,
      videoDuration,
      subtitles = [],
      voiceoverUrl,
      bgmUrl,
      settings = {},
      width = 1920,
      height = 1080,
      // Blur settings (from editor)
      blurEnabled = true,
      blurRegion = 'bottom',
      blurHeight = 15,
      blurWidth = 100,
      blurIntensity = 15,
      // Subtitle style
      subColor = '#000000',
      subBg = '#ffffff',
      subBgOpacity = 85,
      // Logo
      logoPath = null,
      logoX = 10,
      logoY = 10,
      logoSize = 80,
    } = body;

    const taskId = `capcut-${Date.now()}`;
    globalThis.__capcutRenderTasks[taskId] = {
      status: 'processing',
      progress: 0,
      message: 'Khởi tạo...',
    };

    // Async render pipeline
    (async () => {
      try {
        const update = (msg, pct) => {
          globalThis.__capcutRenderTasks[taskId] = { status: 'processing', progress: pct, message: msg };
        };

        const makeAbsoluteUrl = (url) => {
          if (!url) return url;
          if (url.startsWith('http://') || url.startsWith('https://')) return url;
          return `http://127.0.0.1:3000${url.startsWith('/') ? url : '/' + url}`;
        };

        let finalVideoUrl = makeAbsoluteUrl(videoUrl);

        // ═══════ STEP 0: Pre-blur video if enabled ═══════
        if (blurEnabled && blurHeight > 0) {
          update('Đang blur vùng phụ đề gốc...', 3);
          try {
            const blurResult = await preBlurVideo(videoUrl, {
              blurRegion,
              blurHeight,
              blurIntensity,
              taskId,
            });
            // Use blurred video URL instead of original
            finalVideoUrl = makeAbsoluteUrl(blurResult.localUrl);
            console.log(`[CapCut] Using pre-blurred video: ${finalVideoUrl}`);
          } catch (blurError) {
            console.warn(`[CapCut] Pre-blur failed, using original: ${blurError.message}`);
            // Continue with non-blurred video if blur fails
          }
        }

        // ═══════ STEP 1: Create draft ═══════
        update('Tạo dự án CapCut...', 10);
        const draft = await capcutPost('/create_draft', { width, height });
        const draftUrl = draft.draft_url;

        // ═══════ STEP 2: Add video ═══════
        update('Thêm video...', 15);
        const durationUs = Math.round(videoDuration * 1_000_000);
        await capcutPost('/add_videos', {
          draft_url: draftUrl,
          video_infos: JSON.stringify([{
            video_url: finalVideoUrl,
            start: 0,
            end: durationUs,
            duration: durationUs,
          }]),
        });

        // ═══════ STEP 3: Add captions with correct position ═══════
        if (subtitles.length > 0) {
          update('Thêm phụ đề...', 30);
          const captions = subtitles.map(sub => ({
            start: Math.round(parseTimeToSeconds(sub.start) * 1_000_000),
            end: Math.round(parseTimeToSeconds(sub.end) * 1_000_000),
            text: sub.translation || sub.original || '',
          }));

          // Calculate subtitle transform_y to match preview position
          // In CapCut: transform_y is relative to canvas center (0 = center, +height/2 = bottom)
          // In preview: subtitle sits at center of blur zone
          // blur zone at bottom: center Y = (1 - blurHeight/200) * height
          // transform_y for CapCut = ((1 - blurHeight/200) - 0.5) * height
          let transformY;
          if (blurEnabled && blurHeight > 0) {
            if (blurRegion === 'bottom') {
              // Position subtitle at center of bottom blur zone
              // center_ratio = 1 - blurHeight/200 (e.g., blurHeight=15 → 0.925)
              // transform_y = (center_ratio - 0.5) * height
              const centerRatio = 1 - (blurHeight / 200);
              transformY = Math.round((centerRatio - 0.5) * height);
            } else {
              // Position subtitle at center of top blur zone
              const centerRatio = blurHeight / 200;
              transformY = Math.round((centerRatio - 0.5) * height);
            }
          } else {
            // No blur: place subtitle at bottom 10%
            transformY = Math.round(0.4 * height);
          }

          // Determine text color from settings
          const textColor = settings.textColor || subColor || '#000000';
          const borderColor = settings.borderColor || null;

          await capcutPost('/add_captions', {
            draft_url: draftUrl,
            captions: JSON.stringify(captions),
            text_color: textColor,
            border_color: borderColor,
            font: settings.fontFamily || null,
            font_size: settings.fontSize ? Math.round(settings.fontSize / 6) : 15,
            alignment: 1,
            alpha: 1.0,
            transform_y: transformY,
            bold: true,
            has_shadow: true,
            shadow_info: {
              shadow_color: '#000000',
              shadow_alpha: 0.5,
              shadow_diffuse: 8.0,
              shadow_distance: 2.0,
              shadow_angle: -45.0,
            },
          });
          console.log(`[CapCut] Captions added with transform_y=${transformY} (blurHeight=${blurHeight}, region=${blurRegion})`);
        }

        // ═══════ STEP 4: Add voiceover ═══════
        if (voiceoverUrl) {
          update('Thêm lồng tiếng...', 45);
          const absoluteVoiceoverUrl = makeAbsoluteUrl(voiceoverUrl);
          await capcutPost('/add_audios', {
            draft_url: draftUrl,
            audio_infos: JSON.stringify([{
              audio_url: absoluteVoiceoverUrl,
              start: 0,
              end: durationUs,
              duration: durationUs,
              volume: 1.0,
            }]),
          });
        }

        // ═══════ STEP 5: Add BGM ═══════
        if (bgmUrl) {
          update('Thêm nhạc nền...', 50);
          const absoluteBgmUrl = makeAbsoluteUrl(bgmUrl);
          await capcutPost('/add_audios', {
            draft_url: draftUrl,
            audio_infos: JSON.stringify([{
              audio_url: absoluteBgmUrl,
              start: 0,
              end: durationUs,
              duration: durationUs,
              volume: 0.3,
            }]),
          });
        }

        // ═══════ STEP 6: Save & Generate ═══════
        update('Lưu dự án...', 55);
        await capcutPost('/save_draft', { draft_url: draftUrl });

        update('Bắt đầu render video...', 60);
        await capcutPost('/gen_video', { draft_url: draftUrl });

        // ═══════ STEP 7: Poll for completion ═══════
        let pollCount = 0;
        while (pollCount < 600) { // 10 minutes max
          await new Promise(r => setTimeout(r, 2000));
          try {
            const status = await capcutPost('/gen_video_status', { draft_url: draftUrl });
            const progress = 60 + (status.progress || 0) * 0.4;
            update(`Đang render... ${status.progress || 0}%`, Math.round(progress));
            
            if (status.status === 'completed') {
              // Clean up pre-blur temp file
              try {
                const preBlurFile = path.join(PREPROCESS_DIR, `blurred_${taskId}.mp4`);
                if (fs.existsSync(preBlurFile)) fs.unlinkSync(preBlurFile);
              } catch (e) { /* ignore cleanup errors */ }

              globalThis.__capcutRenderTasks[taskId] = {
                status: 'completed', progress: 100, message: 'Hoàn thành!',
                videoUrl: status.video_url || '', draftUrl,
              };
              return;
            }
            if (status.status === 'failed') {
              throw new Error(status.error_message || 'CapCut render failed');
            }
          } catch (e) {
            if (e.message.includes('failed') || e.message.includes('CapCut')) throw e;
          }
          pollCount++;
        }
        throw new Error('Render timeout');
      } catch (error) {
        console.error('[CapCut Render] Error:', error);
        globalThis.__capcutRenderTasks[taskId] = {
          status: 'failed', progress: 0, message: error.message, error: error.message,
        };
      }
    })();

    return NextResponse.json({ taskId, status: 'processing' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const action = searchParams.get('action');

  if (action === 'health') {
    try {
      const res = await fetch(`${CAPCUT_MATE_BASE}/openapi/capcut-mate/v1/str_to_list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ str: 'health' }),
        signal: AbortSignal.timeout(5000),
      });
      return NextResponse.json({ available: res.ok, url: CAPCUT_MATE_BASE });
    } catch {
      return NextResponse.json({ available: false, url: CAPCUT_MATE_BASE });
    }
  }

  if (taskId && globalThis.__capcutRenderTasks?.[taskId]) {
    return NextResponse.json(globalThis.__capcutRenderTasks[taskId]);
  }

  return NextResponse.json({ error: 'Task not found' }, { status: 404 });
}

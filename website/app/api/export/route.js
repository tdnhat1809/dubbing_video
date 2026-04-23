import { NextResponse } from 'next/server';
import path from 'path';

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, resolution, framerate, codec, bitrate, format, taskId } = body;

    const ffmpegPath = path.join(process.cwd(), '..', 'ffmpeg.exe');
    const { exec } = await import('child_process');

    // Determine input files
    const task = globalThis.__tasks?.[taskId];
    const videoPath = task?.filepath || path.join(process.cwd(), '..', '1.mp4');
    const srtPath = path.join(process.cwd(), '..', 'text_ocr_vi.srt');
    const audioPath = path.join(process.cwd(), '..', 'voiceover_combined.wav');
    
    const outputDir = path.join(process.cwd(), '..', 'exports');
    const { existsSync } = await import('fs');
    const { mkdir } = await import('fs/promises');
    if (!existsSync(outputDir)) await mkdir(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, `${title || 'export'}_${Date.now()}.${(format || 'MP4').toLowerCase()}`);

    // Build ffmpeg command
    const resMap = { '720p': '1280:720', '1080p': '1920:1080', '4K': '3840:2160' };
    const bitrateMap = { 'Thấp': '2M', 'Trung Bình': '5M', 'Cao': '10M' };

    let filters = [];
    if (resolution && resolution !== 'Auto') {
      filters.push(`scale=${resMap[resolution] || '1920:1080'}`);
    }
    
    // Add subtitle burn-in
    const subsFilter = existsSync(srtPath) ? `subtitles='${srtPath.replace(/\\/g, '/')}'` : '';
    if (subsFilter) filters.push(subsFilter);

    const filterStr = filters.length > 0 ? `-vf "${filters.join(',')}"` : '';
    const codecStr = codec === 'H.265' ? '-c:v libx265' : codec === 'VP9' ? '-c:v libvpx-vp9' : '-c:v libx264';
    const brStr = `-b:v ${bitrateMap[bitrate] || '5M'}`;
    const fpsStr = framerate && framerate !== 'Auto' ? `-r ${framerate}` : '';

    // Mix audio if voiceover exists
    const audioInput = existsSync(audioPath) ? `-i "${audioPath}" -filter_complex "[0:a][1:a]amix=inputs=2:duration=first" -c:a aac` : '-c:a copy';
    const audioInputFlag = existsSync(audioPath) ? `-i "${audioPath}"` : '';

    const cmd = `"${ffmpegPath}" -i "${videoPath}" ${audioInputFlag} ${filterStr} ${codecStr} ${brStr} ${fpsStr} -c:a aac -y "${outputFile}"`;

    const exportTaskId = `export_${Date.now()}`;
    globalThis.__tasks = globalThis.__tasks || {};
    globalThis.__tasks[exportTaskId] = {
      id: exportTaskId,
      status: 'exporting',
      progress: 0,
      message: 'Rendering video...',
    };

    const child = exec(cmd, { cwd: path.join(process.cwd(), '..'), timeout: 1800000 });

    child.stderr?.on('data', (data) => {
      const line = data.toString();
      // Parse ffmpeg progress
      const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2})/);
      if (timeMatch) {
        const secs = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
        globalThis.__tasks[exportTaskId].progress = Math.min(Math.round((secs / 120) * 100), 99);
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        globalThis.__tasks[exportTaskId].status = 'completed';
        globalThis.__tasks[exportTaskId].progress = 100;
        globalThis.__tasks[exportTaskId].downloadUrl = `/api/download/${path.basename(outputFile)}`;
        globalThis.__tasks[exportTaskId].message = 'Export completed!';
      } else {
        globalThis.__tasks[exportTaskId].status = 'error';
        globalThis.__tasks[exportTaskId].message = `Export failed (code ${code})`;
      }
    });

    return NextResponse.json({
      status: 'processing',
      taskId: exportTaskId,
      message: 'Export started',
    }, { status: 202 });

  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { listTasks } from '../../../../lib/taskStore.js';
import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import os from 'os';

const rootDir = path.resolve(process.cwd(), '..');

function getDirectorySize(dirPath) {
  let size = 0;
  try {
    const files = readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const fp = path.join(dirPath, file.name);
      if (file.isFile()) {
        try { size += statSync(fp).size; } catch {}
      } else if (file.isDirectory()) {
        size += getDirectorySize(fp);
      }
    }
  } catch {}
  return size;
}

function getRenderedVideos() {
  const dir = path.join(rootDir, 'rendered_videos');
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.mp4'))
      .map(f => {
        const fp = path.join(dir, f);
        const st = statSync(fp);
        return { name: f, size: st.size, createdAt: st.birthtime.toISOString() };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch { return []; }
}

function getSystemInfo() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    platform: os.platform(),
    release: os.release(),
    hostname: os.hostname(),
    arch: os.arch(),
    cpuModel: cpus.length > 0 ? cpus[0].model : 'Unknown',
    cpuCores: cpus.length,
    totalMemGB: (totalMem / (1024 ** 3)).toFixed(1),
    usedMemGB: (usedMem / (1024 ** 3)).toFixed(1),
    memUsagePercent: Math.round((usedMem / totalMem) * 100),
    uptime: Math.round(os.uptime() / 3600), // hours
    nodeVersion: process.version,
  };
}

export async function GET(request) {
  try {
    const tasks = listTasks();
    const renderedVideos = getRenderedVideos();

    // Compute stats from tasks
    let totalVideos = tasks.length;
    let completedVideos = 0;
    let failedVideos = 0;
    let processingVideos = 0;
    let totalTTSChars = 0;
    let totalSubtitleEntries = 0;
    let totalMinutesExtracted = 0;
    let totalStorageBytes = 0;
    let voiceoverCount = 0;

    const languagePairs = {};
    const engineUsage = {};
    const dailyActivity = {};
    const recentActivity = [];

    for (const task of tasks) {
      // Status counts
      if (task.status === 'extracted' || task.status === 'completed' || task.status === 'translated') {
        completedVideos++;
      } else if (task.status === 'error' || task.status === 'failed') {
        failedVideos++;
      } else if (task.status === 'processing' || task.status === 'extracting') {
        processingVideos++;
      }

      // Language pairs
      const src = task.sourceLang || 'Unknown';
      const tgt = task.targetLang || 'Unknown';
      const pair = `${src}→${tgt}`;
      languagePairs[pair] = (languagePairs[pair] || 0) + 1;

      // Engine usage
      const engine = task.engine || 'unknown';
      engineUsage[engine] = (engineUsage[engine] || 0) + 1;

      // Subtitle counting for TTS estimate
      const taskDir = path.join(rootDir, 'tasks', task.id);
      try {
        const subsPath = path.join(taskDir, 'subtitles.json');
        if (existsSync(subsPath)) {
          const subs = JSON.parse(readFileSync(subsPath, 'utf-8'));
          const entries = Array.isArray(subs) ? subs : [];
          totalSubtitleEntries += entries.length;
          for (const sub of entries) {
            const text = sub.translation || sub.original || sub.text || '';
            totalTTSChars += text.length;
          }
        }
      } catch {}

      // Voiceover counting
      if (task.voiceoverStatus === 'completed') voiceoverCount++;

      // Storage
      try { totalStorageBytes += getDirectorySize(taskDir); } catch {}

      // Daily activity
      const day = (task.createdAt || '').split('T')[0];
      if (day) dailyActivity[day] = (dailyActivity[day] || 0) + 1;

      // Recent activity
      recentActivity.push({
        taskId: task.id,
        action: task.status || 'unknown',
        filename: task.filename || task.title || task.id,
        sourceLang: src,
        targetLang: tgt,
        engine: engine,
        userEmail: task.userEmail || null,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        voiceoverStatus: task.voiceoverStatus || null,
        voiceoverEngine: task.voiceoverEngine || null,
      });
    }

    // Rendered videos storage
    let renderedStorageBytes = 0;
    for (const rv of renderedVideos) {
      renderedStorageBytes += rv.size;
    }

    // Build daily chart data (last 30 days)
    const dailyChartData = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyChartData.push({ date: key, count: dailyActivity[key] || 0 });
    }

    // Sort language pairs
    const langPairsSorted = Object.entries(languagePairs)
      .sort((a, b) => b[1] - a[1])
      .map(([pair, count]) => ({ pair, count }));

    // Engine distribution
    const engineDist = Object.entries(engineUsage)
      .sort((a, b) => b[1] - a[1])
      .map(([engine, count]) => ({ engine, count }));

    // System info
    const sysInfo = getSystemInfo();

    return NextResponse.json({
      overview: {
        totalVideos,
        completedVideos,
        failedVideos,
        processingVideos,
        totalTTSChars,
        totalSubtitleEntries,
        voiceoverCount,
        totalMinutesExtracted: Math.round(totalSubtitleEntries * 0.15), // estimate ~9s per subtitle
        totalStorageMB: Math.round(totalStorageBytes / (1024 * 1024)),
        renderedStorageMB: Math.round(renderedStorageBytes / (1024 * 1024)),
        totalRenderedVideos: renderedVideos.length,
      },
      tasks: recentActivity.slice(0, 50),
      renderedVideos: renderedVideos.slice(0, 30),
      charts: {
        dailyActivity: dailyChartData,
        languagePairs: langPairsSorted,
        engineDistribution: engineDist
      },
      systemInfo: sysInfo,
    });
  } catch (err) {
    console.error('[Admin Stats] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { loadTaskSubtitles, saveTaskSubtitles, getTaskDir } from '../../../lib/taskStore.js';

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

function toSRT(subtitles, useTranslation = false) {
  return subtitles.map((s, i) => {
    const start = (s.start || '00:00:00.000').replace('.', ',');
    const end = (s.end || '00:00:00.000').replace('.', ',');
    const text = useTranslation ? (s.translation || s.text || '') : (s.original || s.text || '');
    return `${i + 1}\n${start} --> ${end}\n${text}\n`;
  }).join('\n');
}

// GET - Read subtitles (task-aware)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const format = searchParams.get('format') || 'json';
  const translated = searchParams.get('translated') === 'true';

  // Try task-specific subtitles first
  if (taskId) {
    const taskSubs = loadTaskSubtitles(taskId);
    if (taskSubs) {
      if (format === 'srt') {
        return new Response(toSRT(taskSubs, translated), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
      return NextResponse.json({ subtitles: taskSubs, count: taskSubs.length, source: 'task' });
    }
    // Try task directory SRT files
    const taskDir = getTaskDir(taskId);
    const taskSrt = path.join(taskDir, translated ? 'text_ocr_vi.srt' : 'text_ocr.srt');
    if (existsSync(taskSrt)) {
      const content = readFileSync(taskSrt, 'utf-8');
      const subtitles = parseSRT(content);
      return NextResponse.json({ subtitles, count: subtitles.length, source: 'task_srt' });
    }
  }

  // Fallback to global SRT files
  const file = searchParams.get('file') || 'text_ocr.srt';
  const srtPath = path.join(process.cwd(), '..', translated ? 'text_ocr_vi.srt' : file);
  if (!existsSync(srtPath)) {
    return NextResponse.json({ error: 'SRT file not found' }, { status: 404 });
  }
  const content = readFileSync(srtPath, 'utf-8');
  if (format === 'srt') {
    return new Response(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  const subtitles = parseSRT(content);
  return NextResponse.json({ subtitles, count: subtitles.length, source: 'global' });
}

// POST - Save subtitles (task-aware)
export async function POST(request) {
  try {
    const body = await request.json();
    const { subtitles, filename, taskId } = body;
    if (!subtitles?.length) {
      return NextResponse.json({ error: 'No subtitles provided' }, { status: 400 });
    }

    // Save to task directory if taskId provided
    if (taskId) {
      saveTaskSubtitles(taskId, subtitles);
      const taskDir = getTaskDir(taskId);
      writeFileSync(path.join(taskDir, 'text_ocr.srt'), toSRT(subtitles, false), 'utf-8');
      writeFileSync(path.join(taskDir, 'text_ocr_vi.srt'), toSRT(subtitles, true), 'utf-8');
    }

    // Also save to root for compatibility
    writeFileSync(path.join(process.cwd(), '..', filename || 'text_ocr.srt'), toSRT(subtitles, false), 'utf-8');
    writeFileSync(path.join(process.cwd(), '..', 'text_ocr_vi.srt'), toSRT(subtitles, true), 'utf-8');

    return NextResponse.json({ status: 'saved', message: 'Subtitles saved' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT - Update single subtitle
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, translation, start, end } = body;
    const srtPath = path.join(process.cwd(), '..', 'text_ocr_vi.srt');
    if (!existsSync(srtPath)) {
      return NextResponse.json({ error: 'SRT file not found' }, { status: 404 });
    }
    const content = readFileSync(srtPath, 'utf-8');
    const subtitles = parseSRT(content);
    const sub = subtitles.find(s => s.id === id);
    if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (translation !== undefined) sub.translation = translation;
    if (start !== undefined) sub.start = start;
    if (end !== undefined) sub.end = end;
    writeFileSync(srtPath, toSRT(subtitles, true), 'utf-8');
    return NextResponse.json({ status: 'updated', subtitle: sub });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

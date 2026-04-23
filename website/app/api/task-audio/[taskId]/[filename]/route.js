import { NextResponse } from 'next/server';
import path from 'path';
import { existsSync, readFileSync, statSync } from 'fs';

function resolveTaskAudioFile(taskId, filename) {
  const rootDir = path.join(process.cwd(), '..');
  const safeName = path.basename(filename);
  const candidates = [
    path.join(rootDir, 'tasks', taskId, safeName),
    path.join(rootDir, 'tasks', taskId, 'separated', safeName),
  ];

  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function buildAudioResponse(request, filePath, filename) {
  const stat = statSync(filePath);
  const ext = path.extname(filename).toLowerCase();
  const mimeMap = { '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.m4a': 'audio/mp4' };
  const contentType = mimeMap[ext] || 'audio/wav';
  const range = request.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    return import('fs').then(async ({ createReadStream }) => {
      const stream = createReadStream(filePath, { start, end });
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
        },
      });
    });
  }

  const data = readFileSync(filePath);
  return new NextResponse(data, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': stat.size.toString(),
      'Accept-Ranges': 'bytes',
    },
  });
}

export async function GET(request, { params }) {
  const { taskId, filename } = await params;
  const filePath = resolveTaskAudioFile(taskId, filename);

  if (!filePath) {
    return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
  }

  return buildAudioResponse(request, filePath, filename);
}

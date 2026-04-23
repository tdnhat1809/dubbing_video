import { NextResponse } from 'next/server';
import path from 'path';
import { existsSync, readFileSync, statSync } from 'fs';

export async function GET(request, { params }) {
  const { filename } = await params;
  const rootDir = path.join(process.cwd(), '..');

  // Check root dir and voiceover_clips dir
  let filePath = path.join(rootDir, filename);
  if (!existsSync(filePath)) {
    filePath = path.join(rootDir, 'voiceover_clips', filename);
  }
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
  }

  const stat = statSync(filePath);
  const ext = path.extname(filename).toLowerCase();
  const mimeMap = { '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.flac': 'audio/flac' };
  const contentType = mimeMap[ext] || 'audio/wav';

  // Support range requests
  const range = request.headers.get('range');
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    const { createReadStream } = await import('fs');
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

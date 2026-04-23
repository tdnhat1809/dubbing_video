import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  const { filename } = await params;

  // Serve video files from uploads directory
  const uploadsDir = path.join(process.cwd(), '..', 'uploads');
  const filepath = path.join(uploadsDir, filename);

  // Also check root dir for test videos
  const rootPath = path.join(process.cwd(), '..', filename);

  // Try exact match first, then try adding common extensions
  let actualPath = null;
  if (existsSync(filepath)) actualPath = filepath;
  else if (existsSync(rootPath)) actualPath = rootPath;
  else {
    // Try adding common extensions (for old tasks missing extension)
    for (const ext of ['.mp4', '.avi', '.mkv', '.webm', '.mov']) {
      if (existsSync(filepath + ext)) { actualPath = filepath + ext; break; }
      if (existsSync(rootPath + ext)) { actualPath = rootPath + ext; break; }
    }
  }

  if (!actualPath) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  const { statSync, createReadStream } = await import('fs');
  const stat = statSync(actualPath);
  const ext = path.extname(actualPath).toLowerCase();
  const mimeMap = { '.mp4': 'video/mp4', '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska', '.webm': 'video/webm', '.mov': 'video/quicktime' };
  const contentType = mimeMap[ext] || 'video/mp4';

  // Support range requests for video streaming
  const range = request.headers.get('range');
  
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    const buffer = Buffer.alloc(chunkSize);
    const fd = await import('fs').then(fs => fs.openSync(actualPath, 'r'));
    await import('fs').then(fs => fs.readSync(fd, buffer, 0, chunkSize, start));
    await import('fs').then(fs => fs.closeSync(fd));

    return new Response(buffer, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': contentType,
      },
    });
  }

  const fileBuffer = readFileSync(actualPath);
  return new Response(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': stat.size.toString(),
      'Accept-Ranges': 'bytes',
    },
  });
}

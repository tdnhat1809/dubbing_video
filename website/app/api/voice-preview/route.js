import { NextResponse } from 'next/server';
import path from 'path';
import { existsSync, readFileSync } from 'fs';

export async function POST(req) {
  try {
    const { voice } = await req.json();
    if (!voice) {
      return NextResponse.json({ error: 'Missing voice' }, { status: 400 });
    }

    const rootDir = path.resolve(process.cwd(), '..');
    const previewDir = path.join(rootDir, 'models', 'valtec', 'previews');
    
    // Map voice filename to preview filename
    const safeName = voice.replace(/\s/g, '_').replace(/[()]/g, '');
    const previewFile = path.join(previewDir, `${safeName}.wav`);

    if (!existsSync(previewFile)) {
      return NextResponse.json({ error: 'Preview not available for this voice' }, { status: 404 });
    }

    const audioBuffer = readFileSync(previewFile);
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

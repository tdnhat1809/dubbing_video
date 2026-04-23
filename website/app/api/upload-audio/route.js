import { NextResponse } from 'next/server';
import path from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audio = formData.get('audio');

    if (!audio) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), '..', 'uploads');
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

    const filename = `ref_${Date.now()}_${audio.name}`;
    const filePath = path.join(uploadsDir, filename);

    const buffer = Buffer.from(await audio.arrayBuffer());
    writeFileSync(filePath, buffer);

    return NextResponse.json({
      path: filePath,
      filename,
      size: buffer.length,
    });
  } catch (err) {
    console.error('Upload audio error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

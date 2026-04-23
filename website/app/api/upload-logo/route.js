import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const rootDir = path.resolve(process.cwd(), '..');

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('logo');
    if (!file) {
      return NextResponse.json({ error: 'No logo file provided' }, { status: 400 });
    }

    // Save logo to logos/ directory
    const logosDir = path.join(rootDir, 'logos');
    if (!fs.existsSync(logosDir)) fs.mkdirSync(logosDir, { recursive: true });

    const ext = path.extname(file.name) || '.png';
    const filename = `logo_${Date.now()}${ext}`;
    const filePath = path.join(logosDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    console.log(`[Logo] Uploaded: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);

    return NextResponse.json({
      success: true,
      logoPath: filePath,
      filename,
    });
  } catch (err) {
    console.error('[Logo] Upload error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

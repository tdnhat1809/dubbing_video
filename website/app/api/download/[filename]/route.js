import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Allow large responses and long execution
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req, { params }) {
  const { filename } = await params;
  const rootDir = path.resolve(process.cwd(), '..');
  const filePath = path.join(rootDir, 'rendered_videos', filename);
  
  console.log(`[Download] Request for: ${filename}`);
  console.log(`[Download] Full path: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`[Download] File not found: ${filePath}`);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
  
  const stat = fs.statSync(filePath);
  console.log(`[Download] File size: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
  
  // Ensure filename ends with .mp4
  const downloadName = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
  
  // Read file as buffer - most reliable for Next.js App Router
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': stat.size.toString(),
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Accept-Ranges': 'bytes',
      },
    });
    
    console.log(`[Download] Sending ${downloadName} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
    return response;
  } catch (err) {
    console.error(`[Download] Error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

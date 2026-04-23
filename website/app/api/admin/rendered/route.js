import { NextResponse } from 'next/server';
import { existsSync, readdirSync, statSync, unlinkSync, rmSync } from 'fs';
import path from 'path';

const rootDir = path.resolve(process.cwd(), '..');

// GET: List rendered videos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const dir = path.join(rootDir, 'rendered_videos');
    if (!existsSync(dir)) {
      return NextResponse.json({ videos: [], pagination: { page, limit, total: 0, totalPages: 0 } });
    }

    const files = readdirSync(dir)
      .filter(f => f.endsWith('.mp4'))
      .map(f => {
        const fp = path.join(dir, f);
        const st = statSync(fp);
        return {
          name: f,
          sizeMB: (st.size / (1024 * 1024)).toFixed(1),
          sizeBytes: st.size,
          createdAt: st.birthtime.toISOString(),
          downloadUrl: `/api/download/${f}`,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = files.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = files.slice((page - 1) * limit, page * limit);

    const totalSizeMB = files.reduce((sum, f) => sum + f.sizeBytes, 0) / (1024 * 1024);

    return NextResponse.json({
      videos: paginated,
      totalSizeMB: totalSizeMB.toFixed(0),
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete rendered video
export async function DELETE(request) {
  try {
    const { filename } = await request.json();
    if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 });

    const fp = path.join(rootDir, 'rendered_videos', path.basename(filename));
    if (existsSync(fp)) {
      unlinkSync(fp);
      return NextResponse.json({ success: true, message: `Deleted ${filename}` });
    }
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

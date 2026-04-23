import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { getTaskBboxPath } from '../../../lib/taskStore.js';

// GET - Read bbox data from subtitle_bboxes.json
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  // Find bbox file - task-specific first
  let bboxPath = null;
  if (taskId) {
    bboxPath = getTaskBboxPath(taskId);
  }
  if (!bboxPath) {
    const globalPath = path.join(process.cwd(), '..', 'subtitle_bboxes.json');
    if (existsSync(globalPath)) bboxPath = globalPath;
  }

  if (!bboxPath) {
    return NextResponse.json({
      error: 'Bbox file not found',
      message: 'Chưa có dữ liệu YOLO detect.',
    }, { status: 404 });
  }

  try {
    const content = readFileSync(bboxPath, 'utf-8');
    const data = JSON.parse(content);
    const fps = data.fps || 30;
    // Build per-frame bbox data with Y-consistency filtering
    const validBboxes = data.bboxes.filter(b => b.bbox);

    // Y-consistency filtering (MODE/CLUSTERING):
    // Hardsubs appear at a CONSISTENT Y height. Non-hardsub elements at different Y.
    // Bin Y-centers into 30px bands, find the mode (most frequent = hardsub band).
    const yCenters = validBboxes.map(b => (b.bbox[1] + b.bbox[3]) / 2);
    if (yCenters.length > 0) {
      const binSize = 30;
      const bins = {};
      for (const yc of yCenters) {
        const key = Math.floor(yc / binSize) * binSize;
        bins[key] = (bins[key] || 0) + 1;
      }
      // Find the band with the most detections
      const dominantBin = Object.entries(bins).sort((a, b) => b[1] - a[1])[0][0];
      const dominantY = Number(dominantBin) + binSize / 2;
      const yTolerance = binSize;

      const beforeCount = validBboxes.length;
      const filteredBboxes = validBboxes.filter(b => {
        const yCenter = (b.bbox[1] + b.bbox[3]) / 2;
        return Math.abs(yCenter - dominantY) <= yTolerance;
      });
      console.log(`[Bbox] Y-filter: bins=${JSON.stringify(bins)}, dominant=${dominantY}, kept=${filteredBboxes.length}/${beforeCount}`);
      validBboxes.length = 0;
      validBboxes.push(...filteredBboxes);
    }

    const frameBboxMap = {};
    for (const b of validBboxes) {
      const [x1, y1, x2, y2] = b.bbox;
      if (frameBboxMap[b.frame]) {
        const prev = frameBboxMap[b.frame];
        frameBboxMap[b.frame] = [
          Math.min(prev[0], x1),
          Math.min(prev[1], y1),
          Math.max(prev[2], x2),
          Math.max(prev[3], y2),
        ];
      } else {
        frameBboxMap[b.frame] = [x1, y1, x2, y2];
      }
    }

    // Interpolate: fill gaps between first and last detected frame
    const frameNums = Object.keys(frameBboxMap).map(Number).sort((a, b) => a - b);
    if (frameNums.length > 0) {
      let lastBbox = frameBboxMap[frameNums[0]];
      for (let f = frameNums[0]; f <= frameNums[frameNums.length - 1]; f++) {
        if (frameBboxMap[f]) {
          lastBbox = frameBboxMap[f];
        } else {
          frameBboxMap[f] = lastBbox;
        }
      }
    }

    const allFrames = Object.keys(frameBboxMap).map(Number).sort((a, b) => a - b);
    const rawBboxes = allFrames.map(f => ({
      t: f / fps,
      b: frameBboxMap[f],
    }));

    return NextResponse.json({
      resolution: data.resolution,
      fps,
      totalEntries: validBboxes.length,
      interpolatedFrames: allFrames.length,
      rawBboxes,
      source: bboxPath.includes('tasks') ? 'task' : 'global',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// Directory to store preprocessed/blurred temp files
const PREPROCESS_DIR = path.join(process.cwd(), 'public', 'preprocessed');

/**
 * POST /api/preprocess-video
 * 
 * Pre-processes a video with FFmpeg:
 * - Applies Gaussian blur to a region (top or bottom strip)
 * - Returns a local URL to the blurred video
 * 
 * Body: {
 *   videoPath: string,       // relative path to source video (e.g., "/uploads/xxx.mp4")
 *   blurRegion: "bottom"|"top",  // which region to blur
 *   blurHeight: number,      // % of video height to blur (e.g., 15)
 *   blurIntensity: number,   // blur strength (default 20)
 *   taskId: string,          // optional task ID for naming
 * }
 * 
 * Returns: { blurredVideoUrl: string, blurredVideoPath: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      videoPath,
      blurRegion = 'bottom',
      blurHeight = 15,
      blurIntensity = 20,
      taskId = '',
    } = body;

    if (!videoPath) {
      return NextResponse.json({ error: 'videoPath is required' }, { status: 400 });
    }

    // Ensure preprocess directory exists
    if (!fs.existsSync(PREPROCESS_DIR)) {
      fs.mkdirSync(PREPROCESS_DIR, { recursive: true });
    }

    // Resolve input path
    let inputPath;
    if (videoPath.startsWith('/') && !videoPath.startsWith('//')) {
      // Relative to public dir or absolute
      const publicPath = path.join(process.cwd(), 'public', videoPath);
      if (fs.existsSync(publicPath)) {
        inputPath = publicPath;
      } else {
        inputPath = videoPath;
      }
    } else if (path.isAbsolute(videoPath)) {
      inputPath = videoPath;
    } else {
      inputPath = path.join(process.cwd(), 'public', videoPath);
    }

    if (!fs.existsSync(inputPath)) {
      return NextResponse.json({ error: `Video file not found: ${inputPath}` }, { status: 404 });
    }

    // Output file
    const outputName = `blurred_${taskId || Date.now()}.mp4`;
    const outputPath = path.join(PREPROCESS_DIR, outputName);

    // Build FFmpeg filter for regional blur
    // Split video → crop the blur region → apply Gaussian blur → overlay back
    const heightFraction = (blurHeight / 100).toFixed(4);
    const startFraction = blurRegion === 'bottom'
      ? (1 - blurHeight / 100).toFixed(4)
      : '0';

    // FFmpeg filter chain:
    // 1. Split into main + blur copy
    // 2. Crop the target region from blur copy
    // 3. Apply boxblur to the cropped region
    // 4. Overlay blurred crop back onto the main at original position
    const blurRadius = Math.max(5, Math.min(50, blurIntensity));
    const filter = blurRegion === 'bottom'
      ? `split[main][blur];[blur]crop=iw:ih*${heightFraction}:0:ih*${startFraction},boxblur=${blurRadius}:${blurRadius}[blurred];[main][blurred]overlay=0:H*${startFraction}`
      : `split[main][blur];[blur]crop=iw:ih*${heightFraction}:0:0,boxblur=${blurRadius}:${blurRadius}[blurred];[main][blurred]overlay=0:0`;

    const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -vf "${filter}" -c:a copy -movflags +faststart "${outputPath}"`;

    console.log(`[PreprocessVideo] Running FFmpeg blur: ${ffmpegCmd}`);
    
    const { stdout, stderr } = await execAsync(ffmpegCmd, { timeout: 300000 }); // 5min timeout
    
    if (!fs.existsSync(outputPath)) {
      console.error('[PreprocessVideo] FFmpeg stderr:', stderr);
      return NextResponse.json({ error: 'FFmpeg blur failed - output file not created' }, { status: 500 });
    }

    const stats = fs.statSync(outputPath);
    console.log(`[PreprocessVideo] Blurred video created: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);

    // Return local URL
    const blurredVideoUrl = `/preprocessed/${outputName}`;
    
    return NextResponse.json({
      blurredVideoUrl,
      blurredVideoPath: outputPath,
      fileSize: stats.size,
    });

  } catch (error) {
    console.error('[PreprocessVideo] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

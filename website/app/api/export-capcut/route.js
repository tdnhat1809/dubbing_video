import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { getTaskDir } from '../../../lib/taskStore.js';

const CAPCUT_SERVER = 'http://localhost:9001';

async function callCapCut(endpoint, body) {
  const res = await fetch(`${CAPCUT_SERVER}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

/**
 * POST /api/export-capcut
 * Export task video to CapCut draft with selected effects
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { taskId, effects = {} } = body;
    
    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 });
    }
    
    const taskDir = getTaskDir(taskId);
    if (!existsSync(taskDir)) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Find video file
    const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];
    let videoPath = null;
    for (const ext of videoExts) {
      const p = path.join(taskDir, `${taskId}${ext}`);
      if (existsSync(p)) { videoPath = p; break; }
    }
    if (!videoPath) {
      // Check uploads dir
      const uploadsDir = path.join(process.cwd(), '..', 'uploads');
      for (const ext of videoExts) {
        const p = path.join(uploadsDir, `${taskId}${ext}`);
        if (existsSync(p)) { videoPath = p; break; }
      }
    }
    if (!videoPath) {
      return NextResponse.json({ error: 'Video file not found' }, { status: 404 });
    }
    
    // Find SRT file
    const srtPath = path.join(taskDir, 'text_ocr.srt');
    const hasSrt = existsSync(srtPath);
    
    // Find dubbed audio
    const dubbedPath = path.join(taskDir, 'dubbed_audio.mp3');
    const hasDubbed = existsSync(dubbedPath);
    
    const steps = [];
    
    // Step 1: Create draft
    const draftRes = await callCapCut('/create_draft', {
      width: effects.width || 1080,
      height: effects.height || 1920,
    });
    if (!draftRes.success) {
      return NextResponse.json({ error: `Create draft failed: ${draftRes.error}` }, { status: 500 });
    }
    const draftId = draftRes.output.draft_id;
    steps.push({ step: 'create_draft', draftId });
    
    // Step 2: Add video
    const videoBody = {
      video_url: videoPath,
      draft_id: draftId,
      start: 0,
      end: 0, // auto-detect
      width: effects.width || 1080,
      height: effects.height || 1920,
      volume: effects.keepOriginalAudio !== false ? 1.0 : 0.0,
      track_name: 'video_main',
    };
    
    // Add transition if selected
    if (effects.transition) {
      videoBody.transition = effects.transition;
      videoBody.transition_duration = effects.transitionDuration || 0.5;
    }
    
    const videoRes = await callCapCut('/add_video', videoBody);
    steps.push({ step: 'add_video', success: videoRes.success });
    
    // Step 3: Add subtitle if exists
    if (hasSrt && effects.addSubtitle !== false) {
      const subBody = {
        srt: srtPath,
        draft_id: draftId,
        track_name: 'subtitle',
        font_size: effects.subtitleFontSize || 5.0,
        font_color: effects.subtitleColor || '#FFFFFF',
        border_width: effects.subtitleBorderWidth || 1.0,
        border_color: effects.subtitleBorderColor || '#000000',
        transform_y: effects.subtitlePositionY || -0.8,
        width: effects.width || 1080,
        height: effects.height || 1920,
      };
      if (effects.subtitleFont) subBody.font = effects.subtitleFont;
      
      const subRes = await callCapCut('/add_subtitle', subBody);
      steps.push({ step: 'add_subtitle', success: subRes.success });
    }
    
    // Step 4: Add dubbed audio if exists
    if (hasDubbed && effects.addDubbedAudio !== false) {
      const audioBody = {
        audio_url: dubbedPath,
        draft_id: draftId,
        start: 0,
        volume: effects.dubbedVolume || 1.0,
        track_name: 'dubbed_audio',
        width: effects.width || 1080,
        height: effects.height || 1920,
      };
      const audioRes = await callCapCut('/add_audio', audioBody);
      steps.push({ step: 'add_audio', success: audioRes.success });
    }
    
    // Step 5: Add video effect if selected
    if (effects.videoEffect) {
      const effectBody = {
        effect_type: effects.videoEffect,
        start: 0,
        end: 0, // full video
        draft_id: draftId,
        track_name: 'effect_01',
        width: effects.width || 1080,
        height: effects.height || 1920,
      };
      const effectRes = await callCapCut('/add_effect', effectBody);
      steps.push({ step: 'add_effect', success: effectRes.success, effect: effects.videoEffect });
    }
    
    // Step 6: Add text intro animation if selected
    if (effects.textIntro) {
      const textBody = {
        text: effects.introText || 'B2Vision',
        start: 0,
        end: effects.introDuration || 3,
        draft_id: draftId,
        font_size: 12,
        font_color: '#FFFFFF',
        transform_y: 0,
        intro_animation: effects.textIntro,
        intro_duration: effects.introAnimDuration || 0.5,
        track_name: 'text_intro',
        width: effects.width || 1080,
        height: effects.height || 1920,
      };
      const textRes = await callCapCut('/add_text', textBody);
      steps.push({ step: 'add_text_intro', success: textRes.success });
    }
    
    // Step 7: Save draft
    const saveRes = await callCapCut('/save_draft', { draft_id: draftId });
    steps.push({ step: 'save_draft', success: saveRes.success, output: saveRes.output });
    
    // Step 8: Auto-copy to CapCut Desktop
    const capCutDraftsDir = 'C:\\Users\\Admin\\AppData\\Local\\CapCut\\User Data\\Projects\\com.lveditor.draft';
    const draftFolder = saveRes.output?.draft_folder || null;
    let copiedToCapCut = false;
    
    if (draftFolder && existsSync(draftFolder)) {
      const { execSync } = await import('child_process');
      const { writeFileSync } = await import('fs');
      const draftName = `B2Vision_${taskId.substring(0, 8)}`;
      const destPath = path.join(capCutDraftsDir, draftName);
      try {
        execSync(`xcopy "${draftFolder}" "${destPath}" /E /I /Y /Q`, { timeout: 30000 });
        const metaPath = path.join(destPath, 'draft_meta_info.json');
        if (existsSync(metaPath)) {
          let meta = readFileSync(metaPath, 'utf-8');
          const fwd = capCutDraftsDir.replace(/\\/g, '/');
          meta = meta.replace(/"draft_fold_path":"[^"]*"/, `"draft_fold_path":"${fwd}/${draftName}"`);
          meta = meta.replace(/"draft_root_path":"[^"]*"/, `"draft_root_path":"${fwd}"`);
          meta = meta.replace(/"draft_name":"[^"]*"/, `"draft_name":"${draftName}"`);
          writeFileSync(metaPath, meta, 'utf-8');
        }
        copiedToCapCut = true;
        steps.push({ step: 'copy_to_capcut', success: true, dest: destPath });
      } catch (e) {
        steps.push({ step: 'copy_to_capcut', success: false, error: e.message });
      }
    }
    
    return NextResponse.json({
      success: true,
      draftId,
      steps,
      copiedToCapCut,
      message: copiedToCapCut
        ? `Draft da tao va copy vao CapCut! Mo CapCut Desktop de xem.`
        : `Draft tao thanh cong. Thu muc: ${draftFolder}`,
      capCutDraftsDir,
      draftFolder,
    });
    
  } catch (error) {
    console.error('Export CapCut error:', error);
    return NextResponse.json({ 
      error: error.message,
      hint: 'Is CapCut API server running? Start with: cd capcut_api && python capcut_server.py'
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { loadTask } from '../../../../lib/taskStore.js';

export async function GET(request, { params }) {
  const { taskId } = await params;
  const task = loadTask(taskId);
  
  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: task.id,
    status: task.status,
    progress: task.progress || 0,
    step: task.step || '',
    message: task.message || '',
    extractionStage: task.extractionStage || '',
    errorStage: task.errorStage || '',
    retryMode: task.retryMode || '',
    bboxReady: task.bboxReady || false,
    bboxPath: task.bboxPath || null,
    videoUrl: task.videoUrl || null,
    audioUrl: task.audioUrl || null,
    downloadUrl: task.downloadUrl || null,
    createdAt: task.createdAt,
    title: task.title || task.filename || '',
    separation: {
      status: task.separationStatus || 'idle',
      progress: task.separationProgress || 0,
      message: task.separationMessage || '',
      profile: task.separationProfile || null,
      vocalsUrl: task.separationVocalsUrl || null,
      instrumentalUrl: task.separationInstrumentalUrl || null,
    },
  });
}

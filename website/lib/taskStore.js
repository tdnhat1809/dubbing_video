// Shared persistent task storage - file-based
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import path from 'path';

const TASKS_DIR = path.join(process.cwd(), '..', 'tasks');

// Ensure tasks directory exists
function ensureTasksDir(taskId) {
  const dir = taskId ? path.join(TASKS_DIR, taskId) : TASKS_DIR;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

// Save task to disk
export function saveTask(taskId, data) {
  const dir = ensureTasksDir(taskId);
  const filePath = path.join(dir, 'task.json');
  const existing = loadTask(taskId) || {};
  const merged = { ...existing, ...data, id: taskId, updatedAt: new Date().toISOString() };
  writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
  // Also keep in globalThis for active processes
  if (!globalThis.__tasks) globalThis.__tasks = {};
  globalThis.__tasks[taskId] = merged;
  return merged;
}

// Load task from disk (with globalThis fallback for active processes)
export function loadTask(taskId) {
  // Check globalThis first (active processes have latest state)
  if (globalThis.__tasks?.[taskId]) return globalThis.__tasks[taskId];
  // Then check disk
  const filePath = path.join(TASKS_DIR, taskId, 'task.json');
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch { return null; }
}

// List all tasks from disk
export function listTasks() {
  if (!existsSync(TASKS_DIR)) return [];
  try {
    return readdirSync(TASKS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => loadTask(d.name))
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } catch { return []; }
}

// Save subtitles for a task
export function saveTaskSubtitles(taskId, subtitles) {
  const dir = ensureTasksDir(taskId);
  writeFileSync(path.join(dir, 'subtitles.json'), JSON.stringify(subtitles, null, 2), 'utf-8');
}

// Load subtitles for a task
export function loadTaskSubtitles(taskId) {
  const filePath = path.join(TASKS_DIR, taskId, 'subtitles.json');
  if (!existsSync(filePath)) return null;
  try { return JSON.parse(readFileSync(filePath, 'utf-8')); }
  catch { return null; }
}

// Get task directory path
export function getTaskDir(taskId) {
  return path.join(TASKS_DIR, taskId);
}

// Get bbox path for a task
export function getTaskBboxPath(taskId) {
  const taskBbox = path.join(TASKS_DIR, taskId, 'subtitle_bboxes.json');
  if (existsSync(taskBbox)) return taskBbox;
  // Fallback to global
  const globalBbox = path.join(process.cwd(), '..', 'subtitle_bboxes.json');
  if (existsSync(globalBbox)) return globalBbox;
  return null;
}

// Sync globalThis from disk on startup
export function syncFromDisk() {
  if (!globalThis.__tasks) globalThis.__tasks = {};
  const tasks = listTasks();
  for (const t of tasks) {
    if (!globalThis.__tasks[t.id]) {
      globalThis.__tasks[t.id] = t;
    }
  }
}

// Auto-sync
syncFromDisk();

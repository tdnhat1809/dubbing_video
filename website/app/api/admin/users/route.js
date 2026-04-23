import { NextResponse } from 'next/server';
import {
  listUsers, findUser, upsertUser, updateUser, deleteUser,
  incrementUserStats, loadUsers
} from '../../../../lib/userStore.js';
import { listTasks } from '../../../../lib/taskStore.js';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

const rootDir = path.resolve(process.cwd(), '..');

// GET: List users with stats
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const plan = searchParams.get('plan') || 'all';
    const sort = searchParams.get('sort') || 'newest';
    const recalculate = searchParams.get('recalculate') === 'true';

    // Optionally recalculate stats from actual task data
    if (recalculate) {
      await recalculateAllUserStats();
    }

    let users = listUsers({ search, status, plan, sort });

    const total = users.length;
    const totalPages = Math.ceil(total / limit);
    const paginated = users.slice((page - 1) * limit, page * limit);

    // Aggregate stats
    const allUsers = loadUsers();
    const totalActive = allUsers.filter(u => u.status === 'active').length;
    const totalSuspended = allUsers.filter(u => u.status === 'suspended').length;
    const totalPro = allUsers.filter(u => u.plan === 'pro').length;
    const totalEnterprise = allUsers.filter(u => u.plan === 'enterprise').length;

    // New users in last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const newUsersWeek = allUsers.filter(u => u.createdAt >= weekAgo).length;

    return NextResponse.json({
      users: paginated,
      pagination: { page, limit, total, totalPages },
      summary: {
        total: allUsers.length,
        active: totalActive,
        suspended: totalSuspended,
        pro: totalPro,
        enterprise: totalEnterprise,
        newThisWeek: newUsersWeek,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create new user
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, name, role, plan } = body;
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const existing = findUser(email);
    if (existing) return NextResponse.json({ error: 'User already exists' }, { status: 409 });

    const user = upsertUser(email, { name, role, plan });
    return NextResponse.json({ success: true, user });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update user
export async function PUT(request) {
  try {
    const body = await request.json();
    const { email, ...updates } = body;
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    const user = updateUser(email, updates);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ success: true, user });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete user
export async function DELETE(request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    deleteUser(email);
    return NextResponse.json({ success: true, message: `User ${email} deleted` });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Recalculate stats from actual task data
async function recalculateAllUserStats() {
  const tasks = listTasks();
  const users = loadUsers();
  const userMap = {};
  for (const u of users) {
    userMap[u.email] = {
      tasksCreated: 0,
      videosUploaded: 0,
      videosRendered: 0,
      subtitlesExtracted: 0,
      ocrCharacters: 0,
      translatedCharacters: 0,
      ttsCharacters: 0,
      voiceoversCreated: 0,
      totalMinutesProcessed: 0,
      totalStorageMB: 0,
    };
  }

  for (const task of tasks) {
    const email = task.userEmail || task.user;
    if (!email || !userMap[email]) continue;

    userMap[email].tasksCreated++;
    userMap[email].videosUploaded++;

    const taskDir = path.join(rootDir, 'tasks', task.id);

    // Check subtitles
    const subsPath = path.join(taskDir, 'subtitles.json');
    if (existsSync(subsPath)) {
      try {
        const subs = JSON.parse(readFileSync(subsPath, 'utf-8'));
        const entries = Array.isArray(subs) ? subs : [];
        userMap[email].subtitlesExtracted += entries.length;
        for (const sub of entries) {
          const orig = sub.original || sub.text || '';
          const trans = sub.translation || '';
          userMap[email].ocrCharacters += orig.length;
          userMap[email].translatedCharacters += trans.length;
          userMap[email].ttsCharacters += trans.length;
        }
      } catch {}
    }

    // Check voiceover
    if (task.voiceoverStatus === 'completed') {
      userMap[email].voiceoversCreated++;
    }

    // Storage
    try {
      const files = readdirSync(taskDir);
      let totalBytes = 0;
      for (const f of files) {
        try { totalBytes += statSync(path.join(taskDir, f)).size; } catch {}
      }
      userMap[email].totalStorageMB += Math.round(totalBytes / (1024 * 1024));
    } catch {}
  }

  // Check rendered videos
  const renderDir = path.join(rootDir, 'rendered_videos');
  if (existsSync(renderDir)) {
    // Count total rendered per user (simple approximation - assign to first user for now)
    const renderCount = readdirSync(renderDir).filter(f => f.endsWith('.mp4')).length;
    if (users.length > 0 && users[0].email && userMap[users[0].email]) {
      userMap[users[0].email].videosRendered += renderCount;
    }
  }

  // Write back
  const { saveUsers } = await import('../../../../lib/userStore.js');
  for (const u of users) {
    if (userMap[u.email]) {
      u.stats = userMap[u.email];
      u.updatedAt = new Date().toISOString();
    }
  }
  saveUsers(users);
}

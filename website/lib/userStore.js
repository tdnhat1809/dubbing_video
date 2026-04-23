// User storage - file-based JSON
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// Simple password hashing using SHA-256 with salt
const SALT = 'ommivoice_2026_secret';
export function hashPassword(password) {
  return createHash('sha256').update(SALT + password).digest('hex');
}
export function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

const rootDir = path.resolve(process.cwd(), '..');
const USERS_FILE = path.join(rootDir, 'data', 'users.json');

function ensureDataDir() {
  const dir = path.dirname(USERS_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// Load all users
export function loadUsers() {
  ensureDataDir();
  if (!existsSync(USERS_FILE)) return [];
  try { return JSON.parse(readFileSync(USERS_FILE, 'utf-8')); }
  catch { return []; }
}

// Save all users
export function saveUsers(users) {
  ensureDataDir();
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

// Find user by email
export function findUser(email) {
  return loadUsers().find(u => u.email === email) || null;
}

// Find user by ID
export function findUserById(id) {
  return loadUsers().find(u => u.id === id) || null;
}

// Create or update user
export function upsertUser(email, data = {}) {
  const users = loadUsers();
  let user = users.find(u => u.email === email);
  if (user) {
    Object.assign(user, data, { updatedAt: new Date().toISOString() });
  } else {
    user = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email,
      name: data.name || email.split('@')[0],
      role: data.role || 'user',
      plan: data.plan || 'free',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      loginCount: 1,
      // Usage tracking
      stats: {
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
      },
      ...data,
    };
    users.push(user);
  }
  saveUsers(users);
  return user;
}

// Update user stats (increment)
export function incrementUserStats(email, statUpdates) {
  const users = loadUsers();
  const user = users.find(u => u.email === email);
  if (!user) return null;
  if (!user.stats) user.stats = {};
  for (const [key, value] of Object.entries(statUpdates)) {
    user.stats[key] = (user.stats[key] || 0) + value;
  }
  user.updatedAt = new Date().toISOString();
  saveUsers(users);
  return user;
}

// Record user login
export function recordLogin(email) {
  const users = loadUsers();
  const user = users.find(u => u.email === email);
  if (!user) return upsertUser(email);
  user.lastLoginAt = new Date().toISOString();
  user.loginCount = (user.loginCount || 0) + 1;
  user.updatedAt = new Date().toISOString();
  saveUsers(users);
  return user;
}

// Delete user
export function deleteUser(email) {
  const users = loadUsers().filter(u => u.email !== email);
  saveUsers(users);
}

// Update user fields
export function updateUser(email, updates) {
  const users = loadUsers();
  const user = users.find(u => u.email === email);
  if (!user) return null;
  const { stats, ...rest } = updates;
  Object.assign(user, rest, { updatedAt: new Date().toISOString() });
  if (stats) {
    user.stats = { ...user.stats, ...stats };
  }
  saveUsers(users);
  return user;
}

// List all users with optional filters
export function listUsers({ search, status, plan, sort } = {}) {
  let users = loadUsers();

  if (search) {
    const s = search.toLowerCase();
    users = users.filter(u =>
      (u.email || '').toLowerCase().includes(s) ||
      (u.name || '').toLowerCase().includes(s) ||
      (u.id || '').toLowerCase().includes(s)
    );
  }
  if (status && status !== 'all') {
    users = users.filter(u => u.status === status);
  }
  if (plan && plan !== 'all') {
    users = users.filter(u => u.plan === plan);
  }

  // Sort
  if (sort === 'oldest') {
    users.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sort === 'most_active') {
    users.sort((a, b) => (b.stats?.tasksCreated || 0) - (a.stats?.tasksCreated || 0));
  } else if (sort === 'last_login') {
    users.sort((a, b) => new Date(b.lastLoginAt || 0) - new Date(a.lastLoginAt || 0));
  } else {
    users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return users;
}

// Seed sample users for demonstration
import { upsertUser, loadUsers } from '../website/lib/userStore.js';

// Only seed if no users exist
const existing = loadUsers();
if (existing.length === 0) {
  console.log('Seeding sample users...');
  
  upsertUser('admin@dichtudong.com', {
    name: 'Admin OmmiVoice',
    role: 'admin',
    plan: 'enterprise',
    loginCount: 42,
    lastLoginAt: new Date().toISOString(),
    stats: {
      tasksCreated: 23,
      videosUploaded: 23,
      videosRendered: 32,
      subtitlesExtracted: 2400,
      ocrCharacters: 53700,
      translatedCharacters: 48200,
      ttsCharacters: 45000,
      voiceoversCreated: 7,
      totalMinutesProcessed: 180,
      totalStorageMB: 1580,
    }
  });

  upsertUser('user1@gmail.com', {
    name: 'Nguyễn Văn A',
    role: 'user',
    plan: 'pro',
    loginCount: 15,
    lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
    stats: {
      tasksCreated: 8,
      videosUploaded: 8,
      videosRendered: 5,
      subtitlesExtracted: 620,
      ocrCharacters: 12400,
      translatedCharacters: 11800,
      ttsCharacters: 10500,
      voiceoversCreated: 3,
      totalMinutesProcessed: 45,
      totalStorageMB: 420,
    }
  });

  upsertUser('translator@company.vn', {
    name: 'Trần Thị B',
    role: 'user',
    plan: 'pro',
    loginCount: 28,
    lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
    stats: {
      tasksCreated: 15,
      videosUploaded: 15,
      videosRendered: 12,
      subtitlesExtracted: 1800,
      ocrCharacters: 38000,
      translatedCharacters: 35200,
      ttsCharacters: 32000,
      voiceoversCreated: 10,
      totalMinutesProcessed: 120,
      totalStorageMB: 890,
    }
  });

  upsertUser('demo@test.com', {
    name: 'Demo User',
    role: 'user',
    plan: 'free',
    loginCount: 3,
    lastLoginAt: new Date(Date.now() - 172800000).toISOString(),
    stats: {
      tasksCreated: 2,
      videosUploaded: 2,
      videosRendered: 1,
      subtitlesExtracted: 80,
      ocrCharacters: 1600,
      translatedCharacters: 1400,
      ttsCharacters: 1200,
      voiceoversCreated: 0,
      totalMinutesProcessed: 8,
      totalStorageMB: 45,
    }
  });

  upsertUser('newbie@email.com', {
    name: 'Lê Minh C',
    role: 'user',
    plan: 'free',
    status: 'active',
    loginCount: 1,
    lastLoginAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    stats: {
      tasksCreated: 1,
      videosUploaded: 1,
      videosRendered: 0,
      subtitlesExtracted: 0,
      ocrCharacters: 0,
      translatedCharacters: 0,
      ttsCharacters: 0,
      voiceoversCreated: 0,
      totalMinutesProcessed: 0,
      totalStorageMB: 15,
    }
  });

  console.log(`Seeded ${loadUsers().length} users.`);
} else {
  console.log(`Already have ${existing.length} users, skipping seed.`);
}

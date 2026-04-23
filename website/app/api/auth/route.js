import { NextResponse } from 'next/server';
import { upsertUser, recordLogin, findUser, hashPassword, verifyPassword, loadUsers, saveUsers } from '../../../lib/userStore.js';

// POST: Register or login a user
export async function POST(request) {
  try {
    const { email, name, password, action } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email là bắt buộc' }, { status: 400 });
    if (!password) return NextResponse.json({ error: 'Mật khẩu là bắt buộc' }, { status: 400 });

    if (action === 'register') {
      // Check if already exists
      const existing = findUser(email);
      if (existing) {
        return NextResponse.json({ error: 'Email đã được đăng ký' }, { status: 409 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: 'Mật khẩu phải ít nhất 6 ký tự' }, { status: 400 });
      }
      const hashedPw = hashPassword(password);
      const user = upsertUser(email, { 
        name: name || email.split('@')[0],
        passwordHash: hashedPw 
      });
      // Don't return passwordHash to client
      const { passwordHash, ...safeUser } = user;
      return NextResponse.json({ success: true, action: 'registered', user: safeUser });

    } else {
      // Login - verify credentials
      const user = findUser(email);
      if (!user) {
        return NextResponse.json({ error: 'Email không tồn tại. Vui lòng đăng ký.' }, { status: 401 });
      }
      // If user has no password yet (legacy), set it now
      if (!user.passwordHash) {
        const users = loadUsers();
        const u = users.find(u => u.email === email);
        u.passwordHash = hashPassword(password);
        saveUsers(users);
      } else {
        // Verify password
        if (!verifyPassword(password, user.passwordHash)) {
          return NextResponse.json({ error: 'Mật khẩu không đúng' }, { status: 401 });
        }
      }
      const updated = recordLogin(email);
      const { passwordHash, ...safeUser } = updated;
      return NextResponse.json({ success: true, action: 'login', user: safeUser });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: Check user role (for admin guard)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
    const user = findUser(email);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ role: user.role, email: user.email, name: user.name });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

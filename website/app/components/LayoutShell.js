'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import { LanguageProvider } from '../i18n/LanguageContext';

export default function LayoutShell({ children }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');
  const isAuthPage = pathname === '/dang-nhap' || pathname === '/dang-ky';
  const isAdminPage = pathname?.startsWith('/dashboard/admin');
  const [isAuthed, setIsAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isDashboard && !isAuthPage) {
      const user = localStorage.getItem('user');
      if (!user) {
        window.location.href = '/dang-nhap';
        return;
      }

      // Admin page guard - check role
      if (isAdminPage) {
        const role = localStorage.getItem('userRole');
        if (role !== 'admin') {
          // Double-check with server
          fetch(`/api/auth?email=${encodeURIComponent(user)}`)
            .then(r => r.json())
            .then(data => {
              if (data.role === 'admin') {
                localStorage.setItem('userRole', 'admin');
                setIsAuthed(true);
                setChecking(false);
              } else {
                // Not admin - redirect to dashboard
                window.location.href = '/dashboard';
              }
            })
            .catch(() => {
              window.location.href = '/dashboard';
            });
          return;
        }
      }

      setIsAuthed(true);
    }
    setChecking(false);
  }, [pathname, isDashboard, isAuthPage, isAdminPage]);

  // Non-dashboard pages: render normally
  if (!isDashboard) {
    return (
      <LanguageProvider>
        <Header />
        <main className="pt-24">{children}</main>
        <Footer />
      </LanguageProvider>
    );
  }

  // Auth pages (login/register): always render
  if (isAuthPage) {
    return <LanguageProvider>{children}</LanguageProvider>;
  }

  // Dashboard pages: show loading while checking, then content if authed
  if (checking || !isAuthed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a14' }}>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <LanguageProvider>{children}</LanguageProvider>;
}

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <>
      {/* TOP BANNER */}
      <div className="w-full bg-gradient-to-r from-primary to-primary-dim py-3 px-6 text-center z-50 -mt-24">
        <p className="text-white font-medium tracking-tight text-sm md:text-base">
          🎉 Đăng ký ngay để nhận <span className="font-black">200.000 Point</span> miễn phí!
        </p>
      </div>

      {/* MAIN SPLIT LAYOUT */}
      <div className="flex-grow flex flex-col md:flex-row min-h-[calc(100vh-48px)]">
        {/* LEFT SIDE (40%) - Branding */}
        <section className="w-full md:w-[40%] bg-gradient-to-br from-[#1a1145] to-[#302950] flex flex-col justify-between p-12 relative overflow-hidden">
          {/* Branding */}
          <div className="z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-on-primary shadow-lg">
                <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
              </div>
              <span className="text-2xl font-black tracking-tighter text-white">B2Vision.com</span>
            </div>
          </div>

          {/* Content */}
          <div className="z-10 mt-12 md:mt-0">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-8">
              Bắt đầu hành trình dịch thuật AI.
            </h1>
            <p className="text-white/60 text-lg mb-10 max-w-md">
              Tạo tài khoản miễn phí và trải nghiệm công nghệ dịch video hàng đầu Việt Nam.
            </p>

            {/* Benefits */}
            <div className="space-y-5">
              {[
                { icon: 'rocket_launch', text: 'Dịch video tự động trong vài phút' },
                { icon: 'record_voice_over', text: 'Lồng tiếng AI với 50+ ngôn ngữ' },
                { icon: 'verified', text: 'Độ chính xác lên đến 97.8%' },
                { icon: 'card_giftcard', text: 'Tặng 200.000 Point cho thành viên mới' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-white/80">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary text-xl" style={{fontVariationSettings: "'FILL' 1"}}>{item.icon}</span>
                  </div>
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Link */}
          <div className="z-10 pt-8">
            <Link className="group flex items-center gap-2 text-white/50 font-semibold hover:text-primary transition-colors" href="/">
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Trang chủ</span>
            </Link>
          </div>

          {/* Decorations */}
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-secondary/10 rounded-full blur-[100px]"></div>
          <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] border border-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] border border-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
        </section>

        {/* RIGHT SIDE (60%) - Form */}
        <section className="w-full md:w-[60%] bg-surface-container-lowest flex items-center justify-center p-8 md:p-24 relative">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-on-background">Tạo tài khoản mới</h2>
              <p className="text-on-surface-variant">Chỉ mất 30 giây để bắt đầu</p>
            </div>

            {/* Social Register */}
            <div className="flex items-center gap-4">
              <button className="flex-grow flex items-center justify-center gap-3 bg-primary py-4 px-6 rounded-xl text-on-primary font-bold shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98]">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                <span>Đăng ký bằng Google</span>
              </button>
              <button className="w-14 h-14 flex items-center justify-center border-2 border-outline-variant/30 rounded-xl text-on-surface hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined">brand_awareness</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-4">
              <div className="flex-grow h-[1px] bg-outline-variant/20"></div>
              <span className="text-on-surface-variant text-sm font-medium">Hoặc đăng ký bằng email</span>
              <div className="flex-grow h-[1px] bg-outline-variant/20"></div>
            </div>

            {/* Form */}
            <form className="space-y-5" action="javascript:void(0)" onSubmit={(e) => e.preventDefault()}>
              {error && (
                <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface ml-1" htmlFor="name">Họ và tên</label>
                <input className="w-full px-6 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant" id="name" placeholder="Nguyễn Văn A" type="text" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface ml-1" htmlFor="reg-email">Email</label>
                <input className="w-full px-6 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant" id="reg-email" placeholder="ten@congty.com" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface ml-1" htmlFor="reg-password">Mật khẩu</label>
                  <input className="w-full px-6 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant" id="reg-password" placeholder="Tối thiểu 6 ký tự" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface ml-1" htmlFor="reg-confirm">Xác nhận</label>
                  <input className="w-full px-6 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant" id="reg-confirm" placeholder="Nhập lại mật khẩu" type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }} />
                </div>
              </div>

              {/* Agree checkbox */}
              <div className="flex items-start gap-3 pt-2">
                <input type="checkbox" id="agree" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20" />
                <label htmlFor="agree" className="text-sm text-on-surface-variant leading-relaxed">
                  Tôi đồng ý với <a className="text-primary font-semibold hover:underline" href="/thu-vien/dieu-khoan">Điều khoản sử dụng</a> và <a className="text-primary font-semibold hover:underline" href="#">Chính sách bảo mật</a> của B2Vision.com
                </label>
              </div>

              <div className="pt-2">
                <button className="w-full bg-primary text-on-primary py-4 rounded-xl font-black text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed" type="button" disabled={!agreed || loading}
                  onClick={async () => {
                    if (!email || !password) { setError('Vui lòng nhập đầy đủ thông tin'); return; }
                    if (password.length < 6) { setError('Mật khẩu phải ít nhất 6 ký tự'); return; }
                    if (password !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }
                    setLoading(true); setError('');
                    try {
                      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, name, password, action: 'register' }) });
                      const data = await res.json();
                      if (!res.ok) { setError(data.error || 'Đăng ký thất bại'); setLoading(false); return; }
                      localStorage.setItem('user', email);
                      localStorage.setItem('userRole', data.user?.role || 'user');
                      window.location.href = '/dashboard';
                    } catch (err) { setError('Lỗi kết nối server'); setLoading(false); }
                  }}>
                  {loading ? 'Đang tạo tài khoản...' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>

            <div className="text-center pt-4">
              <p className="text-on-surface-variant text-sm">
                Đã có tài khoản? <Link className="text-primary font-bold hover:underline ml-1" href="/dang-nhap">Đăng nhập</Link>
              </p>
            </div>
          </div>

          {/* Glass Element */}
          <div className="hidden lg:block absolute bottom-12 right-12 glass-panel p-6 rounded-3xl border border-white/40 shadow-2xl max-w-[240px]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-on-secondary-container" style={{fontVariationSettings: "'FILL' 1"}}>shield</span>
              </div>
              <span className="text-xs font-bold text-on-background">Bảo mật cao cấp</span>
            </div>
            <p className="text-[10px] text-on-surface-variant leading-relaxed">Tài khoản được bảo vệ bởi mã hóa AES-256 và xác thực hai yếu tố (2FA).</p>
          </div>
        </section>
      </div>
    </>
  );
}

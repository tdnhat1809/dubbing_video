'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <>
      {/* TOP BANNER */}
      <div className="w-full bg-primary/20 backdrop-blur-md py-3 px-6 text-center z-50 sticky top-0 border-b border-white/10 shadow-lg shadow-primary/10">
        <p className="text-primary font-black tracking-widest text-xs uppercase animate-pulse">
          🔥🔥 Đăng nhập bằng Google để nhận ngay Voucher 200.000 Point 🔥🔥
        </p>
      </div>


      {/* MAIN SPLIT LAYOUT */}
      <div className="flex-grow flex flex-col md:flex-row min-h-screen bg-background">
        {/* LEFT SIDE (40%) */}
        <section className="w-full md:w-[45%] hero-gradient flex flex-col justify-between p-16 relative overflow-hidden text-white">
          <div className="relative z-10 space-y-12">
            <Link href="/" className="flex items-center gap-4 group">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
              </div>
              <span className="text-3xl font-black tracking-tighter">B2Vision</span>
            </Link>
            
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-7xl font-black leading-[1.05] tracking-tighter">
                Nơi khởi đầu của <br />
                <span className="text-gradient">Sự sáng tạo</span> <br />
                không giới hạn.
              </h1>
              <p className="text-white/60 text-xl font-medium max-w-md leading-relaxed">
                Tham gia cùng hơn 20,000 creators đã và đang thay đổi cách thế giới xem video.
              </p>
            </div>
            
            {/* Feature preview */}
            <div className="grid grid-cols-2 gap-6 pt-10">
              {['100+ Ngôn ngữ', '99% Chính xác', 'GPU Tốc độ cao', 'Hỗ trợ 24/7'].map((f, i) => (
                <div key={i} className="flex items-center gap-3 glass-panel p-4 rounded-2xl border border-white/5">
                  <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                  <span className="text-xs font-bold uppercase tracking-wider">{f}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative z-10 pt-10 border-t border-white/10 flex justify-between items-center text-sm font-bold text-white/40">
             <Link className="hover:text-primary transition-colors flex items-center gap-2" href="/">
               <span className="material-symbols-outlined">arrow_back</span> Trang chủ
             </Link>
             <span>© 2026 B2Vision AI</span>
          </div>

          {/* Decorations */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] -z-0"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-secondary/20 rounded-full blur-[100px] -z-0"></div>
        </section>


        {/* RIGHT SIDE (55%) */}
        <section className="w-full md:w-[55%] bg-background flex items-center justify-center p-8 md:p-32 relative">
          <div className="w-full max-w-xl space-y-12">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-on-background">Chào mừng <br /><span className="text-gradient">trở lại</span>.</h2>
              <p className="text-on-surface-variant text-xl font-medium">Bắt đầu hành trình sáng tạo của bạn ngay bây giờ.</p>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <button className="flex items-center justify-center gap-4 bg-white/5 py-5 px-8 rounded-2xl text-on-background font-black border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98] text-lg">
                <img className="w-7 h-7" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
                <span>Google</span>
              </button>
              <button className="flex items-center justify-center gap-4 bg-white/5 py-5 px-8 rounded-2xl text-on-background font-black border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98] text-lg">
                <img className="w-7 h-7" src="https://www.svgrepo.com/show/448224/facebook.svg" alt="Facebook" />
                <span>Facebook</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-6">
              <div className="flex-grow h-[1px] bg-white/5"></div>
              <span className="text-on-surface-variant text-sm font-black uppercase tracking-[0.2em]">Hoặc với email</span>
              <div className="flex-grow h-[1px] bg-white/5"></div>
            </div>

            {/* Form */}
            <form className="space-y-8" action="javascript:void(0)" onSubmit={(e) => e.preventDefault()}>
              {error && (
                <div className="bg-primary/10 border border-primary/30 text-primary px-6 py-4 rounded-2xl text-sm font-black animate-pulse">
                  {error}
                </div>
              )}
              <div className="space-y-3">
                <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] ml-2" htmlFor="email">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant/40">mail</span>
                  <input className="w-full pl-14 pr-8 py-5 glass-panel border-none rounded-3xl focus:ring-2 focus:ring-primary/40 focus:bg-white/5 transition-all outline-none font-bold text-lg text-on-background" id="email" placeholder="creators@b2vision.com" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center ml-2">
                  <label className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em]" htmlFor="password">Password</label>
                  <a className="text-xs font-black text-primary hover:underline uppercase tracking-widest" href="#">Quên mật khẩu?</a>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant/40">lock</span>
                  <input className="w-full pl-14 pr-8 py-5 glass-panel border-none rounded-3xl focus:ring-2 focus:ring-primary/40 focus:bg-white/5 transition-all outline-none font-bold text-lg text-on-background" id="password" placeholder="••••••••••••" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
                </div>
              </div>
              <div className="pt-6">
                <button className="w-full bg-primary text-white py-6 rounded-3xl font-black text-2xl shadow-2xl shadow-primary/40 hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50" type="button" disabled={loading}
                  onClick={async () => {
                    const emailVal = email || document.getElementById('email')?.value;
                    const passVal = password || document.getElementById('password')?.value;
                    if (!emailVal || !passVal) {
                      setError('Vui lòng nhập email và mật khẩu');
                      return;
                    }
                    setLoading(true);
                    setError('');
                    try {
                      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailVal, password: passVal, action: 'login' }) });
                      const data = await res.json();
                      if (!res.ok) {
                        setError(data.error || 'Đăng nhập thất bại');
                        setLoading(false);
                        return;
                      }
                      localStorage.setItem('user', emailVal);
                      localStorage.setItem('userRole', data.user?.role || 'user');
                      window.location.href = '/dashboard';
                    } catch (err) {
                      setError('Lỗi kết nối server');
                      setLoading(false);
                    }
                  }}>
                  {loading ? 'Processing...' : 'Đăng Nhập'}
                </button>
              </div>
            </form>

            <div className="text-center pt-10 border-t border-white/5">
              <p className="text-on-surface-variant text-lg font-medium">
                Sẵn sàng tham gia cộng đồng? <Link className="text-primary font-black hover:underline ml-2" href="/dang-ky">Đăng ký ngay</Link>
              </p>
            </div>
          </div>
        </section>


          {/* Glass Element */}
          <div className="hidden lg:block absolute bottom-12 right-12 glass-panel p-6 rounded-3xl border border-white/40 shadow-2xl max-w-[240px]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-on-secondary-container" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
              </div>
              <span className="text-xs font-bold text-on-background">Hệ thống bảo mật AI</span>
            </div>
            <p className="text-[10px] text-on-surface-variant leading-relaxed">Dữ liệu của bạn được mã hóa đa lớp và bảo vệ bởi hạ tầng điện toán đám mây tiên tiến nhất.</p>
          </div>
      </div>
    </>
  );
}

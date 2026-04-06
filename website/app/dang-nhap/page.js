'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <>
      {/* TOP BANNER */}
      <div className="w-full bg-inverse-surface py-3 px-6 text-center z-50 -mt-24">
        <p className="text-on-primary font-medium tracking-tight text-sm md:text-base">
          Đăng nhập bằng Google để nhận ngay Voucher 200.000 Point
        </p>
      </div>

      {/* MAIN SPLIT LAYOUT */}
      <div className="flex-grow flex flex-col md:flex-row min-h-[calc(100vh-48px)]">
        {/* LEFT SIDE (40%) */}
        <section className="w-full md:w-[40%] bg-[#f5e6e0] flex flex-col justify-between p-12 relative overflow-hidden">
          {/* Branding */}
          <div className="z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-on-primary shadow-lg">
                <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>auto_awesome</span>
              </div>
              <span className="text-2xl font-black tracking-tighter text-on-background">DichTuDong.com</span>
            </div>
          </div>

          {/* Content */}
          <div className="z-10 mt-12 md:mt-0">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-on-background leading-[1.1] tracking-tight mb-8">
              Phá vỡ mọi rào cản ngôn ngữ với dịch thuật AI.
            </h1>
            {/* Illustration */}
            <div className="relative w-full h-[400px] rounded-3xl overflow-hidden shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Artistic surreal illustration" className="w-full h-full object-cover" src="/images/faq/faq.avif" />
            </div>
          </div>

          {/* Footer Link */}
          <div className="z-10 pt-8">
            <Link className="group flex items-center gap-2 text-on-surface-variant font-semibold hover:text-primary transition-colors" href="/">
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Trang chủ</span>
            </Link>
          </div>

          {/* Decorations */}
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-container/20 rounded-full blur-[100px]"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-error-container/10 rounded-full blur-[80px]"></div>
        </section>

        {/* RIGHT SIDE (60%) */}
        <section className="w-full md:w-[60%] bg-surface-container-lowest flex items-center justify-center p-8 md:p-24 relative">
          <div className="w-full max-w-md space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-on-background">Đăng nhập một chạm</h2>
              <p className="text-on-surface-variant">Truy cập vào kho tàng ngôn ngữ của bạn</p>
            </div>

            {/* Social Login */}
            <div className="flex items-center gap-4">
              <button className="flex-grow flex items-center justify-center gap-3 bg-primary py-4 px-6 rounded-xl text-on-primary font-bold shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98]">
                <span className="material-symbols-outlined">login</span>
                <span>Đăng nhập bằng Google</span>
              </button>
              <button className="w-14 h-14 flex items-center justify-center border-2 border-outline-variant/30 rounded-xl text-on-surface hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined">brand_awareness</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-4">
              <div className="flex-grow h-[1px] bg-outline-variant/20"></div>
              <span className="text-on-surface-variant text-sm font-medium">Hoặc</span>
              <div className="flex-grow h-[1px] bg-outline-variant/20"></div>
            </div>

            {/* Form */}
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface ml-1" htmlFor="email">Email</label>
                <input className="w-full px-6 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant" id="email" placeholder="ten@congty.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-on-surface ml-1" htmlFor="password">Mật khẩu</label>
                  <a className="text-xs font-semibold text-primary hover:underline" href="#">Quên mật khẩu?</a>
                </div>
                <input className="w-full px-6 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant" id="password" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="pt-2">
                <button className="w-full bg-error-container text-on-error-container py-4 rounded-xl font-black text-lg shadow-xl shadow-error-container/20 hover:shadow-error-container/40 transition-all active:scale-[0.97]" type="submit">
                  Đăng Nhập
                </button>
              </div>
            </form>

            <div className="text-center pt-8">
              <p className="text-on-surface-variant text-sm">
                Chưa có tài khoản? <Link className="text-primary font-bold hover:underline ml-1" href="/dang-ky">Đăng ký ngay</Link>
              </p>
            </div>

            <div className="text-center opacity-40 text-[10px] uppercase tracking-widest pt-12">
              Bằng việc tiếp tục, bạn đồng ý với Điều khoản sử dụng &amp; Chính sách bảo mật
            </div>
          </div>

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
        </section>
      </div>
    </>
  );
}

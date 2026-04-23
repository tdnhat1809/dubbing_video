'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  return (
    <div className="bg-background min-h-screen text-on-background">
      {/* Hero Section */}
      <header className="relative pt-40 pb-20 px-8 text-center overflow-hidden hero-gradient">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-float"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] -z-10 animate-float" style={{animationDelay: '-3s'}}></div>
        
        <div className="relative z-10 space-y-8">
          <span className="inline-flex items-center px-6 py-2 rounded-xl glass-panel text-primary text-xs font-black tracking-[0.3em] uppercase border border-white/10">
            Kết Nối Với Chúng Tôi
          </span>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-on-background max-w-5xl mx-auto leading-[0.9]">
            Hãy để AI <br /><span className="text-gradient">Đồng hành cùng bạn</span>
          </h1>
          <p className="max-w-3xl mx-auto text-on-surface-variant text-xl md:text-2xl leading-relaxed font-medium">
            Mọi thắc mắc, góp ý hoặc yêu cầu hỗ trợ kỹ thuật, <br />
            chúng tôi luôn sẵn sàng lắng nghe và giải đáp 24/7.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 pb-40">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* Left - Visual and Info */}
          <div className="space-y-12">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
              <img 
                src="/images/icon_contact_3d_v2_1776255091263.png" 
                alt="Contact illustration" 
                className="relative z-10 w-full max-w-sm mx-auto animate-float drop-shadow-[0_20px_50px_rgba(99,102,241,0.3)] transition-transform group-hover:scale-110 duration-700" 
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: 'call', label: 'Hotline', value: '+84 33 444 8546', color: 'text-primary' },
                { icon: 'mail', label: 'Email Support', value: 'support@b2vision.com', color: 'text-secondary' },
                { icon: 'forum', label: 'Telegram', value: '@b2vision_support', color: 'text-accent' },
                { icon: 'location_on', label: 'Văn Phòng', value: 'Hà Nội, Việt Nam', color: 'text-primary' },
              ].map((info, i) => (
                <div key={i} className="p-8 glass-card rounded-3xl border border-white/5 hover:border-primary/30 transition-all group overflow-hidden">
                  <div className="w-12 h-12 rounded-2xl glass-panel flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <span className={`material-symbols-outlined ${info.color} text-3xl`} style={{fontVariationSettings: "'FILL' 1"}}>{info.icon}</span>
                  </div>
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">{info.label}</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-on-surface break-all md:break-normal">{info.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Glass Form */}
          <div className="glass-card p-12 md:p-16 rounded-[4rem] border border-white/10 glow-soft shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            
            <form className="relative z-10 space-y-8" onSubmit={(e) => { e.preventDefault(); alert('Cảm ơn! Tin nhắn đã được gửi.'); }}>
              <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-1">Họ và Tên</label>
                  <input 
                    className="w-full px-6 py-4 glass-panel bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:bg-white/10 transition-all outline-none text-on-surface" 
                    placeholder="Nguyễn Văn A" 
                    type="text" 
                    value={form.name} 
                    onChange={(e) => setForm({...form, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-1">Email</label>
                  <input 
                    className="w-full px-6 py-4 glass-panel bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:bg-white/10 transition-all outline-none text-on-surface" 
                    placeholder="example@email.com" 
                    type="email" 
                    value={form.email} 
                    onChange={(e) => setForm({...form, email: e.target.value})} 
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-1">Chủ Đề</label>
                <input 
                  className="w-full px-8 py-5 glass-panel bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:bg-white/10 transition-all outline-none text-on-surface" 
                  placeholder="Tôi muốn tìm hiểu về gói Enterprise" 
                  type="text" 
                  value={form.subject} 
                  onChange={(e) => setForm({...form, subject: e.target.value})} 
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-on-surface-variant uppercase tracking-widest ml-1">Tin Nhắn</label>
                <textarea 
                  className="w-full px-8 py-5 glass-panel bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:bg-white/10 transition-all outline-none text-on-surface min-h-[150px] resize-none" 
                  placeholder="Nhập nội dung tin nhắn của bạn..." 
                  value={form.message} 
                  onChange={(e) => setForm({...form, message: e.target.value})} 
                />
              </div>

              <button className="w-full py-6 rounded-[2rem] bg-primary text-white font-black text-2xl hover:scale-[0.98] active:scale-95 transition-all shadow-2xl shadow-primary/40 flex items-center justify-center gap-4" type="submit">
                Gửi Tin Nhắn
                <span className="material-symbols-outlined text-3xl">send</span>
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Map or Newsletter Area with Cosmic Styling */}
      <section className="max-w-7xl mx-auto px-8 mb-40">
        <div className="glass-card rounded-[4rem] p-16 md:p-32 text-center relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]"></div>
          <div className="absolute inset-0 bg-[url('/images/section-map.png')] opacity-10 bg-center bg-no-repeat bg-contain"></div>
          
          <div className="relative z-10 space-y-10">
            <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">Gia nhập cộng đồng <br /><span className="text-gradient">Creators vươn tầm thế giới</span></h2>
            <p className="text-on-surface-variant text-xl md:text-2xl leading-relaxed max-w-3xl mx-auto">Nhận ngay 10 phút dịch video miễn phí khi hoàn tất đăng ký tài khoản mới.</p>
            <div className="pt-8">
              <Link href="/dang-nhap" className="px-16 py-6 bg-secondary text-white rounded-3xl font-black text-2xl hover:scale-95 transition-all shadow-2xl shadow-secondary/40">
                Đăng ký ngay miễn phí
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

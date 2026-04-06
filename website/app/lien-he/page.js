'use client';
import { useState } from 'react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  return (
    <>
      {/* Hero area */}
      <section className="relative pt-12 pb-8 px-8 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-primary-container/15 to-transparent"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left */}
            <div className="space-y-8">
              <h1 className="text-5xl md:text-6xl font-extrabold text-on-background leading-[1.1] tracking-tight italic">
                Liên Hệ Với <span className="text-primary">Chúng Tôi</span>
              </h1>
              <p className="text-on-surface-variant leading-relaxed max-w-md">
                Đội ngũ của chúng tôi luôn sẵn sàng hỗ trợ bạn. Hãy gửi tin nhắn hoặc gọi cho chúng tôi nếu bạn có bất kỳ câu hỏi nào.
              </p>

              {/* Info Cards */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-5 bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>call</span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">PHONE</p>
                    <p className="text-on-surface font-bold">+84 33 444 8546</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-5 bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>mail</span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">EMAIL</p>
                    <p className="text-on-surface font-bold">support@dichtudong.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-5 bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>location_on</span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">ADDRESS</p>
                    <p className="text-on-surface font-bold">Việt Nam</p>
                  </div>
                </div>
              </div>

              {/* Social */}
              <div>
                <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mb-4">THEO DÕI CHÚNG TÔI</p>
                <div className="flex gap-3">
                  {['diversity_3', 'translate', 'play_circle', 'forum'].map((icon, i) => (
                    <a key={i} href="#" className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-white transition-all">
                      <span className="material-symbols-outlined text-lg">{icon}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Right - Form */}
            <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-lg">
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert('Cảm ơn! Tin nhắn đã được gửi.'); }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface ml-1">Họ Tên</label>
                    <input className="w-full px-5 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant text-sm" placeholder="Nhập tên của bạn" type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-on-surface ml-1">Email</label>
                    <input className="w-full px-5 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant text-sm" placeholder="example@email.com" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface ml-1">Chủ Đề</label>
                  <input className="w-full px-5 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant text-sm" placeholder="Bạn cần hỗ trợ về điều gì?" type="text" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface ml-1">Nội Dung</label>
                  <textarea className="w-full px-5 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline-variant text-sm resize-none" rows={5} placeholder="Viết tin nhắn của bạn tại đây..." value={form.message} onChange={(e) => setForm({...form, message: e.target.value})}></textarea>
                </div>
                <button className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary-fixed text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-primary-container/40" type="submit">
                  Gửi Tin Nhắn <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="max-w-7xl mx-auto px-8 my-24">
        <div className="bg-gradient-to-br from-primary via-primary-dim to-secondary rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/10 blur-[100px] rounded-full"></div>
          <h3 className="text-3xl md:text-4xl font-bold mb-6 text-white italic">Tham gia với chúng tôi để nhận thông tin ưu đãi mới nhất</h3>
          <p className="mb-10 text-white/80 max-w-xl mx-auto text-sm">Cập nhật các tính năng AI mới nhất và nhận mã giảm giá đặc quyền chỉ dành cho thành viên đăng ký sớm.</p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input className="flex-grow bg-white/20 backdrop-blur border-none rounded-xl px-6 py-4 text-white placeholder:text-white/60 focus:ring-2 focus:ring-white/30 outline-none" placeholder="Địa chỉ email của bạn" type="email" />
            <button className="bg-white text-primary px-8 py-4 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all">
              Đăng Ký
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

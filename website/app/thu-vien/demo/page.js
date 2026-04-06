'use client';
import { useState, useEffect, useCallback } from 'react';

const demos = [
  { title: 'Dịch Video Youtube Anh → Việt', desc: 'Video review công nghệ được dịch tự động từ tiếng Anh sang tiếng Việt với AI Voice Cloning.', lang: '🇬🇧 → 🇻🇳', duration: '5:30', img: '/images/library/chat-gpt-2.jpg', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu%207.mp4' },
  { title: 'Dịch Video Tiktok Trung → Việt', desc: 'Video Douyin/Tiktok được dịch từ tiếng Trung sang tiếng Việt, giữ nguyên hiệu ứng và nhạc nền.', lang: '🇨🇳 → 🇻🇳', duration: '1:00', img: '/images/library/thanh-xuan.jpg', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu1.mp4' },
  { title: 'Lồng tiếng AI phim tài liệu', desc: 'Phim tài liệu thiên nhiên được lồng tiếng AI tự nhiên, đa giọng nói, giữ nguyên âm thanh nền.', lang: '🇫🇷 → 🇻🇳', duration: '12:00', img: '/images/library/ted-01.jpg', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu9.mp4' },
  { title: 'Chuyển đổi Audio Podcast', desc: 'Podcast tiếng Nhật được chuyển đổi sang tiếng Việt với giọng đọc AI tự nhiên.', lang: '🇯🇵 → 🇻🇳', duration: '25:00', img: '/images/library/ai-02.jpg', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu10.mp4' },
];

function VideoModal({ demo, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fadeIn" />
      <div className="relative z-10 w-[90vw] max-w-[900px] animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        <button className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors group" onClick={onClose}>
          <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform">close</span>
        </button>
        <div className="mb-4">
          <h3 className="text-white text-xl font-bold">{demo.title}</h3>
          <p className="text-white/60 text-sm mt-1">{demo.lang} • {demo.duration}</p>
        </div>
        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
          <video className="w-full aspect-video" controls autoPlay playsInline src={demo.video}>
            Trình duyệt không hỗ trợ phát video.
          </video>
        </div>
        <p className="text-white/50 text-sm mt-4">{demo.desc}</p>
      </div>
    </div>
  );
}

export default function DemoPage() {
  const [selectedDemo, setSelectedDemo] = useState(null);
  const handleClose = useCallback(() => setSelectedDemo(null), []);

  return (
    <>
      <header className="relative overflow-hidden pt-20 pb-32 px-6">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-primary-container blur-[60px] opacity-40 -z-10"></div>
        <div className="max-w-4xl mx-auto text-center">
          <nav className="flex justify-center items-center gap-2 mb-6 text-sm font-medium text-on-surface-variant/70">
            <span>Trang Chủ</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span>Thư Viện</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary font-semibold">DEMO</span>
          </nav>
          <h1 className="text-6xl md:text-7xl italic font-light tracking-tight text-on-background mb-8">DEMO</h1>
          <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed max-w-3xl mx-auto">
            Xem trực tiếp các video đã được dịch bởi AI. So sánh chất lượng trước và sau khi dịch.
          </p>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-8 py-20">
        <div className="space-y-12">
          {demos.map((demo, i) => (
            <div key={i} className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col md:flex-row cursor-pointer" onClick={() => setSelectedDemo(demo)}>
              <div className="relative md:w-[45%] aspect-video overflow-hidden">
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={demo.img} alt={demo.title} />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-20 h-20 bg-[#ff0000] rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-white text-5xl" style={{fontVariationSettings: "'FILL' 1"}}>play_arrow</span>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-black/80 text-white text-sm px-3 py-1 rounded-lg font-medium">{demo.duration}</div>
              </div>
              <div className="p-8 md:p-12 flex flex-col justify-center md:w-[55%]">
                <span className="text-2xl mb-3">{demo.lang}</span>
                <h3 className="text-2xl font-bold text-on-surface mb-4">{demo.title}</h3>
                <p className="text-on-surface-variant leading-relaxed mb-6">{demo.desc}</p>
                <button className="self-start px-8 py-3 bg-primary text-on-primary rounded-xl font-bold hover:scale-95 transition-transform shadow-lg shadow-primary/20">
                  Xem Demo
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {selectedDemo && <VideoModal demo={selectedDemo} onClose={handleClose} />}
      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scaleIn { animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </>
  );
}

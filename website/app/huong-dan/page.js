'use client';
import { useState, useEffect, useCallback } from 'react';

const tutorialVideos = [
  { title: 'Hướng dẫn dịch Video tự động', views: '125K lượt xem', date: '2 ngày trước', duration: '12:45', img: '/images/library/chat-gpt-2.jpg', video: 'https://dichtudong.com/vi-vn/image/huong-dan.mp4' },
  { title: 'Hướng dẫn dịch Video TikTok', views: '89K lượt xem', date: '1 tuần trước', duration: '08:20', img: '/images/library/ceo-tiktok-1.jpg', video: 'https://dichtudong.com/vi-vn/image/huong-dan-dich-tu-dong.mp4' },
  { title: 'Hướng dẫn lồng tiếng AI nâng cao', views: '210K lượt xem', date: '3 tuần trước', duration: '15:10', img: '/images/library/ted-01.jpg', video: 'https://dichtudong.com/vi-vn/image/huong-dan-chinh-sua-noi-dung.mp4' },
];

const faqItems = [
  { q: 'Làm cách nào để dịch Video??', a: 'Bạn chỉ cần truy cập b2vision.com, đăng nhập tài khoản, upload video và chọn ngôn ngữ cần dịch. Hệ thống AI sẽ tự động xử lý và trả kết quả trong vài phút.' },
  { q: 'Sử dụng b2vision.com dịch có nhanh và chính xác không?', a: 'Sử dụng công nghệ AI Engine mới nhất hiện nay và tối ưu hóa riêng cho Video khiến cho bản dịch tại b2vision.com tự động 95% và độ chính xác lên đến 97,8%!' },
  { q: 'Làm cách nào để tải xuống Video đã dịch??', a: 'Sau khi video được xử lý xong, bạn sẽ nhận được thông báo. Truy cập vào mục "Video của tôi" và nhấn nút tải xuống để lưu video về máy.' },
  { q: 'Có dịch được Video Douyin, Tiktok không?', a: 'Có! B2Vision hỗ trợ dịch video từ mọi nền tảng bao gồm Youtube, Tiktok, Douyin, Instagram Reels và nhiều nền tảng khác.' },
  { q: 'Dịch video từ ngôn ngữ nào?', a: 'Chúng tôi hỗ trợ hơn 50 ngôn ngữ bao gồm Tiếng Anh, Tiếng Trung, Tiếng Nhật, Tiếng Hàn, Tiếng Pháp, Tiếng Đức và nhiều ngôn ngữ khác.' },
];

/* ─── Video Modal ─── */
function VideoModal({ video, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fadeIn" />
      <div className="relative z-10 w-[90vw] max-w-[900px] animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        <button className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors group" onClick={onClose}>
          <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform">close</span>
        </button>
        <div className="mb-4">
          <h3 className="text-white text-xl font-bold">{video.title}</h3>
          <p className="text-white/60 text-sm mt-1">{video.views} • {video.date}</p>
        </div>
        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
          <video className="w-full aspect-video" controls autoPlay playsInline src={video.video}>
            Trình duyệt của bạn không hỗ trợ phát video.
          </video>
        </div>
      </div>
    </div>
  );
}

export default function HuongDanPage() {
  const [openFaq, setOpenFaq] = useState(1);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const handleClose = useCallback(() => setSelectedVideo(null), []);

  return (
    <>
      {/* Hero Section: Video Carousel */}
      <section className="relative overflow-hidden pt-32 pb-40 px-8 hero-gradient">
        <div className="absolute top-0 right-0 -z-10 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[100px] animate-float" style={{animationDelay: '-2s'}}></div>
        
        <div className="max-w-screen-2xl mx-auto relative z-10 text-center md:text-left space-y-16">
          <div className="space-y-6">
            <h1 className="text-white text-6xl md:text-8xl font-black tracking-tighter">
              Bắt đầu với <br />
              <span className="text-gradient">B2Vision</span>
            </h1>
            <p className="text-[#f4f1ff]/60 text-xl md:text-2xl max-w-3xl leading-relaxed">
              Khám phá sức mạnh của AI trong việc biên dịch và lồng tiếng video tự động. 
              Các hướng dẫn chi tiết giúp bạn làm chủ công cụ chỉ trong vài phút.
            </p>
          </div>
          
          {/* Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {tutorialVideos.map((video, i) => (
              <div key={i} className="group glass-card rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-primary/50 transition-all duration-700 cursor-pointer shadow-2xl" onClick={() => setSelectedVideo(video)}>
                <div className="aspect-video relative overflow-hidden">
                  <img className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-80 group-hover:opacity-100" src={video.img} alt={video.title} />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.6)] transform scale-50 group-hover:scale-100 transition-all duration-500">
                      <span className="material-symbols-outlined text-white text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>play_arrow</span>
                    </div>
                  </div>
                  <div className="absolute bottom-4 right-4 glass-panel text-white text-[10px] font-black px-3 py-1 rounded-lg border border-white/20 uppercase tracking-widest">{video.duration}</div>
                </div>
                <div className="p-8 space-y-4">
                  <h3 className="text-white font-black text-xl leading-snug group-hover:text-primary transition-colors">{video.title}</h3>
                  <div className="flex items-center text-white/40 text-xs font-bold uppercase tracking-widest gap-3">
                    <span>{video.views}</span>
                    <span className="w-1.5 h-1.5 bg-white/20 rounded-full"></span>
                    <span>{video.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* FAQ Section */}
      <section id="faq" className="py-40 px-8 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10"></div>
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-32 items-center">
            <div className="w-full lg:w-[60%]">
              <div className="mb-16">
                <span className="px-4 py-2 glass-panel text-primary rounded-xl text-xs font-black uppercase tracking-[0.3em] mb-8 inline-block">Hỗ Trợ & Giải Đáp</span>
                <h2 className="text-on-background text-5xl md:text-7xl font-black mb-6 tracking-tighter">Bạn hỏi, <br /><span className="text-gradient">Chúng tôi trả lời</span></h2>
              </div>
              <div className="space-y-6">
                {faqItems.map((item, i) => (
                  <div key={i} className={`rounded-[2rem] transition-all duration-500 overflow-hidden ${openFaq === i ? 'glass-card border-l-4 border-primary shadow-2xl' : 'glass-panel'}`}>
                    <div className={`p-8 flex justify-between items-center cursor-pointer ${openFaq === i ? 'border-b border-white/5' : ''}`} onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                      <h3 className={`font-black text-xl md:text-2xl ${openFaq === i ? 'text-primary' : 'text-on-surface'}`}>{item.q}</h3>
                      <div className={`w-10 h-10 rounded-full glass-panel flex items-center justify-center transition-transform ${openFaq === i ? 'rotate-180 bg-primary/20' : ''}`}>
                        <span className="material-symbols-outlined text-primary">expand_more</span>
                      </div>
                    </div>
                    {openFaq === i && (<div className="p-8 text-on-surface-variant leading-relaxed text-lg animate-fadeIn">{item.a}</div>)}
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full lg:w-[40%]">
              <div className="relative glass-card rounded-[4rem] overflow-hidden aspect-square flex items-center justify-center p-16 animate-float">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent"></div>
                <img className="relative z-10 w-full h-auto drop-shadow-2xl transition-transform group-hover:scale-105 duration-700" src="/images/icon_knowledge_3d_v2_1776255139521.png" alt="FAQ illustration" />
                <div className="absolute -bottom-10 -right-10 text-[12rem] font-black text-white/5 select-none uppercase tracking-tighter">FAQ</div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Newsletter CTA */}
      <section className="max-w-screen-2xl mx-auto px-8 mb-40">
        <div className="glass-card rounded-[4rem] p-16 md:p-32 text-center relative overflow-hidden shadow-2xl border border-white/10 glow-soft">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
          <div className="relative z-10 max-w-4xl mx-auto space-y-10">
            <h2 className="text-white text-4xl md:text-7xl font-black tracking-tighter leading-tight">Sẵn sàng nâng tầm <br /> <span className="text-gradient">Video của bạn?</span></h2>
            <p className="text-[#f4f1ff]/80 text-xl md:text-2xl leading-relaxed">Đăng ký nhận tin tức và các bản cập nhật công nghệ dịch thuật AI mới nhất từ chúng tôi.</p>
            <div className="flex flex-col md:flex-row gap-6 bg-white/5 p-4 rounded-3xl backdrop-blur-3xl border border-white/10 overflow-hidden group focus-within:border-primary/50 transition-all">
              <input className="bg-transparent border-none focus:ring-0 text-white placeholder-white/30 px-6 py-4 flex-grow text-xl outline-none font-medium" placeholder="Nhập địa chỉ email của bạn..." type="email" />
              <button className="bg-primary text-white font-black px-12 py-5 rounded-2xl hover:scale-95 transition-all shadow-2xl shadow-primary/40 text-xl whitespace-nowrap">Tham Gia Ngay</button>
            </div>
          </div>
        </div>
      </section>


      {/* Video Modal */}
      {selectedVideo && <VideoModal video={selectedVideo} onClose={handleClose} />}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scaleIn { animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </>
  );
}

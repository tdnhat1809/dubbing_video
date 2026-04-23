'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const videos = [
  { id: 1, title: 'CEO TikTok phát biểu trước Quốc hội', category: 'Tiktok', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-video', img: '/images/library/ceo-tiktok-1.jpg', filter: 'Tiktok', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu11.mp4' },
  { id: 2, title: 'ChatGPT - Trí tuệ nhân tạo thay đổi thế giới', category: 'Tech Review', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-video', img: '/images/library/chat-gpt-2.jpg', filter: 'Youtube', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu%207.mp4' },
  { id: 3, title: 'Thanh Xuân - Phim ngắn viral', category: 'Video', lang: 'Dịch: Trung -> Việt (AI)', aspect: 'aspect-[9/16]', img: '/images/library/thanh-xuan.jpg', filter: 'Tiktok', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu1.mp4' },
  { id: 4, title: 'Hoạt hình Anime - Dịch lồng tiếng', category: 'Animation', lang: 'Dịch: Nhật -> Việt (AI)', aspect: 'aspect-[9/16]', img: '/images/library/hoat-hinh-01.jpg', filter: 'Video', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu16.mp4' },
  { id: 5, title: 'Sean - Phỏng vấn quốc tế', category: 'Interview', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-video', img: '/images/library/sean-1.jpg', filter: 'Youtube', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu6.mp4' },
  { id: 6, title: 'Hữu Minh - Chia sẻ kinh nghiệm', category: 'Vlog', lang: 'Dịch: Việt -> Anh (AI)', aspect: 'aspect-video', img: '/images/library/huu-minh.jpg', filter: 'Video', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu2.mp4' },
  { id: 7, title: 'AI và tương lai công nghệ', category: 'Tech', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-square', img: '/images/library/ai-02.jpg', filter: 'Video', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu10.mp4' },
  { id: 8, title: 'TED Talk - Bài thuyết trình #1', category: 'Education', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-video', img: '/images/library/ted-01.jpg', filter: 'Youtube', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu9.mp4' },
  { id: 9, title: 'TED Talk - Bài thuyết trình #2', category: 'Education', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-[3/4]', img: '/images/library/ted-02.jpg', filter: 'Audio', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu12.mp4' },
  { id: 10, title: 'TED Talk - Bài thuyết trình #3', category: 'Education', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-video', img: '/images/library/ted-03.jpg', filter: 'Youtube', video: 'https://dichtudong.com/vi-vn/image/video-tai-lieu/tai_lieu13.mp4' },
];

const filters = ['Tất Cả', 'Video', 'Audio', 'Youtube', 'Tiktok'];

/* ─── Video Modal Component ─── */
function VideoModal({ video, onClose }) {
  // Close on Esc key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fadeIn" />

      {/* Modal Content */}
      <div
        className="relative z-10 w-[90vw] max-w-[900px] animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors group"
          onClick={onClose}
        >
          <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform">close</span>
        </button>

        {/* Video Title */}
        <div className="mb-4">
          <h3 className="text-white text-xl font-bold">{video.title}</h3>
          <p className="text-white/60 text-sm mt-1">{video.lang}</p>
        </div>

        {/* Video Player */}
        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
          <video
            className="w-full aspect-video"
            controls
            autoPlay
            playsInline
            src={video.video}
          >
            Trình duyệt của bạn không hỗ trợ phát video.
          </video>
        </div>

        {/* Video Info */}
        <div className="mt-4 flex items-center gap-4 text-white/50 text-sm">
          <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold">{video.category}</span>
          <span>{video.lang}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function ThuVienPage() {
  const [activeFilter, setActiveFilter] = useState('Tất Cả');
  const [selectedVideo, setSelectedVideo] = useState(null);

  const filtered = activeFilter === 'Tất Cả' ? videos : videos.filter(v => v.filter === activeFilter);

  const handleClose = useCallback(() => setSelectedVideo(null), []);

  return (
    <>
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-40 pb-40 px-8 hero-gradient">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-float"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] -z-10 animate-float" style={{animationDelay: '-3s'}}></div>
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10 text-center lg:text-left">
            <nav className="flex justify-center lg:justify-start items-center gap-3 text-sm font-bold text-on-surface-variant/60 uppercase tracking-widest">
              <Link href="/" className="hover:text-primary transition-colors">Trang Chủ</Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary">Thư Viện</span>
            </nav>
            <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-on-background leading-[0.9]">
              <span className="text-gradient">Thư Viện</span> <br /> Kết Quả AI
            </h1>
            <p className="text-xl md:text-2xl text-on-surface-variant leading-relaxed font-medium">
              Khám phá sức mạnh của trí tuệ nhân tạo thông qua các sản phẩm thực tế. 
              Tất cả video được tạo bởi <span className="font-bold text-primary">B2Vision</span>.
            </p>
          </div>
          <div className="relative group flex justify-center">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
            <img 
              src="/images/icon_media_stack_3d_v2_1776255171860.png" 
              alt="Media Library" 
              className="relative z-10 w-full max-w-md animate-float drop-shadow-2xl transition-transform group-hover:scale-105 duration-700" 
            />
          </div>
        </div>
      </header>


      {/* Filter Section */}
      <section className="bg-background/80 backdrop-blur-xl py-8 sticky top-[72px] z-40 border-y border-white/5">
        <div className="max-w-screen-2xl mx-auto px-8">
          <div className="flex flex-wrap justify-center gap-4">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-10 py-3.5 rounded-2xl font-bold transition-all text-sm uppercase tracking-widest ${
                  activeFilter === f
                    ? 'bg-primary text-on-primary shadow-2xl shadow-primary/40 scale-105'
                    : 'glass-panel text-on-surface hover:bg-white/5 border border-white/10'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>


      {/* Masonry Video Grid */}
      <main className="max-w-screen-2xl mx-auto px-8 py-24">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8">
          {filtered.map(video => (
            <div
              key={video.id}
              className="mb-8 break-inside-avoid group cursor-pointer overflow-hidden rounded-[2.5rem] glass-card shadow-2xl hover:border-primary/50 transition-all duration-700"
              onClick={() => setSelectedVideo(video)}
            >
              <div className={`relative overflow-hidden ${video.aspect}`}>
                <img
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80 group-hover:opacity-100"
                  src={video.img}
                />
                
                {/* Content Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent flex flex-col justify-end p-8">
                  <div className="space-y-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border border-primary/20">{video.category}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                      <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{video.filter}</span>
                    </div>
                    <h3 className="text-white text-2xl font-black leading-tight group-hover:text-primary transition-colors">{video.title}</h3>
                    <div className="flex items-center gap-3 text-white/70 text-sm font-medium">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                        <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>translate</span>
                      </div>
                      <span>{video.lang}</span>
                    </div>
                  </div>
                </div>

                {/* Play Button Center */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                  <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.6)] transform scale-50 group-hover:scale-100 transition-all duration-500">
                    <span className="material-symbols-outlined text-white text-6xl" style={{fontVariationSettings: "'FILL' 1"}}>play_arrow</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-24 text-center">
          <button className="px-12 py-5 rounded-2xl bg-primary text-on-primary font-black text-xl hover:scale-95 transition-all shadow-2xl shadow-primary/40">
            Xem thêm Video mẫu
          </button>
        </div>
      </main>


      {/* Video Modal */}
      {selectedVideo && (
        <VideoModal video={selectedVideo} onClose={handleClose} />
      )}

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  );
}

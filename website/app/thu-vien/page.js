'use client';
import { useState } from 'react';

const videos = [
  { id: 1, title: 'CEO TikTok phát biểu trước Quốc hội', category: 'Tiktok', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-video', img: '/images/library/ceo-tiktok-1.jpg', filter: 'Tiktok' },
  { id: 2, title: 'ChatGPT - Trí tuệ nhân tạo thay đổi thế giới', category: 'Tech Review', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-video', img: '/images/library/chat-gpt-2.jpg', filter: 'Youtube' },
  { id: 3, title: 'Hoạt hình Anime - Dịch lồng tiếng', category: 'Animation', lang: 'Dịch: Nhật -> Việt (AI)', aspect: 'aspect-[9/16]', img: '/images/library/hoat-hinh-01.jpg', filter: 'Video' },
  { id: 4, title: 'Thanh Xuân - Ca khúc viral TikTok', category: 'Music', lang: 'Dịch: Trung -> Việt (AI)', aspect: 'aspect-[9/16]', img: '/images/library/thanh-xuan.jpg', filter: 'Tiktok' },
  { id: 5, title: 'Sean - Phỏng vấn quốc tế', category: 'Interview', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-video', img: '/images/library/sean-1.jpg', filter: 'Youtube' },
  { id: 6, title: 'Hữu Minh - Chia sẻ kinh nghiệm', category: 'Vlog', lang: 'Dịch: Việt -> Anh (AI)', aspect: 'aspect-video', img: '/images/library/huu-minh.jpg', filter: 'Video' },
  { id: 7, title: 'AI và tương lai công nghệ', category: 'Tech', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-square', img: '/images/library/ai-02.jpg', filter: 'Video' },
  { id: 8, title: 'TED Talk - Bài thuyết trình #1', category: 'Education', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-video', img: '/images/library/ted-01.jpg', filter: 'Youtube' },
  { id: 9, title: 'TED Talk - Bài thuyết trình #2', category: 'Education', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-[3/4]', img: '/images/library/ted-02.jpg', filter: 'Audio' },
  { id: 10, title: 'TED Talk - Bài thuyết trình #3', category: 'Education', lang: 'Dịch: Anh -> Việt (AI)', aspect: 'aspect-video', img: '/images/library/ted-03.jpg', filter: 'Youtube' },
];

const filters = ['Tất Cả', 'Video', 'Audio', 'Youtube', 'Tiktok'];

export default function ThuVienPage() {
  const [activeFilter, setActiveFilter] = useState('Tất Cả');

  const filtered = activeFilter === 'Tất Cả' ? videos : videos.filter(v => v.filter === activeFilter);

  return (
    <>
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-20 pb-32 px-6">
        {/* Decorative Shapes */}
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-primary-container blur-[60px] opacity-40 -z-10"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-surface-container blur-[60px] opacity-40 -z-10"></div>
        <div className="absolute top-[20%] right-[10%] w-0 h-0 border-l-[150px] border-l-transparent border-r-[150px] border-r-transparent border-b-[260px] border-b-primary opacity-20 blur-[60px] -z-10"></div>
        <div className="max-w-4xl mx-auto text-center">
          <nav className="flex justify-center items-center gap-2 mb-6 text-sm font-medium text-on-surface-variant/70">
            <span>Trang Chủ</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary font-semibold">Thư Viện</span>
          </nav>
          <h1 className="text-6xl md:text-7xl italic font-light tracking-tight text-on-background mb-8 font-headline">
            Thư Viện
          </h1>
          <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed max-w-3xl mx-auto">
            Tất cả Video trong Thư Viện đều được tạo hoàn toàn tự động bằng <span className="font-bold text-primary">dichtudong.com</span> và chưa qua BẤT KỲ chỉnh sửa nào. Chúng tôi muốn cung cấp cho khách hàng cái nhìn khách quan nhất về sức mạnh công cụ của chúng tôi.
          </p>
        </div>
      </header>

      {/* Filter Section */}
      <section className="bg-surface-container-low py-10 sticky top-[72px] z-40">
        <div className="max-w-screen-2xl mx-auto px-8">
          <div className="flex flex-wrap justify-center gap-4">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-8 py-3 rounded-full font-semibold transition-all ${
                  activeFilter === f
                    ? 'bg-primary text-on-primary shadow-xl shadow-primary/20'
                    : 'border border-outline-variant text-on-surface hover:bg-surface-container-highest font-medium'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Masonry Video Grid */}
      <main className="max-w-screen-2xl mx-auto px-8 py-20">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
          {filtered.map(video => (
            <div key={video.id} className="mb-6 break-inside-avoid group cursor-pointer overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-2xl transition-all duration-500">
              <div className={`relative overflow-hidden ${video.aspect}`}>
                <img
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  src={video.img}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(48,41,80,0.8)] to-transparent flex flex-col justify-end p-6">
                  <span className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2">{video.category}</span>
                  <h3 className="text-white text-xl font-bold leading-tight">{video.title}</h3>
                  <div className="flex items-center gap-2 mt-4 text-white/90 text-sm">
                    <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>play_circle</span>
                    <span>{video.lang}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-20 text-center">
          <button className="px-10 py-4 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-all duration-300">
            Xem thêm video
          </button>
        </div>
      </main>
    </>
  );
}

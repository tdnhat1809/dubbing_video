'use client';
import { useState } from 'react';

const tutorialVideos = [
  { title: 'Hướng dẫn dịch Video Anh-Việt', views: '125K lượt xem', date: '2 ngày trước', duration: '12:45', img: '/images/library/chat-gpt-2.jpg' },
  { title: 'Hướng dẫn dịch Video TikTok', views: '89K lượt xem', date: '1 tuần trước', duration: '08:20', img: '/images/library/ceo-tiktok-1.jpg' },
  { title: 'Hướng dẫn lồng tiếng AI nâng cao', views: '210K lượt xem', date: '3 tuần trước', duration: '15:10', img: '/images/library/ted-01.jpg' },
];

const faqItems = [
  { q: 'Làm cách nào để dịch Video??', a: 'Bạn chỉ cần truy cập dichtudong.com, đăng nhập tài khoản, upload video và chọn ngôn ngữ cần dịch. Hệ thống AI sẽ tự động xử lý và trả kết quả trong vài phút.' },
  { q: 'Sử dụng dichtudong.com dịch có nhanh và chính xác không?', a: 'Sử dụng công nghệ AI Engine mới nhất hiện nay và tối ưu hóa riêng cho Video khiến cho bản dịch tại dichtudong.com tự động 95% và độ chính xác lên đến 97,8%!' },
  { q: 'Làm cách nào để tải xuống Video đã dịch??', a: 'Sau khi video được xử lý xong, bạn sẽ nhận được thông báo. Truy cập vào mục "Video của tôi" và nhấn nút tải xuống để lưu video về máy.' },
  { q: 'Có dịch được Video Douyin, Tiktok không?', a: 'Có! DichTuDong hỗ trợ dịch video từ mọi nền tảng bao gồm Youtube, Tiktok, Douyin, Instagram Reels và nhiều nền tảng khác.' },
  { q: 'Dịch video từ ngôn ngữ nào?', a: 'Chúng tôi hỗ trợ hơn 50 ngôn ngữ bao gồm Tiếng Anh, Tiếng Trung, Tiếng Nhật, Tiếng Hàn, Tiếng Pháp, Tiếng Đức và nhiều ngôn ngữ khác.' },
];

export default function HuongDanPage() {
  const [openFaq, setOpenFaq] = useState(1);

  return (
    <>
      {/* Hero Section: Video Carousel */}
      <section className="min-h-[716px] flex flex-col items-center justify-center py-20 px-8 relative overflow-hidden" style={{ background: 'radial-gradient(circle at top right, #302950, #0f072e)' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary rounded-full blur-[100px]"></div>
        </div>
        <div className="max-w-screen-2xl mx-auto w-full relative z-10">
          <div className="mb-12 text-center md:text-left">
            <h1 className="text-[#f4f1ff] text-4xl md:text-6xl font-extrabold tracking-tight mb-4">Hướng Dẫn Sử Dụng</h1>
            <p className="text-[#f4f1ff]/60 text-lg max-w-2xl">Khám phá sức mạnh của AI trong việc biên dịch và lồng tiếng video tự động. Xem các hướng dẫn chi tiết bên dưới.</p>
          </div>
          {/* Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {tutorialVideos.map((video, i) => (
              <div key={i} className="group relative bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all duration-500 cursor-pointer">
                <div className="aspect-video relative overflow-hidden">
                  <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={video.img} alt={video.title} />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="w-16 h-16 bg-[#ff0000] rounded-full flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-white text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>play_arrow</span>
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">{video.duration}</div>
                </div>
                <div className="p-6">
                  <h3 className="text-[#f4f1ff] font-bold text-lg mb-2 line-clamp-2">{video.title}</h3>
                  <div className="flex items-center text-[#f4f1ff]/60 text-sm gap-2">
                    <span>{video.views}</span>
                    <span className="w-1 h-1 bg-[#f4f1ff]/30 rounded-full"></span>
                    <span>{video.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 px-8 max-w-screen-2xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-20 items-start">
          {/* Left Side: FAQ */}
          <div className="w-full lg:w-[60%]">
            <div className="mb-12">
              <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold tracking-widest uppercase mb-6 inline-block">FAQ</span>
              <h2 className="text-on-background text-4xl md:text-5xl font-black mb-10 tracking-tight">Câu hỏi và Giải đáp</h2>
            </div>
            <div className="space-y-6">
              {faqItems.map((item, i) => (
                <div key={i} className={`rounded-2xl transition-all duration-300 ${openFaq === i ? 'bg-surface-container-low border-l-4 border-primary shadow-lg shadow-primary/5' : 'bg-surface-container-low'}`}>
                  <div
                    className={`p-6 flex justify-between items-center cursor-pointer ${openFaq === i ? 'border-b border-outline-variant/10' : ''}`}
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  >
                    <h3 className={`font-bold text-lg ${openFaq === i ? 'text-primary' : 'text-on-surface'}`}>{item.q}</h3>
                    <span className={`material-symbols-outlined text-primary transition-transform ${openFaq === i ? 'rotate-180' : ''}`}>expand_more</span>
                  </div>
                  {openFaq === i && (
                    <div className="p-6 text-on-surface-variant leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Right Side: Illustration */}
          <div className="w-full lg:w-[40%] sticky top-32">
            <div className="relative bg-surface-variant rounded-[40px] overflow-hidden aspect-square flex items-center justify-center p-12">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent"></div>
              <img className="relative z-10 w-full h-auto drop-shadow-2xl" src="/images/faq/faq.avif" alt="FAQ illustration" />
              <div className="absolute bottom-10 left-10 text-8xl font-black text-on-primary-container/10 select-none">FAQ</div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="max-w-screen-2xl mx-auto px-8 mb-20">
        <div className="bg-gradient-to-r from-primary to-primary-dim rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl shadow-primary/30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-container/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-white text-3xl md:text-5xl font-black mb-6 tracking-tight">Sẵn sàng nâng tầm Video của bạn?</h2>
            <p className="text-[#f4f1ff]/80 text-lg mb-10">Đăng ký nhận tin tức và các bản cập nhật công nghệ dịch thuật AI mới nhất từ chúng tôi.</p>
            <div className="flex flex-col md:flex-row gap-4 bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/20">
              <input className="bg-transparent border-none focus:ring-0 text-white placeholder-white/50 px-6 py-4 flex-grow text-lg outline-none" placeholder="Nhập địa chỉ email của bạn..." type="email" />
              <button className="bg-white text-primary font-bold px-10 py-4 rounded-xl hover:bg-[#f4f1ff] transition-all duration-300 shadow-xl active:scale-95">Tham Gia Ngay</button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

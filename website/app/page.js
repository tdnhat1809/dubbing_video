import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden hero-gradient pt-16 pb-32">
        <div className="absolute top-0 right-0 -z-10 translate-x-1/4 -translate-y-1/4 w-[800px] h-[800px] bg-primary-container/20 rounded-full blur-[120px]"></div>
        {/* Decorative particles */}
        <img src="/images/particles/particle-1.png" alt="" className="absolute top-10 left-10 w-12 h-12 opacity-30 animate-pulse pointer-events-none" />
        <img src="/images/particles/particle-2.png" alt="" className="absolute top-32 right-20 w-16 h-16 opacity-20 animate-bounce pointer-events-none" />
        <img src="/images/particles/particle-3.png" alt="" className="absolute bottom-20 left-1/4 w-10 h-10 opacity-25 animate-pulse pointer-events-none" />

        <div className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="flex gap-3">
              <span className="px-4 py-1.5 bg-white text-primary rounded-full text-xs font-bold tracking-wider uppercase shadow-sm border border-outline-variant/10">OCR Technology</span>
              <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-wider uppercase">Chat GPT+</span>
            </div>
            <h1 className="text-6xl font-black tracking-tight leading-[1.1] text-on-background">
              Công cụ dịch văn bản trong <span className="inline-block px-6 py-1 bg-primary text-on-primary rounded-full transform -rotate-2">video</span> mạnh mẽ nhất
            </h1>
            <p className="text-xl text-on-surface-variant leading-relaxed max-w-lg">
              Tự động hóa quy trình bản địa hóa video với trí tuệ nhân tạo. Dịch thuật chính xác, lồng tiếng tự nhiên chỉ trong vài phút.
            </p>
            {/* Language flags */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-on-surface-variant font-medium">Hỗ trợ ngôn ngữ:</span>
              <div className="flex gap-2">
                <img src="/images/flags/vietnam.png" alt="Vietnamese" className="w-8 h-8 rounded-full object-cover shadow-md" />
                <img src="/images/flags/united-kingdom.png" alt="English" className="w-8 h-8 rounded-full object-cover shadow-md" />
                <img src="/images/flags/china.png" alt="Chinese" className="w-8 h-8 rounded-full object-cover shadow-md" />
                <img src="/images/flags/south-korea.png" alt="Korean" className="w-8 h-8 rounded-full object-cover shadow-md" />
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">+96</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-4">
              <button className="group flex items-center gap-3 px-8 py-4 bg-primary text-on-primary rounded-2xl font-bold text-lg hover:scale-[0.98] transition-all shadow-xl shadow-primary/25">
                Chọn Video
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
              <button className="flex items-center gap-3 px-8 py-4 border-2 border-outline-variant/30 text-primary rounded-2xl font-bold text-lg hover:bg-surface-container-low transition-all">
                Xem ví dụ
                <span className="material-symbols-outlined">play_circle</span>
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl glow-soft border border-white/50">
              <img alt="DichTuDong Dashboard" className="w-full h-auto" src="/images/hero/app-dashboard.png" />
            </div>
            <img src="/images/hero/hero-1-overly.png" alt="" className="absolute -top-4 -left-4 w-24 opacity-50 pointer-events-none" />
            <img src="/images/hero/hero-1-shadow.png" alt="" className="absolute -bottom-6 -right-6 w-32 opacity-30 pointer-events-none" />
            {/* Floating Badge */}
            <div className="absolute -top-6 -right-6 px-6 py-4 glass-panel rounded-2xl border border-white/40 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-container/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>bolt</span>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">Tốc độ xử lý</p>
                <p className="text-lg font-black text-on-surface">300% Nhanh hơn</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OCR Feature Section */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div className="order-2 lg:order-1">
              <img alt="OCR Technology" className="rounded-[2.5rem] shadow-2xl glow-soft w-full" src="/images/features/text-recognising1.png" />
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-high text-primary rounded-lg text-xs font-bold uppercase tracking-tighter">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                Tính năng cốt lõi
              </div>
              <h2 className="text-4xl font-extrabold text-on-background leading-tight">
                Nhận diện ký tự quang học OCR - Nhận diện giọng nói
              </h2>
              <p className="text-lg text-on-surface-variant leading-relaxed">
                Sử dụng công nghệ OCR thế hệ thứ 5, nền tảng của chúng tôi có thể trích xuất văn bản từ bất kỳ định dạng video nào với độ chính xác tuyệt đối, kể cả các phông chữ nghệ thuật hay chuyển động nhanh. Kết hợp cùng AI nhận diện giọng nói đa ngôn ngữ.
              </p>
              <div className="pt-4">
                <Link href="/dich-vu" className="flex items-center gap-3 px-8 py-3.5 border-2 border-primary text-primary rounded-xl font-bold hover:bg-primary/5 transition-all w-fit">
                  Xem Demo
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features Grid */}
      <section className="py-32 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid lg:grid-cols-2 gap-20">
            <div className="grid gap-6">
              <div className="p-8 bg-[#ff7b54] rounded-[2rem] text-white shadow-xl shadow-[#ff7b54]/20 hover:-translate-y-1 transition-transform flex gap-6 items-start">
                <img src="/images/icons/01.png" alt="" className="w-16 h-16 flex-shrink-0" />
                <div>
                  <h3 className="text-2xl font-bold mb-2">Nhận diện ký tự quang học (OCR)</h3>
                  <p className="opacity-90">Tự động quét và trích xuất mọi dòng sub, text cứng có trong video của bạn.</p>
                </div>
              </div>
              <div className="p-8 bg-[#ff9254] rounded-[2rem] text-white shadow-xl shadow-[#ff9254]/20 hover:-translate-y-1 transition-transform flex gap-6 items-start">
                <img src="/images/icons/02.png" alt="" className="w-16 h-16 flex-shrink-0" />
                <div>
                  <h3 className="text-2xl font-bold mb-2">Nhận diện giọng nói chính xác cao</h3>
                  <p className="opacity-90">Chuyển đổi âm thanh sang văn bản với dấu câu và phân đoạn thông minh.</p>
                </div>
              </div>
              <div className="p-8 bg-[#ffa354] rounded-[2rem] text-white shadow-xl shadow-[#ffa354]/20 hover:-translate-y-1 transition-transform flex gap-6 items-start">
                <img src="/images/icons/03.png" alt="" className="w-16 h-16 flex-shrink-0" />
                <div>
                  <h3 className="text-2xl font-bold mb-2">Dịch văn bản với văn phong bản xứ</h3>
                  <p className="opacity-90">Sử dụng LLM mới nhất để dịch thuật tự nhiên, phù hợp với ngữ cảnh văn hóa.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold uppercase tracking-tighter w-fit">
                Tính năng thông minh
              </div>
              <h2 className="text-5xl font-extrabold text-on-background leading-tight">
                Bạn chỉ cần tải lên việc còn lại AI lo
              </h2>
              <div className="space-y-4">
                {['Tự động dịch hơn 100 ngôn ngữ', 'Tự động Edit / Timing khớp từng frame', 'Tự động lồng tiếng AI chất lượng cao'].map((text, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <span className="material-symbols-outlined text-xl">check_circle</span>
                    </div>
                    <span className="text-xl font-medium text-on-surface">{text}</span>
                  </div>
                ))}
              </div>
              <div className="pt-6">
                <button className="px-10 py-5 bg-primary text-on-primary rounded-2xl font-bold text-xl hover:scale-95 transition-all shadow-2xl shadow-primary/30 flex items-center gap-4">
                  Lồng Tiếng Ngay
                  <span className="material-symbols-outlined">rocket_launch</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Steps Section */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-8 text-center space-y-16">
          <div className="space-y-4">
            <span className="text-primary font-bold uppercase tracking-[0.2em] text-sm">Toàn cầu hóa nội dung trong thời đại số</span>
            <h2 className="text-4xl font-extrabold text-on-background max-w-3xl mx-auto leading-tight">
              Có ngay Video với một ngôn ngữ hoàn toàn khác chỉ trong 3 bước!
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-1/3 left-1/4 right-1/4 h-px border-t-2 border-dashed border-outline-variant/30 -z-10"></div>
            {[
              { img: '/images/steps/step-1.png', title: 'Tải lên Video', desc: 'Chọn file từ máy tính hoặc dán link YouTube/Drive', num: 1 },
              { img: '/images/steps/step-2.png', title: 'AI tự động dịch và lồng tiếng', desc: 'Hệ thống xử lý nhanh chóng trong vài phút', num: 2 },
              { img: '/images/steps/step-3.png', title: 'Tải xuống', desc: 'Nhận video hoàn chỉnh đa ngôn ngữ', num: 3 },
            ].map((step) => (
              <div key={step.num} className="space-y-6 flex flex-col items-center group">
                <div className="relative">
                  <img src={step.img} alt={step.title} className="w-64 h-48 object-contain rounded-2xl group-hover:scale-105 transition-transform" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-lg">{step.num}</div>
                </div>
                <h4 className="text-xl font-bold">{step.title}</h4>
                <p className="text-on-surface-variant max-w-[200px] mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-primary relative overflow-hidden">
        <img src="/images/particles/cta-left-particle-1.png" alt="" className="absolute left-0 top-0 opacity-20 pointer-events-none" />
        <img src="/images/particles/cta-right-particle-1.png" alt="" className="absolute right-0 bottom-0 opacity-20 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { num: '10,000+', label: 'Video đã xử lý' },
              { num: '100+', label: 'Ngôn ngữ hỗ trợ' },
              { num: '99.5%', label: 'Độ chính xác OCR' },
              { num: '5,000+', label: 'Khách hàng tin dùng' },
            ].map((stat, i) => (
              <div key={i} className="space-y-2">
                <p className="text-4xl md:text-5xl font-black">{stat.num}</p>
                <p className="text-white/80 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Preview */}
      <section className="py-32 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-8 text-center space-y-16">
          <div className="space-y-4">
            <span className="text-primary font-bold uppercase tracking-[0.2em] text-sm">Kết quả thực tế</span>
            <h2 className="text-4xl font-extrabold text-on-background max-w-3xl mx-auto">
              Video đã xử lý bởi DichTuDong
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="group relative overflow-hidden rounded-2xl shadow-lg">
                <img src={`/images/gallery/core-statistic-${i}.jpg`} alt={`Gallery ${i}`} className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-white font-bold text-sm">Video mẫu #{i}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center space-y-4 mb-20">
            <span className="text-primary font-bold uppercase tracking-[0.2em] text-sm">Tại sao chọn chúng tôi</span>
            <h2 className="text-4xl font-extrabold text-on-background max-w-3xl mx-auto">
              Giải pháp toàn diện cho video đa ngôn ngữ
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '/images/icons/04.png', title: 'Text-to-Speech AI', desc: 'Lồng tiếng với giọng đọc tự nhiên, hỗ trợ hơn 100 ngôn ngữ và nhiều phong cách giọng khác nhau.' },
              { icon: '/images/icons/05.png', title: 'Chỉnh sửa thông minh', desc: 'Giao diện editor trực quan cho phép chỉnh sửa subtitle trước khi xuất bản.' },
              { icon: '/images/icons/06.png', title: 'Xử lý hàng loạt', desc: 'Tải lên nhiều video cùng lúc, hệ thống tự động xử lý song song.' },
            ].map((feat, i) => (
              <div key={i} className="p-8 rounded-[2rem] bg-surface-container-lowest border border-outline-variant/10 hover:shadow-xl hover:-translate-y-2 transition-all group">
                <img src={feat.icon} alt="" className="w-16 h-16 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                <p className="text-on-surface-variant leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-8 text-center space-y-16">
          <div className="space-y-4">
            <span className="text-primary font-bold uppercase tracking-[0.2em] text-sm">Khách hàng nói gì</span>
            <h2 className="text-4xl font-extrabold text-on-background">
              Đánh giá từ người dùng
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Nguyễn Văn An', role: 'Content Creator', img: '/images/testimonial/author-1.jpg', text: 'DichTuDong giúp tôi mở rộng audience quốc tế chỉ trong vài phút. Chất lượng dịch thuật rất tuyệt vời!' },
              { name: 'Trần Thị Bình', role: 'Marketing Manager', img: '/images/testimonial/author-2.jpg', text: 'Tiết kiệm 90% thời gian so với quy trình dịch thủ công trước đây. Rất ấn tượng với công nghệ OCR.' },
              { name: 'Lê Minh Cường', role: 'YouTuber', img: '/images/testimonial/author-3.jpg', text: 'Tính năng lồng tiếng AI tự nhiên đến mức subscribers không nhận ra đó là AI. Quá tuyệt vời!' },
              { name: 'Phạm Hồng Đức', role: 'Giảng viên', img: '/images/testimonial/author-4.jpg', text: 'Dịch bài giảng sang nhiều ngôn ngữ giúp sinh viên quốc tế tiếp cận kiến thức dễ dàng hơn.' },
            ].map((t, i) => (
              <div key={i} className="p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 text-left shadow-sm hover:shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <img src={t.img} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-on-surface">{t.name}</p>
                    <p className="text-xs text-on-surface-variant">{t.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  {[1,2,3,4,5].map(s => <span key={s} className="material-symbols-outlined text-amber-400 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                </div>
                <p className="text-on-surface-variant text-sm leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-primary relative overflow-hidden">
        <img src="/images/particles/cta-left-particle-1.png" alt="" className="absolute left-0 top-0 opacity-10 pointer-events-none" />
        <img src="/images/particles/cta-right-particle-1.png" alt="" className="absolute right-0 bottom-0 opacity-10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-8 text-center text-white space-y-8">
          <h2 className="text-5xl font-black leading-tight">
            Sẵn sàng toàn cầu hóa nội dung video của bạn?
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Đăng ký ngay hôm nay và nhận 10 phút dịch video miễn phí. Không cần thẻ tín dụng.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link href="/dang-nhap" className="px-10 py-5 bg-white text-primary rounded-2xl font-bold text-xl hover:scale-95 transition-all shadow-2xl flex items-center gap-3">
              Bắt đầu miễn phí
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
            <Link href="/lien-he" className="px-10 py-5 border-2 border-white/30 text-white rounded-2xl font-bold text-xl hover:bg-white/10 transition-all flex items-center gap-3">
              Liên hệ tư vấn
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

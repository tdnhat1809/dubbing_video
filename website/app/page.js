import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden hero-gradient pt-24 pb-40">
        <div className="absolute top-0 right-0 -z-10 translate-x-1/4 -translate-y-1/4 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 -z-10 -translate-x-1/4 translate-y-1/4 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[100px]"></div>

        <div className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <div className="flex gap-3">
              <span className="px-4 py-1.5 glass-panel text-primary rounded-full text-xs font-bold tracking-wider uppercase border border-white/10 shadow-lg">New Generation AI</span>
              <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-wider uppercase border border-primary/20">v3.0 Released</span>
            </div>
            <h1 className="text-7xl font-black tracking-tight leading-[1.05] text-on-background">
              Cách mạng hóa <br />
              <span className="text-gradient">Dịch thuật Video</span> <br />
              bằng Trí tuệ Nhân tạo
            </h1>
            <p className="text-xl text-on-surface-variant leading-relaxed max-w-xl">
              Xóa bỏ rào cản ngôn ngữ ngay lập tức. Công nghệ OCR & TTS tiên tiến giúp bạn bản địa hóa nội dung video sang hơn 100 ngôn ngữ chỉ với một cú click.
            </p>
            
            <div className="flex flex-wrap gap-5 pt-4">
              <Link href="/dang-nhap" className="group flex items-center gap-4 px-10 py-5 bg-primary text-on-primary rounded-2xl font-bold text-xl hover:scale-[0.98] transition-all shadow-2xl shadow-primary/40">
                Bắt đầu ngay
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">rocket_launch</span>
              </Link>
              <button className="flex items-center gap-4 px-10 py-5 glass-panel text-on-background rounded-2xl font-bold text-xl hover:bg-white/5 transition-all">
                Xem Demo
                <span className="material-symbols-outlined">play_circle</span>
              </button>
            </div>

            <div className="flex items-center gap-6 pt-6 border-t border-white/5">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                   <div key={i} className="w-12 h-12 rounded-full border-2 border-background overflow-hidden">
                     <img src={`/images/testimonial/author-${i}.jpg`} alt="user" className="w-full h-full object-cover" />
                   </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">5,000+ Người dùng</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => <span key={i} className="material-symbols-outlined text-amber-400 text-xs" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                  <span className="text-xs text-on-surface-variant ml-2">4.9/5 Rating</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative group">
            <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 animate-float glow-soft">
              <img alt="Premium Dashboard" className="w-full h-auto" src="/images/hero_dashboard_mockup_1776242250466.png" />
              <div className="absolute inset-0 animate-shine pointer-events-none"></div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl"></div>
            
            {/* Floating Badge */}
            <div className="absolute -top-6 -left-6 px-6 py-4 glass-card rounded-2xl animate-float" style={{animationDelay: '-1s'}}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>bolt</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">Hiệu năng</p>
                  <p className="text-lg font-black text-on-surface">GPU Accelerated</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* OCR Feature Section */}
      <section className="py-40 bg-background">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid lg:grid-cols-2 gap-32 items-center">
            <div className="order-2 lg:order-1 relative group">
               <div className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-3xl group-hover:bg-primary/30 transition-all"></div>
              <img alt="OCR Technology" className="relative z-10 rounded-[3rem] shadow-2xl w-full border border-white/10" src="/images/icon_ocr_3d_1776242367386.png" />
            </div>
            <div className="order-1 lg:order-2 space-y-10">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 text-secondary rounded-xl text-xs font-bold uppercase tracking-widest border border-white/10">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                Core Technology
              </div>
              <h2 className="text-5xl font-black text-on-background leading-tight">
                Trích xuất nội dung <br />
                <span className="text-secondary">Chính xác 99.9%</span>
              </h2>
              <p className="text-xl text-on-surface-variant leading-relaxed">
                Sử dụng công nghệ OCR thế hệ thứ 5 tối ưu cho video. Nền tảng có thể nhận diện văn bản từ bất kỳ phông chữ nghệ thuật hay chuyển động nào, kết hợp cùng AI nhận diện giọng nói đa ngôn ngữ.
              </p>
              <div className="pt-6">
                <Link href="/dich-vu" className="flex items-center gap-4 px-10 py-5 border-2 border-primary text-primary rounded-2xl font-bold text-lg hover:bg-primary hover:text-white transition-all w-fit shadow-xl shadow-primary/10">
                  Khám phá ngay
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* AI Features Grid */}
      <section className="py-40 bg-background/50 relative">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid lg:grid-cols-2 gap-24">
            <div className="grid gap-8">
              {[
                { icon: '/images/icon_ocr_3d_v2_1776255237242.png', title: 'Nhận diện OCR', desc: 'Quét sạch sub cứng với AI thế hệ 5' },
                { icon: '/images/icon_voice_3d_v2_1776255250461.png', title: 'Voice Cloning', desc: 'Giữ nguyên cảm xúc giọng nói gốc' },
                { icon: '/images/icon_translation_3d_v2_1776255264823.png', title: 'Dịch thuật AI', desc: 'Tự nhiên như người bản xứ' },
                { icon: '/images/icon_speed_3d_v2_1776255280004.png', title: 'Tốc độ Xử lý', desc: '30 phút video chỉ trong 5 phút' },
                { icon: '/images/icon_export_3d_v2_1776255297918.png', title: 'Xuất bản Đa nền tảng', desc: 'TikTok, YouTube chất lượng cao' }
              ].map((item, i) => (
                <div key={i} className={`p-10 glass-card rounded-[2.5rem] hover:-translate-y-2 transition-all duration-500 flex gap-8 items-start group`}>
                  <img src={item.icon} alt="" className="w-20 h-20 flex-shrink-0 group-hover:scale-110 transition-transform animate-float" style={{animationDelay: `${i * 0.5}s`}} />
                  <div>
                    <h3 className="text-2xl font-bold mb-3 text-on-background">{item.title}</h3>
                    <p className="text-on-surface-variant leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center space-y-10">
              <div className="inline-flex items-center gap-3 px-4 py-2 glass-panel text-primary rounded-xl text-xs font-bold uppercase tracking-widest w-fit">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                Smart Translation Engine
              </div>
              <h2 className="text-6xl font-black text-on-background leading-[1.1]">
                Bạn chỉ cần tải lên <br />
                <span className="text-gradient">AI sẽ lo phần còn lại</span>
              </h2>
              <div className="space-y-6">
                {['Tự động dịch hơn 100 ngôn ngữ', 'Tự động Edit / Timing khớp từng frame', 'Tự động lồng tiếng AI chất lượng cao'].map((text, i) => (
                  <div key={i} className="flex items-center gap-5 group">
                    <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-lg">
                      <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                    </div>
                    <span className="text-2xl font-semibold text-on-surface/90">{text}</span>
                  </div>
                ))}
              </div>
              <div className="pt-8">
                <Link href="/dang-nhap" className="px-12 py-6 bg-primary text-on-primary rounded-2xl font-black text-2xl hover:scale-95 transition-all shadow-2xl shadow-primary/30 flex items-center gap-5">
                  Bắt đầu ngay
                  <span className="material-symbols-outlined text-3xl">rocket_launch</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* 3 Steps Section */}
      <section className="py-40 bg-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 text-center space-y-24">
          <div className="space-y-6">
            <span className="text-primary font-bold uppercase tracking-[0.3em] text-sm">Quy trình thông minh</span>
            <h2 className="text-5xl font-black text-on-background max-w-4xl mx-auto leading-tight">
              Có ngay Video đa ngôn ngữ <br /> chỉ trong 3 bước đơn giản
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-16 relative">
            {/* Combined Step Illustration might be used here if needed, but I'll use a clean layout */}
            {[
              { title: 'Tải lên Video', desc: 'Chọn file từ máy tính hoặc dán link YouTube/Drive', num: 1, icon: 'cloud_upload' },
              { title: 'AI Xử lý', desc: 'Hệ thống tự động dịch thuật và lồng tiếng trong vài phút', num: 2, icon: 'psychology' },
              { title: 'Hoàn tất', desc: 'Kiểm tra kết quả và tải xuống video hoàn chỉnh', num: 3, icon: 'download_for_offline' },
            ].map((step) => (
              <div key={step.num} className="glass-card p-10 rounded-[3rem] space-y-8 flex flex-col items-center group relative hover:border-primary/50 transition-all">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                   <span className="material-symbols-outlined text-5xl">{step.icon}</span>
                </div>
                <div className="space-y-4">
                  <h4 className="text-2xl font-bold">{step.title}</h4>
                  <p className="text-on-surface-variant leading-relaxed">{step.desc}</p>
                </div>
                <div className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-xl shadow-xl border-4 border-background">{step.num}</div>
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
      <section className="py-40 bg-background relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[150px] -z-10"></div>
        <div className="max-w-7xl mx-auto px-8 text-center space-y-20">
          <div className="space-y-6">
            <span className="text-primary font-bold uppercase tracking-[0.3em] text-sm">Kết quả thực tế</span>
            <h2 className="text-5xl font-black text-on-background max-w-4xl mx-auto">
              Chất lượng Video <br /> <span className="text-gradient">Đẳng cấp Thế giới</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="group relative flex flex-col items-center">
                <div className="relative w-48 h-48 mb-8">
                  {/* Decorative Glass Rings */}
                  <div className="absolute inset-0 rounded-full border-2 border-white/10 group-hover:border-primary/50 transition-colors duration-700"></div>
                  <div className="absolute inset-4 rounded-full border border-white/5 bg-white/5 backdrop-blur-md"></div>
                  
                  {/* Flag Container - Ensures no cut-off */}
                  <div className="absolute inset-8 rounded-full overflow-hidden shadow-2xl group-hover:scale-110 transition-transform duration-700">
                    <img 
                      src={`/images/gallery/core-statistic-${i}.jpg`} 
                      alt={`Gallery ${i}`} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  
                  {/* Play Icon Badge */}
                  <div className="absolute bottom-0 right-0 w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg transform translate-x-1/4 translate-y-1/4 opacity-0 group-hover:opacity-100 transition-all duration-500">
                    <span className="material-symbols-outlined text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>play_arrow</span>
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <span className="text-on-surface-variant text-[10px] font-black uppercase tracking-[0.2em]">Video Mẫu</span>
                  <p className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors">Dự án #{i}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-10">
            <Link href="/thu-vien" className="px-10 py-4 glass-panel text-on-background rounded-2xl font-bold hover:bg-white/5 transition-all">
              Khám phá toàn bộ thư viện
            </Link>
          </div>
        </div>
      </section>


      {/* Features Showcase */}
      <section className="py-40 bg-background">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center space-y-6 mb-24">
            <span className="text-primary font-bold uppercase tracking-[0.3em] text-sm">Điểm khác biệt</span>
            <h2 className="text-5xl font-black text-on-background max-w-4xl mx-auto">
              Tại sao hàng nghìn creators <br /> chọn B2Vision?
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { icon: '/images/icon_speed_3d_1776242409951.png', title: 'Tốc độ vượt trội', desc: 'Xử lý video dài 30 phút chỉ trong chưa đầy 5 phút nhờ hạ tầng GPU chuyên dụng.' },
              { icon: '/images/icon_edit_3d_1776242425332.png', title: 'Editor thông minh', desc: 'Giao diện chỉnh sửa trực quan, cho phép bạn tinh chỉnh bản dịch và timeline dễ dàng.' },
              { icon: '/images/icon_translation_3d_1776242394563.png', title: 'Hỗ trợ hơn 100 ngôn ngữ', desc: 'Dịch thuật và lồng tiếng giữa bất kỳ cặp ngôn ngữ nào trên thế giới một cách tự nhiên.' },
            ].map((feat, i) => (
              <div key={i} className="p-12 rounded-[3rem] glass-card border border-white/5 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/20 transition-all group">
                <img src={feat.icon} alt="" className="w-24 h-24 mb-10 group-hover:scale-110 transition-transform animate-float" style={{animationDelay: `${i * 0.7}s`}} />
                <h3 className="text-2xl font-bold mb-5 text-on-background">{feat.title}</h3>
                <p className="text-on-surface-variant leading-relaxed text-lg">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Testimonials */}
      <section className="py-40 bg-background/50">
        <div className="max-w-7xl mx-auto px-8 text-center space-y-20">
          <div className="space-y-6">
            <span className="text-secondary font-bold uppercase tracking-[0.3em] text-sm">Cộng đồng</span>
            <h2 className="text-5xl font-black text-on-background">Được tin dùng bởi hàng nghìn Creators</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: 'Nguyễn Văn An', role: 'Content Creator', img: '/images/testimonial/author-1.jpg', text: 'B2Vision giúp tôi mở rộng audience quốc tế chỉ trong vài phút. Chất lượng dịch thuật rất tuyệt vời!' },
              { name: 'Trần Thị Bình', role: 'Marketing Manager', img: '/images/testimonial/author-2.jpg', text: 'Tiết kiệm 90% thời gian so với quy trình dịch thủ công trước đây. Rất ấn tượng với công nghệ OCR.' },
              { name: 'Lê Minh Cường', role: 'YouTuber', img: '/images/testimonial/author-3.jpg', text: 'Tính năng lồng tiếng AI tự nhiên đến mức subscribers không nhận ra đó là AI. Quá tuyệt vời!' },
              { name: 'Phạm Hồng Đức', role: 'Giảng viên', img: '/images/testimonial/author-4.jpg', text: 'Dịch bài giảng sang nhiều ngôn ngữ giúp sinh viên quốc tế tiếp cận kiến thức dễ dàng hơn.' },
            ].map((t, i) => (
              <div key={i} className="p-8 rounded-[2.5rem] glass-card text-left hover:shadow-2xl transition-all border border-white/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <img src={t.img} alt={t.name} className="w-14 h-14 rounded-full object-cover border-2 border-primary/30" />
                    <div>
                      <p className="font-bold text-on-surface text-lg">{t.name}</p>
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest">{t.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-6">
                    {[1,2,3,4,5].map(s => <span key={s} className="material-symbols-outlined text-amber-400 text-sm" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                  </div>
                  <p className="text-on-surface-variant leading-relaxed italic">"{t.text}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-40 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10 -z-20"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-background via-transparent to-background -z-10"></div>
        
        <div className="max-w-5xl mx-auto px-8">
          <div className="glass-card rounded-[4rem] p-16 md:p-32 text-center relative overflow-hidden border border-white/10 glow-soft">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 animate-float"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 animate-float" style={{animationDelay: '-2s'}}></div>
            
            <div className="relative z-10 space-y-10">
              <h2 className="text-5xl md:text-7xl font-black leading-tight text-on-background">
                Sẵn sàng <span className="text-gradient">Toàn cầu hóa</span> <br /> nội dung của bạn?
              </h2>
              <p className="text-xl md:text-2xl text-on-surface-variant max-w-3xl mx-auto leading-relaxed">
                Đăng ký ngay hôm nay và nhận 10 phút dịch video miễn phí. Trải nghiệm sức mạnh của AI thế hệ mới.
              </p>
              <div className="flex flex-wrap justify-center gap-6 pt-10">
                <Link href="/dang-nhap" className="px-12 py-6 bg-primary text-on-primary rounded-3xl font-black text-2xl hover:scale-95 transition-all shadow-2xl shadow-primary/40 flex items-center gap-4">
                  Bắt đầu ngay
                  <span className="material-symbols-outlined text-3xl">arrow_forward</span>
                </Link>
                <Link href="/lien-he" className="px-12 py-6 glass-panel text-on-background rounded-3xl font-black text-2xl hover:bg-white/5 transition-all flex items-center gap-4 border border-white/10">
                  Liên hệ tư vấn
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}

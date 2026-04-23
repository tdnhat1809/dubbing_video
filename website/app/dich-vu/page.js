import Link from 'next/link';

export const metadata = {
  title: 'Dịch Vụ - B2Vision AI',
  description: 'Giải pháp dịch thuật video toàn diện với trí tuệ nhân tạo thế hệ mới.',
};

export default function ServicesPage() {
  const services = [
    { icon: '/images/icon_ocr_3d_v2_1776255237242.png', title: 'Nhận diện OCR (Sub cứng)', desc: 'Công nghệ nhận diện văn bản thế hệ thứ 5, quét sạch mọi dòng sub cứng, text nghệ thuật với độ chính xác tuyệt đối.' },
    { icon: '/images/icon_voice_3d_v2_1776255250461.png', title: 'Nhận diện Giọng nói', desc: 'Speech-to-Text đa ngôn ngữ, hỗ trợ hơn 100+ thứ tiếng, nhận diện chính xác kể cả trong môi trường nhiều tiếng ồn.' },
    { icon: '/images/icon_translation_3d_v2_1776255264823.png', title: 'Dịch thuật AI Thông minh', desc: 'Tích hợp các LLM hàng đầu giúp dịch thuật tự nhiên, hiểu ngữ cảnh và văn hóa địa phương.' },
    { icon: '/images/icon_automation_3d_v2_1776255078318.png', title: 'Lồng tiếng Tự động', desc: 'Hàng trăm giọng đọc AI truyền cảm, hỗ trợ Voice Cloning để giữ nguyên cảm xúc từ video gốc.' },
    { icon: '/images/icon_edit_3d_1776242425332.png', title: 'Chỉnh sửa Thông minh', desc: 'Giao diện Editor trực quan giúp tinh chỉnh bản dịch và timeline khớp từng frame chỉ với vài thao tác.' },
    { icon: '/images/icon_export_3d_v2_1776255297918.png', title: 'Xuất bản Đa nền tảng', desc: 'Hỗ trợ xuất video chất lượng cao cho TikTok, YouTube, Facebook với đầy đủ định dạng phụ đề rời.' },
  ];

  return (
    <div className="bg-background min-h-screen text-on-background">
      {/* Hero Section */}
      <section className="relative pt-40 pb-32 px-8 text-center overflow-hidden hero-gradient">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-float"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] -z-10 animate-float" style={{animationDelay: '-3s'}}></div>
        
        <div className="relative z-10 space-y-8">
          <span className="inline-flex items-center px-6 py-2 rounded-xl glass-panel text-primary text-xs font-black tracking-[0.3em] uppercase border border-white/10">
            Dịch Vụ Toàn Diện
          </span>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-on-background max-w-5xl mx-auto leading-[0.9]">
            Mọi công cụ bạn cần <br /><span className="text-gradient">Trong một nền tảng</span>
          </h1>
          <p className="max-w-3xl mx-auto text-on-surface-variant text-xl md:text-2xl leading-relaxed font-medium">
            Từ quét văn bản đến lồng tiếng AI, chúng tôi cung cấp hệ sinh thái <br />
            tối ưu nhất để bạn chinh phục thị trường toàn cầu.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="max-w-7xl mx-auto px-8 pb-40">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {services.map((s, i) => (
            <div key={i} className="glass-card p-12 rounded-[3.5rem] border border-white/5 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20 transition-all group flex flex-col items-center text-center">
              <div className="w-24 h-24 mb-8 relative">
                <img src={s.icon} alt={s.title} className="w-full h-full object-contain animate-float group-hover:scale-110 transition-transform" style={{animationDelay: `${i * 0.5}s`}} />
              </div>
              <h3 className="text-3xl font-black mb-4 text-on-background group-hover:text-primary transition-colors">{s.title}</h3>
              <p className="text-on-surface-variant leading-relaxed font-medium">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-8 mb-40">
        <div className="glass-card rounded-[4rem] p-20 text-center relative overflow-hidden border border-white/10 glow-soft">
          <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
          <div className="relative z-10 space-y-10">
            <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">Sẵn sàng trải nghiệm <br /> tương lai dịch thuật?</h2>
            <div className="flex flex-wrap justify-center gap-6">
              <Link href="/dang-nhap" className="px-12 py-6 bg-primary text-white rounded-3xl font-black text-2xl hover:scale-95 transition-all shadow-2xl shadow-primary/40 flex items-center gap-4">
                Bắt đầu ngay
                <span className="material-symbols-outlined text-3xl">rocket_launch</span>
              </Link>
              <Link href="/gia-ca" className="px-12 py-6 glass-panel text-white rounded-3xl font-black text-2xl hover:bg-white/5 transition-all flex items-center gap-4 border border-white/10">
                Bảng giá chi tiết
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

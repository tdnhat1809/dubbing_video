import Link from 'next/link';

export const metadata = {
  title: 'Giá Cả - B2Vision.com',
  description: 'Dịch vụ tốt nhất với giá rẻ nhất.',
};

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative pt-32 pb-24 px-8 text-center overflow-hidden hero-gradient">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-float"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] -z-10 animate-float" style={{animationDelay: '-3s'}}></div>
        
        <div className="relative z-10 space-y-8">
          <span className="inline-flex items-center px-6 py-2 rounded-xl glass-panel text-primary text-xs font-black tracking-[0.3em] uppercase border border-white/10">
            Minh Bạch & Tối Ưu
          </span>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-on-background max-w-5xl mx-auto leading-[0.9]">
            Giá tốt nhất cho <br /><span className="text-gradient">Công nghệ hàng đầu</span>
          </h1>
          <p className="max-w-3xl mx-auto text-on-surface-variant text-xl md:text-2xl leading-relaxed font-medium">
            Nâng tầm chất lượng video của bạn với hạ tầng GPU chuyên dụng. <br />
            Xử lý thần tốc, chi phí tối ưu, hiệu quả vượt trội.
          </p>
        </div>
      </section>


      {/* Pricing Cards */}
      <section className="px-8 pb-40 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-stretch">
          {/* DEMO Plan */}
          <div className="glass-card p-12 rounded-[3.5rem] flex flex-col transition-all hover:-translate-y-4 hover:shadow-2xl hover:shadow-primary/20 duration-500 border border-white/5 group">
            <span className="w-fit px-5 py-2 rounded-xl bg-orange-500/10 text-orange-500 text-xs font-black tracking-widest mb-8 border border-orange-500/20">DEMO</span>
            <div className="mb-8 flex items-center justify-center w-24 h-24 rounded-[2.5rem] glass-panel group-hover:bg-orange-500/20 transition-colors">
              <img src="/images/icon_voice_3d_v2_1776255250461.png" alt="Demo" className="w-full h-full object-contain animate-float" />
            </div>
            <div className="mb-10 text-center md:text-left">
              <h3 className="text-3xl font-black mb-3 text-on-background">Gói Demo</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-on-background">Miễn Phí</span>
              </div>
            </div>
            <ul className="space-y-6 mb-12 flex-grow">
              <li className="flex items-start gap-4 text-on-surface-variant">
                <span className="material-symbols-outlined text-orange-500 text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                <span className="text-lg">Dịch văn bản (DEMO)</span>
              </li>
              <li className="flex items-start gap-4 text-on-surface-variant">
                <span className="material-symbols-outlined text-orange-500 text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                <span className="text-lg">Chỉnh sửa thông minh (DEMO)</span>
              </li>
              <li className="flex items-start gap-4 font-bold text-orange-400">
                <span className="material-symbols-outlined text-2xl">stars</span>
                <span className="text-lg">Tặng 5,000 Tokens</span>
              </li>
            </ul>
            <button className="w-full py-6 rounded-3xl bg-orange-500 text-white font-black text-xl hover:scale-95 transition-all shadow-xl shadow-orange-500/20">
              Sử dụng ngay
            </button>
          </div>

          {/* Audio Plan */}
          <div className="glass-card p-12 rounded-[3.5rem] flex flex-col transition-all hover:-translate-y-4 hover:shadow-2xl hover:shadow-primary/40 duration-500 border-2 border-primary/40 scale-110 relative z-20 overflow-hidden glow-soft">
            <div className="absolute top-0 right-0 p-4 bg-primary text-white text-[10px] font-black tracking-[0.2em] rounded-bl-3xl">PHỔ BIẾN</div>
            <span className="w-fit px-5 py-2 rounded-xl bg-primary/10 text-primary text-xs font-black tracking-widest mb-8 border border-primary/20 uppercase">Dịch Âm Thanh</span>
            <div className="mb-8 flex items-center justify-center w-28 h-28 rounded-[2.5rem] bg-primary shadow-2xl relative">
              <img src="/images/icon_premium_3d_v2_1776255155100.png" alt="Premium" className="w-full h-full object-cover animate-float" />
              <div className="absolute inset-0 bg-primary/20 blur-xl -z-10"></div>
            </div>
            <div className="mb-10 text-center md:text-left">
              <h3 className="text-3xl font-black mb-3 text-on-background">Gói Audio</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-on-background">499đ</span>
                <span className="text-on-surface-variant text-xl font-bold">/ Phút</span>
              </div>
            </div>
            <ul className="space-y-6 mb-12 flex-grow">
              {['Xử lý Video 4K', 'Chỉnh sửa thông minh', 'Lồng tiếng AI Premium', 'Dịch thuật LLM v3'].map((feature, i) => (
                <li key={i} className="flex items-start gap-4 text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                  <span className="text-lg font-bold">{feature}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-6 rounded-3xl bg-primary text-white font-black text-xl hover:scale-95 transition-all shadow-2xl shadow-primary/40">
              Upgade Ngay
            </button>
          </div>

          {/* Text Plan */}
          <div className="glass-card p-12 rounded-[3.5rem] flex flex-col transition-all hover:-translate-y-4 hover:shadow-2xl hover:shadow-secondary/20 duration-500 border border-white/5 group">
            <span className="w-fit px-5 py-2 rounded-xl bg-secondary/10 text-secondary text-xs font-black tracking-widest mb-8 border border-secondary/20 uppercase">Dịch Văn Bản</span>
            <div className="mb-8 flex items-center justify-center w-24 h-24 rounded-[2.5rem] glass-panel group-hover:bg-secondary/20 transition-colors">
              <img src="/images/icon_translation_3d_v2_1776255264823.png" alt="Text" className="w-full h-full object-contain animate-float" style={{animationDelay: '-1s'}} />
            </div>
            <div className="mb-10 text-center md:text-left">
              <h3 className="text-3xl font-black mb-3 text-on-background">Gói Text</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-on-background">1199đ</span>
                <span className="text-on-surface-variant text-lg font-bold">/ Phút</span>
              </div>
            </div>
            <ul className="space-y-6 mb-12 flex-grow">
              {['Dịch văn bản cứng', 'Khử nhiễu thông minh', 'AI OCR v5', 'Sub chuẩn từng Frame'].map((feature, i) => (
                <li key={i} className="flex items-start gap-4 text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                  <span className="text-lg">{feature}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-6 rounded-3xl bg-secondary text-white font-black text-xl hover:scale-95 transition-all shadow-xl shadow-secondary/20">
              Sử dụng ngay
            </button>
          </div>
        </div>
      </section>


      {/* Stats Bar */}
      <section className="max-w-7xl mx-auto px-8 mb-40">
        <div className="glass-panel py-16 px-12 rounded-[4rem] shadow-2xl relative overflow-hidden border border-white/10 glow-soft">
          <div className="absolute inset-0 bg-primary/10 opacity-20"></div>
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-12 text-center items-center">
            {[
              { num: '5K+', label: 'Người dùng tin tưởng' },
              { num: '50K+', label: 'Video đã xử lý' },
              { num: '1M+', label: 'Phút lồng tiếng' },
              { num: '100+', label: 'Ngôn ngữ hỗ trợ' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col gap-2 group">
                <span className="text-5xl font-black text-on-background group-hover:text-primary transition-colors">{stat.num}</span>
                <span className="text-on-surface-variant text-sm font-bold uppercase tracking-[0.2em]">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* FAQ Section */}
      <section className="max-w-7xl mx-auto px-8 mb-40">
        <div className="flex flex-col items-center mb-24 text-center">
          <span className="px-6 py-2 rounded-xl glass-panel text-primary text-xs font-black tracking-widest uppercase mb-6 border border-white/10">FAQ</span>
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-on-background">Câu hỏi & <span className="text-gradient">Giải đáp</span></h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-stretch">
          <div className="lg:col-span-12 space-y-6">
            {[
              { q: 'Làm cách nào để dịch Video?', a: 'Chỉ cần tải lên video của bạn, AI sẽ tự động xử lý mọi bước.' },
              { q: 'Sử dụng B2Vision có nhanh không?', a: 'Hạ tầng GPU chuyên dụng giúp xử lý 30 phút video chỉ trong 5 phút.' },
              { q: 'Làm cách nào để tải xuống Video?', a: 'Sau khi xử lý xong, bạn có thể tải video trực tiếp từ Dashboard.' },
              { q: 'Có dịch được Video TikTok không?', a: 'Hoàn toàn được, chúng tôi hỗ trợ mọi nền tảng video phổ biến.' }
            ].map((item, i) => (
              <div key={i} className="group glass-card rounded-[2.5rem] border border-white/5 hover:border-primary/30 transition-all cursor-pointer">
                <div className="p-10 flex justify-between items-center">
                  <h4 className="text-2xl font-black text-on-background group-hover:text-primary transition-colors">{item.q}</h4>
                  <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center group-hover:bg-primary/20 transition-all">
                    <span className="material-symbols-outlined text-primary group-hover:rotate-180 transition-transform">expand_more</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="max-w-7xl mx-auto px-8 mb-40">
        <div className="glass-panel rounded-[4rem] p-16 md:p-32 text-center relative overflow-hidden border border-white/10 glow-soft shadow-2xl">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/20 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary/10 blur-[120px] rounded-full animate-float"></div>
          <h3 className="text-4xl md:text-6xl font-black mb-8 text-on-background leading-tight">Nhận tin tức <br /><span className="text-gradient">Công nghệ AI mới nhất</span></h3>
          <p className="mb-12 text-on-surface-variant text-xl max-w-2xl mx-auto">Đừng bỏ lỡ các ưu đãi độc quyền và tính năng nâng cấp hàng tháng.</p>
          <div className="flex flex-col sm:flex-row gap-6 max-w-2xl mx-auto bg-white/5 p-4 rounded-3xl backdrop-blur-3xl border border-white/10 focus-within:border-primary/50 transition-all">
            <input className="flex-grow bg-transparent border-none focus:ring-0 px-8 py-4 text-on-background text-xl outline-none font-medium placeholder:text-white/20" placeholder="Địa chỉ email của bạn..." type="email" />
            <button className="bg-primary text-white px-12 py-5 rounded-2xl font-black text-xl hover:scale-95 transition-all shadow-2xl shadow-primary/40">
              Tham Gia Ngay
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

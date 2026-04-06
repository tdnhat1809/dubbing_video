import Link from 'next/link';

export const metadata = {
  title: 'Giá Cả - DichTuDong.com',
  description: 'Dịch vụ tốt nhất với giá rẻ nhất.',
};

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative pt-24 pb-16 px-8 text-center overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-primary-container/20 to-transparent blur-3xl rounded-full"></div>
        <div className="relative z-10">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold tracking-widest uppercase mb-6">
            Gói Và Giá Cả
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-on-surface mb-8 italic">
            Dịch vụ tốt nhất với <span className="text-primary">giá rẻ nhất</span>
          </h1>
          <p className="max-w-2xl mx-auto text-on-surface-variant leading-relaxed">
            Nâng tầm chất lượng video của bạn với công nghệ dịch thuật AI hàng đầu. Đơn giản, nhanh chóng và tối ưu chi phí.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-8 pb-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* DEMO Plan */}
          <div className="bg-surface-container-lowest p-8 rounded-3xl flex flex-col transition-all hover:-translate-y-2 hover:shadow-2xl shadow-sm border border-outline-variant/10">
            <span className="w-fit px-4 py-1 rounded-full bg-orange-100 text-orange-600 text-[10px] font-black tracking-widest mb-6">DEMO</span>
            <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-50">
              <span className="material-symbols-outlined text-orange-500 text-4xl">rocket_launch</span>
            </div>
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2">Gói Demo</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-on-surface">Miễn Phí</span>
              </div>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              <li className="flex items-start gap-3 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-orange-500 text-lg">check_circle</span>
                <span>Dịch văn bản (DEMO)</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-orange-500 text-lg">check_circle</span>
                <span>Chỉnh sửa thông minh (DEMO)</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-on-surface-variant font-medium text-orange-700">
                <span className="material-symbols-outlined text-lg">stars</span>
                <span>Tặng 5,000 Tokens (Google login)</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-on-surface-variant font-medium text-orange-700">
                <span className="material-symbols-outlined text-lg">add_moderator</span>
                <span>Tặng 50,000 Tokens lần nạp đầu</span>
              </li>
            </ul>
            <button className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-400 to-pink-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-pink-200">
              Sử dụng ngay <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>

          {/* Audio Plan */}
          <div className="bg-surface-container-lowest p-8 rounded-3xl flex flex-col transition-all hover:-translate-y-2 hover:shadow-2xl shadow-sm border-2 border-primary/20 scale-105 relative z-20 overflow-hidden">
            <div className="absolute top-0 right-0 p-3 bg-primary text-white text-[10px] font-bold rounded-bl-xl">PHỔ BIẾN</div>
            <span className="w-fit px-4 py-1 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-black tracking-widest mb-6 uppercase">Dịch Âm Thanh</span>
            <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-container/20">
              <span className="material-symbols-outlined text-primary text-4xl">headphones</span>
            </div>
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2">Gói Audio</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-on-surface">499đ</span>
                <span className="text-on-surface-variant text-sm font-medium">/ Phút</span>
              </div>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {['Dịch âm thanh trong Video ✓', 'Chỉnh sửa thông minh ✓', 'Lồng tiếng nâng cao AI ✓', 'Dịch nâng cao AI ✓', 'Chất lượng Video 1080p ✓', 'Dịch sát nghĩa Trung-Việt ✓'].map((feature, i) => (
                <li key={i} className={`flex items-start gap-3 text-sm text-on-surface-variant ${i === 2 ? 'font-bold text-on-surface' : ''}`}>
                  <span className="material-symbols-outlined text-primary text-lg">{i === 2 ? 'auto_awesome' : 'done_all'}</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary-fixed text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-primary-container/40">
              Sử dụng ngay <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>

          {/* Text Plan */}
          <div className="bg-surface-container-lowest p-8 rounded-3xl flex flex-col transition-all hover:-translate-y-2 hover:shadow-2xl shadow-sm border border-outline-variant/10">
            <span className="w-fit px-4 py-1 rounded-full bg-rose-100 text-rose-600 text-[10px] font-black tracking-widest mb-6 uppercase">Dịch Văn Bản</span>
            <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50">
              <span className="material-symbols-outlined text-rose-500 text-4xl">description</span>
            </div>
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2">Gói Text</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-on-surface">1199đ</span>
                <span className="text-on-surface-variant text-sm font-medium">/ Phút</span>
              </div>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {['Dịch âm thanh trong Video ✓', 'Chỉnh sửa thông minh ✓', 'Lồng tiếng nâng cao AI ✓', 'Dịch nâng cao AI ✓', 'Chất lượng Video 1080p ✓', 'Dịch sát nghĩa Trung-Việt ✓'].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-rose-500 text-lg">done_all</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <button className="w-full py-4 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-rose-200">
              Sử dụng ngay <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="max-w-7xl mx-auto px-8 mb-24">
        <div className="bg-gradient-to-r from-primary to-secondary py-12 px-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-8 text-center items-center">
            {[
              { num: '384+', label: 'Người dùng đăng kí hôm nay' },
              { num: '872+', label: 'Video được dịch hôm nay' },
              { num: '872+', label: 'Lần tải xuống hôm nay' },
              { num: '24+', label: 'Lần xếp hạng hôm nay' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col gap-1">
                <span className="text-3xl font-black text-white">{stat.num}</span>
                <span className="text-white/80 text-xs font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-7xl mx-auto px-8 mb-32">
        <div className="flex flex-col items-center mb-16 text-center">
          <span className="px-4 py-1.5 rounded-full bg-surface-container-high text-primary text-xs font-bold tracking-widest uppercase mb-4">FAQ</span>
          <h2 className="text-4xl font-bold tracking-tight text-on-surface">Câu hỏi và Giải đáp</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-7 space-y-4">
            {['Làm cách nào để dịch Video?', 'Sử dụng dichtudong.com dịch có nhanh và chính xác không?', 'Làm cách nào để tải xuống Video đã dịch?', 'Có dịch được Video Douyin, Tiktok không?'].map((q, i) => (
              <div key={i} className="group bg-surface-container-low rounded-2xl overflow-hidden cursor-pointer transition-all hover:bg-surface-container">
                <div className="p-6 flex justify-between items-center">
                  <h4 className="font-bold text-on-surface">{q}</h4>
                  <span className="material-symbols-outlined text-primary transition-transform group-hover:rotate-180">expand_more</span>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-5 relative aspect-square lg:aspect-auto h-full min-h-[400px]">
            <div className="absolute inset-0 rounded-[3rem] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="w-full h-full object-cover" alt="AI illustration" src="/images/faq/faq.avif" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent"></div>
            </div>
            <div className="absolute -bottom-8 -left-8 p-6 glass-panel rounded-3xl shadow-xl max-w-[240px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-bold text-on-surface">Hỗ trợ trực tuyến 24/7</span>
              </div>
              <p className="text-[10px] text-on-surface-variant leading-relaxed">Đội ngũ kỹ thuật của chúng tôi luôn sẵn sàng hỗ trợ bạn bất cứ lúc nào.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="max-w-7xl mx-auto px-8 mb-24">
        <div className="bg-surface-container-highest rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/10 blur-[100px] rounded-full"></div>
          <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-secondary/10 blur-[100px] rounded-full"></div>
          <h3 className="text-3xl md:text-4xl font-bold mb-6 text-on-surface">Tham gia với chúng tôi để nhận thông tin ưu đãi mới nhất</h3>
          <p className="mb-10 text-on-surface-variant max-w-xl mx-auto">Đừng bỏ lỡ các cập nhật tính năng AI mới và các chương trình khuyến mãi độc quyền hàng tháng.</p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto bg-white p-2 rounded-2xl shadow-sm">
            <input className="flex-grow bg-transparent border-none focus:ring-0 px-6 py-4 text-on-surface outline-none" placeholder="Nhập email của bạn..." type="email" />
            <button className="bg-primary text-on-primary px-8 py-4 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all">
              Tham Gia Ngay
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

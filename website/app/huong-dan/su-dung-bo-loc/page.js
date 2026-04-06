export default function HDBoLocPage() {
  const steps = [
    { step: 1, title: 'Truy cập Thư Viện', desc: 'Vào mục Thư Viện trên thanh điều hướng chính để xem toàn bộ video đã được dịch trên nền tảng.', icon: 'video_library' },
    { step: 2, title: 'Sử dụng bộ lọc loại nội dung', desc: 'Nhấn vào các tab: Tất Cả, Video, Audio, Youtube, Tiktok để lọc theo loại nội dung bạn quan tâm.', icon: 'filter_list' },
    { step: 3, title: 'Tìm kiếm theo từ khóa', desc: 'Sử dụng ô tìm kiếm ở góc trên để tìm video theo tiêu đề, ngôn ngữ, hoặc chủ đề cụ thể.', icon: 'search' },
    { step: 4, title: 'Sắp xếp kết quả', desc: 'Sắp xếp video theo: Mới nhất, Phổ biến nhất, Đánh giá cao nhất để tìm nội dung phù hợp.', icon: 'sort' },
    { step: 5, title: 'Lọc theo ngôn ngữ', desc: 'Chọn cặp ngôn ngữ dịch cụ thể (VD: Anh → Việt, Trung → Việt) để xem các video theo ngôn ngữ.', icon: 'language' },
  ];

  return (
    <>
      <section className="min-h-[400px] flex flex-col justify-center py-20 px-8 relative overflow-hidden" style={{ background: 'radial-gradient(circle at top right, #302950, #0f072e)' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-primary rounded-full blur-[120px]"></div>
        </div>
        <div className="max-w-screen-2xl mx-auto w-full relative z-10">
          <nav className="flex items-center gap-2 mb-6 text-sm font-medium text-white/50">
            <span>Trang Chủ</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span>Hướng Dẫn</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-white font-semibold">HD Sử Dụng Bộ Lọc</span>
          </nav>
          <h1 className="text-[#f4f1ff] text-4xl md:text-6xl font-extrabold tracking-tight mb-4">HD Sử Dụng Bộ Lọc</h1>
          <p className="text-[#f4f1ff]/60 text-lg max-w-2xl">Hướng dẫn cách sử dụng các bộ lọc và công cụ tìm kiếm trong Thư Viện video.</p>
        </div>
      </section>

      <main className="max-w-screen-2xl mx-auto px-8 py-20">
        <div className="max-w-4xl mx-auto space-y-8">
          {steps.map((item) => (
            <div key={item.step} className="flex gap-6 items-start group">
              <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary text-3xl">{item.icon}</span>
              </div>
              <div className="flex-1 bg-surface-container-lowest rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-outline-variant/10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-primary text-on-primary text-xs font-bold px-3 py-1 rounded-full">Bước {item.step}</span>
                  <h3 className="text-xl font-bold text-on-surface">{item.title}</h3>
                </div>
                <p className="text-on-surface-variant leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

export default function TaiLieuPage() {
  const docs = [
    { title: 'Hướng dẫn sử dụng API B2Vision', desc: 'Tài liệu chi tiết về cách tích hợp API dịch thuật video tự động vào ứng dụng của bạn.', icon: 'api', tag: 'API' },
    { title: 'Định dạng file hỗ trợ', desc: 'Danh sách đầy đủ các định dạng video, audio và subtitle được hỗ trợ trên nền tảng.', icon: 'description', tag: 'Tài liệu' },
    { title: 'Bảng ngôn ngữ hỗ trợ', desc: 'Hơn 50 ngôn ngữ được hỗ trợ dịch thuật với độ chính xác cao nhất.', icon: 'translate', tag: 'Ngôn ngữ' },
    { title: 'Hướng dẫn tối ưu chất lượng', desc: 'Các mẹo và thủ thuật để đạt được kết quả dịch thuật tốt nhất từ video của bạn.', icon: 'tune', tag: 'Hướng dẫn' },
    { title: 'Changelog & Cập nhật', desc: 'Theo dõi các bản cập nhật mới nhất của nền tảng B2Vision.com.', icon: 'update', tag: 'Updates' },
    { title: 'SDK và thư viện', desc: 'Tải về SDK cho Python, JavaScript, và các ngôn ngữ lập trình phổ biến khác.', icon: 'code', tag: 'SDK' },
  ];

  return (
    <>
      <header className="relative overflow-hidden pt-20 pb-32 px-6">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-primary-container blur-[60px] opacity-40 -z-10"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-surface-container blur-[60px] opacity-40 -z-10"></div>
        <div className="max-w-4xl mx-auto text-center">
          <nav className="flex justify-center items-center gap-2 mb-6 text-sm font-medium text-on-surface-variant/70">
            <span>Trang Chủ</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span>Thư Viện</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary font-semibold">Tài Liệu</span>
          </nav>
          <h1 className="text-6xl md:text-7xl italic font-light tracking-tight text-on-background mb-8">Tài Liệu</h1>
          <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed max-w-3xl mx-auto">
            Tham khảo tài liệu kỹ thuật, hướng dẫn API và các tài nguyên phát triển để tích hợp B2Vision vào dự án của bạn.
          </p>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {docs.map((doc, i) => (
            <div key={i} className="group bg-surface-container-lowest rounded-2xl p-8 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 cursor-pointer border border-outline-variant/10 hover:border-primary/30">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary text-2xl">{doc.icon}</span>
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">{doc.tag}</span>
              <h3 className="text-xl font-bold text-on-surface mt-2 mb-3">{doc.title}</h3>
              <p className="text-on-surface-variant leading-relaxed">{doc.desc}</p>
              <div className="mt-6 flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all">
                <span>Xem chi tiết</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

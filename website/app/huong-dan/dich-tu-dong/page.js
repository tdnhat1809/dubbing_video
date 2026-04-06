export default function HDDichTuDongPage() {
  const steps = [
    { step: 1, title: 'Đăng nhập tài khoản', desc: 'Truy cập dichtudong.com và đăng nhập bằng tài khoản Google hoặc email đã đăng ký.', icon: 'login' },
    { step: 2, title: 'Upload video', desc: 'Nhấn nút "Tải lên video" và chọn file video từ máy tính. Hỗ trợ MP4, AVI, MKV, MOV (tối đa 2GB).', icon: 'upload_file' },
    { step: 3, title: 'Chọn ngôn ngữ dịch', desc: 'Chọn ngôn ngữ nguồn (tự động nhận diện) và ngôn ngữ đích muốn dịch. Hỗ trợ 50+ ngôn ngữ.', icon: 'translate' },
    { step: 4, title: 'Cấu hình tùy chọn', desc: 'Tùy chỉnh: giữ lại phụ đề gốc, chọn giọng AI, bật/tắt voice cloning, chọn chất lượng xuất.', icon: 'tune' },
    { step: 5, title: 'Bắt đầu dịch', desc: 'Nhấn "Dịch Ngay" và chờ AI xử lý. Thời gian trung bình 3-5 phút cho video 10 phút.', icon: 'auto_awesome' },
    { step: 6, title: 'Tải về kết quả', desc: 'Khi hoàn tất, xem trước video dịch và tải về bản MP4 1080P cùng file phụ đề SRT/ASS.', icon: 'download' },
  ];

  return (
    <>
      <section className="min-h-[400px] flex flex-col justify-center py-20 px-8 relative overflow-hidden" style={{ background: 'radial-gradient(circle at top right, #302950, #0f072e)' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[120px]"></div>
        </div>
        <div className="max-w-screen-2xl mx-auto w-full relative z-10">
          <nav className="flex items-center gap-2 mb-6 text-sm font-medium text-white/50">
            <span>Trang Chủ</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span>Hướng Dẫn</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-white font-semibold">HD Dịch Tự Động</span>
          </nav>
          <h1 className="text-[#f4f1ff] text-4xl md:text-6xl font-extrabold tracking-tight mb-4">HD Dịch Tự Động</h1>
          <p className="text-[#f4f1ff]/60 text-lg max-w-2xl">Hướng dẫn từng bước cách sử dụng tính năng dịch video tự động bằng AI trên DichTuDong.com.</p>
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

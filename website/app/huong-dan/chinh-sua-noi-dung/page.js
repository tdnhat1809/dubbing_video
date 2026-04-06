export default function HDChinhSuaPage() {
  const steps = [
    { step: 1, title: 'Mở video đã dịch', desc: 'Truy cập mục "Video của tôi" và chọn video cần chỉnh sửa. Nhấn vào biểu tượng bút chì để vào chế độ chỉnh sửa.', icon: 'edit' },
    { step: 2, title: 'Chỉnh sửa phụ đề', desc: 'Chọn dòng phụ đề cần sửa, nhập nội dung mới. Hệ thống sẽ tự động đồng bộ thời gian với video.', icon: 'subtitles' },
    { step: 3, title: 'Điều chỉnh thời gian', desc: 'Kéo thanh timeline để điều chỉnh thời điểm bắt đầu và kết thúc của mỗi đoạn phụ đề cho chính xác.', icon: 'timer' },
    { step: 4, title: 'Thay đổi giọng đọc', desc: 'Chọn giọng AI mới cho từng đoạn hoặc toàn bộ video. Hỗ trợ giọng nam, nữ, trẻ em đa ngôn ngữ.', icon: 'record_voice_over' },
    { step: 5, title: 'Xem trước & Lưu', desc: 'Nhấn "Preview" để xem trước thay đổi. Hài lòng rồi nhấn "Lưu và Xuất" để tạo bản video mới.', icon: 'save' },
  ];

  return (
    <>
      <section className="min-h-[400px] flex flex-col justify-center py-20 px-8 relative overflow-hidden" style={{ background: 'radial-gradient(circle at top right, #302950, #0f072e)' }}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary rounded-full blur-[100px]"></div>
        </div>
        <div className="max-w-screen-2xl mx-auto w-full relative z-10">
          <nav className="flex items-center gap-2 mb-6 text-sm font-medium text-white/50">
            <span>Trang Chủ</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span>Hướng Dẫn</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-white font-semibold">HD Chỉnh Sửa Nội Dung</span>
          </nav>
          <h1 className="text-[#f4f1ff] text-4xl md:text-6xl font-extrabold tracking-tight mb-4">HD Chỉnh Sửa Nội Dung</h1>
          <p className="text-[#f4f1ff]/60 text-lg max-w-2xl">Hướng dẫn chỉnh sửa phụ đề, giọng đọc và nội dung video sau khi dịch tự động.</p>
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

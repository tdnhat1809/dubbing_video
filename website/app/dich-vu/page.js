import Link from 'next/link';

export const metadata = {
  title: 'Dịch Vụ - DichTuDong.com',
  description: 'Giải pháp dịch thuật video toàn diện với AI.',
};

export default function ServicesPage() {
  const services = [
    { icon: 'document_scanner', title: 'Nhận diện văn bản OCR', desc: 'Công nghệ OCR thế hệ mới quét và nhận diện chính xác văn bản trong Video, kể cả chữ viết tay hoặc font đặc biệt.', color: 'from-[#ff7b54] to-[#ff9254]' },
    { icon: 'keyboard_voice', title: 'Nhận diện giọng nói', desc: 'Speech-to-Text thế hệ 5 nhận diện hơn 100+ ngôn ngữ với độ chính xác lên đến 97.8%.', color: 'from-[#ff9254] to-[#ffa354]' },
    { icon: 'translate', title: 'Dịch thuật AI', desc: 'Tích hợp ChatGPT dịch thuật với văn phong bản xứ, hiểu ngữ cảnh và giữ nguyên ý nghĩa gốc.', color: 'from-primary to-primary-fixed' },
    { icon: 'record_voice_over', title: 'Lồng tiếng tự động', desc: 'AI Voice Cloning tạo giọng nói tự nhiên, đa nhân vật, đa tốc độ. Đồng bộ lipsync hoàn hảo.', color: 'from-rose-500 to-pink-500' },
    { icon: 'edit_note', title: 'Chỉnh sửa thông minh', desc: 'Công cụ Edit/Timing tự động căn chỉnh phụ đề theo thời gian thực, hỗ trợ drag & drop.', color: 'from-secondary to-secondary-dim' },
    { icon: 'file_download', title: 'Xuất đa định dạng', desc: 'Xuất Video MP4 Full HD 1080P, file phụ đề SRT/ASS, hoặc tải riêng file âm thanh.', color: 'from-indigo-500 to-violet-500' },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative pt-24 pb-16 px-8 text-center overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-primary-container/20 to-transparent blur-3xl rounded-full"></div>
        <div className="relative z-10">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold tracking-widest uppercase mb-6">
            Dịch Vụ Của Chúng Tôi
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-on-surface mb-8">
            Giải pháp dịch thuật video <span className="text-primary">toàn diện</span>
          </h1>
          <p className="max-w-2xl mx-auto text-on-surface-variant leading-relaxed">
            Từ nhận diện đến xuất bản, AI lo tất cả cho bạn. Tất cả trong một nền tảng duy nhất.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="max-w-7xl mx-auto px-8 pb-32">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, i) => (
            <div key={i} className={`p-8 rounded-[2rem] text-white shadow-xl hover:-translate-y-2 transition-transform bg-gradient-to-br ${s.color}`}>
              <span className="material-symbols-outlined text-4xl mb-4">{s.icon}</span>
              <h3 className="text-2xl font-bold mb-3">{s.title}</h3>
              <p className="opacity-90 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-8 mb-32">
        <div className="bg-gradient-to-r from-primary to-secondary py-16 px-12 rounded-[3rem] shadow-2xl relative overflow-hidden text-center">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Bắt đầu dịch video ngay hôm nay!</h2>
            <p className="text-white/80 mb-8 max-w-md mx-auto">Đăng ký miễn phí, không cần thẻ tín dụng. Nhận ngay 5.000 tokens khi đăng nhập bằng Google.</p>
            <Link href="/dang-nhap" className="inline-flex items-center gap-3 px-10 py-5 bg-white text-primary rounded-2xl font-bold text-lg hover:scale-95 transition-all shadow-xl">
              Dùng thử miễn phí
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

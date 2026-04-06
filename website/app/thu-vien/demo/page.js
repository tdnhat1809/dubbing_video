export default function DemoPage() {
  const demos = [
    { title: 'Dịch Video Youtube Anh → Việt', desc: 'Video review công nghệ được dịch tự động từ tiếng Anh sang tiếng Việt với AI Voice Cloning.', lang: '🇬🇧 → 🇻🇳', duration: '5:30', img: '/images/library/chat-gpt-2.jpg' },
    { title: 'Dịch Video Tiktok Trung → Việt', desc: 'Video Douyin/Tiktok được dịch từ tiếng Trung sang tiếng Việt, giữ nguyên hiệu ứng và nhạc nền.', lang: '🇨🇳 → 🇻🇳', duration: '1:00', img: '/images/library/thanh-xuan.jpg' },
    { title: 'Lồng tiếng AI phim tài liệu', desc: 'Phim tài liệu thiên nhiên được lồng tiếng AI tự nhiên, đa giọng nói, giữ nguyên âm thanh nền.', lang: '🇫🇷 → 🇻🇳', duration: '12:00', img: '/images/library/ted-01.jpg' },
    { title: 'Chuyển đổi Audio Podcast', desc: 'Podcast tiếng Nhật được chuyển đổi sang tiếng Việt với giọng đọc AI tự nhiên.', lang: '🇯🇵 → 🇻🇳', duration: '25:00', img: '/images/library/ai-02.jpg' },
  ];

  return (
    <>
      <header className="relative overflow-hidden pt-20 pb-32 px-6">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-primary-container blur-[60px] opacity-40 -z-10"></div>
        <div className="max-w-4xl mx-auto text-center">
          <nav className="flex justify-center items-center gap-2 mb-6 text-sm font-medium text-on-surface-variant/70">
            <span>Trang Chủ</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span>Thư Viện</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary font-semibold">DEMO</span>
          </nav>
          <h1 className="text-6xl md:text-7xl italic font-light tracking-tight text-on-background mb-8">DEMO</h1>
          <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed max-w-3xl mx-auto">
            Xem trực tiếp các video đã được dịch bởi AI. So sánh chất lượng trước và sau khi dịch.
          </p>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-8 py-20">
        <div className="space-y-12">
          {demos.map((demo, i) => (
            <div key={i} className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col md:flex-row">
              <div className="relative md:w-[45%] aspect-video overflow-hidden">
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={demo.img} alt={demo.title} />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <div className="w-20 h-20 bg-[#ff0000] rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-white text-5xl" style={{fontVariationSettings: "'FILL' 1"}}>play_arrow</span>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-black/80 text-white text-sm px-3 py-1 rounded-lg font-medium">{demo.duration}</div>
              </div>
              <div className="p-8 md:p-12 flex flex-col justify-center md:w-[55%]">
                <span className="text-2xl mb-3">{demo.lang}</span>
                <h3 className="text-2xl font-bold text-on-surface mb-4">{demo.title}</h3>
                <p className="text-on-surface-variant leading-relaxed mb-6">{demo.desc}</p>
                <button className="self-start px-8 py-3 bg-primary text-on-primary rounded-xl font-bold hover:scale-95 transition-transform shadow-lg shadow-primary/20">
                  Xem Demo
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

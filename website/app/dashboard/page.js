'use client';
import { useState, useRef, useCallback } from 'react';

const sidebarItems = [
  { icon: 'cloud_upload', label: 'XUẤT BẢN', id: 'publish' },
  { icon: 'add', label: 'TẠO MỚI', id: 'new' },
  { icon: 'music_note', label: 'LỒNG TIẾNG', id: 'dubbing' },
  { icon: 'list_alt', label: 'TIẾN TRÌNH', id: 'progress' },
  { icon: 'settings', label: 'CÀI ĐẶT', id: 'settings' },
  { icon: 'volume_up', label: 'ÂM THANH', id: 'audio' },
  { icon: 'crop', label: 'KHUNG &\nLOGO', id: 'frame' },
  { icon: 'subtitles', label: 'PHỤ ĐỀ', id: 'subtitle' },
  { icon: 'person', label: 'NGƯỜI DÙNG', id: 'user' },
  { icon: 'help', label: 'HỖ TRỢ', id: 'support' },
];

const sourceLanguages = ['Phát hiện ngôn ngữ', 'Tiếng Trung', 'Tiếng Anh', 'Tiếng Nhật', 'Tiếng Hàn'];
const targetLanguages = ['Tiếng Việt', 'Tiếng Anh', 'Tiếng Trung', 'Tiếng Nhật', 'Tiếng Hàn', 'Tiếng Pháp'];
const aiEngines = [
  { id: 'deepseek', label: 'Deepseek' },
  { id: 'gpt4o', label: 'GPT 4o' },
  { id: 'gpt4mini', label: 'GPT 4mini', badge: '90', hot: true },
];
const translationModes = [
  { id: 'srt', label: 'Lồng tiếng từ .SRT' },
  { id: 'hardsub', label: 'Dịch sub cứng' },
  { id: 'text', label: 'Dịch văn bản' },
  { id: 'audio', label: 'Dịch âm thanh' },
  { id: 'audiov2', label: 'Dịch âm thanh V2' },
];
const advancedOptions = [
  { id: 'removeText', label: 'Xóa văn bản gốc' },
  { id: 'splitMusic', label: 'Tách nhạc nền' },
  { id: 'mergeLine', label: 'Gộp dòng' },
  { id: 'mergeBlur', label: 'Gộp làm mờ' },
];

export default function DashboardPage() {
  const [activeMenu, setActiveMenu] = useState('new');
  const [srcLang, setSrcLang] = useState('Phát hiện ngôn ngữ');
  const [tgtLang, setTgtLang] = useState('Tiếng Việt');
  const [engine, setEngine] = useState('gpt4mini');
  const [mode, setMode] = useState('hardsub');
  const [options, setOptions] = useState({ removeText: false, splitMusic: false, mergeLine: true, mergeBlur: false });
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showSrcDropdown, setShowSrcDropdown] = useState(false);
  const [showTgtDropdown, setShowTgtDropdown] = useState(false);
  const fileInputRef = useRef(null);

  const toggleOption = (id) => setOptions(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) setUploadedFile(file);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#0a0a14', fontFamily: "'Inter', 'Manrope', sans-serif" }}>
      {/* Google Material Symbols */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap" />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex items-center justify-center relative">
        {/* Upload Panel */}
        <div className="w-full max-w-[750px] rounded-2xl overflow-hidden" style={{ background: '#1b1b25' }}>
          {/* Panel Header */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 className="text-white/90 text-base font-semibold tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Tải lên</h2>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span className="material-symbols-outlined text-sm">info</span>
              <span>MP4, AVI, MKV • Tối đa 200MB</span>
            </div>
          </div>

          {/* Drop Zone */}
          <div className="px-6 pt-5 pb-3">
            <div
              className={`relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center py-10 ${dragOver ? 'border-[#17a2b8] bg-[#17a2b8]/5' : 'border-white/15 hover:border-white/30'}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" accept="video/*,.srt,.ass" className="hidden" onChange={handleFileSelect} />
              {uploadedFile ? (
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#17a2b8] text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>movie</span>
                  <div>
                    <p className="text-white/90 font-medium text-sm">{uploadedFile.name}</p>
                    <p className="text-white/40 text-xs">{(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                  <button className="ml-4 text-white/40 hover:text-red-400 transition-colors" onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-white/20 text-5xl mb-3">image</span>
                  <p className="text-white/50 text-sm mb-1">Thả tập tin vào đây</p>
                  <p className="text-white/30 text-xs mb-4">chấp nhận MP4, tối đa 200MB</p>
                  {/* Source Icons */}
                  <div className="flex items-center gap-3">
                    {[
                      { icon: '🔺', label: 'Drive', color: '#FBBC04' },
                      { icon: '💧', label: 'Dropbox', color: '#0061FF' },
                      { icon: '🔗', label: 'Link', color: '#62d6ed' },
                      { icon: '🎵', label: 'TikTok', color: '#ff0050' },
                      { icon: '▶️', label: 'YouTube', color: '#FF0000' },
                    ].map((src, i) => (
                      <button key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-sm hover:scale-110 transition-transform" style={{ background: `${src.color}20` }} title={src.label}>
                        {src.icon}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Language Selection */}
          <div className="px-6 py-3">
            <div className="flex items-center rounded-xl overflow-hidden" style={{ background: '#12121d' }}>
              {/* Source Language */}
              <div className="flex-1 relative">
                <button className="w-full px-4 py-3 text-sm text-left flex items-center justify-between hover:bg-white/5 transition-colors" onClick={() => { setShowSrcDropdown(!showSrcDropdown); setShowTgtDropdown(false); }}>
                  <span className={srcLang === 'Phát hiện ngôn ngữ' ? 'text-[#62d6ed]' : 'text-white/80'}>{srcLang}</span>
                  <span className="material-symbols-outlined text-white/30 text-sm">expand_more</span>
                </button>
                {showSrcDropdown && (
                  <div className="absolute top-full left-0 w-full z-50 rounded-b-xl overflow-hidden shadow-2xl" style={{ background: '#1f1f29' }}>
                    {sourceLanguages.map((lang) => (
                      <button key={lang} className={`w-full px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors ${srcLang === lang ? 'text-[#62d6ed]' : 'text-white/70'}`} onClick={() => { setSrcLang(lang); setShowSrcDropdown(false); }}>
                        {lang}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Swap Button */}
              <button className="px-3 py-3 text-white/30 hover:text-[#62d6ed] transition-colors" onClick={() => { if (srcLang !== 'Phát hiện ngôn ngữ') { const tmp = srcLang; setSrcLang(tgtLang); setTgtLang(tmp); }}}>
                <span className="material-symbols-outlined text-lg">swap_horiz</span>
              </button>
              {/* Target Language */}
              <div className="flex-1 relative">
                <button className="w-full px-4 py-3 text-sm text-right flex items-center justify-end gap-2 hover:bg-white/5 transition-colors" onClick={() => { setShowTgtDropdown(!showTgtDropdown); setShowSrcDropdown(false); }}>
                  <span className="text-white/90 font-medium">{tgtLang}</span>
                  <span className="material-symbols-outlined text-white/30 text-sm">expand_more</span>
                </button>
                {showTgtDropdown && (
                  <div className="absolute top-full right-0 w-full z-50 rounded-b-xl overflow-hidden shadow-2xl" style={{ background: '#1f1f29' }}>
                    {targetLanguages.map((lang) => (
                      <button key={lang} className={`w-full px-4 py-2.5 text-sm text-right hover:bg-white/5 transition-colors ${tgtLang === lang ? 'text-[#62d6ed]' : 'text-white/70'}`} onClick={() => { setTgtLang(lang); setShowTgtDropdown(false); }}>
                        {lang}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Engine Selection */}
          <div className="px-6 py-2">
            <div className="flex items-center rounded-xl overflow-hidden" style={{ background: '#12121d' }}>
              {aiEngines.map((eng) => (
                <button key={eng.id} className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${engine === eng.id ? 'text-[#62d6ed] bg-white/5' : 'text-white/40 hover:text-white/60 hover:bg-white/3'}`} onClick={() => setEngine(eng.id)}>
                  {eng.label}
                  {eng.badge && <span className="text-[#FBBC04] text-xs font-bold">{eng.badge}</span>}
                  {eng.hot && <span className="text-[#FBBC04] text-xs">🔑</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Translation Mode */}
          <div className="px-6 py-2">
            <div className="flex items-center rounded-xl overflow-hidden flex-wrap" style={{ background: '#12121d' }}>
              {translationModes.map((m) => (
                <button key={m.id} className={`flex-1 min-w-0 px-3 py-3 text-xs font-medium transition-all whitespace-nowrap ${mode === m.id ? 'text-[#62d6ed] bg-white/5' : 'text-white/40 hover:text-white/60 hover:bg-white/3'}`} onClick={() => setMode(m.id)}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options */}
          <div className="px-6 py-2">
            <div className="flex items-center rounded-xl overflow-hidden" style={{ background: '#12121d' }}>
              {advancedOptions.map((opt) => (
                <button key={opt.id} className={`flex-1 px-3 py-3 text-xs font-medium transition-all ${options[opt.id] ? 'text-[#62d6ed] bg-white/5' : 'text-white/40 hover:text-white/60 hover:bg-white/3'}`} onClick={() => toggleOption(opt.id)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-between mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>monetization_on</span>
              <span>0 MB | 990 Point/phút</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95" style={{ background: 'linear-gradient(135deg, #62d6ed, #17a2b8)' }}>
                Tải lên
              </button>
              <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white/80 transition-colors" style={{ background: '#292934' }}>
                Hủy
              </button>
            </div>
          </div>
        </div>

        {/* Tiếp tục Button */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <button className="flex items-center gap-3 px-10 py-4 rounded-2xl text-white font-bold text-base shadow-2xl hover:shadow-indigo-500/30 transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            Tiếp tục
            <span className="material-symbols-outlined bg-white/20 rounded-full p-1 text-lg">arrow_forward</span>
          </button>
        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-[76px] flex flex-col items-center py-4 gap-1 overflow-y-auto" style={{ background: '#111118' }}>
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            className={`w-full flex flex-col items-center py-3 px-1 gap-1.5 transition-all relative group ${activeMenu === item.id ? 'text-[#62d6ed]' : 'text-white/35 hover:text-white/60'}`}
            onClick={() => setActiveMenu(item.id)}
          >
            {activeMenu === item.id && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-l-full bg-[#62d6ed]" />
            )}
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: activeMenu === item.id ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
            <span className="text-[9px] font-semibold tracking-wider text-center leading-tight whitespace-pre-line">{item.label}</span>
          </button>
        ))}
        <div className="mt-auto pt-4">
          <button className="text-white/25 text-[9px] font-semibold tracking-wider hover:text-white/50 transition-colors">
            ENGLISH
          </button>
        </div>
      </aside>
    </div>
  );
}

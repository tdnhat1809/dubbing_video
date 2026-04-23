'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  { id: 'gpt54', label: 'GPT 5.4', badge: '⭐', hot: true },
  { id: 'gpt53', label: 'GPT 5.3' },
  { id: 'gpt52', label: 'GPT 5.2' },
  { id: 'gpt51', label: 'GPT 5.1' },
  { id: 'gpt51mini', label: 'GPT 5.1 Mini' },
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
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('new');
  const [srcLang, setSrcLang] = useState('Phát hiện ngôn ngữ');
  const [tgtLang, setTgtLang] = useState('Tiếng Việt');
  const [engine, setEngine] = useState('gpt4mini');
  const [mode, setMode] = useState('hardsub');
  const [options, setOptions] = useState({ removeText: false, splitMusic: false, mergeLine: true, mergeBlur: false });
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [srtFile, setSrtFile] = useState(null);
  const [showSrcDropdown, setShowSrcDropdown] = useState(false);
  const [showTgtDropdown, setShowTgtDropdown] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [taskId, setTaskId] = useState(null);
  const [savedTasks, setSavedTasks] = useState([]);
  const fileInputRef = useRef(null);
  const srtInputRef = useRef(null);

  // Load saved tasks from disk on mount
  useEffect(() => {
    fetch('/api/tasks').then(r => r.json()).then(d => {
      if (d.tasks) setSavedTasks(d.tasks);
    }).catch(() => {});
  }, []);

  const toggleOption = (id) => setOptions(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) { setUploadedFile(file); setUploadError(null); }
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) { setUploadedFile(file); setUploadError(null); }
  };

  const handleUpload = async () => {
    if (!uploadedFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(p => Math.min(p + 3, 90));
    }, 150);

    try {
      const formData = new FormData();
      formData.append('video', uploadedFile);
      if (srtFile) {
        formData.append('srt', srtFile);
        formData.append('skipExtract', 'true');
      }
      formData.append('source_lang', srcLang);
      formData.append('target_lang', tgtLang);
      formData.append('engine', engine);
      formData.append('mode', mode === 'hardsub' ? 'Dịch sub cứng' : mode);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      clearInterval(progressInterval);

      if (res.ok) {
        setUploadProgress(100);
        setTaskId(data.taskId);
        // Redirect to editor after short delay
        setTimeout(() => {
          router.push(`/dashboard/editor?task=${data.taskId}`);
        }, 800);
      } else {
        setUploadError(data.error || 'Upload failed');
        setUploading(false);
      }
    } catch (err) {
      clearInterval(progressInterval);
      setUploadError(err.message);
      setUploading(false);
    }
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
            {/* SRT File Upload */}
            {uploadedFile && (
              <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: '#12121d' }}>
                <span className="material-symbols-outlined text-white/30 text-lg">subtitles</span>
                <div className="flex-1">
                  {srtFile ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[#62d6ed] text-xs">{srtFile.name}</span>
                      <button className="text-white/30 hover:text-red-400 text-xs" onClick={() => setSrtFile(null)}>✕</button>
                    </div>
                  ) : (
                    <button className="text-white/40 text-xs hover:text-[#62d6ed] transition-colors" onClick={() => srtInputRef.current?.click()}>
                      + Tải phụ đề (.srt) có sẵn (bỏ qua trích xuất)
                    </button>
                  )}
                  <input ref={srtInputRef} type="file" accept=".srt,.ass,.vtt" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setSrtFile(e.target.files[0]); }} />
                </div>
                {srtFile && <span className="text-green-400 text-[10px]">✓ Sẽ bỏ qua trích xuất</span>}
              </div>
            )}
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

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="px-6 py-2">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#12121d' }}>
                <div className="h-full rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #62d6ed, #6366f1, #8b5cf6)' }} />
              </div>
              <p className="text-white/30 text-xs text-center mt-1">
                {uploadProgress < 100 ? 'Đang tải video lên server...' : '✓ Upload thành công! Đang chuyển hướng...'}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-between mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>monetization_on</span>
              <span>0 MB | 990 Point/phút</span>
            </div>
            <div className="flex items-center gap-3">
              {uploadError && <span className="text-red-400 text-xs mr-2">{uploadError}</span>}
              <button
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
                style={{ background: uploading ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #62d6ed, #17a2b8)' }}
                onClick={handleUpload}
                disabled={!uploadedFile || uploading}
              >
                {uploading ? `Đang tải... ${uploadProgress}%` : 'Tải lên'}
              </button>
              <button className="px-6 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white/80 transition-colors" style={{ background: '#292934' }}
                onClick={() => { setUploadedFile(null); setUploading(false); setUploadProgress(0); setUploadError(null); }}>
                Hủy
              </button>
            </div>
          </div>
        </div>

        {/* Saved Tasks */}
        {savedTasks.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-[750px] px-4">
            <div className="rounded-xl overflow-hidden" style={{ background: '#1b1b25' }}>
              <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-white/60 text-xs font-semibold">Tiến trình đã lưu ({savedTasks.length})</span>
              </div>
              <div className="max-h-32 overflow-y-auto">
                {savedTasks.map(t => (
                  <button key={t.id} className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors text-left" onClick={() => router.push(`/dashboard/editor?task=${t.id}`)}>
                    <span className={`w-2 h-2 rounded-full ${t.status === 'extracted' ? 'bg-green-400' : t.status === 'error' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                    <span className="text-white/70 text-xs flex-1 truncate">{t.title || t.filename}</span>
                    <span className="text-white/30 text-[10px]">{t.status}</span>
                    <span className="text-white/20 text-[10px]">{new Date(t.createdAt).toLocaleDateString('vi')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-[76px] flex flex-col items-center py-4 gap-1 overflow-y-auto" style={{ background: '#111118' }}>
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            className={`w-full flex flex-col items-center py-3 px-1 gap-1.5 transition-all relative group ${activeMenu === item.id ? 'text-[#62d6ed]' : 'text-white/35 hover:text-white/60'}`}
            onClick={() => { setActiveMenu(item.id); if (item.id === 'progress') router.push('/dashboard/progress'); else if (item.id === 'settings') router.push('/dashboard/settings'); else if (item.id === 'new') router.push('/dashboard'); }}
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

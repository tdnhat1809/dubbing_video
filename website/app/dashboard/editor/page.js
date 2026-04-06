'use client';
import { useState, useRef, useEffect } from 'react';

/* ── sample subtitle data ── */
const sampleSubs = [
  { id: 1, start: '0:00:00.00', end: '0:00:05.20', original: '如果根据卡尔达肖夫指数计算', translation: 'Nếu tính theo chỉ số Kardashev', checked: true },
  { id: 2, start: '0:00:05.20', end: '0:00:10.50', original: '在宇宙中文明可以被分为7个等级', translation: 'Trong vũ trụ, nền văn minh có thể chia thành 7 cấp độ', checked: true },
  { id: 3, start: '0:00:10.50', end: '0:00:16.80', original: '如果你生活在七级文明会是怎样的景象呢', translation: 'Nếu bạn sống trong một nền văn minh cấp độ 7, cuộc sống sẽ trông như thế nào?', checked: true },
  { id: 4, start: '0:00:16.80', end: '0:00:22.10', original: '宇宙一级文明又被叫做行星文明', translation: 'Nền văn minh cấp độ 1 trong vũ trụ còn được gọi là văn minh hành tinh', checked: true },
  { id: 5, start: '0:00:22.10', end: '0:00:27.40', original: '在一级文明的人类', translation: 'Trong nền văn minh cấp độ 1', checked: false },
  { id: 6, start: '0:00:27.40', end: '0:00:33.20', original: '已经能够随心所欲地掌控整个地球', translation: 'Đã có thể tùy ý kiểm soát toàn bộ Trái Đất', checked: false },
  { id: 7, start: '0:00:33.20', end: '0:00:39.00', original: '包括自然界中所有的能量', translation: 'Bao gồm tất cả năng lượng trong tự nhiên', checked: false },
  { id: 8, start: '0:00:39.00', end: '0:00:44.30', original: '可以随意控制天气和地震', translation: 'Có thể tùy ý điều khiển thời tiết và động đất', checked: false },
];

const textStyles = [
  { id: 0, label: '⊘', bg: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' },
  { id: 1, label: 'Text', bg: 'transparent', color: '#fff', border: '1px solid #fff', fontWeight: '400' },
  { id: 2, label: 'Text', bg: 'transparent', color: '#fff', border: 'none', fontWeight: '500', textShadow: '1px 1px 2px #000' },
  { id: 3, label: 'Text', bg: 'transparent', color: '#fff', border: '2px solid #fff', fontWeight: '700' },
  { id: 4, label: 'Text', bg: '#e74c3c', color: '#fff', border: 'none', fontWeight: '700' },
  { id: 5, label: 'Text', bg: '#8b5cf6', color: '#fff', border: 'none', fontWeight: '700' },
  { id: 6, label: 'Text', bg: '#f59e0b', color: '#000', border: 'none', fontWeight: '700' },
  { id: 7, label: 'Text', bg: 'transparent', color: '#3b82f6', border: 'none', fontWeight: '700' },
  { id: 8, label: 'Text', bg: '#10b981', color: '#fff', border: 'none', fontWeight: '700' },
];

const leftTools = [
  { icon: 'add', label: 'Thêm dòng', id: 'add' },
  { icon: 'blur_on', label: 'Làm mờ', id: 'blur' },
  { icon: 'front_hand', label: 'Chọn', id: 'hand' },
  { icon: 'visibility', label: 'Hiển thị', id: 'visibility' },
  { icon: 'open_with', label: 'Di chuyển', id: 'move' },
  { icon: 'swap_horiz', label: 'Đổi nội dung', id: 'swap' },
  { icon: 'translate', label: 'Dịch', id: 'translate' },
  { icon: 'tune', label: 'Tinh chỉnh', id: 'tune' },
  { icon: 'content_copy', label: 'Sao chép', id: 'copy' },
  { icon: 'exit_to_app', label: 'Xuất', id: 'export' },
];

export default function EditorPage() {
  const [subtitles, setSubtitles] = useState(sampleSubs);
  const [activeSub, setActiveSub] = useState(1);
  const [fontSize, setFontSize] = useState(93);
  const [textAngle, setTextAngle] = useState(0);
  const [activeStyle, setActiveStyle] = useState(1);
  const [activeTool, setActiveTool] = useState('hand');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(122.70);
  const [volume, setVolume] = useState(80);
  const [showVolume, setShowVolume] = useState(false);
  const timelineRef = useRef(null);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
  };

  const toggleCheck = (id) => {
    setSubtitles(prev => prev.map(s => s.id === id ? { ...s, checked: !s.checked } : s));
  };

  const updateTranslation = (id, text) => {
    setSubtitles(prev => prev.map(s => s.id === id ? { ...s, translation: text } : s));
  };

  const timeToSeconds = (t) => {
    const parts = t.split(':');
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const sms = parts[2].split('.');
    const s = parseInt(sms[0]);
    const ms = parseInt(sms[1] || 0);
    return h * 3600 + m * 60 + s + ms / 100;
  };

  const progress = (currentTime / duration) * 100;

  return (
    <div className="flex h-screen w-screen overflow-hidden select-none" style={{ background: '#0d1117', fontFamily: "'Inter', sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&family=Inter:wght@400;500;600;700&display=swap" />

      {/* LEFT TOOL BAR */}
      <div className="w-[42px] flex flex-col items-center py-2 gap-0.5 shrink-0" style={{ background: '#161b22' }}>
        {leftTools.map((tool) => (
          <button
            key={tool.id}
            title={tool.label}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeTool === tool.id ? 'text-[#62d6ed] bg-[#62d6ed]/10' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
            onClick={() => setActiveTool(tool.id)}
          >
            <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
          </button>
        ))}
      </div>

      {/* CENTER: VIDEO + CONTROLS + TIMELINE */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* VIDEO PLAYER */}
        <div className="flex-1 relative bg-black flex items-center justify-center min-h-0">
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0020 0%, #1a0040 30%, #2d0060 60%, #0a0020 100%)' }}>
            {/* Simulated video content with cosmic visuals */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(ellipse at center, rgba(180,50,255,0.4) 0%, rgba(100,20,200,0.2) 30%, transparent 70%)',
            }} />
            <div className="absolute w-64 h-64 rounded-full animate-pulse" style={{
              background: 'radial-gradient(circle, rgba(255,100,255,0.6) 0%, rgba(100,50,255,0.3) 40%, transparent 70%)',
              filter: 'blur(30px)',
            }} />
            {/* Subtitle Overlay */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
              <div className="px-4 py-2 rounded" style={{ background: 'rgba(0,0,0,0.0)', border: '2px solid #f59e0b' }}>
                <p className="text-white text-lg font-medium text-center whitespace-nowrap" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                  {subtitles.find(s => s.id === activeSub)?.translation || ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* VIDEO CONTROLS */}
        <div className="px-4 py-2 flex items-center gap-4" style={{ background: '#161b22' }}>
          <span className="text-white/50 text-xs font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
          <button className="text-white/60 hover:text-white transition-colors" onClick={() => setPlaying(!playing)}>
            <span className="material-symbols-outlined text-2xl">{playing ? 'pause' : 'play_arrow'}</span>
          </button>
          {/* Speed */}
          <button className="text-[#62d6ed] text-xs font-bold hover:text-[#a4eeff] transition-colors">T</button>
          {/* Volume */}
          <div className="relative">
            <button className="text-white/60 hover:text-white transition-colors" onClick={() => setShowVolume(!showVolume)}>
              <span className="material-symbols-outlined text-xl">{volume > 0 ? 'volume_up' : 'volume_off'}</span>
            </button>
            {showVolume && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-4 rounded-lg shadow-xl" style={{ background: '#1f2937' }}>
                <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(parseInt(e.target.value))} className="h-20 appearance-none cursor-pointer" style={{ writingMode: 'vertical-lr', direction: 'rtl' }} />
              </div>
            )}
          </div>
        </div>

        {/* FONT SIZE & ANGLE CONTROLS */}
        <div className="px-4 py-2 flex items-center gap-6" style={{ background: '#161b22', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-xs">Cỡ chữ:</span>
            <input type="range" min="10" max="200" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} className="w-40 accent-[#62d6ed]" />
            <input type="number" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value) || 0)} className="w-12 text-center text-white text-xs rounded px-1 py-1" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-xs">Góc chữ:</span>
            <input type="range" min="-180" max="180" value={textAngle} onChange={(e) => setTextAngle(parseInt(e.target.value))} className="w-40 accent-[#62d6ed]" />
            <input type="number" value={textAngle} onChange={(e) => setTextAngle(parseInt(e.target.value) || 0)} className="w-12 text-center text-white text-xs rounded px-1 py-1" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>

        {/* TEXT STYLE PRESETS */}
        <div className="px-4 py-2 flex items-center gap-2" style={{ background: '#161b22', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {textStyles.map((style) => (
            <button
              key={style.id}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${activeStyle === style.id ? 'ring-2 ring-[#62d6ed] ring-offset-1 ring-offset-[#161b22]' : 'hover:opacity-80'}`}
              style={{ background: style.bg, color: style.color, border: style.border || 'none', fontWeight: style.fontWeight || '400', textShadow: style.textShadow || 'none', minWidth: '42px' }}
              onClick={() => setActiveStyle(style.id)}
            >
              {style.label}
            </button>
          ))}
        </div>

        {/* TIMELINE */}
        <div className="relative" style={{ background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Time markers */}
          <div className="flex items-center px-2 py-1 text-[9px] text-white/25 font-mono gap-0 overflow-hidden">
            {Array.from({ length: 13 }, (_, i) => (
              <span key={i} className="flex-1 text-center">{`0:00:${String(i * 5).padStart(2, '0')}.00`}</span>
            ))}
          </div>
          {/* Subtitle track */}
          <div className="h-7 mx-2 flex gap-0.5 overflow-hidden rounded">
            {subtitles.map((sub, i) => {
              const startSec = timeToSeconds(sub.start);
              const endSec = timeToSeconds(sub.end);
              const widthPct = ((endSec - startSec) / duration) * 100;
              const leftPct = (startSec / duration) * 100;
              return (
                <div
                  key={sub.id}
                  className={`h-full rounded-sm flex items-center justify-center text-[8px] text-white font-medium overflow-hidden cursor-pointer whitespace-nowrap px-1 transition-colors ${activeSub === sub.id ? 'bg-orange-500' : 'bg-orange-600/60 hover:bg-orange-500/80'}`}
                  style={{ width: `${widthPct}%`, minWidth: '20px' }}
                  onClick={() => { setActiveSub(sub.id); setCurrentTime(startSec); }}
                  title={sub.translation}
                >
                  {sub.translation.slice(0, 12)}
                </div>
              );
            })}
          </div>
          {/* Thumbnail strip */}
          <div className="h-14 mx-2 mt-1 flex gap-0 overflow-hidden rounded" style={{ background: '#1a1a2e' }}>
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="flex-1 h-full" style={{
                background: `linear-gradient(${45 + i * 18}deg, ${i % 3 === 0 ? '#2d0060' : i % 3 === 1 ? '#0a0040' : '#1a0030'}, ${i % 2 === 0 ? '#120030' : '#0d0020'})`,
                borderRight: '1px solid rgba(255,255,255,0.03)',
              }} />
            ))}
          </div>
          {/* Audio waveform */}
          <div className="h-8 mx-2 mt-1 mb-2 rounded overflow-hidden relative" style={{ background: '#0a1628' }}>
            <div className="absolute inset-0 flex items-end justify-around gap-px px-1">
              {Array.from({ length: 80 }, (_, i) => {
                const h = 15 + Math.sin(i * 0.3) * 10 + Math.random() * 8;
                return <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: `rgba(59,130,246,${0.3 + Math.random() * 0.4})`, minWidth: '2px' }} />;
              })}
            </div>
            {/* Music icon */}
            <div className="absolute left-2 top-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-blue-400/60 text-xs">music_note</span>
            </div>
          </div>
          {/* Playhead */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-blue-400 z-10 pointer-events-none" style={{ left: `${progress}%` }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-blue-400 rounded-full" />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: SUBTITLES */}
      <div className="w-[420px] flex flex-col shrink-0" style={{ background: '#161b22', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Panel Header */}
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-white/60 text-xs font-mono">Toàn bộ: 0:00s - {formatTime(duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-white/30 hover:text-white/60 transition-colors"><span className="material-symbols-outlined text-lg">undo</span></button>
            <button className="text-white/30 hover:text-white/60 transition-colors"><span className="material-symbols-outlined text-lg">redo</span></button>
            <button className="text-white/30 hover:text-white/60 transition-colors"><span className="material-symbols-outlined text-lg">cloud_upload</span></button>
          </div>
        </div>

        {/* Subtitle List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {subtitles.map((sub) => (
            <div
              key={sub.id}
              className={`px-4 py-3 cursor-pointer transition-colors ${activeSub === sub.id ? 'bg-[#1f2937]' : 'hover:bg-white/[0.02]'}`}
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onClick={() => { setActiveSub(sub.id); setCurrentTime(timeToSeconds(sub.start)); }}
            >
              {/* Original text */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-white/40 text-xs leading-relaxed flex-1">{sub.original}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button className="text-white/20 hover:text-[#62d6ed] transition-colors" title="Dịch lại">
                    <span className="material-symbols-outlined text-base">refresh</span>
                  </button>
                  <button className="text-white/20 hover:text-red-400 transition-colors" title="Xóa">
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
              {/* Translation textarea */}
              <div className="flex items-start gap-2">
                <textarea
                  value={sub.translation}
                  onChange={(e) => updateTranslation(sub.id, e.target.value)}
                  className="flex-1 text-white/90 text-sm leading-relaxed resize-none rounded px-2 py-1.5 min-h-[36px] focus:outline-none focus:ring-1 focus:ring-[#62d6ed]/30"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  rows={Math.ceil(sub.translation.length / 50)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex flex-col items-center gap-1.5 shrink-0 pt-1">
                  <button
                    className={`w-5 h-5 rounded flex items-center justify-center text-xs transition-all ${sub.checked ? 'bg-[#17a2b8] text-white' : 'border border-white/20 text-white/20 hover:border-white/40'}`}
                    onClick={(e) => { e.stopPropagation(); toggleCheck(sub.id); }}
                  >
                    {sub.checked && <span className="material-symbols-outlined text-sm">check</span>}
                  </button>
                  <span className="w-4 h-4 rounded bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white/15 text-xs">drag_indicator</span>
                  </span>
                </div>
              </div>
              {/* Time stamp */}
              <p className="text-white/15 text-[10px] font-mono mt-1">{sub.start} → {sub.end}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SIDEBAR (same as dashboard) */}
      <div className="w-[56px] flex flex-col items-center py-3 gap-0.5 shrink-0" style={{ background: '#0d1117', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        {[
          { icon: 'cloud_upload', label: 'XUẤT BẢN' },
          { icon: 'add', label: 'TẠO MỚI' },
          { icon: 'music_note', label: 'LỒNG TIẾNG' },
          { icon: 'list_alt', label: 'TIẾN TRÌNH' },
          { icon: 'settings', label: 'CÀI ĐẶT' },
          { icon: 'volume_up', label: 'ÂM THANH' },
          { icon: 'crop', label: 'KHUNG &\nLOGO' },
          { icon: 'subtitles', label: 'PHỤ ĐỀ' },
          { icon: 'person', label: 'NGƯỜI\nDÙNG' },
          { icon: 'help', label: 'HỖ TRỢ' },
        ].map((item, i) => (
          <button key={i} className="w-full flex flex-col items-center py-2 px-0.5 gap-0.5 text-white/30 hover:text-white/60 transition-colors">
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            <span className="text-[7px] font-semibold tracking-wider text-center leading-tight whitespace-pre-line">{item.label}</span>
          </button>
        ))}
        <div className="mt-auto">
          <span className="text-white/20 text-[7px] tracking-wider font-semibold">ENGLISH</span>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        input[type=range] { height: 4px; }
        input[type=range]::-webkit-slider-thumb { width: 12px; height: 12px; border-radius: 50%; cursor: pointer; }
      `}</style>
    </div>
  );
}

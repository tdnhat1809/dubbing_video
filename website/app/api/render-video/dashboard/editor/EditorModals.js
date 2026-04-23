'use client';
import { useState } from 'react';

/* ─── Modal Backdrop ─── */
function ModalBackdrop({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative">
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   UPLOAD MODAL (Tải lên)
   ═══════════════════════════════════════════ */
export function UploadModal({ onClose, onUpload }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sourceLang, setSourceLang] = useState('Tiếng Trung');
  const [targetLang, setTargetLang] = useState('Tiếng Việt');
  const [engine, setEngine] = useState('GPT 5.4');
  const [mode, setMode] = useState('Dịch sub cứng');

  const engines = ['GPT 5.4', 'GPT 5.3', 'GPT 5.2', 'GPT 5.1', 'GPT 5.1 Mini'];
  const modes = ['Lồng tiếng từ .SRT', 'Dịch sub cứng', 'Dịch văn bản', 'Dịch âm thanh', 'Dịch âm thanh V2'];
  const extras = ['Xóa văn bản gốc', 'Tách nhạc nền', 'Gộp dòng', 'Gộp làm mờ'];

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    const interval = setInterval(() => setProgress(p => Math.min(p + 2, 95)), 100);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('source_lang', sourceLang);
    formData.append('target_lang', targetLang);
    formData.append('engine', engine);
    formData.append('mode', mode);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      clearInterval(interval);
      setProgress(100);
      if (onUpload) onUpload(data);
      setTimeout(() => onClose(), 500);
    } catch (err) {
      clearInterval(interval);
      setUploading(false);
      alert('Upload failed: ' + err.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="rounded-xl w-[700px] max-h-[80vh] overflow-y-auto" style={{ background: '#1b1b2f', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">Tải lên</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer ${dragActive ? 'border-[#62d6ed] bg-[#62d6ed]/5' : 'border-white/10 hover:border-white/20'}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('modal-file-input').click()}
          >
            <span className="material-symbols-outlined text-4xl text-white/20">cloud_upload</span>
            <p className="text-white/40 text-sm">Thả tập tin vào đây</p>
            <div className="flex gap-2 mt-1">
              {['🔗', '📁', '📎', '🎵', '▶️'].map((icon, i) => (
                <span key={i} className="text-lg opacity-40 hover:opacity-80 cursor-pointer transition-opacity">{icon}</span>
              ))}
            </div>
            <input id="modal-file-input" type="file" accept="video/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#0d1117' }}>
                <div className="h-full rounded-full transition-all duration-200" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
              </div>
              <p className="text-white/40 text-xs text-center">{progress}% đang tải lên...</p>
            </div>
          )}

          {/* Language */}
          <div className="flex items-center justify-center gap-3">
            <button className="px-4 py-1.5 rounded-full text-xs text-cyan-300 border border-cyan-400/30 bg-cyan-400/5">Phát hiện ngôn ngữ</button>
            <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} className="px-3 py-1.5 rounded text-sm text-white bg-transparent border border-white/10 focus:outline-none">
              <option value="Tiếng Trung">Tiếng Trung</option>
              <option value="Tiếng Anh">Tiếng Anh</option>
              <option value="Tiếng Nhật">Tiếng Nhật</option>
              <option value="Tiếng Hàn">Tiếng Hàn</option>
            </select>
            <span className="material-symbols-outlined text-white/30">swap_horiz</span>
            <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="px-3 py-1.5 rounded text-sm text-white bg-transparent border border-white/10 focus:outline-none">
              <option value="Tiếng Việt">Tiếng Việt</option>
              <option value="Tiếng Anh">Tiếng Anh</option>
            </select>
          </div>

          {/* Engine */}
          <div className="flex items-center justify-center gap-2">
            {engines.map(e => (
              <button key={e} className={`px-4 py-1.5 rounded text-sm transition-all ${engine === e ? 'bg-[#6366f1] text-white' : 'text-white/50 hover:text-white/80 border border-white/10'}`} onClick={() => setEngine(e)}>{e}</button>
            ))}
          </div>

          {/* Mode */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {modes.map(m => (
              <button key={m} className={`px-3 py-1 rounded text-xs transition-all ${mode === m ? 'bg-[#62d6ed]/20 text-[#62d6ed] border border-[#62d6ed]/30' : 'text-white/40 hover:text-white/60 border border-white/10'}`} onClick={() => setMode(m)}>{m}</button>
            ))}
          </div>

          {/* Extras */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {extras.map(ex => (
              <button key={ex} className="px-3 py-1 rounded text-xs text-white/30 border border-white/5 hover:text-white/50 hover:border-white/15 transition-all">{ex}</button>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <span className="text-white/20 text-xs">📁 0 MB | 990 Point/phút</span>
            <div className="flex gap-2">
              <button className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} onClick={() => document.getElementById('modal-file-input').click()}>Tải lên</button>
              <button className="px-5 py-2 rounded-lg text-sm text-white/50 border border-white/10 hover:bg-white/5" onClick={onClose}>Hủy</button>
            </div>
          </div>
        </div>
      </div>
    </ModalBackdrop>
  );
}

/* ═══════════════════════════════════════════
   EXPORT MODAL (Xuất bản)
   ═══════════════════════════════════════════ */
export function ExportModal({ onClose, onExport, videoTitle = 'DEMO', duration = '0:02:02.70', subtitles = [], settings = {}, videoPath, voiceoverPath, taskId, blurMode = 'manual', blurHeight = 15, blurWidth = 100, blurIntensity = 15 }) {
  const [title, setTitle] = useState(videoTitle);
  const [quality, setQuality] = useState('1080p');
  const [format, setFormat] = useState('MP4');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);
  
  // Render options
  const [blurHardsub, setBlurHardsub] = useState(true);
  const [includeSubtitle, setIncludeSubtitle] = useState(true);
  const [includeVoiceover, setIncludeVoiceover] = useState(!!voiceoverPath);
  const [originalVolume, setOriginalVolume] = useState(0.3);
  const [voiceoverVolume, setVoiceoverVolume] = useState(1.0);
  const [subColor, setSubColor] = useState(settings.textColor || '#ffffff');
  const [subBg, setSubBg] = useState('#000000');
  const [subBgOpacity, setSubBgOpacity] = useState(85);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setExportProgress(0);
    try {
      const res = await fetch('/api/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: videoPath || 'input_video.mp4',
          taskId: taskId || null,
          subtitles: includeSubtitle ? subtitles : [],
          settings: { subColor, subBg, subBgOpacity, subFont: settings.fontFamily || 'Arial', subFontsize: 28 },
          voiceoverPath: includeVoiceover ? voiceoverPath : null,
          originalVolume: includeVoiceover ? originalVolume : 1.0,
          voiceoverVolume,
          quality: quality.toLowerCase(),
          blurHardsub,
          blurMode: blurMode || 'manual',
          blurHeight: blurHeight || 15,
          blurWidth: blurWidth || 100,
          blurIntensity: blurIntensity || 15,
          borderTop: settings.borderTop || '',
          borderBottom: settings.borderBottom || '',
        }),
      });
      const data = await res.json();
      if (data.taskId) {
        // Poll progress
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/render-video?taskId=${data.taskId}`);
            const status = await statusRes.json();
            setExportProgress(status.progress || 0);
            if (status.status === 'completed') {
              clearInterval(pollInterval);
              setExportProgress(100);
              setDownloadUrl(status.outputUrl);
              if (onExport) onExport(status);
            } else if (status.status === 'failed') {
              clearInterval(pollInterval);
              setError(status.error || 'Render failed');
              setExporting(false);
            }
          } catch (e) { /* continue polling */ }
        }, 2000);
      }
    } catch (err) {
      setError('Export failed: ' + err.message);
      setExporting(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="rounded-xl w-[680px]" style={{ background: '#1b1b2f', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-white text-lg font-semibold">🎬 Xuất Video</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Title */}
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-sm">Tiêu đề</span>
            <input value={title} onChange={e => setTitle(e.target.value)} className="px-3 py-1.5 rounded text-sm text-white bg-transparent border border-white/10 w-[220px] focus:outline-none focus:border-[#62d6ed]/40" />
          </div>

          {/* Quality & Format */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Chất lượng</span>
              <select value={quality} onChange={e => setQuality(e.target.value)} className="px-3 py-1.5 rounded text-sm text-white bg-[#0d1117] border border-white/10 focus:outline-none">
                {['1080p', '720p', '480p'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50 text-sm">Định dạng</span>
              <select value={format} onChange={e => setFormat(e.target.value)} className="px-3 py-1.5 rounded text-sm text-white bg-[#0d1117] border border-white/10 focus:outline-none">
                {['MP4', 'MKV'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Render Options */}
          <div className="pt-3 border-t border-white/5 space-y-3">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Tùy chọn render</p>
            {[
              { label: 'Làm mờ phụ đề gốc (Blur Hardsub)', checked: blurHardsub, onChange: setBlurHardsub },
              { label: 'Chèn phụ đề dịch', checked: includeSubtitle, onChange: setIncludeSubtitle },
              { label: 'Thêm lồng tiếng (Voiceover)', checked: includeVoiceover, onChange: setIncludeVoiceover, disabled: !voiceoverPath },
            ].map(opt => (
              <label key={opt.label} className={`flex items-center justify-between ${opt.disabled ? 'opacity-40' : 'cursor-pointer'}`}>
                <span className="text-white/70 text-sm">{opt.label}</span>
                <button disabled={opt.disabled}
                  className={`w-10 h-5 rounded-full relative transition-colors ${opt.checked ? 'bg-[#6366f1]' : 'bg-white/10'}`}
                  onClick={() => !opt.disabled && opt.onChange(!opt.checked)}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${opt.checked ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </label>
            ))}
          </div>

          {/* Subtitle Style */}
          {includeSubtitle && (
            <div className="pt-3 border-t border-white/5 space-y-3">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Kiểu phụ đề</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-white/50 text-[11px] block mb-1">Màu chữ</span>
                  <input type="color" value={subColor} onChange={e => setSubColor(e.target.value)} className="w-full h-8 rounded cursor-pointer border border-white/10" />
                </div>
                <div>
                  <span className="text-white/50 text-[11px] block mb-1">Màu nền</span>
                  <input type="color" value={subBg} onChange={e => setSubBg(e.target.value)} className="w-full h-8 rounded cursor-pointer border border-white/10" />
                </div>
                <div>
                  <span className="text-white/50 text-[11px] block mb-1">Độ mờ nền</span>
                  <input type="range" min="0" max="100" value={subBgOpacity} onChange={e => setSubBgOpacity(parseInt(e.target.value))} className="w-full accent-[#62d6ed]" />
                  <span className="text-white/40 text-[10px]">{subBgOpacity}%</span>
                </div>
              </div>
              {/* Preview */}
              <div className="flex items-center justify-center py-3 rounded-lg" style={{ background: '#0a0a1a' }}>
                <span className="px-4 py-1.5 rounded text-sm font-medium" style={{ color: subColor, backgroundColor: `${subBg}${Math.round(subBgOpacity * 2.55).toString(16).padStart(2, '0')}` }}>
                  Xem trước phụ đề
                </span>
              </div>
            </div>
          )}

          {/* Audio Volume */}
          {includeVoiceover && (
            <div className="pt-3 border-t border-white/5 space-y-2">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Âm lượng</p>
              <div className="flex items-center gap-3">
                <span className="text-white/50 text-xs w-20">Âm gốc:</span>
                <input type="range" min="0" max="100" value={originalVolume * 100} onChange={e => setOriginalVolume(parseInt(e.target.value) / 100)} className="flex-1 accent-white" />
                <span className="text-white/40 text-xs w-8">{Math.round(originalVolume * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/50 text-xs w-20">Lồng tiếng:</span>
                <input type="range" min="0" max="100" value={voiceoverVolume * 100} onChange={e => setVoiceoverVolume(parseInt(e.target.value) / 100)} className="flex-1 accent-purple-400" />
                <span className="text-white/40 text-xs w-8">{Math.round(voiceoverVolume * 100)}%</span>
              </div>
            </div>
          )}

          {/* Progress */}
          {exporting && (
            <div className="pt-2">
              <div className="h-3 rounded-full overflow-hidden" style={{ background: '#0d1117' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${exportProgress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)' }} />
              </div>
              <p className="text-white/40 text-xs text-center mt-1">
                {exportProgress < 100 ? `Đang render... ${exportProgress}%` : '✅ Hoàn thành!'}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm">⚠️ {error}</p>
            </div>
          )}

          {/* Download */}
          {downloadUrl && (
            <div className="pt-2 flex items-center justify-center">
              <button onClick={async () => {
                try {
                  const resp = await fetch(downloadUrl);
                  const blob = await resp.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${title || 'rendered_video'}.mp4`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (e) {
                  window.open(downloadUrl, '_blank');
                }
              }} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 cursor-pointer" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <span className="material-symbols-outlined">download</span>
                Tải video đã render
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/30 text-xs">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span>{duration}</span>
          </div>
          <div className="flex gap-2">
            {!exporting && !downloadUrl && (
              <button className="px-5 py-2 rounded-lg text-sm text-white font-semibold" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} onClick={handleExport}>
                🎬 Xuất Video
              </button>
            )}
            <button className="px-4 py-2 rounded-lg text-sm text-white/40 border border-white/10 hover:bg-white/5" onClick={onClose}>
              {downloadUrl ? 'Đóng' : 'Hủy'}
            </button>
          </div>
        </div>
      </div>
    </ModalBackdrop>
  );
}

/* ═══════════════════════════════════════════
   DUBBING MODAL (Lồng tiếng OmniVoice)
   ═══════════════════════════════════════════ */
export function DubbingModal({ onClose, onDub, videoTitle = 'DEMO', duration = '0:02:02.70', taskId, subtitles = [] }) {
  const [title, setTitle] = useState(videoTitle);
  const [speed, setSpeed] = useState(1.0);
  const [language, setLanguage] = useState('Vietnamese');
  const [autoPublish, setAutoPublish] = useState(false);
  const [dubbing, setDubbing] = useState(false);
  const [dubProgress, setDubProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [voiceTaskId, setVoiceTaskId] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [refAudioFile, setRefAudioFile] = useState(null);
  const [refAudioName, setRefAudioName] = useState('Mặc định (giọng clone)');

  const languages = ['Vietnamese', 'English', 'Chinese', 'Japanese', 'Korean'];
  const speedOptions = [0.8, 0.9, 1.0, 1.1, 1.2, 1.5];

  // Upload reference audio
  const handleRefAudioUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRefAudioFile(file);
      setRefAudioName(file.name);
    }
  };

  // Start dubbing
  const handleDub = async () => {
    setDubbing(true);
    setDubProgress(0);
    setStatusMsg('Đang gửi yêu cầu lồng tiếng...');
    setError(null);
    setAudioUrl(null);

    try {
      // If user uploaded ref audio, upload it first
      let refAudioPath = null;
      if (refAudioFile) {
        const formData = new FormData();
        formData.append('audio', refAudioFile);
        const uploadRes = await fetch('/api/upload-audio', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          refAudioPath = uploadData.path;
        }
      }

      // Send voiceover request with current subtitles
      const res = await fetch('/api/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          title,
          speed,
          language,
          autoPublish,
          refAudioPath,
          subtitles: subtitles.map(s => ({
            start: s.start,
            end: s.end,
            original: s.original,
            translation: s.translation,
          })),
        }),
      });

      const data = await res.json();

      if (data.status === 'processing' && data.taskId) {
        setVoiceTaskId(data.taskId);
        setStatusMsg(data.message || 'Đang xử lý...');
        // Start polling
        pollProgress(data.taskId);
      } else if (data.error) {
        setError(data.error);
        setDubbing(false);
      }
    } catch (err) {
      setError('Lỗi kết nối: ' + err.message);
      setDubbing(false);
    }
  };

  // Poll progress
  const pollProgress = (tid) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/voiceover?taskId=${tid}`);
        const data = await res.json();

        setDubProgress(data.progress || 0);
        setStatusMsg(data.message || '');

        if (data.status === 'completed') {
          clearInterval(interval);
          setDubbing(false);
          setDubProgress(100);
          setAudioUrl(data.audioUrl);
          setStatusMsg('✓ Lồng tiếng hoàn thành!');
          if (onDub) onDub({ audioUrl: data.audioUrl, taskId: tid });
        } else if (data.status === 'error') {
          clearInterval(interval);
          setDubbing(false);
          setError(data.message || 'Lồng tiếng thất bại');
        }
      } catch (err) {
        // Network error, keep polling
      }
    }, 2000);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="rounded-xl w-[680px]" style={{ background: '#1b1b2f', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}>
              <span className="material-symbols-outlined text-white text-lg">record_voice_over</span>
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold">Lồng tiếng OmniVoice</h2>
              <p className="text-white/30 text-xs">AI Voice Cloning & Text-to-Speech</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Info cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg p-3 text-center" style={{ background: '#0d1117', border: '1px solid rgba(139,92,246,0.2)' }}>
              <span className="material-symbols-outlined text-2xl text-purple-400">subtitles</span>
              <p className="text-white/80 text-sm font-medium mt-1">{subtitles.length} dòng</p>
              <p className="text-white/30 text-xs">Phụ đề</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0d1117', border: '1px solid rgba(59,130,246,0.2)' }}>
              <span className="material-symbols-outlined text-2xl text-blue-400">schedule</span>
              <p className="text-white/80 text-sm font-medium mt-1">{duration}</p>
              <p className="text-white/30 text-xs">Thời lượng</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: '#0d1117', border: '1px solid rgba(16,185,129,0.2)' }}>
              <span className="material-symbols-outlined text-2xl text-emerald-400">graphic_eq</span>
              <p className="text-white/80 text-sm font-medium mt-1">OmniVoice</p>
              <p className="text-white/30 text-xs">Engine</p>
            </div>
          </div>

          {/* Reference Audio */}
          <div className="rounded-lg p-4" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/60 text-sm font-medium">🎤 Giọng tham chiếu (Voice Clone)</span>
              <label className="px-3 py-1 rounded text-xs cursor-pointer transition-all text-purple-300 border border-purple-400/20 hover:bg-purple-400/10">
                Tải lên .WAV
                <input type="file" accept=".wav,.mp3,.ogg" className="hidden" onChange={handleRefAudioUpload} />
              </label>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: '#161b22' }}>
              <span className="material-symbols-outlined text-sm text-purple-400">mic</span>
              <span className="text-white/50 text-xs flex-1">{refAudioName}</span>
              {refAudioFile && <span className="text-emerald-400 text-xs">✓ Đã chọn</span>}
            </div>
          </div>

          {/* Voice Settings */}
          <div className="grid grid-cols-2 gap-4">
            {/* Language */}
            <div>
              <label className="text-white/40 text-xs mb-1 block">Ngôn ngữ đầu ra</label>
              <select value={language} onChange={e => setLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded text-sm text-white bg-[#0d1117] border border-white/10 focus:outline-none focus:border-purple-400/40">
                {languages.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {/* Speed */}
            <div>
              <label className="text-white/40 text-xs mb-1 block">Tốc độ nói: {speed}x</label>
              <div className="flex gap-1">
                {speedOptions.map(s => (
                  <button key={s} onClick={() => setSpeed(s)}
                    className={`flex-1 py-1.5 rounded text-xs transition-all ${speed === s ? 'bg-purple-500 text-white' : 'text-white/40 border border-white/10 hover:text-white/60'}`}>
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-sm">Tiêu đề:</span>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded text-sm text-white bg-[#0d1117] border border-white/10 focus:outline-none focus:border-purple-400/40" />
          </div>

          {/* Auto publish */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={autoPublish} onChange={e => setAutoPublish(e.target.checked)} className="w-4 h-4 accent-[#8b5cf6]" />
            <span className="text-white/60 text-sm">Xuất bản sau khi lồng tiếng</span>
          </label>

          {/* Progress */}
          {(dubbing || audioUrl) && (
            <div className="rounded-lg p-4" style={{ background: '#0d1117', border: `1px solid ${audioUrl ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.2)'}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-xs">{statusMsg}</span>
                <span className="text-white/40 text-xs font-mono">{dubProgress}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#161b22' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${dubProgress}%`,
                  background: audioUrl ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #8b5cf6, #d946ef)',
                }} />
              </div>

              {/* Audio Preview */}
              {audioUrl && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                  <audio controls src={audioUrl} className="flex-1 h-8" style={{ filter: 'hue-rotate(100deg)' }} />
                  <a href={audioUrl} download className="px-3 py-1 rounded text-xs text-cyan-300 border border-cyan-400/20 hover:bg-cyan-400/10 transition-all">
                    Tải xuống
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg p-3 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span className="material-symbols-outlined text-red-400 text-sm">error</span>
              <span className="text-red-300 text-xs">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/20 text-xs">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>GPU CUDA • Model: k2-fsa/OmniVoice</span>
          </div>
          <div className="flex gap-2">
            {!audioUrl && (
              <button className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}
                onClick={handleDub} disabled={dubbing || subtitles.length === 0}>
                {dubbing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </span>
                ) : '🎙️ Bắt đầu lồng tiếng'}
              </button>
            )}
            <button className="px-5 py-2 rounded-lg text-sm text-white/50 border border-white/10 hover:bg-white/5" onClick={onClose}>
              {audioUrl ? 'Đóng' : 'Hủy'}
            </button>
          </div>
        </div>
      </div>
    </ModalBackdrop>
  );
}


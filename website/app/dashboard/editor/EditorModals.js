'use client';
import { useEffect, useState, useRef } from 'react';

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
  const [showDetectZone, setShowDetectZone] = useState(false);
  const [detectZoneTop, setDetectZoneTop] = useState(82); // % from top (default: 82% = bottom 18%)

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
    if (showDetectZone && detectZoneTop < 82) {
      formData.append('detect_zone_top', (detectZoneTop / 100).toFixed(2));
    }

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

          {/* Detection Zone Option */}
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-amber-400/70">target</span>
                <span className="text-white/60 text-sm">Tùy chỉnh vùng detect phụ đề</span>
              </div>
              <button
                className={`w-10 h-5 rounded-full relative transition-colors ${showDetectZone ? 'bg-amber-500' : 'bg-white/10'}`}
                onClick={() => setShowDetectZone(!showDetectZone)}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${showDetectZone ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </label>

            {showDetectZone && (
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 text-amber-300/80 text-xs">
                  <span className="material-symbols-outlined text-sm">info</span>
                  <span>Kéo thanh trượt để mở rộng vùng detect cho video có sub nằm cao</span>
                </div>
                {/* Visual mini-preview */}
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-40 rounded-lg overflow-hidden border border-white/10 flex-shrink-0" style={{ background: '#0a0a1a' }}>
                    {/* Non-detect zone (top - dimmed) */}
                    <div className="absolute inset-x-0 top-0 transition-all" style={{ height: `${detectZoneTop}%`, background: 'rgba(0,0,0,0.6)' }} />
                    {/* Detect zone (bottom - highlighted) */}
                    <div className="absolute inset-x-0 bottom-0 transition-all flex items-center justify-center" style={{ height: `${100 - detectZoneTop}%`, background: 'rgba(34,211,238,0.12)', borderTop: '2px dashed rgba(34,211,238,0.5)' }}>
                      <span className="text-[9px] text-cyan-300/70 font-medium">DETECT</span>
                    </div>
                    {/* Sample subtitle text indicator */}
                    <div className="absolute left-1/2 -translate-x-1/2 text-[7px] text-white/60 bg-black/40 px-1 rounded" style={{ bottom: '15%' }}>字幕</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white/40 text-xs">Vùng detect</span>
                      <span className="text-cyan-300 text-xs font-mono">{100 - detectZoneTop}% dưới</span>
                    </div>
                    <input
                      type="range"
                      min="20" max="82" step="1"
                      value={detectZoneTop}
                      onChange={e => setDetectZoneTop(parseInt(e.target.value))}
                      className="w-full accent-cyan-400"
                      style={{ direction: 'rtl' }}
                    />
                    <div className="flex justify-between text-[10px] text-white/25">
                      <span>80% (rộng)</span>
                      <span>18% (mặc định)</span>
                    </div>
                    {detectZoneTop < 60 && (
                      <div className="text-[10px] text-amber-400/70 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        Vùng quá rộng có thể detect nhầm text không phải subtitle
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
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
export function ExportModal({ onClose, onExport, videoTitle = 'DEMO', duration = '0:02:02.70', subtitles = [], settings = {}, videoPath, voiceoverPath, taskId, blurMode = 'manual', blurHeight = 15, blurWidth = 100, blurIntensity = 15, logoSrc = null, logoPos = { x: 10, y: 10 }, logoSize = 80, videoDisplayRect = null }) {
  const [title, setTitle] = useState(videoTitle);
  const [quality, setQuality] = useState('1080p');
  const [format, setFormat] = useState('MP4');
  const [exportEngine, setExportEngine] = useState('ffmpeg'); // 'ffmpeg' | 'canvas' | 'capcut'
  const [capcutAvailable, setCapcutAvailable] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [error, setError] = useState(null);

  // Check CapCut Mate availability
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/render-capcut?action=health');
        const data = await res.json();
        setCapcutAvailable(data.available);
      } catch { setCapcutAvailable(false); }
    })();
  }, []);

  // Render options
  const [blurHardsub, setBlurHardsub] = useState(true);
  const [includeSubtitle, setIncludeSubtitle] = useState(true);
  const [includeLogo, setIncludeLogo] = useState(!!logoSrc);
  const [includeVoiceover, setIncludeVoiceover] = useState(!!voiceoverPath);
  const [originalVolume, setOriginalVolume] = useState(0.3);
  const [voiceoverVolume, setVoiceoverVolume] = useState(1.0);
  const [subColor, setSubColor] = useState(settings.textColor || '#000000');
  const [subBg, setSubBg] = useState(settings.bgColor || '#ffffff');
  const [subBgOpacity, setSubBgOpacity] = useState(settings.bgOpacity || 85);
  const [backgroundAudioPath, setBackgroundAudioPath] = useState(null);
  const [includeSeparatedBackground, setIncludeSeparatedBackground] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!taskId) {
      setBackgroundAudioPath(null);
      setIncludeSeparatedBackground(false);
      return undefined;
    }

    (async () => {
      try {
        const res = await fetch(`/api/status/${taskId}`);
        if (!res.ok) return;

        const data = await res.json();
        const instrumentalUrl = data?.separation?.instrumentalUrl || null;
        if (!cancelled) {
          setBackgroundAudioPath(instrumentalUrl);
          setIncludeSeparatedBackground(!!instrumentalUrl);
        }
      } catch (e) {
        // Separation metadata is optional.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setExportProgress(0);
    setExportMessage('');

    try {
      // ═══════ CANVAS EXPORT ═══════
      if (exportEngine === 'canvas') {
        setExportMessage('Đang chuẩn bị Canvas export...');
        // Dynamic import to avoid SSR issues
        const { CanvasVideoExporter } = await import('../../lib/canvasVideoExporter');

        // Find the video element in the editor
        const videoEl = document.querySelector('video');
        if (!videoEl) throw new Error('Không tìm thấy video element');

        const qualityMap = { '1080p': [1920, 1080], '720p': [1280, 720], '480p': [854, 480] };
        const [tw, th] = qualityMap[quality] || [1920, 1080];

        // Determine target dimensions based on aspect ratio
        const vw = videoEl.videoWidth || 1920;
        const vh = videoEl.videoHeight || 1080;
        let targetW, targetH;
        if (vw >= vh) { // Landscape
          targetH = th;
          targetW = Math.round(th * vw / vh);
        } else { // Portrait
          targetW = th; // Use smaller dimension
          targetH = Math.round(th * vh / vw);
        }
        // Ensure even dimensions
        targetW = targetW % 2 === 0 ? targetW : targetW - 1;
        targetH = targetH % 2 === 0 ? targetH : targetH - 1;

        const exporter = new CanvasVideoExporter({
          videoElement: videoEl,
          subtitles: includeSubtitle ? subtitles : [],
          settings: {
            fontFamily: settings.fontFamily || 'Arial',
            fontStyle: settings.fontStyle || '',
            textColor: subColor,
            borderSize: settings.borderSize || 0,
            bgColor: subBg,
            fontSize: settings.fontSize || 28,
            bgOpacity: subBgOpacity,
          },
          blurEnabled: blurHardsub,
          blurMode: blurMode || 'manual',
          blurHeight: blurHeight || 15,
          blurWidth: blurWidth || 100,
          blurIntensity: blurIntensity || 15,
          whiteSubBg: true,
          whiteSubBgColor: subBg,
          whiteSubBgOpacity: subBgOpacity,
          whiteSubTextColor: subColor,
          logoSrc: includeLogo ? logoSrc : null,
          logoPos,
          logoSize,
          targetWidth: targetW,
          targetHeight: targetH,
          fps: 30,
          onProgress: (progress) => {
            setExportProgress(progress);
            setExportMessage(`Canvas render: ${progress}%`);
          },
        });

        setExportMessage('Đang render từng frame...');
        const blob = await exporter.export();

        // Create download URL
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setExportProgress(100);
        setExportMessage('Hoàn thành!');
        if (onExport) onExport({ status: 'completed', engine: 'canvas' });
        return;
      }

      // ═══════ CAPCUT EXPORT ═══════
      if (exportEngine === 'capcut') {
        setExportMessage('Đang kết nối CapCut Mate...');
        setExportProgress(5);

        // Determine target resolution from quality setting
        const qualityMap = { '1080p': [1920, 1080], '720p': [1280, 720], '480p': [854, 480] };
        const [targetW, targetH] = qualityMap[quality] || [1920, 1080];

        const res = await fetch('/api/render-capcut', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrl: videoPath || 'input_video.mp4',
            videoDuration: parseFloat(duration?.split(':').reduce((acc, t) => acc * 60 + parseFloat(t), 0) || 120),
            subtitles: includeSubtitle ? subtitles : [],
            voiceoverUrl: includeVoiceover ? voiceoverPath : null,
            bgmUrl: includeSeparatedBackground ? backgroundAudioPath : null,
            settings: {
              textColor: subColor,
              fontFamily: settings.fontFamily || 'Arial',
              fontSize: settings.fontSize || 28,
              borderColor: settings.borderColor || null,
            },
            width: targetW,
            height: targetH,
            // Blur settings from editor
            blurEnabled: blurHardsub,
            blurRegion: blurMode === 'manual' ? 'bottom' : 'bottom',
            blurHeight: blurHeight || 15,
            blurWidth: blurWidth || 100,
            blurIntensity: blurIntensity || 15,
            // Subtitle style
            subColor: subColor,
            subBg: subBg,
            subBgOpacity: subBgOpacity,
          }),
        });
        const data = await res.json();

        if (data.taskId) {
          const pollInterval = setInterval(async () => {
            try {
              const statusRes = await fetch(`/api/render-capcut?taskId=${data.taskId}`);
              const status = await statusRes.json();
              setExportProgress(status.progress || 0);
              setExportMessage(status.message || 'Đang render...');
              if (status.status === 'completed') {
                clearInterval(pollInterval);
                setExportProgress(100);
                setDownloadUrl(status.videoUrl);
                if (onExport) onExport(status);
              } else if (status.status === 'failed') {
                clearInterval(pollInterval);
                setError(status.error || 'CapCut render failed');
                setExporting(false);
              }
            } catch (e) { /* continue polling */ }
          }, 2000);
        }
        return;
      }

      // ═══════ FFMPEG EXPORT (default) ═══════
      // Upload logo to server if needed
      let serverLogoPath = null;
      let scaledLogoX = 10, scaledLogoY = 10, scaledLogoSize = 80;
      if (includeLogo && logoSrc) {
        try {
          setExportProgress(2);
          console.log('[Export] Uploading logo from blob URL...');
          const logoBlob = await fetch(logoSrc).then(r => r.blob());
          console.log('[Export] Logo blob size:', logoBlob.size, 'bytes');
          const formData = new FormData();
          formData.append('logo', logoBlob, 'logo.png');
          const uploadRes = await fetch('/api/upload-logo', { method: 'POST', body: formData });
          const uploadData = await uploadRes.json();
          console.log('[Export] Logo upload response:', uploadData);
          if (uploadData.logoPath) {
            serverLogoPath = uploadData.logoPath;
            if (videoDisplayRect && videoDisplayRect.width > 0) {
              const videoRelativeX = logoPos.x - (videoDisplayRect.left || 0);
              const videoRelativeY = logoPos.y - (videoDisplayRect.top || 0);
              const qualityMap = { '1080p': [1920, 1080], '720p': [1280, 720], '480p': [854, 480] };
              const [targetW, targetH] = qualityMap[quality] || [1920, 1080];
              const scaleX = targetW / videoDisplayRect.width;
              const scaleY = targetH / videoDisplayRect.height;
              scaledLogoX = Math.round(videoRelativeX * scaleX);
              scaledLogoY = Math.round(videoRelativeY * scaleY);
              scaledLogoSize = Math.round(logoSize * scaleX);
            } else {
              scaledLogoX = logoPos.x;
              scaledLogoY = logoPos.y;
              scaledLogoSize = logoSize;
            }
            console.log(`[Export] Logo: containerPos=(${logoPos.x},${logoPos.y}), displayRect=(${videoDisplayRect?.left},${videoDisplayRect?.top}), scaled=(${scaledLogoX},${scaledLogoY}) size=${scaledLogoSize}`);
          }
        } catch (e) {
          console.warn('Logo upload failed:', e);
        }
      }
      setExportProgress(5);
      setExportMessage('Đang render FFmpeg...');

      const res = await fetch('/api/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: videoPath || 'input_video.mp4',
          taskId: taskId || null,
          subtitles: includeSubtitle ? subtitles : [],
          settings: {
            subColor: subColor,
            subBg: subBg,
            subBgOpacity: subBgOpacity,
            subFont: settings.fontFamily || 'Arial',
            subFontsize: settings.fontSize || 28,
          },
          voiceoverPath: includeVoiceover ? voiceoverPath : null,
          backgroundAudioPath: includeSeparatedBackground ? backgroundAudioPath : null,
          logoPath: serverLogoPath,
          logoX: scaledLogoX,
          logoY: scaledLogoY,
          logoSize: scaledLogoSize,
          originalVolume: includeVoiceover ? originalVolume : 1.0,
          voiceoverVolume,
          quality: quality.toLowerCase(),
          blurHardsub,
          blurMode: blurMode || 'yolo',
          blurHeight: blurHeight || 15,
          blurWidth: blurWidth || 100,
          blurIntensity: blurIntensity || 15,
          borderTop: settings.borderTop || '',
          borderBottom: settings.borderBottom || '',
          borderColor: settings.borderColor || '#000000',
          borderTextColor: settings.borderTextColor || '#ffffff',
          borderHeight: settings.borderHeight || 40,
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

          {/* Export Engine Selector */}
          <div className="pt-3 border-t border-white/5 space-y-2">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Engine xuất video</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ffmpeg', icon: 'speed', label: 'Nhanh', desc: 'FFmpeg Server', badge: 'Free', color: '#6366f1' },
                { id: 'canvas', icon: 'brush', label: 'Giống Preview', desc: 'Canvas WYSIWYG', badge: 'Free', color: '#10b981' },
                { id: 'capcut', icon: 'auto_awesome', label: 'Chuyên nghiệp', desc: 'CapCut Engine', badge: capcutAvailable ? 'PRO' : 'Offline', color: capcutAvailable ? '#ec4899' : '#555' },
              ].map(eng => (
                <button
                  key={eng.id}
                  disabled={eng.id === 'capcut' && !capcutAvailable}
                  className={`relative p-3 rounded-xl border text-left transition-all ${exportEngine === eng.id
                    ? 'border-white/30 bg-white/5 scale-[1.02]'
                    : eng.id === 'capcut' && !capcutAvailable
                      ? 'border-white/5 bg-white/2 opacity-40 cursor-not-allowed'
                      : 'border-white/8 bg-white/2 hover:bg-white/5 hover:border-white/15'
                    }`}
                  onClick={() => !(eng.id === 'capcut' && !capcutAvailable) && setExportEngine(eng.id)}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-sm" style={{ color: exportEngine === eng.id ? eng.color : '#888' }}>{eng.icon}</span>
                    <span className="text-white text-xs font-semibold">{eng.label}</span>
                  </div>
                  <p className="text-white/30 text-[10px]">{eng.desc}</p>
                  <span className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${eng.badge === 'PRO' ? 'bg-pink-500/20 text-pink-400'
                    : eng.badge === 'Offline' ? 'bg-red-500/20 text-red-400'
                      : 'bg-emerald-500/15 text-emerald-400'
                    }`}>{eng.badge}</span>
                  {exportEngine === eng.id && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center" style={{ background: eng.color }}>
                      <span className="text-white text-[8px]">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
            {exportEngine === 'canvas' && (
              <div className="rounded-lg px-3 py-2 text-xs text-emerald-200/80" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                💡 Canvas export tạo video WebM giống hệt preview. Xử lý trên trình duyệt, không cần server.
              </div>
            )}
            {exportEngine === 'capcut' && capcutAvailable && (
              <div className="rounded-lg px-3 py-2 text-xs text-pink-200/80" style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)' }}>
                ⭐ CapCut Engine cho chất lượng chuyên nghiệp: phụ đề động, hiệu ứng đẹp, render cloud.
              </div>
            )}
          </div>

          {/* Render Options */}
          <div className="pt-3 border-t border-white/5 space-y-3">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Tùy chọn render</p>
            {[
              { label: 'Làm mờ phụ đề gốc (Blur Hardsub)', checked: blurHardsub, onChange: setBlurHardsub },
              { label: 'Chèn phụ đề dịch', checked: includeSubtitle, onChange: setIncludeSubtitle },
              { label: 'Chèn Logo', checked: includeLogo, onChange: setIncludeLogo, disabled: !logoSrc },
              { label: 'Thêm lồng tiếng (Voiceover)', checked: includeVoiceover, onChange: setIncludeVoiceover, disabled: !voiceoverPath },
              { label: 'Dùng instrumental đã tách', checked: includeSeparatedBackground, onChange: setIncludeSeparatedBackground, disabled: !backgroundAudioPath },
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
            {backgroundAudioPath && (
              <div className="rounded-lg px-3 py-2 text-xs text-cyan-200/80" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}>
                Export sẽ ưu tiên instrumental đã tách làm nền audio để lồng tiếng sạch hơn.
              </div>
            )}
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
                {exportProgress < 100 ? (exportMessage || `Đang render... ${exportProgress}%`) : '✅ Hoàn thành!'}
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
              <a href={downloadUrl} download={`${title || 'rendered_video'}${exportEngine === 'canvas' ? '.webm' : '.mp4'}`} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 cursor-pointer no-underline" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <span className="material-symbols-outlined">download</span>
                Tải video đã render
              </a>
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
export function DubbingModal({ onClose, onDub, videoTitle = 'DEMO', duration = '0:02:02.70', taskId, subtitles = [], existingAudioUrl = null }) {
  const [title, setTitle] = useState(videoTitle);
  const [speed, setSpeed] = useState(1.0);
  const [language, setLanguage] = useState('Vietnamese');
  const [voiceType, setVoiceType] = useState('female');
  const [engine, setEngine] = useState('edge');  // 'edge', 'omnivoice', 'capcut', or 'valtec'
  const [edgeVoice, setEdgeVoice] = useState('vi-VN-HoaiMyNeural');
  const [capcutVoiceType, setCapcutVoiceType] = useState(14);
  const [valtecVoice, setValtecVoice] = useState('Vietnam_hoa-mai (woman).pt');
  const [omnivoiceModel, setOmnivoiceModel] = useState('default');
  const [autoPublish, setAutoPublish] = useState(false);
  const [dubbing, setDubbing] = useState(false);
  const [dubProgress, setDubProgress] = useState(existingAudioUrl ? 100 : 0);
  const [statusMsg, setStatusMsg] = useState(existingAudioUrl ? 'Da tai ban long tieng da luu.' : '');
  const [voiceTaskId, setVoiceTaskId] = useState(null);
  const [audioUrl, setAudioUrl] = useState(existingAudioUrl);
  const [error, setError] = useState(null);
  const [refAudioFile, setRefAudioFile] = useState(null);
  const [refAudioName, setRefAudioName] = useState('Chưa chọn file tham chiếu');
  const [previewVoice, setPreviewVoice] = useState(null);
  const previewAudioRef = useRef(null);

  // Play voice preview sample
  const playVoicePreview = async (voiceFile, e) => {
    e?.stopPropagation();
    if (previewVoice === voiceFile) {
      // Stop current preview
      if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
      setPreviewVoice(null);
      return;
    }
    // Stop any existing preview
    if (previewAudioRef.current) { previewAudioRef.current.pause(); }
    setPreviewVoice(voiceFile);
    try {
      const res = await fetch('/api/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: voiceFile, text: 'Xin chào, tôi là trợ lý ảo. Rất vui được gặp bạn.' }),
      });
      if (!res.ok) { setPreviewVoice(null); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => { setPreviewVoice(null); URL.revokeObjectURL(url); };
      audio.play().catch(() => setPreviewVoice(null));
    } catch { setPreviewVoice(null); }
  };

  const languages = ['Vietnamese', 'English', 'Chinese', 'Japanese', 'Korean'];
  const speedOptions = [0.8, 0.9, 1.0, 1.1, 1.2, 1.5];

  useEffect(() => {
    let cancelled = false;

    if (existingAudioUrl) {
      setAudioUrl(existingAudioUrl);
      setDubProgress(100);
      setStatusMsg('Da tai ban long tieng da luu.');
      return undefined;
    }

    if (!taskId) return undefined;

    const hydrateExistingAudio = async () => {
      try {
        const res = await fetch(`/api/status/${taskId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.audioUrl) {
          setAudioUrl(data.audioUrl);
          setDubProgress(100);
          setStatusMsg('Da tai ban long tieng da luu.');
        }
      } catch (err) {
        // Silent fallback: modal still works for new dubbing requests.
      }
    };

    hydrateExistingAudio();

    return () => {
      cancelled = true;
    };
  }, [existingAudioUrl, taskId]);

  // Edge TTS voice models by language
  const edgeVoices = {
    Vietnamese: [
      { id: 'vi-VN-HoaiMyNeural', name: 'HoaiMy', gender: 'Nữ', flag: '🇻🇳' },
      { id: 'vi-VN-NamMinhNeural', name: 'NamMinh', gender: 'Nam', flag: '🇻🇳' },
    ],
    Chinese: [
      { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao', gender: 'Nữ', flag: '🇨🇳' },
      { id: 'zh-CN-XiaoyiNeural', name: 'Xiaoyi', gender: 'Nữ', flag: '🇨🇳' },
      { id: 'zh-CN-YunjianNeural', name: 'Yunjian', gender: 'Nam', flag: '🇨🇳' },
      { id: 'zh-CN-YunxiNeural', name: 'Yunxi', gender: 'Nam', flag: '🇨🇳' },
      { id: 'zh-CN-YunyangNeural', name: 'Yunyang', gender: 'Nam', flag: '🇨🇳' },
    ],
    English: [
      { id: 'en-US-EmmaNeural', name: 'Emma', gender: 'Nữ', flag: '🇺🇸' },
      { id: 'en-US-AvaNeural', name: 'Ava', gender: 'Nữ', flag: '🇺🇸' },
      { id: 'en-US-BrianNeural', name: 'Brian', gender: 'Nam', flag: '🇺🇸' },
      { id: 'en-US-AndrewNeural', name: 'Andrew', gender: 'Nam', flag: '🇺🇸' },
    ],
    Japanese: [
      { id: 'ja-JP-NanamiNeural', name: 'Nanami', gender: 'Nữ', flag: '🇯🇵' },
      { id: 'ja-JP-KeitaNeural', name: 'Keita', gender: 'Nam', flag: '🇯🇵' },
    ],
    Korean: [
      { id: 'ko-KR-SunHiNeural', name: 'SunHi', gender: 'Nữ', flag: '🇰🇷' },
      { id: 'ko-KR-InJoonNeural', name: 'InJoon', gender: 'Nam', flag: '🇰🇷' },
    ],
  };

  const voiceTypes = [
    { id: 'female', label: 'Giọng nữ', icon: 'female', desc: 'TTS mặc định' },
    { id: 'male', label: 'Giọng nam', icon: 'male', desc: 'TTS mặc định' },
    { id: 'clone', label: 'Voice Clone', icon: 'mic', desc: 'OmniVoice only' },
  ];

  const omnivoiceModels = [
    { id: 'default', label: 'OmniVoice mặc định', desc: 'k2-fsa/OmniVoice' },
    { id: 'ngochuyen_ft_3000', label: 'Ngọc Huyền FT 3000', desc: 'Checkpoint fine-tune local' },
  ];

  // CapCut TTS fallback voices (always available)
  const capcutVoices = [
    { type: 0, name: 'Labebe', gender: 'Nữ', tag: 'Dễ thương' },
    { type: 1, name: 'Cool Lady', gender: 'Nữ', tag: 'Phong cách' },
    { type: 4, name: 'Popular Guy', gender: 'Nam', tag: 'Đại chúng' },
    { type: 6, name: 'Game Host', gender: 'Nam', tag: 'MC Game' },
    { type: 7, name: 'Calm Dubbing', gender: 'Nữ', tag: 'Nhẹ nhàng' },
    { type: 8, name: 'Gruff Uncle', gender: 'Nam', tag: 'Trầm' },
    { type: 10, name: 'High Tension', gender: 'Nam', tag: 'Sôi động' },
    { type: 11, name: 'Serious Man', gender: 'Nam', tag: 'Nghiêm túc' },
    { type: 12, name: 'Manager', gender: 'Nam', tag: 'Quản lý' },
    { type: 13, name: 'Little Sister', gender: 'Nữ', tag: 'Trẻ trung' },
    { type: 14, name: 'Young Girl', gender: 'Nữ', tag: 'Thiếu nữ' },
    { type: 15, name: 'Peaceful Woman', gender: 'Nữ', tag: 'Bình yên' },
  ];

  // Valtec Vietnamese TTS voices (25 local models)
  const valtecVoices = [
    // === Giọng Nữ (10) ===
    { file: 'Vietnam_hoa-mai (woman).pt', name: 'Hoa Mai', gender: 'Nữ', tag: 'Dịu dàng' },
    { file: 'Vietnam_my-huyen (woman).pt', name: 'Mỹ Huyền', gender: 'Nữ', tag: 'Tự nhiên' },
    { file: 'Vietnam_ngoc-anh (woman).pt', name: 'Ngọc Anh', gender: 'Nữ', tag: 'Nhẹ nhàng' },
    { file: 'Vietnam_ngoc-duyen (woman).pt', name: 'Ngọc Duyên', gender: 'Nữ', tag: 'Thanh thoát' },
    { file: 'Vietnam_quynh-nhu (woman).pt', name: 'Quỳnh Như', gender: 'Nữ', tag: 'Truyền cảm' },
    { file: 'Vietnam_thao-van (woman).pt', name: 'Thảo Vân', gender: 'Nữ', tag: 'Ấm áp' },
    { file: 'Vietnam_thuy-linh (woman).pt', name: 'Thùy Linh', gender: 'Nữ', tag: 'Ngọt ngào' },
    { file: 'Vietnam_ha-giang (woman).pt', name: 'Hà Giang', gender: 'Nữ', tag: 'Miền núi' },
    { file: 'Vietnam_lan-my (woman).pt', name: 'Lan My', gender: 'Nữ', tag: 'Trẻ trung' },
    { file: 'Vietnam_minh-thu (woman).pt', name: 'Minh Thu', gender: 'Nữ', tag: 'Sáng sủa' },
    // === Giọng Nam (9) ===
    { file: 'Vietnam_hoang-son (man).pt', name: 'Hoàng Sơn', gender: 'Nam', tag: 'Trầm ấm' },
    { file: 'Vietnam_le-nam (man).pt', name: 'Lê Nam', gender: 'Nam', tag: 'Phóng viên' },
    { file: 'Vietnam_nguyen-thang (man).pt', name: 'Nguyễn Thắng', gender: 'Nam', tag: 'Mạnh mẽ' },
    { file: 'Vietnam_nguyen-tung (man).pt', name: 'Nguyễn Tùng', gender: 'Nam', tag: 'MC' },
    { file: 'Vietnam_tran-binh (man).pt', name: 'Trần Bình', gender: 'Nam', tag: 'Điềm đạm' },
    { file: 'Vietnam_trung-anh (man).pt', name: 'Trung Anh', gender: 'Nam', tag: 'Chuyên nghiệp' },
    { file: 'Vietnam_tung-lam (man).pt', name: 'Tùng Lâm', gender: 'Nam', tag: 'Năng động' },
    { file: 'Vietnam_dinh-quan (man).pt', name: 'Đình Quân', gender: 'Nam', tag: 'Phong cách' },
    { file: 'Vietnam_minh-tuan (man).pt', name: 'Minh Tuấn', gender: 'Nam', tag: 'Đĩnh đạc' },
    { file: 'Vietnam_the-trung (man).pt', name: 'Thế Trung', gender: 'Nam', tag: 'Vững vàng' },
    // === Giọng Đặc biệt (5) ===
    { file: 'Vietnam_binh-an (child).pt', name: 'Bình An', gender: 'Trẻ em', tag: 'Dễ thương' },
    { file: 'Vietnam_nguyen-lien (old woman).pt', name: 'Nguyễn Liên', gender: 'Cao tuổi (Nữ)', tag: 'Trầm lắng' },
    { file: 'Vietnam_tung-lam (old man).pt', name: 'Tùng Lâm (Lão)', gender: 'Cao tuổi (Nam)', tag: 'Uy nghiêm' },
    { file: 'Vietnam_quang-linh (gay).pt', name: 'Quang Linh', gender: 'Đặc biệt', tag: 'Cá tính' },
    { file: 'Vietnam_suca.pt', name: 'Suca', gender: 'Đặc biệt', tag: 'Vui nhộn' },
  ];

  // Auto-select first voice when language changes
  const currentVoices = edgeVoices[language] || edgeVoices.Vietnamese;
  if (engine === 'edge' && !currentVoices.find(v => v.id === edgeVoice)) {
    // Pick matching gender or first
    const match = currentVoices.find(v => v.gender === (voiceType === 'male' ? 'Nam' : 'Nữ'));
    setEdgeVoice(match ? match.id : currentVoices[0].id);
  }

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
    setStatusMsg(
      engine === 'edge' ? `Đang tạo giọng Edge TTS (${edgeVoice})...` :
        engine === 'capcut' ? `Đang tạo giọng CapCut TTS...` :
          engine === 'valtec' ? `Đang tạo giọng Server 2 (${valtecVoice.split('(')[0].replace('Vietnam_', '').replace(/-/g, ' ').trim()})...` :
            voiceType === 'clone' ? 'Đang gửi yêu cầu voice clone...' :
              `Đang tạo giọng ${voiceType === 'female' ? 'nữ' : 'nam'}...`
    );
    setError(null);
    setAudioUrl(null);

    try {
      // If voice clone mode and user uploaded ref audio, upload it first
      let refAudioPath = null;
      if (voiceType === 'clone' && refAudioFile) {
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
          voiceType,
          engine,
          omnivoiceModel: engine === 'omnivoice' ? omnivoiceModel : undefined,
          edgeVoice: engine === 'edge' ? edgeVoice : undefined,
          capcutVoiceType: engine === 'capcut' ? capcutVoiceType : undefined,
          valtecVoice: engine === 'valtec' ? valtecVoice : undefined,
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
      <div className="rounded-xl w-[680px] max-h-[90vh] flex flex-col" style={{ background: '#1b1b2f', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}>
              <span className="material-symbols-outlined text-white text-lg">record_voice_over</span>
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold">Lồng tiếng AI</h2>
              <p className="text-white/30 text-xs">Edge TTS • Server 1 • CapCut • Server 2</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><span className="material-symbols-outlined">close</span></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Engine tabs */}
          <div className="flex gap-2 p-1 rounded-lg" style={{ background: '#0d1117' }}>
            <button onClick={() => setEngine('edge')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${engine === 'edge' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'text-white/40 hover:text-white/60 border border-transparent'}`}>
              <span className="material-symbols-outlined text-base">cloud</span>
              Edge TTS
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Free</span>
            </button>
            <button onClick={() => { setEngine('omnivoice'); setVoiceType('female'); }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${engine === 'omnivoice' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'text-white/40 hover:text-white/60 border border-transparent'}`}>
              <span className="material-symbols-outlined text-base">memory</span>
              Server 1
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">GPU</span>
            </button>
            <button onClick={() => { setEngine('capcut'); }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${engine === 'capcut' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'text-white/40 hover:text-white/60 border border-transparent'}`}>
              <span className="material-symbols-outlined text-base">smart_toy</span>
              CapCut
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">TikTok</span>
            </button>
            <button onClick={() => { setEngine('valtec'); }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${engine === 'valtec' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'text-white/40 hover:text-white/60 border border-transparent'}`}>
              <span className="material-symbols-outlined text-base">spatial_audio</span>
              Server 2
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400">🇻🇳</span>
            </button>
          </div>

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
              <p className="text-white/80 text-sm font-medium mt-1">{engine === 'edge' ? 'Edge TTS' : engine === 'capcut' ? 'CapCut TTS' : engine === 'valtec' ? 'Server 2' : 'Server 1'}</p>
              <p className="text-white/30 text-xs">Engine</p>
            </div>
          </div>

          {/* Edge TTS: Voice model selector */}
          {engine === 'edge' && (
            <div className="rounded-lg p-4" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-white/60 text-sm font-medium block mb-3">🎤 Chọn giọng nói ({language})</span>
              <div className="grid grid-cols-2 gap-2">
                {currentVoices.map(v => (
                  <button key={v.id} onClick={() => setEdgeVoice(v.id)}
                    className={`p-3 rounded-lg text-left transition-all flex items-center gap-3 ${edgeVoice === v.id ? 'bg-purple-400/10' : 'hover:bg-white/5'}`}
                    style={{ border: `1px solid ${edgeVoice === v.id ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
                    <span className="text-xl">{v.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${edgeVoice === v.id ? 'text-purple-300' : 'text-white/70'}`}>{v.name}</p>
                      <p className="text-white/30 text-[10px] truncate">{v.gender} • {v.id}</p>
                    </div>
                    {edgeVoice === v.id && <span className="material-symbols-outlined text-purple-400 text-sm">check_circle</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CapCut TTS: Voice Type Selector */}
          {engine === 'capcut' && (
            <div className="rounded-lg p-4" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-white/60 text-sm font-medium block mb-3">🎤 Giọng CapCut TTS (TikTok Voices)</span>
              <div className="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto pr-1">
                {capcutVoices.map(v => (
                  <button key={v.type} onClick={() => setCapcutVoiceType(v.type)}
                    className={`p-2.5 rounded-lg text-left transition-all ${capcutVoiceType === v.type ? 'bg-cyan-400/10' : 'hover:bg-white/5'}`}
                    style={{ border: `1px solid ${capcutVoiceType === v.type ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-base ${capcutVoiceType === v.type ? 'text-cyan-400' : 'text-white/30'}`}>
                        {v.gender === 'Nữ' ? 'female' : 'male'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${capcutVoiceType === v.type ? 'text-cyan-300' : 'text-white/60'}`}>{v.name}</p>
                        <p className="text-white/25 text-[9px]">{v.gender} • {v.tag}</p>
                      </div>
                      {capcutVoiceType === v.type && <span className="material-symbols-outlined text-cyan-400 text-sm">check_circle</span>}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-white/20 text-[10px] mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]">info</span>
                Requires CapCut TTS server running at localhost:8080
              </p>
            </div>
          )}

          {/* Valtec: Vietnamese TTS Voice Selector */}
          {engine === 'valtec' && (
            <div className="rounded-lg p-4" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-white/60 text-sm font-medium block mb-3">🇻🇳 Giọng Valtec (Tiếng Việt) — {valtecVoices.length} giọng</span>

              {/* Gender filter tabs */}
              <div className="flex gap-1.5 mb-3">
                {[
                  { id: 'all', label: 'Tất cả', icon: 'group' },
                  { id: 'Nữ', label: 'Nữ', icon: 'female' },
                  { id: 'Nam', label: 'Nam', icon: 'male' },
                  { id: 'special', label: 'Đặc biệt', icon: 'diversity_3' },
                ].map(tab => (
                  <button key={tab.id}
                    onClick={() => setValtecFilter?.(tab.id) || (window._valtecFilter = tab.id, setValtecVoice(valtecVoice))}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 ${(window._valtecFilter || 'all') === tab.id
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                      : 'text-white/40 border border-white/8 hover:text-white/60'
                      }`}>
                    <span className="material-symbols-outlined text-xs">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                {valtecVoices
                  .filter(v => {
                    const f = window._valtecFilter || 'all';
                    if (f === 'all') return true;
                    if (f === 'special') return !['Nữ', 'Nam'].includes(v.gender);
                    return v.gender === f;
                  })
                  .map(v => (
                    <div key={v.file} className={`p-2.5 rounded-lg text-left transition-all ${valtecVoice === v.file ? 'bg-rose-400/10' : 'hover:bg-white/5'}`}
                      style={{ border: `1px solid ${valtecVoice === v.file ? 'rgba(244,63,94,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                      <div className="flex items-center gap-1.5" onClick={() => setValtecVoice(v.file)} style={{ cursor: 'pointer' }}>
                        <span className={`material-symbols-outlined text-base ${valtecVoice === v.file ? 'text-rose-400' : 'text-white/30'}`}>
                          {v.gender === 'Nữ' ? 'female' : v.gender === 'Nam' ? 'male' : v.gender === 'Trẻ em' ? 'child_care' : v.gender.includes('Cao tuổi') ? 'elderly' : 'face'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${valtecVoice === v.file ? 'text-rose-300' : 'text-white/60'}`}>{v.name}</p>
                          <p className="text-white/25 text-[9px]">{v.gender} • {v.tag}</p>
                        </div>
                        <button onClick={(e) => playVoicePreview(v.file, e)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${previewVoice === v.file ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60'}`}
                          title={previewVoice === v.file ? 'Dừng' : 'Nghe thử'}>
                          <span className="material-symbols-outlined text-xs">
                            {previewVoice === v.file ? 'stop' : 'play_arrow'}
                          </span>
                        </button>
                        {valtecVoice === v.file && <span className="material-symbols-outlined text-rose-400 text-sm">check_circle</span>}
                      </div>
                    </div>
                  ))}
              </div>

              <p className="text-white/20 text-[10px] mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[10px]">info</span>
                25 giọng Việt Nam chất lượng cao • Local GPU
              </p>
            </div>
          )}

          {/* Server 1 (OmniVoice): Voice Type Selector */}
          {engine === 'omnivoice' && (
            <div className="rounded-lg p-4" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-white/60 text-sm font-medium block mb-3">Model Server 1</span>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {omnivoiceModels.map(model => (
                  <button key={model.id} onClick={() => setOmnivoiceModel(model.id)}
                    className={`p-3 rounded-lg text-left transition-all ${omnivoiceModel === model.id ? 'bg-purple-400/10' : 'hover:bg-white/5'}`}
                    style={{ border: `1px solid ${omnivoiceModel === model.id ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
                    <p className={`text-sm font-medium ${omnivoiceModel === model.id ? 'text-purple-300' : 'text-white/70'}`}>{model.label}</p>
                    <p className="text-white/30 text-[10px] mt-1">{model.desc}</p>
                  </button>
                ))}
              </div>
              <span className="text-white/60 text-sm font-medium block mb-3">🎤 Chọn giọng nói</span>
              <div className="grid grid-cols-3 gap-2">
                {voiceTypes.map(vt => (
                  <button key={vt.id} onClick={() => setVoiceType(vt.id)}
                    className={`p-3 rounded-lg text-center transition-all ${voiceType === vt.id ? 'bg-purple-400/10' : 'hover:bg-white/5'}`}
                    style={{ border: `1px solid ${voiceType === vt.id ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
                    <span className={`material-symbols-outlined text-xl ${voiceType === vt.id ? 'text-purple-400' : 'text-white/40'}`}>{vt.icon}</span>
                    <p className={`text-xs font-medium mt-1 ${voiceType === vt.id ? 'text-purple-300' : 'text-white/60'}`}>{vt.label}</p>
                    <p className="text-white/25 text-[10px] mt-0.5">{vt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reference Audio - only for OmniVoice Clone mode */}
          {engine === 'omnivoice' && voiceType === 'clone' && (
            <div className="rounded-lg p-4" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/60 text-sm font-medium">🎧 File giọng tham chiếu</span>
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
              {!refAudioFile && (
                <p className="text-amber-400/60 text-xs mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  Cần file tham chiếu để clone giọng nói
                </p>
              )}
            </div>
          )}

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
            <div className="rounded-lg p-3 flex items-start gap-2 max-h-[80px] overflow-y-auto" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span className="material-symbols-outlined text-red-400 text-sm flex-shrink-0 mt-0.5">error</span>
              <span className="text-red-300 text-xs break-all">{typeof error === 'string' && error.length > 200 ? error.substring(0, 200) + '...' : error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/20 text-xs">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>GPU CUDA • Model: {engine === 'omnivoice' ? (omnivoiceModels.find(m => m.id === omnivoiceModel)?.label || 'Server 1') : engine === 'edge' ? 'Edge TTS' : engine === 'valtec' ? 'Server 2' : 'CapCut TTS'}</span>
          </div>
          <div className="flex gap-2">
            <button className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}
              onClick={handleDub} disabled={dubbing || subtitles.length === 0 || (voiceType === 'clone' && !refAudioFile)}>
              {dubbing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </span>
              ) : audioUrl ? '🔄 Tạo lại lồng tiếng' : '🎙️ Bắt đầu lồng tiếng'}
            </button>
            <button className="px-5 py-2 rounded-lg text-sm text-white/50 border border-white/10 hover:bg-white/5" onClick={onClose}>
              {audioUrl ? 'Đóng' : 'Hủy'}
            </button>
          </div>
        </div>
      </div>
    </ModalBackdrop>
  );
}

'use client';
import { useEffect, useState, useRef } from 'react';

/* Modal Backdrop */
function ModalBackdrop({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative">
        {children}
      </div>
    </div>
  );
}

/* Upload Modal */
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

/* Export Modal */
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
      // Canvas export
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

      // CapCut export
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

      // FFmpeg export
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
          <h2 className="text-white text-lg font-semibold">Xuất video</h2>
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
                Canvas export tạo video WebM giống hệt preview. Xử lý trên trình duyệt, không cần server.
              </div>
            )}
            {exportEngine === 'capcut' && capcutAvailable && (
              <div className="rounded-lg px-3 py-2 text-xs text-pink-200/80" style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)' }}>
                CapCut Engine cho chất lượng chuyên nghiệp: phụ đề động, hiệu ứng đẹp, render cloud.
              </div>
            )}
          </div>

          {/* Render Options */}
          <div className="pt-3 border-t border-white/5 space-y-3">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Tùy chọn render</p>
            {[
              { label: 'Làm mờ phụ đề gốc (Blur Hardsub)', checked: blurHardsub, onChange: setBlurHardsub },
              { label: 'Chèn phụ đề dịch', checked: includeSubtitle, onChange: setIncludeSubtitle },
              { label: 'Chèn logo', checked: includeLogo, onChange: setIncludeLogo, disabled: !logoSrc },
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
                {exportProgress < 100 ? (exportMessage || `Đang render... ${exportProgress}%`) : 'Hoàn thành!'}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm">Cảnh báo: {error}</p>
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
                Xuất video
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

/* Dubbing Modal */
export function DubbingModal({ onClose, onDub, videoTitle = 'DEMO', duration = '0:02:02.70', taskId, subtitles = [], existingAudioUrl = null }) {
  const languageVoices = {
    Vietnamese: [
      { id: 'vi-VN-HoaiMyNeural', name: 'Hoài My', gender: 'Nữ', flag: 'VN' },
      { id: 'vi-VN-NamMinhNeural', name: 'Nam Minh', gender: 'Nam', flag: 'VN' },
    ],
    English: [
      { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'Nữ', flag: 'US' },
      { id: 'en-US-GuyNeural', name: 'Guy', gender: 'Nam', flag: 'US' },
    ],
    Chinese: [
      { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao', gender: 'Nữ', flag: 'CN' },
      { id: 'zh-CN-YunxiNeural', name: 'Yunxi', gender: 'Nam', flag: 'CN' },
    ],
    Japanese: [
      { id: 'ja-JP-NanamiNeural', name: 'Nanami', gender: 'Nữ', flag: 'JP' },
      { id: 'ja-JP-KeitaNeural', name: 'Keita', gender: 'Nam', flag: 'JP' },
    ],
    Korean: [
      { id: 'ko-KR-SunHiNeural', name: 'Sun Hi', gender: 'Nữ', flag: 'KR' },
      { id: 'ko-KR-InJoonNeural', name: 'In Joon', gender: 'Nam', flag: 'KR' },
    ],
  };

  const capcutVoices = [
    { type: 14, name: 'TikTok Nữ Mặc Định', gender: 'Nữ', tag: 'smooth' },
    { type: 15, name: 'TikTok Nam Mặc Định', gender: 'Nam', tag: 'clear' },
    { type: 12, name: 'Nữ Trẻ', gender: 'Nữ', tag: 'young' },
    { type: 10, name: 'Nam Trầm', gender: 'Nam', tag: 'deep' },
  ];

  const cloneServers = [
    {
      id: 'omnivoice',
      label: 'Server 1',
      title: 'Clone Voice bằng OmniVoice',
      desc: 'Clone voice local bằng OmniVoice và file tham chiếu.',
      color: 'rgba(139,92,246,0.55)',
      bg: 'bg-purple-400/10',
      text: 'text-purple-300',
    },
    {
      id: 'valtec',
      label: 'Server 2',
      title: 'Clone Voice bằng Valtec TTS',
      desc: 'Clone voice local bằng Valtec TTS và file tham chiếu.',
      color: 'rgba(34,211,238,0.55)',
      bg: 'bg-cyan-400/10',
      text: 'text-cyan-300',
    },
  ];

  const b2Models = [
    { id: 'default', label: 'OmniVoice mặc định', desc: 'Model gốc của OmniVoice.' },
    { id: 'ngochuyen_ft_3000', label: 'Ngọc Huyền FT 3000', desc: 'Model fine-tune local cho B2 Server.' },
  ];

  const valtecVoices = [
    { id: 'hoa-mai', label: 'Hoa Mai', meta: 'Nữ - Tự nhiên', voice: 'Vietnam_hoa-mai (woman).pt', available: true },
    { id: 'my-huyen', label: 'Mỹ Huyền', meta: 'Nữ - Ấm áp', voice: 'Vietnam_my-huyen (woman).pt', available: true },
    { id: 'ngoc-anh', label: 'Ngọc Anh', meta: 'Nữ - Rành rõ', voice: 'Vietnam_ngoc-anh (woman).pt', available: true },
    { id: 'ngoc-duyen', label: 'Ngọc Duyên', meta: 'Nữ - Nhẹ nhàng', voice: 'Vietnam_ngoc-duyen (woman).pt', available: true },
    { id: 'quynh-nhu', label: 'Quỳnh Như', meta: 'Nữ - Trẻ trung', voice: 'Vietnam_quynh-nhu (woman).pt', available: true },
    { id: 'thao-van', label: 'Thảo Vân', meta: 'Nữ - MC', voice: 'Vietnam_thao-van (woman).pt', available: true },
    { id: 'thuy-linh', label: 'Thùy Linh', meta: 'Nữ - Sang', voice: 'Vietnam_thuy-linh (woman).pt', available: true },
    { id: 'ha-giang', label: 'Hà Giang', meta: 'Nữ - Độc đáo', voice: 'Vietnam_ha-giang (woman).pt', available: true },
    { id: 'lan-my', label: 'Lan My', meta: 'Nữ - Tinh tế', voice: 'Vietnam_lan-my (woman).pt', available: true },
    { id: 'minh-thu', label: 'Minh Thư', meta: 'Nữ - Diễn cảm', voice: 'Vietnam_minh-thu (woman).pt', available: true },
    { id: 'hoang-son', label: 'Hoàng Sơn', meta: 'Nam - Chuyên nghiệp', voice: 'Vietnam_hoang-son (man).pt', available: true },
    { id: 'le-nam', label: 'Lê Nam', meta: 'Nam - Năng động', voice: 'Vietnam_le-nam (man).pt', available: true },
    { id: 'nguyen-thang', label: 'Nguyễn Thắng', meta: 'Nam - Vững vàng', voice: 'Vietnam_nguyen-thang (man).pt', available: true },
    { id: 'nguyen-tung', label: 'Nguyễn Tùng', meta: 'Nam - Truyền cảm', voice: 'Vietnam_nguyen-tung (man).pt', available: true },
    { id: 'tran-binh', label: 'Trần Bình', meta: 'Nam - Trầm ấm', voice: 'Vietnam_tran-binh (man).pt', available: true },
    { id: 'trung-anh', label: 'Trung Anh', meta: 'Nam - Sạch sẽ', voice: 'Vietnam_trung-anh (man).pt', available: true },
    { id: 'tung-lam', label: 'Tùng Lâm', meta: 'Nam - Mạnh mẽ', voice: 'Vietnam_tung-lam (man).pt', available: true },
    { id: 'dinh-quan', label: 'Đình Quân', meta: 'Nam - Đĩnh đạc', voice: 'Vietnam_dinh-quan (man).pt', available: true },
    { id: 'minh-tuan', label: 'Minh Tuấn', meta: 'Nam - Bình tĩnh', voice: 'Vietnam_minh-tuan (man).pt', available: true },
    { id: 'the-trung', label: 'Thế Trung', meta: 'Nam - Rành rõ', voice: 'Vietnam_the-trung (man).pt', available: true },
    { id: 'binh-an', label: 'Bình An', meta: 'Trẻ em - Dễ thương', voice: 'Vietnam_binh-an (child).pt', available: true },
    { id: 'nguyen-lien', label: 'Nguyễn Liên', meta: 'Cao tuổi - Trầm lắng', voice: 'Vietnam_nguyen-lien (old woman).pt', available: true },
    { id: 'tung-lam-old', label: 'Tùng Lâm (Lão)', meta: 'Cao tuổi - Nam', voice: 'Vietnam_tung-lam (old man).pt', available: true },
    { id: 'quang-linh', label: 'Quang Linh', meta: 'Đặc biệt - Cá tính', voice: 'Vietnam_quang-linh (gay).pt', available: true },
    { id: 'suca', label: 'Suca', meta: 'Đặc biệt - Vui nhộn', voice: 'Vietnam_suca.pt', available: true },
  ];

  const voiceTypes = [
    { id: 'female', label: 'Giọng nữ', desc: 'TTS mặc định', icon: 'female' },
    { id: 'male', label: 'Giọng nam', desc: 'TTS mặc định', icon: 'male' },
  ];

  const languages = ['Vietnamese', 'English', 'Chinese', 'Japanese', 'Korean'];
  const speedOptions = [0.8, 0.9, 1.0, 1.1, 1.2, 1.5];

  const [title, setTitle] = useState(videoTitle);
  const [speed, setSpeed] = useState(1.0);
  const [language, setLanguage] = useState('Vietnamese');
  const [voiceType, setVoiceType] = useState('female');
  const [engine, setEngine] = useState('edge');
  const [cloneServer, setCloneServer] = useState('omnivoice');
  const [b2Mode, setB2Mode] = useState('omnivoice');
  const [edgeVoice, setEdgeVoice] = useState('vi-VN-HoaiMyNeural');
  const [capcutVoiceType, setCapcutVoiceType] = useState(14);
  const [omnivoiceModel, setOmnivoiceModel] = useState('ngochuyen_ft_3000');
  const [valtecVoice, setValtecVoice] = useState('Vietnam_hoa-mai (woman).pt');
  const [autoPublish, setAutoPublish] = useState(false);
  const [dubbing, setDubbing] = useState(false);
  const [dubProgress, setDubProgress] = useState(existingAudioUrl ? 100 : 0);
  const [statusMsg, setStatusMsg] = useState(existingAudioUrl ? 'Đã tải bản lồng tiếng đã lưu.' : '');
  const [audioUrl, setAudioUrl] = useState(existingAudioUrl);
  const [error, setError] = useState(null);
  const [refAudioFile, setRefAudioFile] = useState(null);
  const [refAudioName, setRefAudioName] = useState('Chưa chọn file tham chiếu');
  const [previewVoice, setPreviewVoice] = useState(null);
  const pollRef = useRef(null);
  const previewAudioRef = useRef(null);

  const currentVoices = languageVoices[language] || languageVoices.Vietnamese;
  const selectedEdgeVoice = currentVoices.find((voice) => voice.id === edgeVoice) || currentVoices[0];
  const selectedCapcutVoice = capcutVoices.find((voice) => voice.type === capcutVoiceType) || capcutVoices[0];
  const selectedCloneServer = cloneServers.find((server) => server.id === cloneServer) || cloneServers[0];
  const selectedB2Model = b2Models.find((model) => model.id === omnivoiceModel) || b2Models[0];
  const selectedValtecVoice = valtecVoices.find((voice) => voice.voice === valtecVoice) || valtecVoices[0];

  const currentEngineLabel = engine === 'edge'
    ? 'Edge TTS'
    : engine === 'capcut'
      ? 'CapCut'
      : engine === 'clone'
        ? 'Clone Voice'
        : 'B2 Server';

  const currentModelLabel = engine === 'edge'
    ? (selectedEdgeVoice?.name || edgeVoice)
    : engine === 'capcut'
      ? (selectedCapcutVoice?.name || 'CapCut')
      : engine === 'clone'
        ? `${selectedCloneServer.label} - ${selectedCloneServer.title}`
        : b2Mode === 'valtec'
          ? selectedValtecVoice.label
          : selectedB2Model.label;

  const effectiveEngine = engine === 'edge'
    ? 'edge'
    : engine === 'capcut'
      ? 'capcut'
      : engine === 'clone'
        ? (cloneServer === 'valtec' ? 'valtec' : 'omnivoice')
        : b2Mode === 'valtec'
          ? 'valtec'
          : 'omnivoice';

  useEffect(() => {
    if (existingAudioUrl) {
      setAudioUrl(existingAudioUrl);
      setDubProgress(100);
      setStatusMsg('Đã tải bản lồng tiếng đã lưu.');
    }
  }, [existingAudioUrl]);

  useEffect(() => {
    if (!currentVoices.some((voice) => voice.id === edgeVoice) && currentVoices[0]) {
      setEdgeVoice(currentVoices[0].id);
    }
  }, [currentVoices, edgeVoice]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  const playVoicePreview = async (voiceFile, event) => {
    event?.stopPropagation();
    if (previewVoice === voiceFile) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
      setPreviewVoice(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    setPreviewVoice(voiceFile);
    try {
      const res = await fetch('/api/voice-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: voiceFile }),
      });
      if (!res.ok) {
        setPreviewVoice(null);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.onended = () => {
        setPreviewVoice(null);
        URL.revokeObjectURL(url);
      };
      audio.play().catch(() => setPreviewVoice(null));
    } catch {
      setPreviewVoice(null);
    }
  };

  const handleRefAudioUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setRefAudioFile(file);
    setRefAudioName(file.name);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const pollProgress = (voiceTaskId) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/voiceover?taskId=${voiceTaskId}`);
        const data = await res.json();

        setDubProgress(data.progress || 0);
        setStatusMsg(data.message || '');

        if (data.status === 'completed') {
          stopPolling();
          setDubbing(false);
          setDubProgress(100);
          setAudioUrl(data.audioUrl);
          setStatusMsg('Lồng tiếng hoàn thành.');
          if (onDub) onDub({ audioUrl: data.audioUrl, taskId: voiceTaskId });
        } else if (data.status === 'error') {
          stopPolling();
          setDubbing(false);
          setError(data.message || 'Lồng tiếng thất bại');
        }
      } catch {
        // keep polling
      }
    }, 2000);
  };

  const handleDub = async () => {
    setDubbing(true);
    setDubProgress(0);
    setError(null);
    setAudioUrl(null);

    const runningMessage = engine === 'edge'
      ? `Đang tạo giọng Edge TTS (${selectedEdgeVoice?.name || edgeVoice})...`
      : engine === 'capcut'
        ? `Đang tạo giọng CapCut (${selectedCapcutVoice?.name || 'default'})...`
        : engine === 'clone'
          ? `Đang gửi yêu cầu Clone Voice (${selectedCloneServer.title})...`
          : b2Mode === 'valtec'
            ? `Đang tạo giọng B2 Server (${selectedValtecVoice.label} - thư viện giọng Valtec)...`
            : `Đang tạo giọng B2 Server (${selectedB2Model.label} - ${voiceType === 'female' ? 'nữ' : 'nam'})...`;
    setStatusMsg(runningMessage);

    try {
      let refAudioPath = null;
      if (engine === 'clone' && refAudioFile) {
        const formData = new FormData();
        formData.append('audio', refAudioFile);
        const uploadRes = await fetch('/api/upload-audio', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Không upload được file tham chiếu');
        }
        refAudioPath = uploadData.path;
      }

      const requestVoiceType = engine === 'clone' ? 'clone' : voiceType;
      const requestOmniModel = effectiveEngine === 'omnivoice'
        ? (engine === 'clone' ? 'default' : omnivoiceModel)
        : undefined;
      const requestValtecVoice = engine === 'clone' && cloneServer === 'valtec'
        ? '__clone__'
        : engine === 'b2' && b2Mode === 'valtec'
          ? valtecVoice
          : undefined;
      const requestModelLabel = engine === 'edge'
        ? (selectedEdgeVoice?.name || edgeVoice)
        : engine === 'capcut'
          ? (selectedCapcutVoice?.name || 'CapCut')
          : engine === 'clone'
            ? `${selectedCloneServer.label} - ${selectedCloneServer.title}`
            : b2Mode === 'valtec'
              ? selectedValtecVoice.label
              : selectedB2Model.label;

      const res = await fetch('/api/voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          title,
          speed,
          language,
          autoPublish,
          voiceType: requestVoiceType,
          engine: effectiveEngine,
          engineLabel: currentEngineLabel,
          voiceoverModelLabel: requestModelLabel,
          omnivoiceModel: requestOmniModel,
          edgeVoice: engine === 'edge' ? edgeVoice : undefined,
          capcutVoiceType: engine === 'capcut' ? capcutVoiceType : undefined,
          valtecVoice: requestValtecVoice,
          refAudioPath,
          subtitles: subtitles.map((subtitle) => ({
            start: subtitle.start,
            end: subtitle.end,
            original: subtitle.original,
            translation: subtitle.translation,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không tạo được bản lồng tiếng');
      }

      if (data.status === 'processing' && data.taskId) {
        setStatusMsg(data.message || 'Đang xử lý...');
        pollProgress(data.taskId);
        return;
      }

      throw new Error(data.error || 'Không tạo được bản lồng tiếng');
    } catch (err) {
      setDubbing(false);
      setError(err.message || 'Không tạo được bản lồng tiếng');
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="rounded-xl w-[680px] max-h-[90vh] flex flex-col" style={{ background: '#1b1b2f', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}>
              <span className="material-symbols-outlined text-white text-lg">record_voice_over</span>
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold">Lồng tiếng AI</h2>
              <p className="text-white/30 text-xs">Edge TTS - Clone Voice - CapCut - B2 Server</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="flex gap-2 p-1 rounded-lg" style={{ background: '#0d1117' }}>
            <button
              onClick={() => setEngine('edge')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${engine === 'edge' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'text-white/40 hover:text-white/60 border border-transparent'}`}
            >
              <span className="material-symbols-outlined text-base">cloud</span>
              Edge TTS
            </button>
            <button
              onClick={() => setEngine('clone')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${engine === 'clone' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'text-white/40 hover:text-white/60 border border-transparent'}`}
            >
              <span className="material-symbols-outlined text-base">memory</span>
              Clone Voice
            </button>
            <button
              onClick={() => setEngine('capcut')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${engine === 'capcut' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'text-white/40 hover:text-white/60 border border-transparent'}`}
            >
              <span className="material-symbols-outlined text-base">smart_toy</span>
              CapCut
            </button>
            <button
              onClick={() => setEngine('b2')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${engine === 'b2' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' : 'text-white/40 hover:text-white/60 border border-transparent'}`}
            >
              <span className="material-symbols-outlined text-base">spatial_audio</span>
              B2 Server
            </button>
          </div>

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
              <p className="text-white/80 text-sm font-medium mt-1">{currentEngineLabel}</p>
              <p className="text-white/30 text-xs">Engine</p>
            </div>
          </div>

          {engine === 'edge' && (
            <div className="rounded-lg p-4" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-white/60 text-sm font-medium block mb-3">Chọn giọng nói ({language})</span>
              <div className="grid grid-cols-2 gap-2">
                {currentVoices.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setEdgeVoice(voice.id)}
                    className={`p-3 rounded-lg text-left transition-all flex items-center gap-3 ${edgeVoice === voice.id ? 'bg-purple-400/10' : 'hover:bg-white/5'}`}
                    style={{ border: `1px solid ${edgeVoice === voice.id ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}` }}
                  >
                    <span className="text-xs font-semibold text-white/60">{voice.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${edgeVoice === voice.id ? 'text-purple-300' : 'text-white/70'}`}>{voice.name}</p>
                      <p className="text-white/30 text-[10px]">{voice.gender} - {voice.id}</p>
                    </div>
                    {edgeVoice === voice.id && <span className="material-symbols-outlined text-purple-400 text-sm">check_circle</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {engine === 'clone' && (
            <>
              <div className="rounded-lg p-4" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-white/60 text-sm font-medium block mb-3">Clone Voice có 2 server</span>
                <div className="grid grid-cols-2 gap-2">
                  {cloneServers.map((server) => (
                    <button
                      key={server.id}
                      onClick={() => setCloneServer(server.id)}
                      className={`p-3 rounded-lg text-left transition-all ${cloneServer === server.id ? server.bg : 'hover:bg-white/5'}`}
                      style={{ border: `1px solid ${cloneServer === server.id ? server.color : 'rgba(255,255,255,0.1)'}` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-medium ${cloneServer === server.id ? server.text : 'text-white/70'}`}>{server.label}</p>
                          <p className="text-white/70 text-xs mt-1">{server.title}</p>
                          <p className="text-white/30 text-[10px] mt-1">{server.desc}</p>
                        </div>
                        {cloneServer === server.id && <span className="material-symbols-outlined text-sm text-white/80">check_circle</span>}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-white/20 text-[10px] mt-2">{cloneServer === 'valtec' ? 'Server 2 dùng Valtec TTS để clone voice từ file tham chiếu.' : 'Server 1 dùng OmniVoice để clone voice từ file tham chiếu.'}</p>
              </div>

              <div className="rounded-lg p-4" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/60 text-sm font-medium">File giọng tham chiếu</span>
                  <label className="px-3 py-1 rounded text-xs cursor-pointer transition-all text-purple-300 border border-purple-400/20 hover:bg-purple-400/10">
                    Tải lên .WAV
                    <input type="file" accept=".wav,.mp3,.ogg" className="hidden" onChange={handleRefAudioUpload} />
                  </label>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: '#161b22' }}>
                  <span className="material-symbols-outlined text-sm text-purple-400">mic</span>
                  <span className="text-white/50 text-xs flex-1">{refAudioName}</span>
                  {refAudioFile && <span className="text-emerald-400 text-xs">Đã chọn</span>}
                </div>
                {!refAudioFile && <p className="text-amber-400/60 text-xs mt-2">Cần file tham chiếu để clone voice.</p>}
              </div>
            </>
          )}

          {engine === 'capcut' && (
            <div className="rounded-lg p-4" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-white/60 text-sm font-medium block mb-3">Giọng CapCut TTS</span>
              <div className="grid grid-cols-2 gap-2">
                {capcutVoices.map((voice) => (
                  <button
                    key={voice.type}
                    onClick={() => setCapcutVoiceType(voice.type)}
                    className={`p-3 rounded-lg text-left transition-all ${capcutVoiceType === voice.type ? 'bg-cyan-400/10' : 'hover:bg-white/5'}`}
                    style={{ border: `1px solid ${capcutVoiceType === voice.type ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.1)'}` }}
                  >
                    <p className={`text-sm font-medium ${capcutVoiceType === voice.type ? 'text-cyan-300' : 'text-white/70'}`}>{voice.name}</p>
                    <p className="text-white/30 text-[10px] mt-1">{voice.gender} - {voice.tag}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {engine === 'b2' && (
            <div className="rounded-lg p-4" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-white/60 text-sm font-medium block mb-3">B2 Server gồm OmniVoice và thư viện Valtec</span>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => setB2Mode('omnivoice')}
                  className={`p-3 rounded-lg text-left transition-all ${b2Mode === 'omnivoice' ? 'bg-purple-400/10' : 'hover:bg-white/5'}`}
                  style={{ border: `1px solid ${b2Mode === 'omnivoice' ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}` }}
                >
                  <p className={`text-sm font-medium ${b2Mode === 'omnivoice' ? 'text-purple-300' : 'text-white/70'}`}>OmniVoice Model</p>
                  <p className="text-white/30 text-[10px] mt-1">Dùng model TTS local, có Ngọc Huyền FT 3000.</p>
                </button>
                <button
                  onClick={() => setB2Mode('valtec')}
                  className={`p-3 rounded-lg text-left transition-all ${b2Mode === 'valtec' ? 'bg-cyan-400/10' : 'hover:bg-white/5'}`}
                  style={{ border: `1px solid ${b2Mode === 'valtec' ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.1)'}` }}
                >
                  <p className={`text-sm font-medium ${b2Mode === 'valtec' ? 'text-cyan-300' : 'text-white/70'}`}>Valtec Voice Library</p>
                  <p className="text-white/30 text-[10px] mt-1">Gộp lại hơn 25 giọng của server 2 cũ vào đây.</p>
                </button>
              </div>

              {b2Mode === 'omnivoice' && (
                <>
                  <span className="text-white/60 text-sm font-medium block mb-3">Model B2 Server</span>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {b2Models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => setOmnivoiceModel(model.id)}
                        className={`p-3 rounded-lg text-left transition-all ${omnivoiceModel === model.id ? 'bg-purple-400/10' : 'hover:bg-white/5'}`}
                        style={{ border: `1px solid ${omnivoiceModel === model.id ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}` }}
                      >
                        <p className={`text-sm font-medium ${omnivoiceModel === model.id ? 'text-purple-300' : 'text-white/70'}`}>{model.label}</p>
                        <p className="text-white/30 text-[10px] mt-1">{model.desc}</p>
                      </button>
                    ))}
                  </div>
                  <span className="text-white/60 text-sm font-medium block mb-3">Chọn giọng nói</span>
                  <div className="grid grid-cols-2 gap-2">
                    {voiceTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setVoiceType(type.id)}
                        className={`p-3 rounded-lg text-center transition-all ${voiceType === type.id ? 'bg-purple-400/10' : 'hover:bg-white/5'}`}
                        style={{ border: `1px solid ${voiceType === type.id ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.1)'}` }}
                      >
                        <span className={`material-symbols-outlined text-xl ${voiceType === type.id ? 'text-purple-400' : 'text-white/40'}`}>{type.icon}</span>
                        <p className={`text-xs font-medium mt-1 ${voiceType === type.id ? 'text-purple-300' : 'text-white/60'}`}>{type.label}</p>
                        <p className="text-white/25 text-[10px] mt-0.5">{type.desc}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {b2Mode === 'valtec' && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/60 text-sm font-medium block">Thư viện 25+ giọng Valtec</span>
                    <span className="text-white/20 text-[10px]">Đã nạp đầy đủ voice embedding local</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-[310px] overflow-y-auto pr-1">
                    {valtecVoices.map((voice) => (
                      <div
                        key={voice.id}
                        onClick={() => voice.available && setValtecVoice(voice.voice)}
                        className={`p-2.5 rounded-lg text-left transition-all ${valtecVoice === voice.voice ? 'bg-cyan-400/10' : 'hover:bg-white/5'} ${voice.available ? '' : 'opacity-50 cursor-not-allowed'}`}
                        style={{ border: `1px solid ${valtecVoice === voice.voice ? 'rgba(34,211,238,0.5)' : 'rgba(255,255,255,0.08)'}` }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${valtecVoice === voice.voice ? 'text-cyan-300' : 'text-white/70'}`}>{voice.label}</p>
                            <p className="text-white/25 text-[9px]">{voice.meta}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => playVoicePreview(voice.voice, event)}
                            className="text-white/50 hover:text-white text-xs"
                            title="Nghe thử"
                          >
                            <span className="material-symbols-outlined text-base">
                              {previewVoice === voice.voice ? 'pause_circle' : 'play_circle'}
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/40 text-xs mb-1 block">Ngôn ngữ đầu ra</label>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="w-full px-3 py-2 rounded text-sm text-white bg-[#0d1117] border border-white/10 focus:outline-none focus:border-purple-400/40"
              >
                {languages.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Tốc độ nói: {speed}x</label>
              <div className="flex gap-1">
                {speedOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSpeed(option)}
                    className={`flex-1 py-1.5 rounded text-xs transition-all ${speed === option ? 'bg-purple-500 text-white' : 'text-white/40 border border-white/10 hover:text-white/60'}`}
                  >
                    {option}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-white/40 text-sm">Tiêu đề:</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="flex-1 px-3 py-1.5 rounded text-sm text-white bg-[#0d1117] border border-white/10 focus:outline-none focus:border-purple-400/40"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoPublish}
              onChange={(event) => setAutoPublish(event.target.checked)}
              className="w-4 h-4 accent-[#8b5cf6]"
            />
            <span className="text-white/60 text-sm">Xuất bản sau khi lồng tiếng</span>
          </label>

          {(dubbing || audioUrl) && (
            <div className="rounded-lg p-4" style={{ background: '#0d1117', border: `1px solid ${audioUrl ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.2)'}` }}>
              <div className="flex items-center justify-between mb-2 gap-4">
                <span className="text-white/60 text-xs break-all">{statusMsg}</span>
                <span className="text-white/40 text-xs font-mono">{dubProgress}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#161b22' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${dubProgress}%`,
                    background: audioUrl ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #8b5cf6, #d946ef)',
                  }}
                />
              </div>
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

          {error && (
            <div className="rounded-lg p-3 flex items-start gap-2 max-h-[100px] overflow-y-auto" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span className="material-symbols-outlined text-red-400 text-sm flex-shrink-0 mt-0.5">error</span>
              <span className="text-red-300 text-xs break-all">{error}</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/20 text-xs">
            <span className="material-symbols-outlined text-sm">info</span>
            <span>GPU CUDA - Model: {currentModelLabel}</span>
          </div>
          <div className="flex gap-2">
            <button
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}
              onClick={handleDub}
              disabled={dubbing || subtitles.length === 0 || (engine === 'clone' && !refAudioFile) || (engine === 'b2' && b2Mode === 'valtec' && !selectedValtecVoice?.available)}
            >
              {dubbing ? 'Đang xử lý...' : audioUrl ? 'Tạo lại lồng tiếng' : 'Bắt đầu lồng tiếng'}
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

'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SettingsPanel from './SettingsPanel';
import { UploadModal, ExportModal, DubbingModal } from './EditorModals';
import CapCutEffectsBrowser from './CapCutEffectsBrowser';
import UserModals from './UserModals';
import { useLanguage } from '../../i18n/LanguageContext';

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

const separationProfiles = [
  { id: 'model_bs_roformer_ep_317_sdr_12.9755.ckpt', label: 'Server Tách 1', desc: 'BS RoFormer - Clean vocal split' },
  { id: 'UVR_MDXNET_KARA_2.onnx', label: 'Server Tách 2', desc: 'UVR MDX - Fast karaoke split' },
  { id: 'htdemucs_ft.yaml', label: 'Server Tách 3', desc: 'Demucs FT - Balanced quality' },
];

export default function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lang, setLang, LANGUAGE_OPTIONS } = useLanguage();
  const taskId = searchParams.get('task');
  const [subtitles, setSubtitles] = useState([]);
  const [activeSub, setActiveSub] = useState(1);
  const [fontSize, setFontSize] = useState(93);
  const [textAngle, setTextAngle] = useState(0);
  const [activeStyle, setActiveStyle] = useState(1);
  const [activeTool, setActiveTool] = useState('hand');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [showVolume, setShowVolume] = useState(false);
  const [videoSrc, setVideoSrc] = useState(null);
  const [settings, setSettings] = useState({});
  const videoRef = useRef(null);
  const subListRef = useRef(null);

  // Modals
  const [showUpload, setShowUpload] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDubbing, setShowDubbing] = useState(false);
  const [showCapCut, setShowCapCut] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [notification, setNotification] = useState(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [contentCategory, setContentCategory] = useState('');
  const [contentCategories, setContentCategories] = useState([]);
  const autoSaveTimerRef = useRef(null);
  const subtitlesLoadedRef = useRef(false);  // Track if subtitles loaded from server
  const lastSavedRef = useRef('');  // Track last saved state to avoid duplicate saves

  // Audio controls
  const [muteOriginal, setMuteOriginal] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(20);
  const [vocalVolume, setVocalVolume] = useState(0);
  const [enableSeparationMix, setEnableSeparationMix] = useState(true);
  const [voiceoverSrc, setVoiceoverSrc] = useState(null);
  const [voiceoverVolume, setVoiceoverVolume] = useState(100);
  const [separationProfile, setSeparationProfile] = useState(separationProfiles[0].id);
  const [separationStatus, setSeparationStatus] = useState('idle');
  const [separationProgress, setSeparationProgress] = useState(0);
  const [separationStatusMsg, setSeparationStatusMsg] = useState('');
  const [separatingAudio, setSeparatingAudio] = useState(false);
  const [separatedVocalsSrc, setSeparatedVocalsSrc] = useState(null);
  const [separatedInstrumentalSrc, setSeparatedInstrumentalSrc] = useState(null);
  const voiceoverRef = useRef(null);
  const bgmRef = useRef(null);
  const vocalsRef = useRef(null);

  // Audio panel settings
  const [audioSyncEnabled, setAudioSyncEnabled] = useState(true);
  const [keepOriginalAudio, setKeepOriginalAudio] = useState(true);
  const [mergeTime, setMergeTime] = useState(3);
  const [durci, setDurci] = useState(1.5);
  const [voiceoverLang, setVoiceoverLang] = useState('Tiếng Việt');
  const [showAudioSettingsMenu, setShowAudioSettingsMenu] = useState(false);
  const defaultVoiceChannel = { voice: 'GG-Thu Cúc', speed: 1, vol: 5, pitch: 0, rate: 1.2, trim: 0.25 };
  const [voiceChannels, setVoiceChannels] = useState([
    { ...defaultVoiceChannel },
    { ...defaultVoiceChannel, speed: 2, rate: 1 },
    { ...defaultVoiceChannel, speed: 2, rate: 1 },
  ]);
  const voiceOptions = ['GG-Thu Cúc', 'GG-Minh Anh', 'GG-Hồng Đào', 'GG-Lan Nhi', 'GG-Anh Tuấn', 'GG-Minh Quang', 'OmniVoice Clone'];
  const langOptions = ['Tiếng Việt', 'Tiếng Anh', 'Tiếng Nhật', 'Tiếng Hàn', 'Tiếng Trung', 'Tiếng Thái', 'Tiếng Indonesia'];

  const updateVoiceChannel = (idx, key, value) => {
    setVoiceChannels(prev => prev.map((ch, i) => i === idx ? { ...ch, [key]: value } : ch));
  };

  const exportAudioSettings = () => {
    const settings = {
      audioSyncEnabled, keepOriginalAudio, mergeTime, durci, voiceoverLang,
      enableSeparationMix, bgmVolume, vocalVolume, voiceoverVolume,
      voiceChannels, separationProfile,
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'b2vision_audio_settings.json';
    a.click();
    URL.revokeObjectURL(url);
    showNotif('Đã xuất cài đặt âm thanh!', 'success');
  };

  const importAudioSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const s = JSON.parse(text);
        if (s.audioSyncEnabled !== undefined) setAudioSyncEnabled(s.audioSyncEnabled);
        if (s.keepOriginalAudio !== undefined) setKeepOriginalAudio(s.keepOriginalAudio);
        if (s.mergeTime !== undefined) setMergeTime(s.mergeTime);
        if (s.durci !== undefined) setDurci(s.durci);
        if (s.voiceoverLang) setVoiceoverLang(s.voiceoverLang);
        if (s.enableSeparationMix !== undefined) setEnableSeparationMix(s.enableSeparationMix);
        if (s.bgmVolume !== undefined) setBgmVolume(s.bgmVolume);
        if (s.vocalVolume !== undefined) setVocalVolume(s.vocalVolume);
        if (s.voiceoverVolume !== undefined) setVoiceoverVolume(s.voiceoverVolume);
        if (s.voiceChannels) setVoiceChannels(s.voiceChannels);
        if (s.separationProfile) setSeparationProfile(s.separationProfile);
        showNotif('Đã nhập cài đặt âm thanh thành công!', 'success');
      } catch (err) {
        showNotif('Lỗi đọc file cài đặt: ' + err.message, 'error');
      }
    };
    input.click();
  };

  // Logo
  const [logoSrc, setLogoSrc] = useState(null);
  const [logoPos, setLogoPos] = useState({ x: 10, y: 10 });
  const [logoSize, setLogoSize] = useState(80);
  const [logoDragging, setLogoDragging] = useState(false);
  const logoDragOffset = useRef({ x: 0, y: 0 });
  const videoContainerRef = useRef(null);

  // Frame / Aspect
  const [aspectRatio, setAspectRatio] = useState(null);
  const [frameBorderTop, setFrameBorderTop] = useState('');
  const [frameBorderBottom, setFrameBorderBottom] = useState('');
  const [frameBorderColor, setFrameBorderColor] = useState('#000000');
  const [frameTextColor, setFrameTextColor] = useState('#ffffff');
  const [frameFont, setFrameFont] = useState('Bebas');
  const [frameBorderHeight, setFrameBorderHeight] = useState(40);
  const [frameHighlightColor, setFrameHighlightColor] = useState('#fbbf24');

  // Blur Hardsub
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [blurIntensity, setBlurIntensity] = useState(15);
  const [blurRegion, setBlurRegion] = useState('bottom'); // 'bottom', 'top', 'custom'
  const [blurHeight, setBlurHeight] = useState(15); // % of video height
  const [blurWidth, setBlurWidth] = useState(100); // % of video width (centered)
  const [blurMode, setBlurMode] = useState('manual'); // 'manual' or 'yolo'
  const [whiteSubBg, setWhiteSubBg] = useState(true);
  const [whiteSubBgColor, setWhiteSubBgColor] = useState('#ffffff');
  const [whiteSubBgOpacity, setWhiteSubBgOpacity] = useState(85);
  const [whiteSubTextColor, setWhiteSubTextColor] = useState('#000000');
  // YOLO bbox data
  const [bboxData, setBboxData] = useState(null); // { resolution, rawBboxes, timeline }
  const [bboxLoading, setBboxLoading] = useState(false);
  // Actual video display rect within container (for object-contain)
  const [videoDisplayRect, setVideoDisplayRect] = useState(null);

  const applySeparationState = useCallback((separation) => {
    const nextStatus = separation?.status || 'idle';
    setSeparationStatus(nextStatus);
    setSeparationProgress(separation?.progress || 0);
    setSeparationStatusMsg(separation?.message || '');
    setSeparatedVocalsSrc(separation?.vocalsUrl || null);
    setSeparatedInstrumentalSrc(separation?.instrumentalUrl || null);
    setSeparatingAudio(nextStatus === 'processing');
    if (separation?.profile) setSeparationProfile(separation.profile);
  }, []);

  // Track actual video display area (object-contain creates letterboxing)
  useEffect(() => {
    const video = videoRef.current;
    const container = videoContainerRef.current;
    if (!video || !container) return;
    const updateRect = () => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const videoAR = vw / vh;
      const containerAR = cw / ch;
      let displayW, displayH, offsetX, offsetY;
      if (videoAR > containerAR) {
        // Video wider than container → pillarbox (black top/bottom)
        displayW = cw;
        displayH = cw / videoAR;
        offsetX = 0;
        offsetY = (ch - displayH) / 2;
      } else {
        // Video taller → letterbox (black left/right)
        displayH = ch;
        displayW = ch * videoAR;
        offsetX = (cw - displayW) / 2;
        offsetY = 0;
      }
      setVideoDisplayRect({ left: offsetX, top: offsetY, width: displayW, height: displayH });
    };
    video.addEventListener('loadedmetadata', updateRect);
    video.addEventListener('resize', updateRect);
    const ro = new ResizeObserver(updateRect);
    ro.observe(container);
    updateRect(); // initial
    return () => {
      video.removeEventListener('loadedmetadata', updateRect);
      video.removeEventListener('resize', updateRect);
      ro.disconnect();
    };
  }, [videoSrc]);

  // Load task data if navigated with ?task=
  useEffect(() => {
    if (!taskId) {
      subtitlesLoadedRef.current = false;
      lastSavedRef.current = '';
      setPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setAspectRatio(null);
      setVideoDisplayRect(null);
      setBboxData(null);
      setSubtitles([]);
      setVideoSrc(null);
      setVoiceoverSrc(null);
      applySeparationState(null);
      return;
    }
    let cancelled = false;
    subtitlesLoadedRef.current = false;
    lastSavedRef.current = '';
    setTaskLoading(true);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAspectRatio(null);
    setVideoDisplayRect(null);
    setBboxData(null);
    setSubtitles([]);
    setVideoSrc(null);
    setVoiceoverSrc(null);
    applySeparationState(null);
    const loadTask = async () => {
      try {
        const res = await fetch(`/api/status/${taskId}`);
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          if (data.videoUrl) setVideoSrc(data.videoUrl);
          setVoiceoverSrc(data.audioUrl || null);
          applySeparationState(data.separation);
          // If extraction done, load subtitles
          if (data.status === 'extracted' || data.status === 'completed') {
            const subRes = await fetch(`/api/subtitles?taskId=${taskId}`);
            if (subRes.ok) {
              const subData = await subRes.json();
              if (subData.subtitles?.length) {
                if (cancelled) return;
                const nextSubtitles = subData.subtitles.map((s, i) => ({ id: i + 1, ...s, checked: false }));
                setSubtitles(nextSubtitles);
                setActiveSub(nextSubtitles[0]?.id || 1);
                setDuration(prev => prev > 0 ? prev : getSubtitlesDuration(nextSubtitles));
                subtitlesLoadedRef.current = true;  // Mark as loaded, enable auto-save
                lastSavedRef.current = JSON.stringify(nextSubtitles.map(s => s.translation || ''));
              }
            }
          }
          // Load YOLO bbox data
          try {
            const bboxRes = await fetch(`/api/bboxes?taskId=${taskId}`);
            if (bboxRes.ok) {
              const bboxJson = await bboxRes.json();
              if (cancelled) return;
              setBboxData(bboxJson);
              console.log(`Loaded ${bboxJson.rawBboxes?.length} bbox entries, resolution: ${bboxJson.resolution}`);
            }
          } catch (e) { console.log('No bbox data available'); }
        }
      } catch (err) { console.error('Load task error:', err); }
      if (!cancelled) setTaskLoading(false);
    };
    loadTask();
    return () => {
      cancelled = true;
    };
  }, [taskId, applySeparationState]);

  // Get current YOLO bbox based on video time (returns {left,top,width,height} in %)
  const getCurrentBbox = () => {
    if (!bboxData?.rawBboxes?.length || !bboxData?.resolution) return null;
    const [vw, vh] = bboxData.resolution;
    const entries = bboxData.rawBboxes;

    // Binary search for closest time
    let lo = 0, hi = entries.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (entries[mid].t < currentTime) lo = mid + 1;
      else hi = mid;
    }
    // Check lo and lo-1 for closest match
    let best = null;
    let bestDist = Infinity;
    for (const idx of [lo - 1, lo, lo + 1]) {
      if (idx < 0 || idx >= entries.length) continue;
      const e = entries[idx];
      if (!e.b) continue;
      const dist = Math.abs(e.t - currentTime);
      if (dist < bestDist) { bestDist = dist; best = e; }
    }
    // Increased tolerance to 2s since data is interpolated (no gaps)
    if (!best || !best.b || bestDist > 2.0) return null;
    const [x1, y1, x2, y2] = best.b;
    return {
      left: (x1 / vw) * 100,
      top: (y1 / vh) * 100,
      width: ((x2 - x1) / vw) * 100,
      height: ((y2 - y1) / vh) * 100,
    };
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(2,'0')}`;
  };

  const timeToSeconds = (t) => {
    if (!t) return 0;
    const parts = t.split(':');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    const sms = (parts[2] || '0').split(/[.,]/);
    const s = parseInt(sms[0]) || 0;
    const msStr = sms[1] || '0';
    // Normalize: "399" → 0.399, "20" → 0.20, "5" → 0.5
    const frac = parseFloat('0.' + msStr);
    return h * 3600 + m * 60 + s + frac;
  };

  const deterministicNoise = (seed) => {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  };

  const safeNumber = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const safeDuration = Math.max(duration || 0, 0.001);
  const formatPercent = (value, digits = 4) => `${Number(value.toFixed(digits))}%`;
  const formatAlpha = (value, digits = 3) => Number(value.toFixed(digits));

  const getSubtitlesDuration = (items = subtitles) => {
    if (!items?.length) return 0;
    return items.reduce((maxEnd, item) => Math.max(maxEnd, timeToSeconds(item.end)), 0);
  };

  const toggleCheck = (id) => setSubtitles(prev => prev.map(s => s.id === id ? { ...s, checked: !s.checked } : s));
  const updateTranslation = (id, text) => setSubtitles(prev => prev.map(s => s.id === id ? { ...s, translation: text } : s));

  const deleteSub = (id) => {
    setSubtitles(prev => prev.filter(s => s.id !== id));
    if (activeSub === id) setActiveSub(subtitles[0]?.id || 1);
  };

  const addSubAfter = (id) => {
    const idx = subtitles.findIndex(s => s.id === id);
    const curr = subtitles[idx];
    const next = subtitles[idx + 1];
    const newEnd = next ? next.start : curr.end;
    const newId = Math.max(...subtitles.map(s => s.id)) + 1;
    const newSub = { id: newId, start: curr.end, end: newEnd, original: '', translation: '', checked: false };
    const copy = [...subtitles];
    copy.splice(idx + 1, 0, newSub);
    setSubtitles(copy);
    setActiveSub(newId);
  };

  const showNotif = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Auto-save subtitles to server (no notification, silent)
  const autoSaveSubtitles = useCallback(async (subsToSave) => {
    const taskId = searchParams.get('task');
    if (!taskId || !subsToSave?.length) return;
    const stateKey = JSON.stringify(subsToSave.map(s => s.translation || ''));
    if (stateKey === lastSavedRef.current) return;  // Skip if unchanged
    try {
      const res = await fetch('/api/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitles: subsToSave, taskId }),
      });
      if (res.ok) {
        lastSavedRef.current = stateKey;
        console.log('[AutoSave] Subtitles saved successfully');
      }
    } catch (err) { console.error('[AutoSave] Failed:', err); }
  }, [searchParams]);

  // Debounced auto-save when subtitles change
  useEffect(() => {
    if (!subtitlesLoadedRef.current || !subtitles.length) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveSubtitles(subtitles);
    }, 3000);  // Auto-save 3s after last change
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [subtitles, autoSaveSubtitles]);

  // Save before leaving page
  useEffect(() => {
    const handleBeforeUnload = () => {
      const taskId = searchParams.get('task');
      if (taskId && subtitles.length && subtitlesLoadedRef.current) {
        // Use sendBeacon for reliable save on page leave
        const data = JSON.stringify({ subtitles, taskId });
        navigator.sendBeacon('/api/subtitles', new Blob([data], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [subtitles, searchParams]);

  // Load content categories from prompts.json
  useEffect(() => {
    fetch('/api/prompts')
      .then(r => r.json())
      .then(data => {
        if (data.categories) setContentCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  const translateAll = async () => {
    setTranslating(true);
    showNotif('Đang dịch tất cả phụ đề...', 'info');
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitles, sourceLang: 'Tiếng Trung', targetLang: 'Tiếng Việt', engine: 'GPT 5.4', contentCategory: contentCategory || undefined }),
      });
      const data = await res.json();
      if (data.subtitles) {
        setSubtitles(data.subtitles);
        showNotif(`Đã dịch ${data.count} dòng thành công!`, 'success');
        // Auto-save translations immediately
        await autoSaveSubtitles(data.subtitles);
        showNotif(`Đã dịch ${data.count} dòng & lưu tự động!`, 'success');
      }
    } catch (err) {
      showNotif('Lỗi dịch: ' + err.message, 'error');
    }
    setTranslating(false);
  };

  const retranslateOne = async (id) => {
    const sub = subtitles.find(s => s.id === id);
    if (!sub) return;
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitles: [sub], sourceLang: 'Tiếng Trung', targetLang: 'Tiếng Việt', engine: 'GPT 5.4', contentCategory: contentCategory || undefined }),
      });
      const data = await res.json();
      if (data.subtitles?.[0]) {
        const updated = subtitles.map(s => s.id === id ? { ...s, translation: data.subtitles[0].translation } : s);
        setSubtitles(updated);
        showNotif('Đã dịch lại dòng #' + id, 'success');
        // Auto-save after retranslate
        await autoSaveSubtitles(updated);
      }
    } catch (err) { showNotif('Lỗi dịch lại', 'error'); }
  };

  const saveSubtitles = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitles, taskId: searchParams.get('task') }),
      });
      if (res.ok) showNotif('Đã lưu phụ đề!', 'success');
      else showNotif('Lỗi lưu', 'error');
    } catch (err) { showNotif('Lỗi lưu: ' + err.message, 'error'); }
    setSaving(false);
  };

  // ── Export SRT ──
  const exportSRT = (useTranslation = false) => {
    const srtContent = subtitles.map((s, i) => {
      const start = (s.start || '00:00:00.00').replace('.', ',') + (s.start?.split('.')[1]?.length === 2 ? '0' : '');
      const end = (s.end || '00:00:00.00').replace('.', ',') + (s.end?.split('.')[1]?.length === 2 ? '0' : '');
      const text = useTranslation ? (s.translation || s.original || '') : (s.original || '');
      return `${i + 1}\n${start} --> ${end}\n${text}\n`;
    }).join('\n');
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = useTranslation ? 'subtitles_vi.srt' : 'subtitles_original.srt';
    a.click();
    URL.revokeObjectURL(url);
    showNotif(`Đã xuất file ${useTranslation ? 'phụ đề dịch' : 'phụ đề gốc'} .SRT!`, 'success');
  };

  // ── Export ASS ──
  const exportASS = () => {
    let ass = `[Script Info]\nTitle: Subtitles\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,${settings.fontFamily || 'Arial'},${fontSize || 48},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,2,10,10,30,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
    subtitles.forEach(s => {
      const start = (s.start || '0:00:00.00').replace(',', '.');
      const end = (s.end || '0:00:00.00').replace(',', '.');
      const text = s.translation || s.original || '';
      ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text.replace(/\n/g, '\\N')}\n`;
    });
    const blob = new Blob([ass], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.ass';
    a.click();
    URL.revokeObjectURL(url);
    showNotif('Đã xuất file .ASS!', 'success');
  };

  // ── Import SRT ──
  const importSRT = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.srt,.ass,.txt';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const blocks = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split(/\n\n+/);
      const parsed = blocks.map(block => {
        const lines = block.trim().split('\n');
        if (lines.length < 3) return null;
        const tc = lines[1]?.match(/(\d{2}:\d{2}:\d{2}[,.]\d{2,3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{2,3})/);
        if (!tc) return null;
        const start = tc[1].replace(',', '.');
        const end = tc[2].replace(',', '.');
        const original = lines.slice(2).join('\n').trim();
        return { start, end, original, translation: original, checked: false };
      }).filter(Boolean).map((s, i) => ({ ...s, id: i + 1 }));
      if (parsed.length) {
        setSubtitles(parsed);
        showNotif(`Đã nhập ${parsed.length} dòng phụ đề từ ${file.name}`, 'success');
      } else {
        showNotif('Không thể phân tích file phụ đề', 'error');
      }
    };
    input.click();
  };

  // Video player logic
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTime = () => {
      setCurrentTime(vid.currentTime);
      // Auto-sync active sub
      const active = subtitles.find(s => {
        const start = timeToSeconds(s.start);
        const end = timeToSeconds(s.end);
        return vid.currentTime >= start && vid.currentTime < end;
      });
      if (active) {
        if (active.id !== activeSub) setActiveSub(active.id);
      } else {
        setActiveSub(null); // No subtitle at this time
      }
    };
    const onDur = () => {
      if (Number.isFinite(vid.duration) && vid.duration > 0) {
        setDuration(vid.duration);
      } else {
        const subtitleDuration = getSubtitlesDuration();
        setDuration(subtitleDuration || 0);
      }
      // Auto-set aspect ratio from video dimensions so blur overlay positions correctly
      if (vid.videoWidth && vid.videoHeight && !aspectRatio) {
        setAspectRatio(`${vid.videoWidth}/${vid.videoHeight}`);
      }
    };
    const onEnd = () => setPlaying(false);
    const onSeek = () => {
      if (bgmRef.current) bgmRef.current.currentTime = vid.currentTime;
      if (vocalsRef.current) vocalsRef.current.currentTime = vid.currentTime;
      if (voiceoverRef.current) voiceoverRef.current.currentTime = vid.currentTime;
    };
    vid.addEventListener('timeupdate', onTime);
    vid.addEventListener('loadedmetadata', onDur);
    vid.addEventListener('durationchange', onDur);
    vid.addEventListener('ended', onEnd);
    vid.addEventListener('seeked', onSeek);
    vid.addEventListener('seeking', onSeek);
    onDur();
    return () => {
      vid.removeEventListener('timeupdate', onTime);
      vid.removeEventListener('loadedmetadata', onDur);
      vid.removeEventListener('durationchange', onDur);
      vid.removeEventListener('ended', onEnd);
      vid.removeEventListener('seeked', onSeek);
      vid.removeEventListener('seeking', onSeek);
    };
  }, [subtitles, activeSub, videoSrc, aspectRatio]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoSrc) return;
    setPlaying(false);
    setCurrentTime(0);
    setVideoDisplayRect(null);
    try {
      vid.pause();
      vid.currentTime = 0;
    } catch {}
    vid.load();
  }, [videoSrc]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !videoSrc) return;
    if (playing) {
      vid.play().catch(() => {});
      if (bgmRef.current) bgmRef.current.play().catch(() => {});
      if (vocalsRef.current) vocalsRef.current.play().catch(() => {});
      if (voiceoverRef.current) voiceoverRef.current.play().catch(() => {});
    } else {
      vid.pause();
      if (bgmRef.current) bgmRef.current.pause();
      if (vocalsRef.current) vocalsRef.current.pause();
      if (voiceoverRef.current) voiceoverRef.current.pause();
    }
  }, [playing, videoSrc]);

  useEffect(() => {
    // Unified volume/mute handling — single source of truth
    const vid = videoRef.current;
    if (vid) {
      if (muteOriginal) {
        vid.muted = true;
      } else {
        vid.muted = false;
        if (enableSeparationMix && (separatedInstrumentalSrc || separatedVocalsSrc)) {
          vid.volume = 0; // Silence main video track, separated tracks handle audio
        } else {
          vid.volume = volume / 100;
        }
      }
    }
    if (bgmRef.current) bgmRef.current.volume = bgmVolume / 100;
    if (vocalsRef.current) vocalsRef.current.volume = vocalVolume / 100;
    if (voiceoverRef.current) voiceoverRef.current.volume = voiceoverVolume / 100;
  }, [volume, bgmVolume, vocalVolume, voiceoverVolume, muteOriginal, enableSeparationMix, separatedInstrumentalSrc, separatedVocalsSrc]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); setPlaying(p => !p); }
      if (e.code === 'ArrowLeft') { e.preventDefault(); const vid = videoRef.current; if (vid) vid.currentTime = Math.max(0, vid.currentTime - 5); }
      if (e.code === 'ArrowRight') { e.preventDefault(); const vid = videoRef.current; if (vid) vid.currentTime = Math.min(duration, vid.currentTime + 5); }
      if (e.ctrlKey && e.code === 'KeyS') { e.preventDefault(); saveSubtitles(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [duration]);

  // Auto-scroll subtitle list
  useEffect(() => {
    if (!subListRef.current || !(settings.autoScroll ?? true)) return;
    const el = subListRef.current.querySelector(`[data-sub-id="${activeSub}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeSub, settings.autoScroll]);

  const handleUploadComplete = (data) => {
    if (data?.videoUrl) setVideoSrc(data.videoUrl);
    setVoiceoverSrc(data?.audioUrl || null);
    applySeparationState(null);
    if (data?.subtitles) {
      setSubtitles(data.subtitles.map((s, i) => ({ id: i + 1, ...s, checked: false })));
    }
  };

  const handleSeparateAudio = async (force = false) => {
    if (!taskId) {
      showNotif('Hay mo mot task da luu de tach audio va giu ket qua theo tien trinh.', 'error');
      return;
    }

    try {
      setSeparatingAudio(true);
      setSeparationStatus('processing');
      setSeparationProgress((prev) => (prev > 0 && !force ? prev : 3));
      setSeparationStatusMsg('Dang gui yeu cau tach audio...');

      const res = await fetch('/api/audio-separation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          profile: separationProfile,
          force,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Khong the tach audio');
      }

      if (data.status === 'completed') {
        applySeparationState({
          status: 'completed',
          progress: 100,
          message: data.message || 'Audio separation completed.',
          profile: separationProfile,
          vocalsUrl: data.vocalsUrl || null,
          instrumentalUrl: data.instrumentalUrl || null,
        });
        showNotif(data.cached ? 'Da nap lai stem da luu cho task nay.' : 'Tach audio hoan thanh.', 'success');
        return;
      }

      setSeparationStatus(data.status || 'processing');
      setSeparationStatusMsg(data.message || 'Dang tach vocals va instrumental...');
      showNotif('Da bat dau tach audio AI.', 'info');
    } catch (err) {
      setSeparatingAudio(false);
      setSeparationStatus('error');
      setSeparationProgress(0);
      setSeparationStatusMsg(err.message);
      showNotif(`Loi tach audio: ${err.message}`, 'error');
    }
  };

  // NOTE: mute/volume/voiceoverVolume are all handled by the unified effect above (line ~610).

  useEffect(() => {
    const vo = voiceoverRef.current;
    const vid = videoRef.current;
    if (!vo || !vid || !voiceoverSrc) return;
    const syncVoiceover = () => { if (Math.abs(vo.currentTime - vid.currentTime) > 0.3) vo.currentTime = vid.currentTime; };
    vid.addEventListener('seeked', syncVoiceover);
    if (playing) { vo.play().catch(() => {}); } else { vo.pause(); }
    return () => vid.removeEventListener('seeked', syncVoiceover);
  }, [playing, voiceoverSrc]);

  useEffect(() => {
    if (!taskId || !separatingAudio) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/audio-separation?taskId=${taskId}`);
        if (!res.ok) return;

        const data = await res.json();
        applySeparationState(data);

        if (data.status === 'completed') {
          clearInterval(interval);
          showNotif('Tach audio hoan thanh. Export co the dung instrumental da tach.', 'success');
        } else if (data.status === 'error') {
          clearInterval(interval);
          showNotif(data.message || 'Tach audio that bai.', 'error');
        }
      } catch (err) {
        // Keep polling until the next tick.
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [taskId, separatingAudio, applySeparationState]);

  // Logo drag handlers
  const handleLogoDragStart = (e) => {
    e.preventDefault();
    const container = videoContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    logoDragOffset.current = { x: clientX - rect.left - logoPos.x, y: clientY - rect.top - logoPos.y };
    setLogoDragging(true);
  };

  useEffect(() => {
    if (!logoDragging) return;
    const handleMove = (e) => {
      const container = videoContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setLogoPos({
        x: Math.max(0, Math.min(rect.width - logoSize, clientX - rect.left - logoDragOffset.current.x)),
        y: Math.max(0, Math.min(rect.height - logoSize, clientY - rect.top - logoDragOffset.current.y)),
      });
    };
    const handleUp = () => setLogoDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); window.removeEventListener('touchmove', handleMove); window.removeEventListener('touchend', handleUp); };
  }, [logoDragging, logoSize]);

  const handleLogoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setLogoSrc(url);
        showNotif('Logo đã được thêm!', 'success');
      }
    };
    input.click();
  };

  const seekTo = (time) => {
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  const handleTimelineClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seekTo(pct * duration);
  };

  const togglePanel = (panel) => setActivePanel(prev => prev === panel ? null : panel);

  // Save subtitles before navigating away (client-side nav doesn't trigger beforeunload)
  const navigateWithSave = useCallback(async (path) => {
    if (subtitles.length && subtitlesLoadedRef.current) {
      await autoSaveSubtitles(subtitles);
    }
    router.push(path);
  }, [subtitles, autoSaveSubtitles, router]);

  // Sidebar click handlers
  const sidebarItems = [
    { icon: 'cloud_upload', label: t('toolbar_export'), id: 'publish', onClick: () => setShowExport(true) },
    { icon: 'add', label: t('toolbar_upload'), id: 'new', onClick: () => setShowUpload(true) },
    { icon: 'music_note', label: t('toolbar_dubbing'), id: 'dubbing', onClick: () => setShowDubbing(true) },
    { icon: 'movie_filter', label: 'CAPCUT\nEFFECTS', id: 'capcut', onClick: () => setShowCapCut(true) },
    { icon: 'list_alt', label: 'PROGRESS', id: 'progress', onClick: () => navigateWithSave('/dashboard/progress') },
    { icon: 'settings', label: 'SETTINGS', id: 'settings', onClick: () => navigateWithSave('/dashboard/settings') },
    { icon: 'volume_up', label: t('sidebar_audio'), id: 'audio', onClick: () => togglePanel('audio') },
    { icon: 'blur_on', label: t('sidebar_blur') + '\nHARDSUB', id: 'blur', onClick: () => togglePanel('blur') },
    { icon: 'crop', label: t('sidebar_frame') + ' &\nLOGO', id: 'frame', onClick: () => togglePanel('frame') },
    { icon: 'subtitles', label: t('sidebar_subtitle'), id: 'subtitle', onClick: () => togglePanel('subtitle') },
    { icon: 'person', label: t('sidebar_user'), id: 'user', onClick: () => togglePanel('user') },
    { icon: 'help', label: t('sidebar_help'), id: 'help', onClick: () => togglePanel('help') },
  ];

  const safeDurationValue = duration > 0 ? duration : 1;
  const progress = (currentTime / safeDurationValue) * 100;
  const currentSub = subtitles.find(s => s.id === activeSub);
  // Only show subtitle overlay when currentTime is within the active sub's range
  const isSubVisible = currentSub && currentTime >= timeToSeconds(currentSub.start) && currentTime < timeToSeconds(currentSub.end);
  const subtitleFontPx = Math.max(fontSize / 5, 14);
  const subtitleBoxRadius = blurEnabled && whiteSubBg ? Math.max(14, Math.round(subtitleFontPx * 0.75)) : 10;
  const subtitleBoxPadX = blurEnabled && whiteSubBg ? Math.max(18, Math.round(subtitleFontPx * 0.95)) : 16;
  const subtitleBoxPadY = blurEnabled && whiteSubBg ? Math.max(10, Math.round(subtitleFontPx * 0.5)) : 8;

  // Get subtitle style from settings
  const subStyle = {
    fontFamily: settings.fontFamily || 'Inter',
    fontWeight: (settings.fontStyle === 'In Đậm' || settings.fontStyle === 'In Đậm Nghiêng') ? '700' : '400',
    fontStyle: (settings.fontStyle === 'Nghiêng' || settings.fontStyle === 'In Đậm Nghiêng') ? 'italic' : 'normal',
    color: settings.textColor || '#ffffff',
    opacity: (settings.textOpacity ?? 100) / 100,
    WebkitTextStroke: settings.borderSize ? `${settings.borderSize}px rgba(0,0,0,0.8)` : undefined,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden select-none" style={{ background: '#0d1117', fontFamily: "'Inter', sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Be+Vietnam+Pro:wght@400;500;700&display=swap" />

      {/* LEFT TOOL BAR */}
      <div className="w-[42px] flex flex-col items-center py-2 gap-0.5 shrink-0" style={{ background: '#161b22' }}>
        {leftTools.map((tool) => (
          <button key={tool.id} title={tool.label}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${activeTool === tool.id ? 'text-[#62d6ed] bg-[#62d6ed]/10' : 'text-white/40 hover:text-white/70 hover:bg-white/5'} ${tool.id === 'translate' && translating ? 'animate-pulse text-yellow-400' : ''}`}
            onClick={() => {
              setActiveTool(tool.id);
              if (tool.id === 'add') addSubAfter(activeSub);
              if (tool.id === 'export') setShowExport(true);
              if (tool.id === 'translate') translateAll();
              if (tool.id === 'copy') saveSubtitles();
              if (tool.id === 'blur') { setBlurEnabled(e => !e); togglePanel('blur'); }
            }}>
            <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
          </button>
        ))}
      </div>

      {/* CENTER: VIDEO + CONTROLS + TIMELINE */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* VIDEO PLAYER */}
        <div ref={videoContainerRef} className="flex-1 relative bg-black flex items-center justify-center min-h-0 overflow-hidden"
          style={aspectRatio ? { aspectRatio, maxHeight: '100%', maxWidth: '100%', margin: 'auto' } : {}}>
          {/* Frame border top */}
          {frameBorderTop && (
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center"
              style={{ background: frameBorderColor, height: `${frameBorderHeight}px` }}>
              <span style={{ color: frameTextColor, fontFamily: frameFont, fontSize: `${Math.max(frameBorderHeight * 0.5, 10)}px`, fontWeight: 700, letterSpacing: '0.5px' }}>
                {frameBorderTop.split('**').map((part, i) =>
                  i % 2 === 1
                    ? <span key={i} style={{ color: frameHighlightColor, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{part}</span>
                    : <span key={i}>{part}</span>
                )}
              </span>
            </div>
          )}
          {/* Frame border bottom */}
          {frameBorderBottom && (
            <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center"
              style={{ background: frameBorderColor, height: `${frameBorderHeight}px` }}>
              <span style={{ color: frameTextColor, fontFamily: frameFont, fontSize: `${Math.max(frameBorderHeight * 0.5, 10)}px`, fontWeight: 700, letterSpacing: '0.5px' }}>
                {frameBorderBottom.split('**').map((part, i) =>
                  i % 2 === 1
                    ? <span key={i} style={{ color: frameHighlightColor, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{part}</span>
                    : <span key={i}>{part}</span>
                )}
              </span>
            </div>
          )}
          {videoSrc ? (
            <video key={videoSrc} ref={videoRef} src={videoSrc} className="w-full h-full object-contain" onClick={() => setPlaying(p => !p)} playsInline preload="metadata" />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0020 0%, #1a0040 30%, #2d0060 60%, #0a0020 100%)' }}>
              <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(180,50,255,0.4) 0%, rgba(100,20,200,0.2) 30%, transparent 70%)' }} />
              <div className="absolute w-64 h-64 rounded-full animate-pulse" style={{ background: 'radial-gradient(circle, rgba(255,100,255,0.6) 0%, rgba(100,50,255,0.3) 40%, transparent 70%)', filter: 'blur(30px)' }} />
              <p className="relative z-10 text-white/30 text-sm">Chưa có video. Tải video lên để bắt đầu.</p>
            </div>
          )}
          {/* Logo Overlay - draggable */}
          {logoSrc && (
            <img src={logoSrc} alt="Logo" className="absolute z-30 cursor-grab active:cursor-grabbing"
              style={{ left: logoPos.x, top: logoPos.y, width: logoSize, height: 'auto', userSelect: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
              onMouseDown={handleLogoDragStart} onTouchStart={handleLogoDragStart} draggable={false} />
          )}
          {/* Voiceover audio element */}
          {voiceoverSrc && <audio ref={voiceoverRef} src={voiceoverSrc} preload="auto" />}
          {/* Separated audio elements - always rendered so playback works even when audio panel is closed */}
          {separatedInstrumentalSrc && <audio ref={bgmRef} src={separatedInstrumentalSrc} preload="auto" />}
          {separatedVocalsSrc && <audio ref={vocalsRef} src={separatedVocalsSrc} preload="auto" />}

          {/* VIDEO OVERLAY WRAPPER - matches actual video display area (handles object-contain letterboxing) */}
          {videoDisplayRect && (
            <div className="absolute z-15 pointer-events-none" style={{
              left: videoDisplayRect.left,
              top: videoDisplayRect.top,
              width: videoDisplayRect.width,
              height: videoDisplayRect.height,
            }}>

              {/* BLUR HARDSUB - Manual mode */}
              {blurEnabled && blurMode === 'manual' && (
                <div className="absolute pointer-events-none" style={{
                  [blurRegion === 'top' ? 'top' : 'bottom']: '0',
                  left: `${(100 - blurWidth) / 2}%`,
                  width: `${blurWidth}%`,
                  height: `${blurHeight}%`,
                  backdropFilter: `blur(${blurIntensity}px)`,
                  WebkitBackdropFilter: `blur(${blurIntensity}px)`,
                  background: `rgba(200,200,200,0.15)`,
                  border: '2px dashed rgba(255,80,80,0.6)',
                }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-red-400/60 text-[10px] font-bold uppercase tracking-widest bg-black/30 px-2 py-0.5 rounded">BLUR ZONE</span>
                  </div>
                </div>
              )}

              {/* BLUR HARDSUB - YOLO mode (per-frame bbox) */}
              {blurEnabled && blurMode === 'yolo' && (() => {
                const bbox = getCurrentBbox();
                if (!bbox) return null;
                return (
                  <div className="absolute pointer-events-none" style={{
                    left: `${bbox.left}%`,
                    top: `${bbox.top}%`,
                    width: `${bbox.width}%`,
                    height: `${bbox.height}%`,
                    backdropFilter: `blur(${blurIntensity}px)`,
                    WebkitBackdropFilter: `blur(${blurIntensity}px)`,
                    background: `rgba(200,200,200,0.15)`,
                    border: '2px dashed rgba(255,80,80,0.8)',
                    transition: 'all 0.1s ease-out',
                  }}>
                    <div className="absolute -top-4 left-0 flex items-center gap-1">
                      <span className="text-red-400 text-[8px] font-bold bg-black/50 px-1 rounded">AI</span>
                      <span className="text-red-300/60 text-[8px] bg-black/30 px-1 rounded">{bbox.width.toFixed(0)}×{bbox.height.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })()}

              {/* Subtitle Overlay */}
              {isSubVisible && currentSub && (() => {
                let subPosition = {};
                if (blurEnabled && blurMode === 'yolo') {
                  const bbox = getCurrentBbox();
                  if (bbox) {
                    subPosition = {
                      left: `${bbox.left + bbox.width / 2}%`,
                      top: `${bbox.top + bbox.height / 2}%`,
                      transform: 'translate(-50%, -50%)',
                    };
                  } else {
                    subPosition = { left: '50%', bottom: '40px', transform: 'translateX(-50%)' };
                  }
                } else if (blurEnabled && blurMode === 'manual') {
                  if (blurRegion === 'bottom') {
                    subPosition = { left: '50%', bottom: `${blurHeight / 2}%`, transform: 'translate(-50%, 50%)' };
                  } else {
                    subPosition = { left: '50%', top: `${blurHeight / 2}%`, transform: 'translate(-50%, -50%)' };
                  }
                } else {
                  subPosition = { left: '50%', bottom: '40px', transform: 'translateX(-50%)' };
                }
                return (
                  <div className="absolute z-20 pointer-events-auto" style={{...subPosition, maxWidth: '90%'}}>
                    <div style={{
                      padding: `${subtitleBoxPadY}px ${subtitleBoxPadX}px`,
                      borderRadius: `${subtitleBoxRadius}px`,
                      background: blurEnabled && whiteSubBg
                        ? `${whiteSubBgColor}${Math.round(whiteSubBgOpacity * 2.55).toString(16).padStart(2, '0')}`
                        : settings.bgColor ? `${settings.bgColor}80` : 'rgba(0,0,0,0.5)',
                      border: blurEnabled && whiteSubBg ? 'none' : '2px solid #f59e0b',
                      boxShadow: blurEnabled && whiteSubBg ? '0 10px 28px rgba(0,0,0,0.22)' : 'none',
                    }}>
                      <p className="text-center" style={{
                        ...(blurEnabled && whiteSubBg ? {
                          fontFamily: settings.fontFamily || 'Inter',
                          fontWeight: '700',
                          color: whiteSubTextColor || '#000000',
                        } : subStyle),
                        fontSize: `${subtitleFontPx}px`,
                        transform: `rotate(${textAngle}deg)`,
                        textShadow: blurEnabled && whiteSubBg ? 'none' : '2px 2px 4px rgba(0,0,0,0.8)',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'normal',
                        lineHeight: 1.35,
                      }}>
                        {currentSub.translation || currentSub.original || ''}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* VIDEO CONTROLS */}
        <div className="px-4 py-2 flex items-center gap-3" style={{ background: '#161b22' }}>
          <span className="text-white/50 text-xs font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
          <button className="text-white/60 hover:text-white transition-colors" onClick={() => setPlaying(!playing)}>
            <span className="material-symbols-outlined text-2xl">{playing ? 'pause' : 'play_arrow'}</span>
          </button>
          <button className="text-[#62d6ed] text-xs font-bold hover:text-[#a4eeff] transition-colors">T</button>
          {/* Original audio volume */}
          <div className="relative flex items-center gap-1">
            <button className={`transition-colors ${muteOriginal ? 'text-red-400' : 'text-white/60 hover:text-white'}`} onClick={() => setMuteOriginal(!muteOriginal)} title={muteOriginal ? 'Bật âm thanh gốc' : 'Tắt âm thanh gốc'}>
              <span className="material-symbols-outlined text-xl">{muteOriginal ? 'volume_off' : 'volume_up'}</span>
            </button>
            <input type="range" min="0" max="100" value={muteOriginal ? 0 : volume} onChange={(e) => { setVolume(parseInt(e.target.value)); if (parseInt(e.target.value) > 0) setMuteOriginal(false); }} className="w-16 accent-white" title="Âm lượng gốc" />
          </div>
          {/* Voiceover volume */}
          {voiceoverSrc && (
            <div className="flex items-center gap-1 ml-1 px-2 py-1 rounded-md" style={{ background: 'rgba(139,92,246,0.15)' }}>
              <span className="material-symbols-outlined text-purple-400 text-base">record_voice_over</span>
              <input type="range" min="0" max="100" value={voiceoverVolume} onChange={(e) => setVoiceoverVolume(parseInt(e.target.value))} className="w-16 accent-purple-400" title="Âm lượng lồng tiếng" />
              <span className="text-purple-300/60 text-[10px] w-6">{voiceoverVolume}%</span>
            </div>
          )}
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
            <button key={style.id}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${activeStyle === style.id ? 'ring-2 ring-[#62d6ed] ring-offset-1 ring-offset-[#161b22]' : 'hover:opacity-80'}`}
              style={{ background: style.bg, color: style.color, border: style.border || 'none', fontWeight: style.fontWeight || '400', textShadow: style.textShadow || 'none', minWidth: '42px' }}
              onClick={() => {
                setActiveStyle(style.id);
                // Apply style preset to settings
                setSettings(prev => ({
                  ...prev,
                  textColor: style.color || '#ffffff',
                  bgColor: style.bg === 'transparent' ? '' : (style.bg || ''),
                  fontStyle: style.fontWeight === '700' ? 'In Đậm' : 'Thường',
                }));
              }}>
              {style.label}
            </button>
          ))}
        </div>

        {/* TIMELINE */}
        <div className="relative cursor-pointer select-none" style={{ background: '#0d1117', borderTop: '1px solid rgba(255,255,255,0.08)' }} onClick={handleTimelineClick}>
          {/* Dynamic time markers based on actual duration */}
          <div className="flex items-center px-2 py-1 text-[9px] text-white/25 font-mono gap-0 overflow-hidden">
            {(() => {
              const markerCount = 13;
              const displayDuration = duration > 0 ? duration : 60;
              const interval = displayDuration / (markerCount - 1);
              return Array.from({ length: markerCount }, (_, i) => {
                const t = i * interval;
                const h = Math.floor(t / 3600);
                const m = Math.floor((t % 3600) / 60);
                const s = Math.floor(t % 60);
                return (
                  <span key={i} className="flex-1 text-center">{`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}</span>
                );
              });
            })()}
          </div>
          
          {/* Tracks Wrapper (mx-2 allows aligning everything perfectly) */}
          <div className="relative mx-2 mb-2">
            {/* Subtitle blocks on timeline */}
            <div className="relative h-7 flex gap-0.5 overflow-hidden rounded mb-1 bg-white/5">
              {subtitles.map((sub) => {
                const startSec = timeToSeconds(sub.start);
                const endSec = timeToSeconds(sub.end);
                const leftPct = safeNumber((startSec / safeDuration) * 100);
                const widthPct = safeNumber(((endSec - startSec) / safeDuration) * 100);
                return (
                  <div key={sub.id}
                    className={`absolute h-full rounded-sm flex items-center justify-center text-[8px] text-white font-medium overflow-hidden cursor-pointer whitespace-nowrap px-1 transition-colors ${activeSub === sub.id ? 'bg-orange-500' : 'bg-orange-600/60 hover:bg-orange-500/80'}`}
                    style={{ left: formatPercent(leftPct), width: formatPercent(Math.max(widthPct, 0.5)) }}
                    onClick={(e) => { e.stopPropagation(); setActiveSub(sub.id); seekTo(startSec); }}
                    title={`${sub.original}\n${sub.start} → ${sub.end}`}>
                    {widthPct > 3 ? sub.original.slice(0, Math.floor(widthPct / 2)) : ''}
                  </div>
                );
              })}
            </div>
            
            {/* Waveform placeholder */}
            <div className="h-8 rounded overflow-hidden relative" style={{ background: '#0a1628' }}>
              <div className="absolute inset-0 flex items-end justify-around gap-px px-1">
                {Array.from({ length: 80 }, (_, i) => {
                  const h = 15 + Math.sin(i * 0.3) * 10 + deterministicNoise(i + 1) * 8;
                  const alpha = formatAlpha(0.3 + deterministicNoise(i + 1000) * 0.4);
                  return <div key={i} className="flex-1 rounded-t-sm" style={{ height: formatPercent(h), backgroundColor: `rgba(59,130,246,${alpha})`, minWidth: '2px' }} />;
                })}
              </div>
              <div className="absolute left-2 top-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-blue-400/60 text-xs">music_note</span>
              </div>
            </div>

            {/* Global Playhead */}
            <div className="absolute top-[-28px] bottom-[-4px] w-[2px] bg-red-500 z-10 pointer-events-none" style={{ left: formatPercent(progress), marginLeft: '-1px' }}>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: SUBTITLES */}
      <div className="w-[380px] flex flex-col shrink-0" style={{ background: '#161b22', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-white/60 text-xs font-mono">Toàn bộ: 0:00s - {formatTime(duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-white/30 hover:text-white/60 transition-colors"><span className="material-symbols-outlined text-lg">undo</span></button>
            <button className="text-white/30 hover:text-white/60 transition-colors"><span className="material-symbols-outlined text-lg">redo</span></button>
            <button className="text-white/30 hover:text-white/60 transition-colors" onClick={() => setShowUpload(true)}><span className="material-symbols-outlined text-lg">cloud_upload</span></button>
          </div>
        </div>
        <div ref={subListRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
          {subtitles.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center opacity-40">
              <span className="material-symbols-outlined text-4xl mb-3">subtitles_off</span>
              <p className="text-sm font-semibold">Chưa có phụ đề</p>
              <p className="text-xs mt-1">Vui lòng tải video và chờ hệ thống trích xuất tự động.</p>
            </div>
          )}
          {subtitles.map((sub) => (
            <div key={sub.id} data-sub-id={sub.id}
              className={`px-4 py-3 cursor-pointer transition-colors ${activeSub === sub.id ? 'bg-[#1f2937]' : 'hover:bg-white/[0.02]'}`}
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onClick={() => { setActiveSub(sub.id); seekTo(timeToSeconds(sub.start)); }}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-white/40 text-xs leading-relaxed flex-1">{sub.original}</p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button className="text-white/20 hover:text-[#62d6ed] transition-colors" title="Dịch lại" onClick={(e) => { e.stopPropagation(); retranslateOne(sub.id); }}><span className="material-symbols-outlined text-base">refresh</span></button>
                  <button className="text-white/20 hover:text-red-400 transition-colors" title="Xóa" onClick={(e) => { e.stopPropagation(); deleteSub(sub.id); }}><span className="material-symbols-outlined text-base">delete</span></button>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <textarea value={sub.translation} onChange={(e) => updateTranslation(sub.id, e.target.value)}
                  className="flex-1 text-white/90 text-sm leading-relaxed resize-none rounded px-2 py-1.5 min-h-[36px] focus:outline-none focus:ring-1 focus:ring-[#62d6ed]/30"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  rows={Math.ceil(sub.translation.length / 45)} onClick={(e) => e.stopPropagation()} />
                <div className="flex flex-col items-center gap-1.5 shrink-0 pt-1">
                  <button className={`w-5 h-5 rounded flex items-center justify-center text-xs transition-all ${sub.checked ? 'bg-[#17a2b8] text-white' : 'border border-white/20 text-white/20 hover:border-white/40'}`}
                    onClick={(e) => { e.stopPropagation(); toggleCheck(sub.id); }}>
                    {sub.checked && <span className="material-symbols-outlined text-sm">check</span>}
                  </button>
                  <span className="w-4 h-4 rounded bg-white/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white/15 text-xs">drag_indicator</span>
                  </span>
                </div>
              </div>
              <p className="text-white/15 text-[10px] font-mono mt-1">{sub.start} → {sub.end}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT SETTINGS PANEL */}
      <SettingsPanel settings={settings} onSettingsChange={setSettings} />

      {/* RIGHT SIDEBAR */}
      <div className="w-[56px] flex flex-col items-center py-3 gap-0.5 shrink-0" style={{ background: '#0d1117', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        {sidebarItems.map((item, i) => (
          <button key={i} className={`w-full flex flex-col items-center py-2 px-0.5 gap-0.5 transition-colors ${activePanel === item.id ? 'text-[#62d6ed]' : 'text-white/30 hover:text-white/60'}`}
            onClick={item.onClick}>
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            <span className="text-[7px] font-semibold tracking-wider text-center leading-tight whitespace-pre-line">{item.label}</span>
          </button>
        ))}
        <div className="mt-auto">
          <span className="text-white/20 text-[7px] tracking-wider font-semibold">ENGLISH</span>
        </div>
      </div>

      {/* SIDEBAR PANELS - Cloned from vidocr.com */}
      {activePanel && (
        <div className="fixed right-[52px] top-0 bottom-0 w-[300px] z-[45] flex flex-col overflow-hidden" style={{ background: '#1a1a2e', borderLeft: '1px solid rgba(255,255,255,0.08)', boxShadow: '-4px 0 20px rgba(0,0,0,0.5)' }}>
          {/* Panel Header with emoji icon */}
          <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-2xl">{activePanel === 'audio' ? '😺' : activePanel === 'frame' ? '😺' : activePanel === 'blur' ? '🔲' : activePanel === 'subtitle' ? '😺' : activePanel === 'user' ? '👤' : '💬'}</span>
            <span className="text-white text-sm">
              {activePanel === 'audio' && t('panel_audio')}
              {activePanel === 'frame' && t('panel_frame')}
              {activePanel === 'blur' && t('panel_blur')}
              {activePanel === 'subtitle' && t('panel_subtitle')}
              {activePanel === 'user' && t('panel_user')}
              {activePanel === 'help' && t('panel_help')}
            </span>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">

            {/* ═══════ AUDIO PANEL ═══════ */}
            {activePanel === 'audio' && (
              <div className="p-4 space-y-4">
                {/* Nhập/Xuất cài đặt button */}
                <div className="relative">
                  <button className="w-full py-2.5 rounded-lg text-sm font-semibold text-white" style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                    onClick={() => setShowAudioSettingsMenu(!showAudioSettingsMenu)}>
                    {t('audio_import_settings')} <span className="ml-1">▾</span>
                  </button>
                  {showAudioSettingsMenu && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50 shadow-xl" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <button className="w-full px-4 py-2.5 text-left text-xs text-white/80 hover:bg-white/10 flex items-center gap-2 transition-colors"
                        onClick={() => { importAudioSettings(); setShowAudioSettingsMenu(false); }}>
                        <span className="material-symbols-outlined text-base">upload</span> {t('audio_import_json')}
                      </button>
                      <button className="w-full px-4 py-2.5 text-left text-xs text-white/80 hover:bg-white/10 flex items-center gap-2 transition-colors"
                        onClick={() => { exportAudioSettings(); setShowAudioSettingsMenu(false); }}>
                        <span className="material-symbols-outlined text-base">download</span> {t('audio_export_json')}
                      </button>
                      <button className="w-full px-4 py-2.5 text-left text-xs text-white/80 hover:bg-white/10 flex items-center gap-2 transition-colors"
                        onClick={() => {
                          setAudioSyncEnabled(true); setKeepOriginalAudio(true); setMergeTime(3); setDurci(1.5);
                          setVoiceoverLang('Tiếng Việt'); setEnableSeparationMix(true); setBgmVolume(20); setVocalVolume(0); setVoiceoverVolume(100);
                          setVoiceChannels([{ ...defaultVoiceChannel }, { ...defaultVoiceChannel, speed: 2, rate: 1 }, { ...defaultVoiceChannel, speed: 2, rate: 1 }]);
                          setShowAudioSettingsMenu(false);
                          showNotif(t('audio_restored_msg'), 'success');
                        }}>
                        <span className="material-symbols-outlined text-base">restart_alt</span> {t('audio_restore_default')}
                      </button>
                    </div>
                  )}
                </div>

                {/* AI Stem Separation */}
                <div className="rounded-xl p-4 space-y-3" style={{ background: '#0d1117', border: '1px solid rgba(98,214,237,0.14)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white/85 text-sm font-semibold">{t('audio_stem_separation')}</p>
                      <p className="text-white/35 text-[11px] leading-relaxed">
                        {t('audio_stem_desc')}
                      </p>
                    </div>
                    <button
                      className="px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0891b2, #2563eb)' }}
                      onClick={() => handleSeparateAudio(separationStatus === 'completed')}
                      disabled={!taskId || !videoSrc || separatingAudio}
                    >
                      {separatingAudio ? t('audio_separating') : separationStatus === 'completed' ? t('audio_reseparate') : t('audio_separate')}
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/55 text-[11px] uppercase tracking-wider">Model</span>
                      <span className="text-cyan-300/70 text-[10px]">{separationStatus === 'completed' ? 'Saved with task' : 'Reusable after complete'}</span>
                    </div>
                    <select
                      value={separationProfile}
                      onChange={(e) => setSeparationProfile(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-xs text-white bg-white/5 border border-white/10 focus:outline-none"
                      disabled={separatingAudio}
                    >
                      {separationProfiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.label} - {profile.desc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(separationStatus !== 'idle' || separatedVocalsSrc || separatedInstrumentalSrc) && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/60 text-xs">{separationStatusMsg || 'Audio separation status'}</span>
                          <span className="text-white/35 text-[11px]">{separationProgress}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#161b22' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${separationProgress}%`,
                              background: separationStatus === 'error'
                                ? 'linear-gradient(90deg, #ef4444, #f97316)'
                                : 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                            }}
                          />
                        </div>
                      </div>

                      {separatedInstrumentalSrc && (
                        <div className="rounded-lg p-3" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.12)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-cyan-200 text-xs font-medium">Instrumental / background</span>
                            <span className="text-cyan-200/50 text-[10px]">Auto available in export</span>
                          </div>
                          <audio controls src={separatedInstrumentalSrc} className="w-full h-8" />
                        </div>
                      )}

                      {separatedVocalsSrc && (
                        <div className="rounded-lg p-3" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-purple-200 text-xs font-medium">Vocals reference</span>
                            <span className="text-purple-200/50 text-[10px]">Clone mode can reuse this stem</span>
                          </div>
                          <audio controls src={separatedVocalsSrc} className="w-full h-8" />
                        </div>
                      )}
                    </div>
                  )}

                  {!taskId && (
                    <p className="text-amber-300/70 text-[11px]">
                      {t('audio_need_task')}
                    </p>
                  )}
                </div>

                {/* Cân bằng video và âm thanh */}
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-xs">{t('audio_sync')}</span>
                  <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${audioSyncEnabled ? 'bg-[#62d6ed]' : 'bg-white/10'}`}
                    onClick={() => setAudioSyncEnabled(!audioSyncEnabled)}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${audioSyncEnabled ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>

                {/* Giữ âm thanh gốc khi không có lồng tiếng */}
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-xs">{t('audio_keep_original')}</span>
                  <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${keepOriginalAudio ? 'bg-[#62d6ed]' : 'bg-white/10'}`}
                    onClick={() => setKeepOriginalAudio(!keepOriginalAudio)}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${keepOriginalAudio ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>

                {/* Thời gian gộp lồng tiếng */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70 text-xs">{t('audio_merge_time')}</span>
                    <span className="text-white/50 text-xs">Trên {mergeTime}s</span>
                  </div>
                  <input type="range" min="0" max="10" value={mergeTime} step="0.1" className="w-full accent-white"
                    onChange={e => setMergeTime(parseFloat(e.target.value))} />
                </div>

                {/* Durci */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70 text-xs">{t('audio_durci')}</span>
                    <span className="text-white/50 text-xs">Durci: {durci}</span>
                  </div>
                  <input type="range" min="0" max="5" value={durci} step="0.1" className="w-full accent-white"
                    onChange={e => setDurci(parseFloat(e.target.value))} />
                </div>

                <div className="pt-2 border-t border-white/5" />

                {/* Tách nhạc và giọng nói */}
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-xs font-medium">{t('audio_separation_toggle')}</span>
                  <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${enableSeparationMix ? 'bg-[#62d6ed]' : 'bg-white/10'}`} onClick={() => setEnableSeparationMix(!enableSeparationMix)}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${enableSeparationMix ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>

                {/* Âm lượng nhạc nền */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70 text-xs">{t('audio_bgm_vol')}</span>
                    <span className="text-white/50 text-xs">Vol: {bgmVolume} %</span>
                  </div>
                  <input type="range" min="0" max="100" value={bgmVolume} onChange={e => setBgmVolume(parseInt(e.target.value))} className="w-full accent-white" />
                </div>

                {/* Âm lượng giọng gốc */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70 text-xs">{t('audio_vocal_vol')}</span>
                    <span className="text-white/50 text-xs">Vol: {vocalVolume} %</span>
                  </div>
                  <input type="range" min="0" max="100" value={vocalVolume} onChange={e => setVocalVolume(parseInt(e.target.value))} className="w-full accent-white" />
                </div>

                <div className="pt-2 border-t border-white/5" />

                {/* Ngôn ngữ lồng tiếng */}
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-xs">{t('audio_voiceover_lang')}</span>
                  <select value={voiceoverLang} onChange={e => setVoiceoverLang(e.target.value)}
                    className="bg-white/5 text-white/70 text-xs rounded px-2 py-1 border border-white/10 focus:outline-none">
                    {langOptions.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* Voice channels */}
                {voiceChannels.map((ch, idx) => (
                  <div key={idx} className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-xs font-medium">{t('audio_voiceover_channel')} {idx + 1}:</span>
                      <select value={ch.voice} onChange={e => updateVoiceChannel(idx, 'voice', e.target.value)}
                        className="bg-white/5 text-white/70 text-xs rounded px-2 py-1 border border-white/10 focus:outline-none">
                        {voiceOptions.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    {[
                      { key: 'speed', label: 'Tốc độ', max: 5, step: 0.1 },
                      { key: 'vol', label: 'Vol', max: 20, step: 1, suffix: ' Db' },
                      { key: 'pitch', label: 'Cao độ', max: 12, step: 1 },
                      { key: 'rate', label: 'Rate', max: 3, step: 0.1 },
                      { key: 'trim', label: 'Trim', max: 2, step: 0.05 },
                    ].map(ctrl => (
                      <div key={ctrl.key} className="flex items-center gap-3">
                        <input type="range" min="0" max={ctrl.max} value={ch[ctrl.key]} step={ctrl.step}
                          onChange={e => updateVoiceChannel(idx, ctrl.key, parseFloat(e.target.value))}
                          className="flex-1 accent-white" />
                        <span className="text-white/50 text-[10px] w-16 text-right">{ctrl.label}: {ch[ctrl.key]}{ctrl.suffix || ''}</span>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Âm lượng lồng tiếng bottom */}
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/70 text-xs">{t('audio_voiceover_vol')}</span>
                    <span className="text-white/50 text-xs">Vol: {voiceoverVolume}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={voiceoverVolume} onChange={e => setVoiceoverVolume(parseInt(e.target.value))} className="w-full accent-white" />
                </div>
              </div>
            )}

            {/* ═══════ BLUR HARDSUB PANEL ═══════ */}
            {activePanel === 'blur' && (
              <div className="p-4 space-y-4">
                {/* Main Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm font-medium">{t('blur_toggle')}</span>
                  <button
                    className={`w-12 h-6 rounded-full relative transition-colors ${blurEnabled ? 'bg-red-500' : 'bg-white/10'}`}
                    onClick={() => setBlurEnabled(!blurEnabled)}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${blurEnabled ? 'left-[26px]' : 'left-1'}`} />
                  </button>
                </div>

                {blurEnabled && (
                  <>
                    {/* Status badge */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <span className="material-symbols-outlined text-red-400 text-base">blur_on</span>
                      <span className="text-red-400 text-xs font-medium">{t('blur_active')}</span>
                    </div>

                    {/* Blur Mode Selector */}
                    <div className="space-y-2">
                      <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">{t('blur_mode')}</span>
                      <div className="flex gap-2">
                        <button
                          className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all border flex flex-col items-center gap-1 ${blurMode === 'manual' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-white/5 text-white/50 border-white/5 hover:bg-orange-500/10'}`}
                          onClick={() => setBlurMode('manual')}>
                          <span className="material-symbols-outlined text-sm">tune</span>
                          {t('blur_manual')}
                        </button>
                        <button
                          className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all border flex flex-col items-center gap-1 ${blurMode === 'yolo' ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-white/5 text-white/50 border-white/5 hover:bg-green-500/10'}`}
                          onClick={() => {
                            setBlurMode('yolo');
                            if (!bboxData) {
                              setBboxLoading(true);
                              fetch('/api/bboxes').then(r => r.json()).then(d => { setBboxData(d); setBboxLoading(false); }).catch(() => setBboxLoading(false));
                            }
                          }}>
                          <span className="material-symbols-outlined text-sm">smart_toy</span>
                          {t('blur_yolo')}
                        </button>
                      </div>
                    </div>

                    {/* YOLO mode info */}
                    {blurMode === 'yolo' && (
                      <div className="space-y-2">
                        {bboxLoading ? (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <span className="animate-spin text-blue-400 text-base">⏳</span>
                            <span className="text-blue-400 text-xs">{t('blur_loading')}</span>
                          </div>
                        ) : bboxData ? (
                          <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-green-400 text-xs font-bold">✓ {t('blur_yolo')} Data Loaded</span>
                            </div>
                            <div className="text-green-300/60 text-[10px] space-y-0.5">
                              <p>📐 Resolution: {bboxData.resolution?.join('×')}</p>
                              <p>📊 Bbox entries: {bboxData.rawBboxes?.length || 0}</p>
                              <p>🎬 Timeline groups: {bboxData.timelineCount || 0}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <span className="text-yellow-400 text-xs">⚠ {t('blur_no_data')}</span>
                          </div>
                        )}
                        <div className="px-3 py-2 rounded-lg bg-white/5">
                          <p className="text-white/40 text-[10px] leading-relaxed">
                            {t('blur_yolo_desc')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Manual mode controls */}
                    {blurMode === 'manual' && (
                      <>
                        {/* Blur Region */}
                        <div className="space-y-2">
                          <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">{t('blur_region')}</span>
                          <div className="flex gap-2">
                            {[{ label: 'Dưới', value: 'bottom' }, { label: 'Trên', value: 'top' }].map(r => (
                              <button key={r.value}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all border ${blurRegion === r.value ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-white/5 text-white/50 border-white/5 hover:bg-red-500/10'}`}
                                onClick={() => setBlurRegion(r.value)}>
                                {r.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Blur Height */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-white/50 text-xs">{t('blur_height')}</span>
                            <span className="text-white/40 text-xs">{blurHeight}%</span>
                          </div>
                          <input type="range" min="5" max="50" value={blurHeight} onChange={e => setBlurHeight(parseInt(e.target.value))} className="w-full accent-red-500" />
                        </div>

                        {/* Blur Width */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-white/50 text-xs">{t('blur_width')}</span>
                            <span className="text-white/40 text-xs">{blurWidth}%</span>
                          </div>
                          <input type="range" min="20" max="100" value={blurWidth} onChange={e => setBlurWidth(parseInt(e.target.value))} className="w-full accent-red-500" />
                        </div>
                      </>
                    )}

                    {/* Blur Intensity (shared for both modes) */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white/50 text-xs">{t('blur_intensity')}</span>
                        <span className="text-white/40 text-xs">{blurIntensity}px</span>
                      </div>
                      <input type="range" min="5" max="40" value={blurIntensity} onChange={e => setBlurIntensity(parseInt(e.target.value))} className="w-full accent-red-500" />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/5 pt-3 space-y-3">
                      <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">{t('blur_white_sub')}</span>

                      {/* White BG Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-white/70 text-xs">{t('blur_add_white_bg')}</span>
                        <button
                          className={`w-10 h-5 rounded-full relative transition-colors ${whiteSubBg ? 'bg-[#6366f1]' : 'bg-white/10'}`}
                          onClick={() => setWhiteSubBg(!whiteSubBg)}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${whiteSubBg ? 'left-[18px]' : 'left-0.5'}`} />
                        </button>
                      </div>

                      {whiteSubBg && (
                        <>
                          {/* Colors */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-white/50 text-[10px] block mb-1">{t('blur_text_color')}</span>
                              <div className="flex items-center gap-2">
                                <input type="color" value={whiteSubTextColor} onChange={e => setWhiteSubTextColor(e.target.value)} className="w-8 h-6 rounded cursor-pointer border-0" style={{ background: 'none' }} />
                                <span className="text-white/40 text-[10px] font-mono">{whiteSubTextColor}</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-white/50 text-[10px] block mb-1">{t('blur_bg_color')}</span>
                              <div className="flex items-center gap-2">
                                <input type="color" value={whiteSubBgColor} onChange={e => setWhiteSubBgColor(e.target.value)} className="w-8 h-6 rounded cursor-pointer border-0" style={{ background: 'none' }} />
                                <span className="text-white/40 text-[10px] font-mono">{whiteSubBgColor}</span>
                              </div>
                            </div>
                          </div>

                          {/* Opacity */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-white/50 text-xs">{t('blur_bg_opacity')}</span>
                              <span className="text-white/40 text-xs">{whiteSubBgOpacity}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={whiteSubBgOpacity} onChange={e => setWhiteSubBgOpacity(parseInt(e.target.value))} className="w-full accent-[#62d6ed]" />
                          </div>

                          {/* Preview */}
                          <div className="flex items-center justify-center py-3 rounded-lg" style={{ background: '#0a0a1a' }}>
                            <span className="px-5 py-2 text-sm font-bold" style={{
                              color: whiteSubTextColor,
                              backgroundColor: `${whiteSubBgColor}${Math.round(whiteSubBgOpacity * 2.55).toString(16).padStart(2, '0')}`,
                              borderRadius: '14px',
                            }}>
                              {t('blur_preview')}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Info */}
                    <div className="px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      <p className="text-indigo-300 text-[10px] leading-relaxed">
                        💡 Khi xuất video, FFmpeg sẽ blur vùng hardsub gốc và chèn phụ đề dịch với nền trắng lên video.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══════ FRAME & LOGO PANEL ═══════ */}
            {activePanel === 'frame' && (
              <div className="p-4 space-y-5">
                {/* Aspect Ratio Buttons */}
                <div className="flex items-center justify-center gap-3">
                  <button className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${!aspectRatio ? 'bg-[#62d6ed]/20 text-[#62d6ed]' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'}`}
                    onClick={() => setAspectRatio(null)}>
                    <span className="material-symbols-outlined text-sm">history</span>
                  </button>
                  {[{ label: '16:9', value: '16/9' }, { label: '9:16', value: '9/16' }, { label: '1:1', value: '1/1' }, { label: '4:3', value: '4/3' }].map(r => (
                    <button key={r.label} className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${aspectRatio === r.value ? 'bg-[#62d6ed]/20 text-[#62d6ed] border-[#62d6ed]/40' : 'bg-white/5 text-white/50 border-white/5 hover:bg-[#62d6ed]/10 hover:text-[#62d6ed] hover:border-[#62d6ed]/30'}`}
                      onClick={() => setAspectRatio(r.value)}>
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* THÊM LOGO */}
                <div>
                  <p className="text-white/50 text-xs font-semibold mb-3 uppercase tracking-wider">Thêm Logo</p>
                  <div className="flex items-center gap-3">
                    <button className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-[#62d6ed]/10 hover:text-[#62d6ed] hover:border-[#62d6ed]/30 transition-all text-xl"
                      onClick={handleLogoUpload}>+</button>
                    <button className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/30 transition-all text-xl"
                      onClick={() => { setLogoSrc(null); showNotif('Logo đã xóa', 'info'); }}>−</button>
                  </div>
                  {logoSrc && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                        <img src={logoSrc} alt="Logo preview" className="w-10 h-10 object-contain rounded" />
                        <span className="text-white/50 text-[10px] flex-1">Kéo thả logo trên video để đặt vị trí</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 text-[11px]">Kích thước:</span>
                        <input type="range" min="30" max="300" value={logoSize} onChange={(e) => setLogoSize(parseInt(e.target.value))} className="flex-1 accent-[#62d6ed]" />
                        <span className="text-white/40 text-[10px] w-8">{logoSize}px</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* KHUNG VIỀN */}
                <div>
                  <p className="text-white/50 text-xs font-semibold mb-3 uppercase tracking-wider">Khung viền</p>
                  <div className="space-y-3">
                    <div>
                      <span className="text-white/50 text-[11px] block mb-1">Viền trên:</span>
                      <input type="text" value={frameBorderTop} onChange={(e) => setFrameBorderTop(e.target.value)} placeholder="Nhập văn bản viền trên..."
                        className="w-full bg-white/5 text-white/70 text-xs rounded px-3 py-2 border border-white/10 focus:outline-none focus:border-[#62d6ed]/40" />
                    </div>
                    <div>
                      <span className="text-white/50 text-[11px] block mb-1">Viền dưới:</span>
                      <input type="text" value={frameBorderBottom} onChange={(e) => setFrameBorderBottom(e.target.value)} placeholder="Nhập văn bản viền dưới..."
                        className="w-full bg-white/5 text-white/70 text-xs rounded px-3 py-2 border border-white/10 focus:outline-none focus:border-[#62d6ed]/40" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-white/50 text-[11px] block mb-1">Màu viền:</span>
                        <div className="flex items-center gap-2">
                          <input type="color" value={frameBorderColor} onChange={(e) => setFrameBorderColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" style={{ background: 'none' }} />
                          <span className="text-white/40 text-[10px]">{frameBorderColor}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-white/50 text-[11px] block mb-1">Màu chữ:</span>
                        <div className="flex items-center gap-2">
                          <input type="color" value={frameTextColor} onChange={(e) => setFrameTextColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" style={{ background: 'none' }} />
                          <span className="text-white/40 text-[10px]">{frameTextColor}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-white/50 text-[11px] block mb-1">Font chữ:</span>
                        <select value={frameFont} onChange={(e) => setFrameFont(e.target.value)}
                          className="w-full bg-white/5 text-white/70 text-xs rounded px-2 py-2 border border-white/10 focus:outline-none">
                          {['Bebas', 'Roboto', 'Inter', 'Be Vietnam Pro', 'Arial', 'Montserrat'].map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <span className="text-white/50 text-[11px] block mb-1">Chiều cao: {frameBorderHeight}px</span>
                        <input type="range" min="16" max="60" value={frameBorderHeight} onChange={(e) => setFrameBorderHeight(parseInt(e.target.value))}
                          className="w-full accent-[#62d6ed]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-white/50 text-[11px] block mb-1">Màu highlight:</span>
                        <div className="flex items-center gap-2">
                          <input type="color" value={frameHighlightColor} onChange={(e) => setFrameHighlightColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" style={{ background: 'none' }} />
                          <span className="text-white/40 text-[10px]">{frameHighlightColor}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-white/20 text-[9px] mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">info</span>
                      Bọc text trong **text** để highlight. VD: Review Phim: **Luật Sư Bóng Ma**
                    </p>
                  </div>
                </div>

                {/* VIDEO REMAKER */}
                <div className="pt-2 border-t border-white/5">
                  <p className="text-white/50 text-xs font-semibold mb-3 uppercase tracking-wider">Video Remaker</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 text-[11px]">Phóng to video:</span>
                      <select className="bg-white/5 text-white/70 text-xs rounded px-2 py-1 border border-white/10">
                        <option>Không</option><option>1.1x</option><option>1.2x</option><option>1.5x</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════ SUBTITLE PANEL ═══════ */}
            {activePanel === 'subtitle' && (
              <div className="p-4 space-y-5">
                {/* DỊCH PHỤ ĐỀ */}
                <div>
                  <p className="text-white/50 text-xs font-semibold mb-3 uppercase tracking-wider">{t('subtitle_translate')}</p>
                  {/* Content category dropdown */}
                  {contentCategories.length > 0 && (
                    <div className="mb-3">
                      <label className="text-white/40 text-[11px] mb-1.5 block flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-purple-400">category</span>
                        Thể loại nội dung
                      </label>
                      <select
                        value={contentCategory}
                        onChange={e => setContentCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0d1117] border border-white/10 focus:outline-none focus:border-purple-400/40 transition-colors"
                      >
                        <option value="">Tự động (mặc định)</option>
                        {contentCategories.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button onClick={translateAll} disabled={translating}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    <span className="material-symbols-outlined text-lg">{translating ? 'hourglass_top' : 'translate'}</span>
                    {translating ? t('subtitle_translating') : t('subtitle_translate_all')}
                  </button>
                </div>

                {/* XUẤT PHỤ ĐỀ */}
                <div>
                  <p className="text-white/50 text-xs font-semibold mb-3 uppercase tracking-wider">{t('subtitle_export')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* SRT Original */}
                    <button onClick={() => exportSRT(false)} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-[#62d6ed]/30 bg-[#62d6ed]/5 hover:bg-[#62d6ed]/10 transition-all group">
                      <div className="w-12 h-12 rounded-lg bg-[#62d6ed]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#62d6ed] text-2xl">description</span>
                      </div>
                      <span className="text-[#62d6ed] text-[10px] font-semibold">{t('subtitle_export_srt_orig')}</span>
                    </button>
                    {/* SRT Translated */}
                    <button onClick={() => exportSRT(true)} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-[#62d6ed]/30 bg-[#62d6ed]/5 hover:bg-[#62d6ed]/10 transition-all group">
                      <div className="w-12 h-12 rounded-lg bg-[#62d6ed]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#62d6ed] text-2xl">description</span>
                      </div>
                      <span className="text-[#62d6ed] text-[10px] font-semibold">{t('subtitle_export_srt_trans')}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {/* ASS button */}
                    <button onClick={exportASS} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-[#62d6ed]/30 bg-[#62d6ed]/5 hover:bg-[#62d6ed]/10 transition-all group">
                      <div className="w-12 h-12 rounded-lg bg-[#62d6ed]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#62d6ed] text-2xl">description</span>
                      </div>
                      <span className="text-[#62d6ed] text-[10px] font-semibold">{t('subtitle_export_ass')}</span>
                    </button>
                    {/* SRT cân bằng */}
                    <button onClick={() => exportSRT(true)} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-[#62d6ed]/30 bg-[#62d6ed]/5 hover:bg-[#62d6ed]/10 transition-all group">
                      <div className="w-12 h-12 rounded-lg bg-[#62d6ed]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#62d6ed] text-2xl">description</span>
                      </div>
                      <span className="text-[#62d6ed] text-[10px] font-semibold text-center">{t('subtitle_export_srt_balanced')}</span>
                    </button>
                  </div>
                </div>

                {/* NHẬP PHỤ ĐỀ */}
                <div>
                  <p className="text-white/50 text-xs font-semibold mb-3 uppercase tracking-wider">{t('subtitle_import')}</p>
                  <button onClick={importSRT} className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-[#62d6ed]/30 bg-[#62d6ed]/5 hover:bg-[#62d6ed]/10 transition-all w-full max-w-[calc(50%-6px)]">
                    <div className="w-14 h-14 rounded-lg bg-[#62d6ed]/10 flex items-center justify-center">
                      <span className="text-[#62d6ed] text-3xl font-bold">CC</span>
                    </div>
                    <span className="text-[#62d6ed] text-[10px] font-semibold">{t('subtitle_import_srt')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ═══════ USER PANEL ═══════ */}
            {activePanel === 'user' && (
              <div className="p-4 space-y-3">
                {/* User actions list */}
                <button onClick={() => { setActivePanel(null); const ev = new CustomEvent('openUserModal', { detail: 'password' }); window.dispatchEvent(ev); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:bg-white/5 hover:text-white/80 transition-all text-left">
                  <span className="material-symbols-outlined text-lg text-white/30">lock</span>
                  <span className="text-xs">{t('user_change_pw')}</span>
                  <span className="material-symbols-outlined text-white/20 ml-auto text-sm">chevron_right</span>
                </button>
                <button onClick={() => { setActivePanel(null); const ev = new CustomEvent('openUserModal', { detail: 'team' }); window.dispatchEvent(ev); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:bg-white/5 hover:text-white/80 transition-all text-left">
                  <span className="material-symbols-outlined text-lg text-white/30">group</span>
                  <span className="text-xs">{t('user_team')}</span>
                  <span className="material-symbols-outlined text-white/20 ml-auto text-sm">chevron_right</span>
                </button>

                <div className="pt-2 border-t border-white/5 space-y-3">
                  <div className="flex items-center justify-between px-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg text-white/30">language</span>
                      <span className="text-white/60 text-xs">{t('user_language')}</span>
                    </div>
                    <select value={LANGUAGE_OPTIONS.find(o => o.value === lang)?.label || 'Tiếng Việt'} className="text-white/70 text-xs rounded px-2 py-1 border border-white/10 cursor-pointer" style={{ background: '#1e1e2e', color: '#e0e0e0' }} onChange={e => { const opt = LANGUAGE_OPTIONS.find(o => o.label === e.target.value); if (opt) { setLang(opt.value); showNotif(`${t('lang_changed')} ${e.target.value}`, 'success'); } }}>
                      {LANGUAGE_OPTIONS.map(o => <option key={o.value} value={o.label} style={{ background: '#1e1e2e', color: '#e0e0e0' }}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center justify-between px-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg text-white/30">cloud</span>
                      <span className="text-white/60 text-xs">{t('user_storage')}</span>
                    </div>
                    <button className="text-xs text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded hover:bg-[#f59e0b]/20 transition-colors font-medium" onClick={() => { setActivePanel(null); const ev = new CustomEvent('openUserModal', { detail: 'upgrade' }); window.dispatchEvent(ev); }}>14 Day ↗</button>
                  </div>
                  <button onClick={() => { setActivePanel(null); const ev = new CustomEvent('openUserModal', { detail: 'support' }); window.dispatchEvent(ev); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:bg-white/5 hover:text-white/80 transition-all text-left">
                    <span className="material-symbols-outlined text-lg text-white/30">mail</span>
                    <span className="text-xs">{t('user_support')}</span>
                    <span className="material-symbols-outlined text-white/20 ml-auto text-sm">chevron_right</span>
                  </button>
                  <button onClick={() => { setActivePanel(null); const ev = new CustomEvent('openUserModal', { detail: 'bug' }); window.dispatchEvent(ev); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:bg-white/5 hover:text-white/80 transition-all text-left">
                    <span className="material-symbols-outlined text-lg text-white/30">bug_report</span>
                    <span className="text-xs">{t('user_bug')}</span>
                    <span className="material-symbols-outlined text-white/20 ml-auto text-sm">chevron_right</span>
                  </button>
                  <button onClick={() => { setActivePanel(null); const ev = new CustomEvent('openUserModal', { detail: 'logout' }); window.dispatchEvent(ev); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/60 hover:bg-white/5 hover:text-red-400 transition-all text-left">
                    <span className="material-symbols-outlined text-lg text-white/30">logout</span>
                    <span className="text-xs">{t('user_logout')}</span>
                  </button>
                  <button onClick={() => { setActivePanel(null); const ev = new CustomEvent('openUserModal', { detail: 'delete_account' }); window.dispatchEvent(ev); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500/60 hover:bg-red-500/10 hover:text-red-500 transition-all text-left mt-2 border border-red-500/20">
                    <span className="material-symbols-outlined text-lg text-red-500/60">person_remove</span>
                    <span className="text-xs">{t('user_delete')}</span>
                  </button>
                </div>

                {/* Server info */}
                <div className="pt-2 border-t border-white/5 space-y-2 px-3">
                  {['Upload Server', 'Edit Server', 'Download Server'].map(s => (
                    <div key={s} className="flex items-center justify-between">
                      <span className="text-white/40 text-[11px]">{s}:</span>
                      <span className="text-white/60 text-xs">Hồ Chí Minh 09</span>
                    </div>
                  ))}
                </div>

                {/* Feedback form */}
                <div className="pt-3 border-t border-white/5">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-white/60 text-[11px] font-medium text-center mb-3">{t('user_feedback_title')}</p>
                    <div className="space-y-2 mb-3">
                      {[t('user_feedback_accuracy'), t('user_feedback_font'), t('user_feedback_timing'), t('user_feedback_tools'), t('user_feedback_more_tools')].map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/20 bg-transparent accent-[#62d6ed]" />
                          <span className="text-white/50 text-[11px] group-hover:text-white/70 transition-colors">{opt}</span>
                        </label>
                      ))}
                    </div>
                    <span className="text-white/50 text-[11px] block mb-1">{t('user_feedback_detail')}</span>
                    <textarea id="editorFeedbackText" className="w-full bg-white/5 text-white/70 text-xs rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:border-[#62d6ed]/30 resize-none" rows={2} placeholder={t('user_feedback_placeholder')} />
                    <button className="w-full mt-2 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                      onClick={async () => {
                        const btn = document.activeElement;
                        btn.textContent = '⏳ Đang gửi...';
                        btn.disabled = true;
                        await new Promise(r => setTimeout(r, 1500));
                        btn.textContent = '✅ Đã gửi!';
                        btn.style.background = '#10b981';
                        showNotif(t('user_feedback_thanks'), 'success');
                        const ta = document.getElementById('editorFeedbackText');
                        if (ta) ta.value = '';
                        setTimeout(() => { btn.textContent = 'Gửi đánh giá'; btn.style.background = 'linear-gradient(90deg, #6366f1, #8b5cf6)'; btn.disabled = false; }, 2500);
                      }}>
                      {t('user_feedback_submit')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════ SUPPORT PANEL ═══════ */}
            {activePanel === 'help' && (
              <div className="p-4 space-y-3">
                {[
                  { label: 'Điện thoại', linkText: '0867809383', color: '#10b981', href: 'tel:0867809383' },
                  { label: 'Email', linkText: 'nhat49465@gmail.com', color: '#62d6ed', href: 'mailto:nhat49465@gmail.com' },
                  { label: 'Facebook', linkText: 'Trần Đình Nhật', color: '#0084ff', href: 'https://www.facebook.com/tran.inh.nhat.986822' },
                  { label: 'Telegram', linkText: '@tlong189231', color: '#26A5E4', href: 'https://t.me/tlong189231' },
                ].map(item => (
                  <a key={item.linkText + item.label} href={item.href} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-all" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-white/60 text-xs">{item.label}</span>
                    <span className="text-xs font-medium" style={{ color: item.color }}>{item.linkText}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] animate-in">
          <div className={`px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-500/90 text-white' : notification.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-indigo-500/90 text-white'}`} style={{ backdropFilter: 'blur(8px)' }}>
            <span className="material-symbols-outlined text-lg">{notification.type === 'success' ? 'check_circle' : notification.type === 'error' ? 'error' : 'info'}</span>
            {notification.msg}
          </div>
        </div>
      )}

      {/* TRANSLATING OVERLAY */}
      {translating && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="px-8 py-6 rounded-2xl text-center" style={{ background: '#1b1b2f', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white font-semibold">{t('translating_msg')}</p>
            <p className="text-white/40 text-xs mt-1">{t('translating_wait')}</p>
          </div>
        </div>
      )}

      {/* USER MODALS (shared) */}
      <UserModals />

      {/* MODALS */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={handleUploadComplete} />}
      {showExport && <ExportModal onClose={() => setShowExport(false)} subtitles={subtitles} settings={{...settings, fontSize, fontFamily: settings.fontFamily || 'Arial', borderTop: frameBorderTop, borderBottom: frameBorderBottom, borderColor: frameBorderColor, borderTextColor: frameTextColor, borderHeight: frameBorderHeight, highlightColor: frameHighlightColor}} videoPath={videoSrc} voiceoverPath={voiceoverSrc} duration={formatTime(duration)} taskId={taskId} blurMode={blurMode} blurHeight={blurHeight} blurWidth={blurWidth} blurIntensity={blurIntensity} logoSrc={logoSrc} logoPos={logoPos} logoSize={logoSize} videoDisplayRect={videoDisplayRect} />}
      {showDubbing && <DubbingModal onClose={() => setShowDubbing(false)} taskId={taskId} subtitles={subtitles} duration={formatTime(duration)} onDub={(data) => { if (data?.audioUrl) setVoiceoverSrc(data.audioUrl); showNotif('Lồng tiếng hoàn thành!', 'success'); }} />}
      {showCapCut && <CapCutEffectsBrowser isOpen={showCapCut} onClose={() => setShowCapCut(false)} taskId={taskId} onExport={(data) => { showNotif('CapCut draft exported!', 'success'); setShowCapCut(false); }} />}

      {/* Click outside to close panel */}
      {activePanel && <div className="fixed inset-0 z-[40]" onClick={() => setActivePanel(null)} />}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        input[type=range] { 
          -webkit-appearance: none;
          appearance: none;
          height: 4px; 
          background: rgba(255,255,255,0.15); 
          border-radius: 2px;
          outline: none;
        }
        input[type=range]::-webkit-slider-thumb { 
          -webkit-appearance: none;
          appearance: none;
          width: 14px; 
          height: 14px; 
          border-radius: 50%; 
          cursor: pointer; 
          background: #62d6ed;
          transition: transform 0.1s;
        }
        input[type=range]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>
    </div>
  );
}

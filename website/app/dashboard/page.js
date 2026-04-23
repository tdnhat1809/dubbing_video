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
  const [ocrEngine, setOcrEngine] = useState('google');
  const [multiSub, setMultiSub] = useState(false);
  const [showDetectZone, setShowDetectZone] = useState(false);
  const [detectZoneTop, setDetectZoneTop] = useState(82); // % from top (default: 82% = bottom 18%)
  const [extractionMethod, setExtractionMethod] = useState('yolo'); // 'yolo' or 'whisper'
  const [whisperModel, setWhisperModel] = useState('large-v3');
  const [options, setOptions] = useState({ removeText: false, splitMusic: false, mergeLine: true, mergeBlur: false });
  const [feedbackOptions, setFeedbackOptions] = useState({ accuracy: false, font: false, timing: false, editTool: false, moreTool: false });
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showBugModal, setShowBugModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // Password form
  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwDone, setPwDone] = useState(false);
  // Language
  const [uiLang, setUiLang] = useState('Tiếng Việt');
  // Team
  const [teamMembers, setTeamMembers] = useState([
    { name: 'Bạn (Admin)', email: 'admin@b2vision.com', role: 'Chủ sở hữu' },
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  // Bug report
  const [bugTitle, setBugTitle] = useState('');
  const [bugDesc, setBugDesc] = useState('');
  const [bugSending, setBugSending] = useState(false);
  const [bugSent, setBugSent] = useState(false);
  // Toast
  const [toast, setToast] = useState(null);
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
  const [videoThumb, setVideoThumb] = useState(null);
  const fileInputRef = useRef(null);
  const srtInputRef = useRef(null);

  // Capture a random frame from the uploaded video for preview
  useEffect(() => {
    if (!uploadedFile || !uploadedFile.type?.startsWith('video/')) {
      setVideoThumb(null);
      return;
    }
    const url = URL.createObjectURL(uploadedFile);
    const vid = document.createElement('video');
    vid.crossOrigin = 'anonymous';
    vid.preload = 'metadata';
    vid.muted = true;
    vid.src = url;
    const cleanup = () => { URL.revokeObjectURL(url); };
    vid.onloadedmetadata = () => {
      // Seek to 30% of video duration for a representative frame
      vid.currentTime = Math.min(vid.duration * 0.3, vid.duration - 0.5);
    };
    vid.onseeked = () => {
      try {
        const c = document.createElement('canvas');
        c.width = vid.videoWidth;
        c.height = vid.videoHeight;
        c.getContext('2d').drawImage(vid, 0, 0);
        setVideoThumb(c.toDataURL('image/jpeg', 0.7));
      } catch { setVideoThumb(null); }
      cleanup();
    };
    vid.onerror = () => { setVideoThumb(null); cleanup(); };
    return cleanup;
  }, [uploadedFile]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim() && !Object.values(feedbackOptions).some(v => v)) {
      showToast('Vui lòng nhập ý kiến hoặc chọn ít nhất một mục.', 'error');
      return;
    }
    setFeedbackSending(true);
    await new Promise(r => setTimeout(r, 1500));
    setFeedbackSending(false);
    setFeedbackSent(true);
    setFeedbackText('');
    setFeedbackOptions({ accuracy: false, font: false, timing: false, editTool: false, moreTool: false });
    showToast('Cảm ơn bạn đã góp ý! Thông tin đã được ghi nhận. 🎉');
    setTimeout(() => setFeedbackSent(false), 4000);
  };

  const handlePasswordChange = async () => {
    if (!pwOld || !pwNew || !pwConfirm) { showToast('Vui lòng điền đầy đủ thông tin.', 'error'); return; }
    if (pwNew.length < 8) { showToast('Mật khẩu mới phải có ít nhất 8 ký tự.', 'error'); return; }
    if (pwNew !== pwConfirm) { showToast('Mật khẩu xác nhận không khớp.', 'error'); return; }
    setPwSaving(true);
    await new Promise(r => setTimeout(r, 1800));
    setPwSaving(false);
    setPwDone(true);
    showToast('Đổi mật khẩu thành công! ✅');
    setTimeout(() => { setShowPasswordModal(false); setPwOld(''); setPwNew(''); setPwConfirm(''); setPwDone(false); }, 1500);
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) { showToast('Email không hợp lệ.', 'error'); return; }
    setInviting(true);
    await new Promise(r => setTimeout(r, 1200));
    setTeamMembers(prev => [...prev, { name: inviteEmail.split('@')[0], email: inviteEmail, role: 'Thành viên' }]);
    setInviteEmail('');
    setInviting(false);
    showToast(`Đã mời ${inviteEmail} vào nhóm! 🎉`);
  };

  const handleBugReport = async () => {
    if (!bugTitle.trim()) { showToast('Vui lòng nhập tiêu đề lỗi.', 'error'); return; }
    setBugSending(true);
    await new Promise(r => setTimeout(r, 1500));
    setBugSending(false);
    setBugSent(true);
    showToast('Báo lỗi đã được gửi thành công! Cảm ơn bạn. 🐛✅');
    setTimeout(() => { setShowBugModal(false); setBugTitle(''); setBugDesc(''); setBugSent(false); }, 2000);
  };

  // Load saved tasks from disk on mount (filtered by user)
  useEffect(() => {
    const userEmail = localStorage.getItem('user') || '';
    const params = userEmail ? `?userEmail=${encodeURIComponent(userEmail)}` : '';
    fetch(`/api/tasks${params}`).then(r => r.json()).then(d => {
      if (d.tasks) setSavedTasks(d.tasks);
    }).catch(() => { });
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
      formData.append('ocr_engine', ocrEngine);
      formData.append('multi_sub', multiSub ? 'true' : 'false');
      formData.append('extraction_method', extractionMethod);
      formData.append('whisper_model', whisperModel);
      if (showDetectZone && detectZoneTop < 82) {
        formData.append('detect_zone_top', (detectZoneTop / 100).toFixed(2));
      }
      // Track user
      try { formData.append('userEmail', localStorage.getItem('user') || ''); } catch { }

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

  // Modal overlay helper
  const ModalOverlay = ({ children, onClose }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onClose}>
      <div style={{ background: '#1a1a2e', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', maxWidth: 480, width: '90%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  const ModalInput = ({ label, ...props }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{label}</label>
      <input style={{ width: '100%', padding: '12px 16px', background: '#292934', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none' }} {...props} />
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#0a0a14', fontFamily: "'Inter', 'Manrope', sans-serif" }}>
      {/* Google Material Symbols */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap" />

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 99999, padding: '14px 28px', borderRadius: 14, background: toast.type === 'error' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 14, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'slideDown 0.3s ease', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined text-lg">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          {toast.msg}
        </div>
      )}

      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <ModalOverlay onClose={() => setShowPasswordModal(false)}>
          <div style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#8b5cf6' }}>lock</span>
              </div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 700 }}>Đổi mật khẩu</h3>
            </div>
            <ModalInput label="Mật khẩu hiện tại" type="password" placeholder="Nhập mật khẩu cũ" value={pwOld} onChange={e => setPwOld(e.target.value)} />
            <ModalInput label="Mật khẩu mới" type="password" placeholder="Tối thiểu 8 ký tự" value={pwNew} onChange={e => setPwNew(e.target.value)} />
            <ModalInput label="Xác nhận mật khẩu mới" type="password" placeholder="Nhập lại mật khẩu mới" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} />
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={() => setShowPasswordModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#999', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Hủy</button>
              <button onClick={handlePasswordChange} disabled={pwSaving} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: pwDone ? '#10b981' : 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: pwSaving ? 0.6 : 1 }}>
                {pwSaving ? '⏳ Đang lưu...' : pwDone ? '✅ Thành công!' : 'Lưu mật khẩu'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* TEAM MODAL */}
      {showTeamModal && (
        <ModalOverlay onClose={() => setShowTeamModal(false)}>
          <div style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#6366f1' }}>group</span>
              </div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 700 }}>Quản lý đội nhóm</h3>
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, fontWeight: 600 }}>THÀNH VIÊN ({teamMembers.length})</p>
              {teamMembers.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, marginBottom: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 18, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>{m.name[0].toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{m.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>{m.email}</p>
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>{m.role}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontWeight: 600 }}>MỜI THÀNH VIÊN MỚI</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ flex: 1, padding: '12px 16px', background: '#292934', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#fff', fontSize: 13, outline: 'none' }} placeholder="email@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
              <button onClick={handleInviteMember} disabled={inviting} style={{ padding: '12px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', opacity: inviting ? 0.6 : 1 }}>
                {inviting ? '⏳' : '+ Mời'}
              </button>
            </div>
            <button onClick={() => setShowTeamModal(false)} style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#999', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Đóng</button>
          </div>
        </ModalOverlay>
      )}

      {/* BUG REPORT MODAL */}
      {showBugModal && (
        <ModalOverlay onClose={() => setShowBugModal(false)}>
          <div style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>bug_report</span>
              </div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 700 }}>Báo lỗi</h3>
            </div>
            <ModalInput label="Tiêu đề lỗi" type="text" placeholder="VD: Video không export được" value={bugTitle} onChange={e => setBugTitle(e.target.value)} />
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Mô tả chi tiết</label>
              <textarea style={{ width: '100%', padding: '12px 16px', background: '#292934', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none', resize: 'none', height: 100 }} placeholder="Mô tả lỗi bạn gặp phải..." value={bugDesc} onChange={e => setBugDesc(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={() => setShowBugModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#999', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Hủy</button>
              <button onClick={handleBugReport} disabled={bugSending} style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: bugSent ? '#10b981' : 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: bugSending ? 0.6 : 1 }}>
                {bugSending ? '⏳ Đang gửi...' : bugSent ? '✅ Đã gửi!' : '🐛 Gửi báo lỗi'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* SUPPORT MODAL */}
      {showSupportModal && (
        <ModalOverlay onClose={() => setShowSupportModal(false)}>
          <div style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#10b981' }}>support_agent</span>
              </div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 700 }}>Hỗ trợ</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: 'mail', label: 'Email hỗ trợ', value: 'cskh@b2vision.com', color: '#6366f1' },
                { icon: 'chat', label: 'Zalo OA', value: 'B2Vision Support', color: '#0068ff' },
                { icon: 'call', label: 'Hotline', value: '1900 xxxx', color: '#10b981' },
                { icon: 'schedule', label: 'Giờ làm việc', value: '8:00 - 22:00 (T2 - CN)', color: '#f59e0b' },
              ].map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: c.color, fontSize: 20 }}>{c.icon}</span>
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0, fontWeight: 600 }}>{c.label}</p>
                    <p style={{ color: '#fff', fontSize: 14, margin: 0, fontWeight: 600 }}>{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowSupportModal(false)} style={{ width: '100%', marginTop: 20, padding: '12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#999', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Đóng</button>
          </div>
        </ModalOverlay>
      )}

      {/* UPGRADE MODAL */}
      {showUpgradeModal && (
        <ModalOverlay onClose={() => setShowUpgradeModal(false)}>
          <div style={{ padding: '28px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#f59e0b,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 28 }}>diamond</span>
            </div>
            <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Nâng cấp lên PRO</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 24px' }}>Mở khóa tất cả tính năng cao cấp</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', marginBottom: 24 }}>
              {['Lưu trữ vĩnh viễn', 'Ưu tiên xử lý video', 'Hỗ trợ 24/7 qua Zalo', 'GPT 5.4 không giới hạn', 'Xuất video 4K'].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(245,158,11,0.06)', borderRadius: 10 }}>
                  <span className="material-symbols-outlined" style={{ color: '#f59e0b', fontSize: 18 }}>check_circle</span>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>{f}</span>
                </div>
              ))}
            </div>
            <button style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 24px rgba(245,158,11,0.3)' }} onClick={() => { showToast('Liên hệ cskh@b2vision.com để nâng cấp PRO! 💎'); setShowUpgradeModal(false); }}>Nâng cấp ngay — 299.000đ/tháng</button>
            <button onClick={() => setShowUpgradeModal(false)} style={{ width: '100%', marginTop: 10, padding: '12px', borderRadius: 10, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13 }}>Để sau</button>
          </div>
        </ModalOverlay>
      )}

      {/* ANIMATION KEYFRAMES */}
      <style>{`
        @keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      `}</style>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex items-center justify-center relative overflow-y-auto">
        {activeMenu === 'user' ? (
          <div className="w-full h-full p-8 overflow-y-auto flex flex-col max-w-[600px] mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Thông tin tài khoản</h1>
            </div>

            {/* List menu 1 */}
            <div className="space-y-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <button
                className="w-full flex items-center gap-4 px-4 py-3 text-white/70 hover:bg-white/5 rounded-xl transition-colors"
                onClick={() => setShowPasswordModal(true)}
              >
                <span className="material-symbols-outlined text-white/50">lock</span>
                <span className="font-medium">Đổi mật khẩu</span>
                <span className="material-symbols-outlined text-white/20 ml-auto text-lg">chevron_right</span>
              </button>
              <button
                className="w-full flex items-center gap-4 px-4 py-3 text-white/70 hover:bg-white/5 rounded-xl transition-colors"
                onClick={() => setShowTeamModal(true)}
              >
                <span className="material-symbols-outlined text-white/50">group</span>
                <span className="font-medium">Đội nhóm</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{teamMembers.length}</span>
                <span className="material-symbols-outlined text-white/20 text-lg">chevron_right</span>
              </button>
            </div>

            {/* List menu 2 */}
            <div className="space-y-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="w-full flex items-center justify-between px-4 py-3 text-white/70 relative">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-white/50">language</span>
                  <span className="font-medium">Ngôn ngữ:</span>
                </div>
                <button
                  className="bg-white/10 px-4 py-1.5 rounded-lg border border-white/5 text-sm hover:bg-white/15 transition-colors cursor-pointer flex items-center gap-2"
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                >
                  {uiLang}
                  <span className="material-symbols-outlined text-white/30 text-sm">expand_more</span>
                </button>
                {showLangDropdown && (
                  <div style={{ position: 'absolute', right: 16, top: '100%', zIndex: 50, background: '#1f1f29', borderRadius: 10, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', minWidth: 160 }}>
                    {['Tiếng Việt', 'English', '中文', '日本語', '한국어'].map(lang => (
                      <button key={lang} onClick={() => { setUiLang(lang); setShowLangDropdown(false); showToast(`Ngôn ngữ đã chuyển sang ${lang}`); }} style={{ display: 'block', width: '100%', padding: '10px 16px', border: 'none', background: uiLang === lang ? 'rgba(99,102,241,0.15)' : 'transparent', color: uiLang === lang ? '#818cf8' : 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'left', cursor: 'pointer', fontWeight: uiLang === lang ? 700 : 400 }}>
                        {lang} {uiLang === lang && '✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-full flex items-center justify-between px-4 py-3 text-white/70">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-white/50">cloud</span>
                  <span className="font-medium">Lưu trữ:</span>
                </div>
                <button
                  className="text-sm bg-primary/20 text-primary px-3 py-1 rounded-lg hover:bg-primary/40 transition-colors font-medium flex items-center gap-1.5"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  14 Day
                  <span className="material-symbols-outlined text-sm">north_east</span>
                </button>
              </div>
              <button
                className="w-full flex items-center gap-4 px-4 py-3 text-white/70 hover:bg-white/5 rounded-xl transition-colors"
                onClick={() => setShowSupportModal(true)}
              >
                <span className="material-symbols-outlined text-white/50">mail</span>
                <span className="font-medium">Hỗ trợ</span>
                <span className="material-symbols-outlined text-white/20 ml-auto text-lg">chevron_right</span>
              </button>
              <button
                className="w-full flex items-center gap-4 px-4 py-3 text-white/70 hover:bg-white/5 rounded-xl transition-colors"
                onClick={() => setShowBugModal(true)}
              >
                <span className="material-symbols-outlined text-white/50">bug_report</span>
                <span className="font-medium">Báo lỗi</span>
                <span className="material-symbols-outlined text-white/20 ml-auto text-lg">chevron_right</span>
              </button>
            </div>

            {/* List Servers */}
            <div className="space-y-3 px-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40 font-medium">Upload Server:</span>
                <span className="text-white/70 font-medium tracking-wide">Hồ Chí Minh 09</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40 font-medium">Edit Server:</span>
                <span className="text-white/70 font-medium tracking-wide">Hồ Chí Minh 09</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40 font-medium">Download Server:</span>
                <span className="text-white/70 font-medium tracking-wide">Hồ Chí Minh 09</span>
              </div>
            </div>

            {/* Feedback Box */}
            <div className="bg-[#1b1b25] rounded-2xl p-6 shadow-xl border border-white/5">
              {feedbackSent ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                  <h3 style={{ color: '#10b981', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Cảm ơn bạn!</h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Thông tin góp ý đã được ghi nhận.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-white/90 text-[15px] font-bold text-center leading-relaxed mb-6">Đừng ngại góp ý để chúng tôi cải tiến hơn qua từng phiên bản!</h3>

                  <div className="space-y-4 mb-6">
                    {[
                      { id: 'accuracy', label: 'Độ chính xác trong nhận dạng' },
                      { id: 'font', label: 'Kiểu chữ văn bản' },
                      { id: 'timing', label: 'Timing' },
                      { id: 'editTool', label: 'Công cụ chỉnh sửa' },
                      { id: 'moreTool', label: 'Cần thêm công cụ' },
                    ].map(item => (
                      <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border ${feedbackOptions[item.id] ? 'bg-primary border-primary' : 'border-white/20 group-hover:border-white/40'} flex items-center justify-center transition-colors`}>
                          {feedbackOptions[item.id] && <span className="material-symbols-outlined text-[14px] text-white font-bold">check</span>}
                        </div>
                        <input type="checkbox" className="hidden" checked={feedbackOptions[item.id]} onChange={() => setFeedbackOptions(prev => ({ ...prev, [item.id]: !prev[item.id] }))} />
                        <span className="text-sm font-medium text-white/50 group-hover:text-white/80 transition-colors">{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-white/50 mb-2">Ý kiến chi tiết:</label>
                    <textarea
                      className="w-full bg-[#292934] border border-white/5 rounded-xl p-4 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow resize-none h-24"
                      placeholder="Thêm ý kiến"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                    ></textarea>
                  </div>

                  <button
                    className="w-full py-3.5 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all disabled:opacity-60"
                    onClick={handleFeedbackSubmit}
                    disabled={feedbackSending}
                  >
                    {feedbackSending ? '⏳ Đang gửi...' : 'Gửi đánh giá'}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center">
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
                      <span className="material-symbols-outlined text-[#17a2b8] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>movie</span>
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
                  <button className="px-3 py-3 text-white/30 hover:text-[#62d6ed] transition-colors" onClick={() => { if (srcLang !== 'Phát hiện ngôn ngữ') { const tmp = srcLang; setSrcLang(tgtLang); setTgtLang(tmp); } }}>
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

              {/* OCR Engine Selector */}
              {mode === 'hardsub' && (
                <div className="px-6 py-2">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1 font-semibold">OCR Engine</p>
                  <div className="flex items-center rounded-xl overflow-hidden" style={{ background: '#12121d' }}>
                    <button className={`flex-1 px-4 py-3 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${ocrEngine === 'google' ? 'text-[#62d6ed] bg-white/5' : 'text-white/40 hover:text-white/60 hover:bg-white/3'}`} onClick={() => setOcrEngine('google')}>
                      <span className="material-symbols-outlined text-sm">cloud</span>
                      Google Drive OCR
                      <span className="text-[10px] text-emerald-400 font-bold">✦ Chính xác</span>
                    </button>
                    <button className={`flex-1 px-4 py-3 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${ocrEngine === 'rapidocr' ? 'text-[#62d6ed] bg-white/5' : 'text-white/40 hover:text-white/60 hover:bg-white/3'}`} onClick={() => setOcrEngine('rapidocr')}>
                      <span className="material-symbols-outlined text-sm">memory</span>
                      RapidOCR
                      <span className="text-[10px] text-yellow-400">Offline</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Multi-Sub Toggle */}
              {mode === 'hardsub' && (
                <div className="px-6 py-2">
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#12121d' }}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-purple-400">subtitles</span>
                      <div>
                        <p className="text-xs font-medium text-white/70">Multi-Sub</p>
                        <p className="text-[10px] text-white/30">Phát hiện nhiều sub ở nhiều vị trí</p>
                      </div>
                    </div>
                    <button
                      className={`w-10 h-5 rounded-full transition-all relative ${multiSub ? 'bg-purple-500' : 'bg-white/10'}`}
                      onClick={() => setMultiSub(!multiSub)}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${multiSub ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Extraction Method Selector */}
              <div className="px-6 py-2">
                <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1 font-semibold">Phương pháp trích xuất</p>
                <div className="flex items-center rounded-xl overflow-hidden" style={{ background: '#12121d' }}>
                  <button className={`flex-1 px-4 py-3 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${extractionMethod === 'yolo' ? 'text-[#62d6ed] bg-white/5' : 'text-white/40 hover:text-white/60 hover:bg-white/3'}`} onClick={() => setExtractionMethod('yolo')}>
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    AI + OCR
                    <span className="text-[10px] text-emerald-400 font-bold">Sub cứng</span>
                  </button>
                  <button className={`flex-1 px-4 py-3 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${extractionMethod === 'whisper' ? 'text-[#62d6ed] bg-white/5' : 'text-white/40 hover:text-white/60 hover:bg-white/3'}`} onClick={() => setExtractionMethod('whisper')}>
                    <span className="material-symbols-outlined text-sm">mic</span>
                    Whisper AI
                    <span className="text-[10px] text-purple-400">Âm thanh</span>
                  </button>
                </div>
              </div>

              {/* Whisper Model Selector */}
              {extractionMethod === 'whisper' && (
                <div className="px-6 py-2">
                  <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1 font-semibold">Whisper Model</p>
                  <div className="flex items-center rounded-xl overflow-hidden" style={{ background: '#12121d' }}>
                    {[{ id: 'base', label: 'Base', desc: 'Nhanh' }, { id: 'small', label: 'Small', desc: 'Cân bằng' }, { id: 'medium', label: 'Medium', desc: 'Tốt' }, { id: 'large-v3', label: 'Large V3', desc: 'Tốt nhất' }].map((m) => (
                      <button key={m.id} className={`flex-1 px-3 py-3 text-xs font-medium transition-all flex flex-col items-center gap-0.5 ${whisperModel === m.id ? 'text-[#62d6ed] bg-white/5' : 'text-white/40 hover:text-white/60 hover:bg-white/3'}`} onClick={() => setWhisperModel(m.id)}>
                        <span>{m.label}</span>
                        <span className="text-[9px] text-white/25">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

              {/* Detection Zone Customization */}
              {mode === 'hardsub' && (
                <div className="px-6 py-2">
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#12121d' }}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-amber-400">target</span>
                      <div>
                        <p className="text-xs font-medium text-white/70">Tùy chỉnh vùng detect</p>
                        <p className="text-[10px] text-white/30">Cho video có sub nằm cao (giữa màn hình)</p>
                      </div>
                    </div>
                    <button
                      className={`w-10 h-5 rounded-full transition-all relative ${showDetectZone ? 'bg-amber-500' : 'bg-white/10'}`}
                      onClick={() => setShowDetectZone(!showDetectZone)}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${showDetectZone ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {showDetectZone && (
                    <div className="mt-2 p-3 rounded-xl" style={{ background: '#12121d', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="flex items-center gap-4">
                        {/* Visual mini-preview with real video frame */}
                        <div className="relative w-24 h-40 rounded-lg overflow-hidden border border-white/10 flex-shrink-0" style={{ background: videoThumb ? 'none' : '#0a0a1a' }}>
                          {videoThumb && <img src={videoThumb} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                          {!videoThumb && <div className="absolute inset-0 flex items-center justify-center"><span className="material-symbols-outlined text-white/10 text-2xl">movie</span></div>}
                          {/* Non-detect zone overlay (top - dimmed) */}
                          <div className="absolute inset-x-0 top-0 transition-all" style={{ height: `${detectZoneTop}%`, background: 'rgba(0,0,0,0.6)' }} />
                          {/* Detect zone overlay (bottom - highlighted) */}
                          <div className="absolute inset-x-0 bottom-0 transition-all flex items-end justify-center" style={{ height: `${100 - detectZoneTop}%`, background: 'rgba(34,211,238,0.12)', borderTop: '2px dashed rgba(34,211,238,0.7)' }}>
                            <span style={{ fontSize: 9 }} className="text-cyan-300/80 font-bold mb-1">DETECT</span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-white/40 text-[11px]">Vùng detect</span>
                            <span className="text-cyan-300 text-[11px] font-mono">{100 - detectZoneTop}% dưới</span>
                          </div>
                          <input
                            type="range" min="20" max="82" step="1"
                            value={detectZoneTop}
                            onChange={e => setDetectZoneTop(parseInt(e.target.value))}
                            className="w-full accent-cyan-400" style={{ direction: 'rtl' }}
                          />
                          <div className="flex justify-between text-[9px] text-white/20">
                            <span>80% (rộng)</span>
                            <span>18% (mặc định)</span>
                          </div>
                          {detectZoneTop < 60 && (
                            <p className="text-[9px] text-amber-400/70 flex items-center gap-1">
                              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>warning</span>
                              Quá rộng có thể detect nhầm
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              {/* Footer - Upload Button (always visible) */}
              <div className="px-6 py-4 flex items-center justify-between mt-1 sticky bottom-0 z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#1f1f2e' }}>
                <div className="flex items-center gap-2 text-white/40 text-xs">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
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
              <div className="mt-4 w-full max-w-[750px] mx-auto">
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

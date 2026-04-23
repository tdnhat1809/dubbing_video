'use client';
import { useState, useEffect } from 'react';
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

export default function SettingsPage() {
  const router = useRouter();
  const [activeMenu, setActiveMenu] = useState('settings');
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    defaultSrc: 'Phát hiện ngôn ngữ',
    defaultTgt: 'Tiếng Việt',
    defaultEngine: 'gpt4mini',
    autoSave: true,
    notifications: true,
    darkMode: true,
    subtitleFont: 'Be Vietnam Pro',
    subtitleSize: 24,
    subtitleColor: '#ffffff',
    subtitleBg: '#000000',
    subtitleOpacity: 80,
    watermark: false,
    autoTranslate: true,
    mergeLines: true,
    quality: 'high',
  });

  // Modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  const [paymentCode] = useState('OV' + Math.random().toString(36).substring(2, 8).toUpperCase());
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [deleteText, setDeleteText] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [pollingId, setPollingId] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [userPlan, setUserPlan] = useState('free');

  // Load real user data
  useEffect(() => {
    const email = localStorage.getItem('user') || '';
    const role = localStorage.getItem('userRole') || 'user';
    setUserEmail(email);
    setUserRole(role);
    if (email) {
      fetch(`/api/auth?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(data => {
          if (data.name) setUserName(data.name);
          if (data.role) { setUserRole(data.role); localStorage.setItem('userRole', data.role); }
        })
        .catch(() => {});
    }
  }, []);

  const PAYMENT_AMOUNT = 40000;
  const BANK_ID = 'MB';
  const ACCOUNT_NO = '0867809383';
  const ACCOUNT_NAME = 'TRAN DINH NHAT';

  // VietQR URL for QR code image
  const vietQrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${PAYMENT_AMOUNT}&addInfo=${encodeURIComponent(paymentCode)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const updateSetting = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    showToast('Đã đăng xuất thành công!');
    setTimeout(() => { window.location.href = '/dang-nhap'; }, 1000);
  };

  const handleDeleteAccount = () => {
    if (deleteText !== 'XÓA TÀI KHOẢN') {
      showToast('Vui lòng nhập đúng "XÓA TÀI KHOẢN" để xác nhận.', 'error');
      return;
    }
    showToast('Tài khoản đã được xóa.');
    setTimeout(() => router.push('/dang-nhap'), 1500);
  };

  // Single payment check
  const checkPaymentOnce = async () => {
    try {
      const res = await fetch('/api/check-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: paymentCode, amount: PAYMENT_AMOUNT }),
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { found: false, error: 'Lỗi kết nối server.' };
    }
  };

  // Start checking (with auto-poll every 10s)
  const checkPayment = async () => {
    setCheckingPayment(true);
    setPaymentResult(null);
    setPollCount(0);

    const data = await checkPaymentOnce();
    setPaymentResult(data);

    if (data.found) {
      setIsPro(true);
      showToast('🎉 Thanh toán thành công! Tài khoản đã nâng cấp PRO!');
      setCheckingPayment(false);
      return;
    }

    // Start auto-polling every 10 seconds (max 30 times = 5 minutes)
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      setPollCount(count);
      const result = await checkPaymentOnce();
      setPaymentResult(result);

      if (result.found) {
        clearInterval(interval);
        setPollingId(null);
        setIsPro(true);
        setCheckingPayment(false);
        showToast('🎉 Thanh toán thành công! Tài khoản đã nâng cấp PRO!');
      } else if (count >= 30) {
        clearInterval(interval);
        setPollingId(null);
        setCheckingPayment(false);
      }
    }, 10000);

    setPollingId(interval);
  };

  // Cleanup polling on unmount or modal close
  const stopPolling = () => {
    if (pollingId) {
      clearInterval(pollingId);
      setPollingId(null);
    }
    setCheckingPayment(false);
    setPollCount(0);
  };

  const tabs = [
    { id: 'general', label: 'Tổng quát', icon: 'tune' },
    { id: 'subtitle', label: 'Phụ đề', icon: 'subtitles' },
    { id: 'export', label: 'Xuất bản', icon: 'movie' },
    { id: 'account', label: 'Tài khoản', icon: 'person' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#0a0a14', fontFamily: "'Inter', 'Manrope', sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h1 className="text-white text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Cài đặt</h1>
            <p className="text-white/30 text-xs mt-1">Tùy chỉnh trải nghiệm dịch video của bạn</p>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 py-4 px-3 space-y-1 shrink-0" style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}>
            {tabs.map((tab) => (
              <button key={tab.id} className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 transition-all ${activeTab === tab.id ? 'text-[#62d6ed] bg-[#62d6ed]/10' : 'text-white/35 hover:text-white/60 hover:bg-white/5'}`} onClick={() => setActiveTab(tab.id)}>
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            {activeTab === 'general' && (
              <div className="max-w-xl space-y-6">
                <h3 className="text-white/70 text-sm font-semibold mb-4">Ngôn ngữ mặc định</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/30 text-xs mb-1.5 block">Ngôn ngữ nguồn</label>
                    <select value={settings.defaultSrc} onChange={(e) => updateSetting('defaultSrc', e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-sm text-white/80" style={{ background: '#14141f', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Phát hiện ngôn ngữ', 'Tiếng Trung', 'Tiếng Anh', 'Tiếng Nhật', 'Tiếng Hàn'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/30 text-xs mb-1.5 block">Ngôn ngữ đích</label>
                    <select value={settings.defaultTgt} onChange={(e) => updateSetting('defaultTgt', e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-sm text-white/80" style={{ background: '#14141f', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Tiếng Việt', 'Tiếng Anh', 'Tiếng Trung', 'Tiếng Nhật', 'Tiếng Hàn'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <h3 className="text-white/70 text-sm font-semibold mb-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>AI Engine</h3>
                <div>
                  <label className="text-white/30 text-xs mb-1.5 block">Engine mặc định</label>
                  <select value={settings.defaultEngine} onChange={(e) => updateSetting('defaultEngine', e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-sm text-white/80" style={{ background: '#14141f', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <option value="deepseek">Deepseek</option>
                    <option value="gpt4o">GPT 4o</option>
                    <option value="gpt4mini">GPT 4mini</option>
                  </select>
                </div>
                <h3 className="text-white/70 text-sm font-semibold mb-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>Tùy chọn</h3>
                {[
                  { key: 'autoSave', label: 'Tự động lưu', desc: 'Tự động lưu thay đổi khi chỉnh sửa phụ đề' },
                  { key: 'notifications', label: 'Thông báo', desc: 'Nhận thông báo khi tác vụ hoàn thành' },
                  { key: 'autoTranslate', label: 'Tự động dịch', desc: 'Tự động dịch khi tải video lên' },
                  { key: 'mergeLines', label: 'Gộp dòng', desc: 'Tự động gộp các dòng phụ đề ngắn' },
                ].map((opt) => (
                  <div key={opt.key} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div>
                      <p className="text-white/70 text-sm">{opt.label}</p>
                      <p className="text-white/25 text-xs mt-0.5">{opt.desc}</p>
                    </div>
                    <button className={`w-11 h-6 rounded-full relative transition-colors ${settings[opt.key] ? 'bg-[#17a2b8]' : 'bg-white/10'}`} onClick={() => updateSetting(opt.key, !settings[opt.key])}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings[opt.key] ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'subtitle' && (
              <div className="max-w-xl space-y-6">
                <h3 className="text-white/70 text-sm font-semibold mb-4">Kiểu phụ đề</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/30 text-xs mb-1.5 block">Font chữ</label>
                    <select value={settings.subtitleFont} onChange={(e) => updateSetting('subtitleFont', e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-sm text-white/80" style={{ background: '#14141f', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {['Be Vietnam Pro', 'Inter', 'Roboto', 'Noto Sans', 'Arial'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/30 text-xs mb-1.5 block">Cỡ chữ: {settings.subtitleSize}px</label>
                    <input type="range" min="12" max="48" value={settings.subtitleSize} onChange={(e) => updateSetting('subtitleSize', parseInt(e.target.value))} className="w-full accent-[#62d6ed]" />
                  </div>
                </div>
                <div>
                  <label className="text-white/30 text-xs mb-1.5 block">Độ trong suốt nền: {settings.subtitleOpacity}%</label>
                  <input type="range" min="0" max="100" value={settings.subtitleOpacity} onChange={(e) => updateSetting('subtitleOpacity', parseInt(e.target.value))} className="w-full accent-[#62d6ed]" />
                </div>
                <div className="rounded-xl p-6 flex items-center justify-center" style={{ background: '#14141f', minHeight: '120px' }}>
                  <p className="text-center" style={{ fontFamily: settings.subtitleFont, fontSize: `${settings.subtitleSize}px`, color: settings.subtitleColor, background: `${settings.subtitleBg}${Math.round(settings.subtitleOpacity * 2.55).toString(16).padStart(2, '0')}`, padding: '8px 16px', borderRadius: '4px' }}>
                    Xem trước phụ đề
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="max-w-xl space-y-6">
                <h3 className="text-white/70 text-sm font-semibold mb-4">Chất lượng xuất bản</h3>
                <div className="space-y-2">
                  {[
                    { id: 'low', label: '720p - Tiêu chuẩn', desc: 'Phù hợp TikTok, Story' },
                    { id: 'medium', label: '1080p - HD', desc: 'Phù hợp YouTube, Facebook' },
                    { id: 'high', label: '4K - Ultra HD', desc: 'Chất lượng cao nhất' },
                  ].map((q) => (
                    <button key={q.id} className={`w-full px-4 py-3 rounded-xl text-left flex items-center gap-3 transition-all ${settings.quality === q.id ? 'bg-[#62d6ed]/10 border-[#62d6ed]/30' : 'hover:bg-white/5 border-white/5'}`} style={{ border: `1px solid ${settings.quality === q.id ? 'rgba(98,214,237,0.3)' : 'rgba(255,255,255,0.05)'}` }} onClick={() => updateSetting('quality', q.id)}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${settings.quality === q.id ? 'border-[#62d6ed]' : 'border-white/15'}`}>
                        {settings.quality === q.id && <div className="w-2 h-2 rounded-full bg-[#62d6ed]" />}
                      </div>
                      <div>
                        <p className="text-white/80 text-sm font-medium">{q.label}</p>
                        <p className="text-white/25 text-xs">{q.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-white/70 text-sm">Xóa watermark</p>
                    <p className="text-white/25 text-xs">Yêu cầu tài khoản Premium</p>
                  </div>
                  <button className={`w-11 h-6 rounded-full relative transition-colors ${settings.watermark ? 'bg-[#17a2b8]' : 'bg-white/10'}`} onClick={() => updateSetting('watermark', !settings.watermark)}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.watermark ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="max-w-xl space-y-6">
                <div className="flex items-center gap-4 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl" style={{ background: isPro ? 'linear-gradient(135deg, #f59e0b, #f97316)' : userRole === 'admin' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>{isPro ? '💎' : userRole === 'admin' ? '🛡️' : '👤'}</div>
                  <div>
                    <p className="text-white text-base font-semibold">{userName || userEmail?.split('@')[0] || 'User'}</p>
                    <p className="text-white/30 text-xs">{userEmail || 'Chưa đăng nhập'}</p>
                    {userRole === 'admin' && (
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-red-500 to-red-600 mr-1">ADMIN</span>
                    )}
                    {isPro ? (
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-[#f59e0b] to-[#f97316]">PRO PLAN 💎</span>
                    ) : (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#f59e0b] bg-[#f59e0b]/10">FREE PLAN</span>
                    )}
                  </div>
                </div>
                {!isPro ? (
                  <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <h4 className="text-white text-sm font-bold mb-2">🚀 Nâng cấp PRO</h4>
                    <ul className="space-y-1.5 text-xs text-white/50 mb-4">
                      <li className="flex items-center gap-2"><span className="text-[#10b981]">✓</span> Tải lên tối đa 10GB</li>
                      <li className="flex items-center gap-2"><span className="text-[#10b981]">✓</span> Dịch video không giới hạn</li>
                      <li className="flex items-center gap-2"><span className="text-[#10b981]">✓</span> Xóa watermark</li>
                      <li className="flex items-center gap-2"><span className="text-[#10b981]">✓</span> Lưu trữ đám mây</li>
                      <li className="flex items-center gap-2"><span className="text-[#10b981]">✓</span> Lồng tiếng AI không giới hạn</li>
                    </ul>
                    <button onClick={() => setShowUpgradeModal(true)} className="w-full py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      💳 Nâng cấp PRO — {PAYMENT_AMOUNT.toLocaleString()}đ
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.1))', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <h4 className="text-white text-sm font-bold mb-2">💎 Tài khoản PRO</h4>
                    <p className="text-white/50 text-xs">Bạn đang sử dụng gói PRO với đầy đủ tính năng premium.</p>
                  </div>
                )}
                <div className="pt-4 space-y-3">
                  <button onClick={() => setShowLogoutConfirm(true)} className="text-white/30 text-xs hover:text-white/60 transition-colors flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">logout</span>Đăng xuất</button>
                  <button onClick={() => setShowDeleteConfirm(true)} className="text-red-400/40 text-xs hover:text-red-400/80 transition-colors flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">delete_forever</span>Xóa tài khoản</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-[76px] flex flex-col items-center py-4 gap-1 overflow-y-auto" style={{ background: '#111118' }}>
        {sidebarItems.map((item) => (
          <button key={item.id} className={`w-full flex flex-col items-center py-3 px-1 gap-1.5 transition-all relative group ${activeMenu === item.id ? 'text-[#62d6ed]' : 'text-white/35 hover:text-white/60'}`} onClick={() => { setActiveMenu(item.id); if (item.id === 'new') router.push('/dashboard'); else if (item.id === 'progress') router.push('/dashboard/progress'); else if (item.id === 'settings') router.push('/dashboard/settings'); }}>
            {activeMenu === item.id && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-l-full bg-[#62d6ed]" />}
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: activeMenu === item.id ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
            <span className="text-[9px] font-semibold tracking-wider text-center leading-tight whitespace-pre-line">{item.label}</span>
          </button>
        ))}
        <div className="mt-auto pt-4">
          <button className="text-white/25 text-[9px] font-semibold tracking-wider hover:text-white/50 transition-colors">ENGLISH</button>
        </div>
      </aside>

      {/* ═══ UPGRADE MODAL WITH VIETQR + MBBANK ═══ */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} onClick={() => { stopPolling(); setShowUpgradeModal(false); }}>
          <div className="rounded-2xl max-w-lg w-[95%] overflow-hidden" style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                    <span className="material-symbols-outlined text-white text-2xl">diamond</span>
                  </div>
                  <div>
                    <h3 className="text-white text-lg font-extrabold">Nâng cấp PRO</h3>
                    <p className="text-white/30 text-xs">Quét QR để thanh toán — Tự động kích hoạt</p>
                  </div>
                </div>
                <button onClick={() => { stopPolling(); setShowUpgradeModal(false); }} className="text-white/30 hover:text-white/60"><span className="material-symbols-outlined">close</span></button>
              </div>

              <div className="flex gap-5">
                {/* QR Code */}
                <div className="flex flex-col items-center">
                  <div className="rounded-xl overflow-hidden bg-white p-1" style={{ border: '2px solid rgba(245,158,11,0.3)' }}>
                    <img src={vietQrUrl} alt="VietQR" width={200} height={200} className="rounded-lg" style={{ minWidth: '200px', minHeight: '200px' }} />
                  </div>
                  <p className="text-white/20 text-[10px] mt-2 text-center">Quét bằng app ngân hàng<br/>hoặc ví điện tử</p>
                </div>

                {/* Bank Info */}
                <div className="flex-1 space-y-3">
                  <div className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[#f59e0b] text-xs font-bold mb-2.5">💳 Thông tin chuyển khoản</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between"><span className="text-white/30">Ngân hàng</span><span className="text-white font-bold">MBBank</span></div>
                      <div className="flex justify-between"><span className="text-white/30">Số TK</span><span className="text-white font-bold">{ACCOUNT_NO}</span></div>
                      <div className="flex justify-between"><span className="text-white/30">Chủ TK</span><span className="text-white font-bold text-[11px]">{ACCOUNT_NAME}</span></div>
                      <div className="flex justify-between"><span className="text-white/30">Số tiền</span><span className="text-[#10b981] font-bold">{PAYMENT_AMOUNT.toLocaleString()}đ</span></div>
                      <div className="flex justify-between items-center"><span className="text-white/30">Nội dung CK</span><span className="text-[#f59e0b] font-bold select-all cursor-pointer" title="Click để copy">{paymentCode}</span></div>
                    </div>
                  </div>
                  <p className="text-white/20 text-[10px] leading-relaxed">⚠ Chuyển đúng nội dung <strong className="text-[#f59e0b]">{paymentCode}</strong> để hệ thống tự động kích hoạt.</p>
                </div>
              </div>

              {/* Action & Status */}
              <div className="mt-5 space-y-2">
                <button onClick={checkPayment} disabled={checkingPayment || paymentResult?.found}
                  className="w-full py-3.5 rounded-xl text-sm font-extrabold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: paymentResult?.found ? '#10b981' : 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 6px 20px rgba(245,158,11,0.25)' }}>
                  {checkingPayment ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{pollCount > 0 ? `Đang chờ giao dịch... (${pollCount}/30)` : 'Đang kiểm tra MBBank...'}</>
                  ) : paymentResult?.found ? (
                    '✅ Thanh toán thành công! Đã nâng cấp PRO'
                  ) : '🔍 Kiểm tra thanh toán'}
                </button>

                {checkingPayment && !paymentResult?.found && (
                  <p className="text-white/25 text-[10px] text-center">Hệ thống tự động kiểm tra mỗi 10 giây. Vui lòng chuyển khoản và đợi...</p>
                )}

                {paymentResult && !paymentResult.found && !checkingPayment && (
                  <p className="text-amber-400/70 text-xs text-center">⏳ Chưa tìm thấy giao dịch. Hãy chuyển khoản rồi bấm kiểm tra lại.</p>
                )}

                {paymentResult?.found && (
                  <div className="rounded-lg p-3 flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <span className="material-symbols-outlined text-emerald-400 text-lg">verified</span>
                    <div>
                      <p className="text-emerald-400 text-xs font-bold">Tài khoản đã được nâng cấp PRO! 💎</p>
                      <p className="text-white/30 text-[10px]">{paymentResult.transaction?.date || ''} — {paymentResult.transaction?.amount?.toLocaleString() || PAYMENT_AMOUNT.toLocaleString()}đ</p>
                    </div>
                  </div>
                )}

                <button onClick={() => { stopPolling(); setShowUpgradeModal(false); }} className="w-full py-2 text-white/30 text-xs hover:text-white/50 transition-colors">
                  {paymentResult?.found ? 'Đóng' : 'Để sau'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LOGOUT CONFIRM ═══ */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} onClick={() => setShowLogoutConfirm(false)}>
          <div className="rounded-2xl max-w-sm w-[90%] p-7" style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.2)' }}>
              <span className="material-symbols-outlined text-[#6366f1] text-2xl">logout</span>
            </div>
            <h3 className="text-white text-lg font-bold text-center mb-2">Đăng xuất</h3>
            <p className="text-white/40 text-sm text-center mb-6">Bạn có chắc muốn đăng xuất khỏi tài khoản?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/50 border border-white/10 hover:bg-white/5 transition-colors">Hủy</button>
              <button onClick={handleLogout} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>Đăng xuất</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE ACCOUNT CONFIRM ═══ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }} onClick={() => setShowDeleteConfirm(false)}>
          <div className="rounded-2xl max-w-sm w-[90%] p-7" style={{ background: '#1a1a2e', border: '1px solid rgba(239,68,68,0.2)' }} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)' }}>
              <span className="material-symbols-outlined text-red-400 text-2xl">warning</span>
            </div>
            <h3 className="text-white text-lg font-bold text-center mb-2">Xóa tài khoản</h3>
            <p className="text-white/40 text-sm text-center mb-2">Hành động này không thể hoàn tác. Tất cả dữ liệu sẽ bị xóa vĩnh viễn.</p>
            <p className="text-red-400/70 text-xs text-center mb-4">Nhập <strong>XÓA TÀI KHOẢN</strong> để xác nhận:</p>
            <input value={deleteText} onChange={e => setDeleteText(e.target.value)} placeholder="XÓA TÀI KHOẢN" className="w-full px-4 py-3 rounded-lg text-sm text-white/80 mb-4 outline-none" style={{ background: '#14141f', border: '1px solid rgba(239,68,68,0.2)' }} />
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteText(''); }} className="flex-1 py-3 rounded-xl text-sm font-medium text-white/50 border border-white/10 hover:bg-white/5 transition-colors">Hủy</button>
              <button onClick={handleDeleteAccount} className="flex-1 py-3 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>Xóa vĩnh viễn</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70]" style={{ animation: 'fadeInDown 0.3s ease' }}>
          <div className={`px-6 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500/90' : 'bg-[#10b981]/90'} text-white`} style={{ backdropFilter: 'blur(8px)' }}>
            <span className="material-symbols-outlined text-lg">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
            {toast.msg}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

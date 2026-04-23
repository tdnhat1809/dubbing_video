'use client';
import { useState } from 'react';
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

  const updateSetting = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

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
        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h1 className="text-white text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Cài đặt</h1>
            <p className="text-white/30 text-xs mt-1">Tùy chỉnh trải nghiệm dịch video của bạn</p>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Settings Tabs */}
          <div className="w-48 py-4 px-3 space-y-1 shrink-0" style={{ borderRight: '1px solid rgba(255,255,255,0.04)' }}>
            {tabs.map((tab) => (
              <button key={tab.id} className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 transition-all ${activeTab === tab.id ? 'text-[#62d6ed] bg-[#62d6ed]/10' : 'text-white/35 hover:text-white/60 hover:bg-white/5'}`} onClick={() => setActiveTab(tab.id)}>
                <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Settings Content */}
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
                {/* Preview */}
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
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    👤
                  </div>
                  <div>
                    <p className="text-white text-base font-semibold">User Demo</p>
                    <p className="text-white/30 text-xs">user@b2vision.com</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#f59e0b] bg-[#f59e0b]/10">FREE PLAN</span>
                  </div>
                </div>
                <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <h4 className="text-white text-sm font-bold mb-2">🚀 Nâng cấp Premium</h4>
                  <ul className="space-y-1.5 text-xs text-white/50 mb-4">
                    <li className="flex items-center gap-2"><span className="text-[#10b981]">✓</span> Tải lên tối đa 10GB</li>
                    <li className="flex items-center gap-2"><span className="text-[#10b981]">✓</span> Dịch video trên 1 phút</li>
                    <li className="flex items-center gap-2"><span className="text-[#10b981]">✓</span> Xóa watermark</li>
                    <li className="flex items-center gap-2"><span className="text-[#10b981]">✓</span> Lưu trữ đám mây</li>
                  </ul>
                  <button className="w-full py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    Nâng cấp với 1 nhấn
                  </button>
                </div>
                <div className="pt-4 space-y-3">
                  <button className="text-white/30 text-xs hover:text-white/60 transition-colors flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">logout</span>Đăng xuất</button>
                  <button className="text-red-400/40 text-xs hover:text-red-400/80 transition-colors flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">delete_forever</span>Xóa tài khoản</button>
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
    </div>
  );
}

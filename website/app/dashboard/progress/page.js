'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const tasks = [
  { id: 1, title: 'Vũ trụ 7 cấp độ văn minh', status: 'done', src: 'Tiếng Trung', tgt: 'Tiếng Việt', engine: 'GPT 4mini', mode: 'Dịch sub cứng', duration: '2:02', size: '45.2 MB', date: '06/04/2026 14:30', progress: 100, thumb: '🌌' },
  { id: 2, title: 'Hướng dẫn nấu ăn Nhật Bản', status: 'processing', src: 'Tiếng Nhật', tgt: 'Tiếng Việt', engine: 'Deepseek', mode: 'Dịch âm thanh', duration: '5:30', size: '120.8 MB', date: '06/04/2026 15:00', progress: 67, thumb: '🍣' },
  { id: 3, title: 'Machine Learning Tutorial', status: 'queued', src: 'Tiếng Anh', tgt: 'Tiếng Việt', engine: 'GPT 4o', mode: 'Lồng tiếng từ .SRT', duration: '12:45', size: '198.5 MB', date: '06/04/2026 15:15', progress: 0, thumb: '🤖' },
  { id: 4, title: 'K-Drama Highlight Ep.12', status: 'done', src: 'Tiếng Hàn', tgt: 'Tiếng Việt', engine: 'GPT 4mini', mode: 'Dịch sub cứng', duration: '8:20', size: '89.3 MB', date: '05/04/2026 22:10', progress: 100, thumb: '🎬' },
  { id: 5, title: 'TED Talk - Future of AI', status: 'error', src: 'Tiếng Anh', tgt: 'Tiếng Việt', engine: 'GPT 4o', mode: 'Dịch văn bản', duration: '18:30', size: '200.0 MB', date: '05/04/2026 20:00', progress: 34, thumb: '💡' },
  { id: 6, title: 'Review iPhone 16 Pro Max', status: 'done', src: 'Tiếng Anh', tgt: 'Tiếng Việt', engine: 'Deepseek', mode: 'Dịch âm thanh V2', duration: '15:00', size: '156.7 MB', date: '05/04/2026 18:45', progress: 100, thumb: '📱' },
];

const statusConfig = {
  done: { label: 'Hoàn thành', color: '#10b981', icon: 'check_circle', bg: 'rgba(16,185,129,0.1)' },
  processing: { label: 'Đang xử lý', color: '#f59e0b', icon: 'hourglass_top', bg: 'rgba(245,158,11,0.1)' },
  queued: { label: 'Chờ xử lý', color: '#6366f1', icon: 'schedule', bg: 'rgba(99,102,241,0.1)' },
  error: { label: 'Lỗi', color: '#ef4444', icon: 'error', bg: 'rgba(239,68,68,0.1)' },
};

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

export default function ProgressPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [activeMenu, setActiveMenu] = useState('progress');

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    processing: tasks.filter(t => t.status === 'processing').length,
    error: tasks.filter(t => t.status === 'error').length,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#0a0a14', fontFamily: "'Inter', 'Manrope', sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" />

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h1 className="text-white text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Tiến trình</h1>
            <p className="text-white/30 text-xs mt-1">Quản lý các tác vụ dịch video của bạn</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Stats */}
            {[
              { label: 'Tổng', value: stats.total, color: '#62d6ed' },
              { label: 'Hoàn thành', value: stats.done, color: '#10b981' },
              { label: 'Đang xử lý', value: stats.processing, color: '#f59e0b' },
              { label: 'Lỗi', value: stats.error, color: '#ef4444' },
            ].map((s, i) => (
              <div key={i} className="px-4 py-2 rounded-xl" style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
                <p className="text-xs font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-white/30">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-8 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'done', label: 'Hoàn thành' },
            { id: 'processing', label: 'Đang xử lý' },
            { id: 'queued', label: 'Chờ xử lý' },
            { id: 'error', label: 'Lỗi' },
          ].map((f) => (
            <button key={f.id} className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${filter === f.id ? 'text-[#62d6ed] bg-[#62d6ed]/10' : 'text-white/35 hover:text-white/60 hover:bg-white/5'}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => router.push('/dashboard')} className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:shadow-lg hover:shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">add</span>
            Tạo mới
          </button>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto px-8 py-4 space-y-3">
          {filteredTasks.map((task) => {
            const status = statusConfig[task.status];
            return (
              <div key={task.id}
                className="rounded-xl p-4 transition-all hover:bg-white/[0.03] cursor-pointer group"
                style={{ background: '#14141f', border: '1px solid rgba(255,255,255,0.04)' }}
                onClick={() => task.status === 'done' && router.push('/dashboard/editor')}
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-14 rounded-lg flex items-center justify-center text-3xl shrink-0" style={{ background: '#1f1f30' }}>
                    {task.thumb}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white/90 text-sm font-semibold truncate">{task.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1" style={{ background: status.bg, color: status.color }}>
                        <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>{status.icon}</span>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-white/25 mb-2">
                      <span>{task.src} → {task.tgt}</span>
                      <span>•</span>
                      <span>{task.engine}</span>
                      <span>•</span>
                      <span>{task.mode}</span>
                      <span>•</span>
                      <span>{task.duration}</span>
                      <span>•</span>
                      <span>{task.size}</span>
                    </div>
                    {/* Progress Bar */}
                    {task.status !== 'done' && task.status !== 'error' && (
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1f1f30' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${task.progress}%`, background: status.color }} />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {task.status === 'done' && (
                      <>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-[#62d6ed] hover:bg-[#62d6ed]/10 transition-all" title="Chỉnh sửa">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-[#10b981] hover:bg-[#10b981]/10 transition-all" title="Tải xuống">
                          <span className="material-symbols-outlined text-lg">download</span>
                        </button>
                      </>
                    )}
                    {task.status === 'error' && (
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-[#f59e0b] hover:bg-[#f59e0b]/10 transition-all" title="Thử lại">
                        <span className="material-symbols-outlined text-lg">refresh</span>
                      </button>
                    )}
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Xóa">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>

                  {/* Date */}
                  <span className="text-[10px] text-white/15 shrink-0 pt-1">{task.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* RIGHT SIDEBAR */}
      <aside className="w-[76px] flex flex-col items-center py-4 gap-1 overflow-y-auto" style={{ background: '#111118' }}>
        {sidebarItems.map((item) => (
          <button
            key={item.id}
            className={`w-full flex flex-col items-center py-3 px-1 gap-1.5 transition-all relative group ${activeMenu === item.id ? 'text-[#62d6ed]' : 'text-white/35 hover:text-white/60'}`}
            onClick={() => { setActiveMenu(item.id); if (item.id === 'new') router.push('/dashboard'); else if (item.id === 'progress') router.push('/dashboard/progress'); else if (item.id === 'settings') router.push('/dashboard/settings'); }}
          >
            {activeMenu === item.id && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-l-full bg-[#62d6ed]" />
            )}
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

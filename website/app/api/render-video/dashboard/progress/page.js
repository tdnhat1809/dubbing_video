'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const statusConfig = {
  uploaded: { label: 'Đã tải lên', color: '#6366f1', icon: 'cloud_done', bg: 'rgba(99,102,241,0.1)' },
  extracting: { label: 'Đang trích xuất', color: '#f59e0b', icon: 'hourglass_top', bg: 'rgba(245,158,11,0.1)' },
  extracted: { label: 'Đã trích xuất', color: '#10b981', icon: 'subtitles', bg: 'rgba(16,185,129,0.1)' },
  translating: { label: 'Đang dịch', color: '#f59e0b', icon: 'translate', bg: 'rgba(245,158,11,0.1)' },
  dubbing: { label: 'Đang lồng tiếng', color: '#f59e0b', icon: 'mic', bg: 'rgba(245,158,11,0.1)' },
  exporting: { label: 'Đang xuất', color: '#f59e0b', icon: 'movie', bg: 'rgba(245,158,11,0.1)' },
  completed: { label: 'Hoàn thành', color: '#10b981', icon: 'check_circle', bg: 'rgba(16,185,129,0.1)' },
  error: { label: 'Lỗi', color: '#ef4444', icon: 'error', bg: 'rgba(239,68,68,0.1)' },
  processing: { label: 'Đang xử lý', color: '#f59e0b', icon: 'hourglass_top', bg: 'rgba(245,158,11,0.1)' },
  done: { label: 'Hoàn thành', color: '#10b981', icon: 'check_circle', bg: 'rgba(16,185,129,0.1)' },
  queued: { label: 'Chờ xử lý', color: '#6366f1', icon: 'schedule', bg: 'rgba(99,102,241,0.1)' },
};

// No demo tasks - only real tasks from API

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
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch real tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/tasks');
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks || []);
        }
      } catch (err) { console.error('Fetch tasks error:', err); }
      setLoading(false);
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  const getStatusGroup = (status) => {
    if (['completed', 'extracted', 'done'].includes(status)) return 'done';
    if (['extracting', 'translating', 'dubbing', 'exporting', 'processing'].includes(status)) return 'processing';
    if (['error'].includes(status)) return 'error';
    return 'queued';
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => getStatusGroup(t.status) === filter);
  const stats = {
    total: tasks.length,
    done: tasks.filter(t => getStatusGroup(t.status) === 'done').length,
    processing: tasks.filter(t => getStatusGroup(t.status) === 'processing').length,
    error: tasks.filter(t => getStatusGroup(t.status) === 'error').length,
  };

  const deleteTask = async (taskId) => {
    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) { /* ignore */ }
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
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/20">
              <span className="material-symbols-outlined text-5xl mb-3">inbox</span>
              <p className="text-sm">Chưa có tác vụ nào</p>
            </div>
          ) : filteredTasks.map((task) => {
            const status = statusConfig[task.status] || statusConfig['queued'];
            const isActive = getStatusGroup(task.status) === 'processing';
            return (
              <div key={task.id}
                className="rounded-xl p-4 transition-all hover:bg-white/[0.03] cursor-pointer group"
                style={{ background: '#14141f', border: `1px solid ${isActive ? status.color + '30' : 'rgba(255,255,255,0.04)'}` }}
                onClick={() => router.push(`/dashboard/editor?task=${task.id}`)}
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-14 rounded-lg flex items-center justify-center shrink-0 relative overflow-hidden" style={{ background: '#1f1f30' }}>
                    <span className="material-symbols-outlined text-2xl text-white/20" style={{fontVariationSettings: "'FILL' 1"}}>movie</span>
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white/90 text-sm font-semibold truncate">{task.filename || task.id}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0" style={{ background: status.bg, color: status.color }}>
                        <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>{status.icon}</span>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-white/25 mb-2">
                      {task.sourceLang && <span>{task.sourceLang} → {task.targetLang}</span>}
                      {task.engine && <><span>•</span><span>{task.engine}</span></>}
                      {task.mode && <><span>•</span><span>{task.mode}</span></>}
                      {task.message && <><span>•</span><span className="text-white/40">{task.message}</span></>}
                    </div>
                    {/* Progress Bar */}
                    {(isActive || (task.progress > 0 && task.progress < 100)) && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#1f1f30' }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${task.progress || 0}%`, background: `linear-gradient(90deg, ${status.color}, ${status.color}90)` }} />
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: status.color }}>{task.progress || 0}%</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {getStatusGroup(task.status) === 'done' && (
                      <>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-[#62d6ed] hover:bg-[#62d6ed]/10 transition-all" title="Chỉnh sửa"
                          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/editor?task=${task.id}`); }}>
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        {task.downloadUrl && (
                          <a href={task.downloadUrl} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-[#10b981] hover:bg-[#10b981]/10 transition-all" title="Tải xuống"
                            onClick={(e) => e.stopPropagation()}>
                            <span className="material-symbols-outlined text-lg">download</span>
                          </a>
                        )}
                      </>
                    )}
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Xóa"
                      onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}>
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>

                  {/* Date */}
                  <span className="text-[10px] text-white/15 shrink-0 pt-1">
                    {task.createdAt ? new Date(task.createdAt).toLocaleString('vi-VN') : ''}
                  </span>
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
            onClick={() => {
              setActiveMenu(item.id);
              if (item.id === 'new') router.push('/dashboard');
              else if (item.id === 'progress') {} // already here
              else if (item.id === 'settings') router.push('/dashboard/settings');
              else if (item.id === 'publish' || item.id === 'dubbing' || item.id === 'audio' || item.id === 'frame' || item.id === 'subtitle') router.push('/dashboard/editor');
              else if (item.id === 'user') router.push('/dashboard/settings');
              else if (item.id === 'support') window.open('https://t.me/b2vision', '_blank');
            }}
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

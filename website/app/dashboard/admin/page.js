'use client';
import { useState, useEffect, useCallback } from 'react';

// ============================================================
// B2Vision Admin Dashboard
// ============================================================

const TABS = [
  { id: 'overview', label: '📊 Tổng quan', icon: 'dashboard' },
  { id: 'users', label: '👥 Người dùng', icon: 'people' },
  { id: 'tasks', label: '🎬 Video/Tasks', icon: 'movie' },
  { id: 'rendered', label: '📁 Video đã render', icon: 'video_file' },
  { id: 'analytics', label: '📈 Phân tích', icon: 'analytics' },
  { id: 'system', label: '⚙️ Hệ thống', icon: 'settings' },
];

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(d) {
  if (!d) return '—';
  const now = Date.now();
  const diff = now - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
}

// ━━━━━ Mini Bar Chart (SVG) ━━━━━
function MiniBarChart({ data, color = '#818cf8', height = 60 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const barWidth = Math.max(4, Math.floor(100 / data.length) - 1);
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${data.length * (barWidth + 2)} ${height}`} style={{ display: 'block' }}>
      {data.map((d, i) => (
        <rect
          key={i}
          x={i * (barWidth + 2)}
          y={height - (d.count / max) * (height - 4)}
          width={barWidth}
          height={Math.max(2, (d.count / max) * (height - 4))}
          rx={2}
          fill={color}
          opacity={0.7 + 0.3 * (d.count / max)}
        >
          <title>{d.date}: {d.count} video</title>
        </rect>
      ))}
    </svg>
  );
}

// ━━━━━ Donut Chart (SVG) ━━━━━
function DonutChart({ data, size = 160 }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.count, 0);
  const colors = ['#818cf8', '#62d6ed', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa', '#ec4899'];
  let cumulative = 0;
  const radius = size / 2 - 8;
  const cx = size / 2, cy = size / 2;

  function describeArc(startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={size} height={size}>
        {data.map((d, i) => {
          const angle = (d.count / total) * 360;
          const startAngle = cumulative;
          cumulative += angle;
          if (angle < 0.5) return null;
          return (
            <path
              key={i}
              d={describeArc(startAngle, startAngle + angle - 0.5)}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth={24}
              strokeLinecap="round"
            >
              <title>{d.engine || d.pair}: {d.count}</title>
            </path>
          );
        })}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#dfe2eb" fontSize={20} fontWeight={700}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#908fa0" fontSize={11}>tổng</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ color: '#c7c4d7' }}>{d.engine || d.pair}</span>
            <span style={{ color: '#908fa0', marginLeft: 'auto' }}>{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ━━━━━ Status Badge ━━━━━
function StatusBadge({ status }) {
  const map = {
    extracted: { label: 'Đã trích xuất', bg: '#10b98120', color: '#10b981' },
    completed: { label: 'Hoàn thành', bg: '#10b98120', color: '#10b981' },
    translated: { label: 'Đã dịch', bg: '#818cf820', color: '#818cf8' },
    processing: { label: 'Đang xử lý', bg: '#f59e0b20', color: '#f59e0b' },
    extracting: { label: 'Đang trích xuất', bg: '#f59e0b20', color: '#f59e0b' },
    error: { label: 'Lỗi', bg: '#f43f5e20', color: '#f43f5e' },
    failed: { label: 'Thất bại', bg: '#f43f5e20', color: '#f43f5e' },
    uploaded: { label: 'Đã tải lên', bg: '#62d6ed20', color: '#62d6ed' },
  };
  const s = map[status] || { label: status || '—', bg: '#908fa020', color: '#908fa0' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OVERVIEW TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function OverviewTab({ stats }) {
  if (!stats) return <div style={{ textAlign: 'center', padding: 60, color: '#908fa0' }}>Đang tải...</div>;
  const { overview, charts } = stats;

  const statCards = [
    { label: 'Tổng Video/Tasks', value: overview.totalVideos, icon: '🎬', color: '#818cf8' },
    { label: 'Hoàn thành', value: overview.completedVideos, icon: '✅', color: '#10b981' },
    { label: 'Đang xử lý', value: overview.processingVideos, icon: '⏳', color: '#f59e0b' },
    { label: 'Lỗi', value: overview.failedVideos, icon: '❌', color: '#f43f5e' },
    { label: 'Ký tự TTS', value: formatNumber(overview.totalTTSChars), icon: '🗣️', color: '#62d6ed' },
    { label: 'Lồng tiếng', value: overview.voiceoverCount, icon: '🎤', color: '#a78bfa' },
    { label: 'Video đã render', value: overview.totalRenderedVideos, icon: '📁', color: '#ec4899' },
    { label: 'Dung lượng tổng', value: `${(overview.totalStorageMB / 1024).toFixed(1)} GB`, icon: '💾', color: '#f59e0b' },
  ];

  return (
    <div>
      {/* Stat Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {statCards.map((card, i) => (
          <div key={i} className="admin-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, color: '#908fa0', marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: card.color, letterSpacing: '-0.02em' }}>{card.value}</div>
              </div>
              <span style={{ fontSize: 28 }}>{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="admin-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#dfe2eb' }}>📈 Hoạt động 30 ngày qua</h3>
          <MiniBarChart data={charts.dailyActivity} height={120} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#908fa0' }}>
            <span>{charts.dailyActivity[0]?.date}</span>
            <span>{charts.dailyActivity[charts.dailyActivity.length - 1]?.date}</span>
          </div>
        </div>
        <div className="admin-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#dfe2eb' }}>🔧 Engine phân bổ</h3>
          <DonutChart data={charts.engineDistribution} size={140} />
        </div>
      </div>

      {/* Language Pairs */}
      <div className="admin-card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#dfe2eb' }}>🌐 Phân bổ ngôn ngữ</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {charts.languagePairs.map((lp, i) => (
            <div key={i} style={{
              padding: '6px 14px', borderRadius: 999,
              background: '#818cf815', border: '1px solid #818cf830',
              fontSize: 13, color: '#c0c1ff'
            }}>
              {lp.pair} <span style={{ color: '#908fa0', marginLeft: 4 }}>({lp.count})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="admin-card" style={{ padding: 20, marginTop: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#dfe2eb' }}>🕐 Hoạt động gần đây</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Video</th>
                <th>Người dùng</th>
                <th>Trạng thái</th>
                <th>Engine</th>
                <th>Ngôn ngữ</th>
                <th>Lồng tiếng</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {(stats.tasks || []).slice(0, 10).map((t, i) => (
                <tr key={i}>
                  <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.filename || t.taskId}</td>
                  <td>
                    {t.userEmail ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 10, background: 'linear-gradient(135deg, #818cf8, #62d6ed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>
                          {t.userEmail[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize: 11, color: '#c7c4d7' }}>{t.userEmail.split('@')[0]}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: '#908fa050' }}>—</span>
                    )}
                  </td>
                  <td><StatusBadge status={t.action} /></td>
                  <td style={{ color: '#c7c4d7' }}>{t.engine}</td>
                  <td style={{ color: '#62d6ed' }}>{t.sourceLang}→{t.targetLang}</td>
                  <td><StatusBadge status={t.voiceoverStatus || '—'} /></td>
                  <td style={{ color: '#908fa0', fontSize: 12 }}>{timeAgo(t.updatedAt || t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TASKS TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TasksTab() {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const fetchTasks = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, search, status: statusFilter });
      const res = await fetch(`/api/admin/tasks?${params}`);
      const data = await res.json();
      setTasks(data.tasks || []);
      setPagination(data.pagination || {});
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => { fetchTasks(1); }, [fetchTasks]);

  const handleDelete = async (taskId) => {
    if (!confirm(`Xóa task ${taskId}?\nTất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.`)) return;
    setDeleting(taskId);
    try {
      await fetch('/api/admin/tasks', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId }) });
      fetchTasks(pagination.page);
    } catch (err) { console.error(err); }
    setDeleting(null);
  };

  return (
    <div>
      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="🔍 Tìm kiếm video, task ID..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="admin-input" style={{ flex: 1, minWidth: 250 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="admin-select">
          <option value="all">Tất cả trạng thái</option>
          <option value="extracted">Đã trích xuất</option>
          <option value="completed">Hoàn thành</option>
          <option value="processing">Đang xử lý</option>
          <option value="error">Lỗi</option>
          <option value="uploaded">Đã tải lên</option>
        </select>
      </div>

      {/* Tasks Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Video</th>
                <th>Người dùng</th>
                <th>Trạng thái</th>
                <th>Engine</th>
                <th>Ngôn ngữ</th>
                <th>Files</th>
                <th>Dung lượng</th>
                <th>Tính năng</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#908fa0' }}>Đang tải...</td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#908fa0' }}>Không có dữ liệu</td></tr>
              ) : tasks.map((t, i) => (
                <tr key={t.id || i}>
                  <td>
                    <div style={{ maxWidth: 200 }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.filename || t.title || '—'}</div>
                      <div style={{ fontSize: 11, color: '#908fa0', fontFamily: 'monospace' }}>{t.id?.slice(0, 8)}...</div>
                    </div>
                  </td>
                  <td>
                    {t.userEmail ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 11, background: 'linear-gradient(135deg, #818cf8, #62d6ed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                          {t.userEmail[0].toUpperCase()}
                        </div>
                        <span style={{ fontSize: 11, color: '#c7c4d7', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.userEmail}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: '#908fa050' }}>—</span>
                    )}
                  </td>
                  <td><StatusBadge status={t.status} /></td>
                  <td style={{ color: '#c7c4d7' }}>{t.engine || '—'}</td>
                  <td style={{ color: '#62d6ed', fontSize: 12 }}>{t.sourceLang || '?'}→{t.targetLang || '?'}</td>
                  <td style={{ color: '#c7c4d7' }}>{t.fileCount}</td>
                  <td style={{ color: '#c7c4d7' }}>{t.totalSizeMB} MB</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {t.hasSubtitles && <span title="Subtitles" style={{ fontSize: 16 }}>📝</span>}
                      {t.hasBboxes && <span title="YOLO Bboxes" style={{ fontSize: 16 }}>🎯</span>}
                      {t.hasVoiceover && <span title="Voiceover" style={{ fontSize: 16 }}>🎤</span>}
                      {t.hasRendered && <span title="Rendered" style={{ fontSize: 16 }}>🎞️</span>}
                    </div>
                  </td>
                  <td style={{ color: '#908fa0', fontSize: 12 }}>{formatDate(t.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a href={`/dashboard/editor?task=${t.id}`} target="_blank" rel="noopener noreferrer"
                        className="admin-btn-sm" style={{ color: '#818cf8' }} title="Mở editor">
                        ✏️
                      </a>
                      <button
                        className="admin-btn-sm" style={{ color: '#f43f5e' }}
                        onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}
                        title="Xóa task"
                      >
                        {deleting === t.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button className="admin-btn-sm" disabled={pagination.page <= 1} onClick={() => fetchTasks(pagination.page - 1)}>← Trước</button>
          <span style={{ color: '#908fa0', fontSize: 13 }}>Trang {pagination.page} / {pagination.totalPages} ({pagination.total} tasks)</span>
          <button className="admin-btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchTasks(pagination.page + 1)}>Sau →</button>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RENDERED VIDEOS TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function RenderedTab() {
  const [videos, setVideos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [totalSizeMB, setTotalSizeMB] = useState('0');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const fetchVideos = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rendered?page=${page}&limit=15`);
      const data = await res.json();
      setVideos(data.videos || []);
      setPagination(data.pagination || {});
      setTotalSizeMB(data.totalSizeMB || '0');
    } catch (err) { console.error(err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchVideos(1); }, [fetchVideos]);

  const handleDelete = async (filename) => {
    if (!confirm(`Xóa video ${filename}?`)) return;
    setDeleting(filename);
    try {
      await fetch('/api/admin/rendered', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename }) });
      fetchVideos(pagination.page);
    } catch (err) { console.error(err); }
    setDeleting(null);
  };

  return (
    <div>
      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div className="admin-card" style={{ padding: '12px 20px', flex: 1 }}>
          <span style={{ color: '#908fa0', fontSize: 13 }}>Tổng video render: </span>
          <span style={{ color: '#818cf8', fontWeight: 700, fontSize: 18 }}>{pagination.total}</span>
        </div>
        <div className="admin-card" style={{ padding: '12px 20px', flex: 1 }}>
          <span style={{ color: '#908fa0', fontSize: 13 }}>Dung lượng tổng: </span>
          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 18 }}>{(totalSizeMB / 1024).toFixed(2)} GB</span>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên file</th>
                <th>Dung lượng</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#908fa0' }}>Đang tải...</td></tr>
              ) : videos.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: '#908fa0' }}>Chưa có video nào</td></tr>
              ) : videos.map((v, i) => (
                <tr key={i}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 13 }}>{v.name}</span></td>
                  <td style={{ color: '#c7c4d7' }}>{v.sizeMB} MB</td>
                  <td style={{ color: '#908fa0', fontSize: 12 }}>{formatDate(v.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a href={v.downloadUrl} target="_blank" rel="noopener noreferrer"
                        className="admin-btn-sm" style={{ color: '#10b981' }} title="Tải xuống">
                        ⬇️
                      </a>
                      <button
                        className="admin-btn-sm" style={{ color: '#f43f5e' }}
                        onClick={() => handleDelete(v.name)}
                        disabled={deleting === v.name}
                        title="Xóa"
                      >
                        {deleting === v.name ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button className="admin-btn-sm" disabled={pagination.page <= 1} onClick={() => fetchVideos(pagination.page - 1)}>← Trước</button>
          <span style={{ color: '#908fa0', fontSize: 13 }}>Trang {pagination.page} / {pagination.totalPages}</span>
          <button className="admin-btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchVideos(pagination.page + 1)}>Sau →</button>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ANALYTICS TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AnalyticsTab({ stats }) {
  if (!stats) return <div style={{ textAlign: 'center', padding: 60, color: '#908fa0' }}>Đang tải...</div>;
  const { overview, charts } = stats;

  const totalVids = overview.totalVideos || 1;
  const successRate = totalVids > 0 ? ((overview.completedVideos / totalVids) * 100).toFixed(1) : 0;
  const avgPerDay = charts.dailyActivity.reduce((s, d) => s + d.count, 0) / 30;

  // Compute week-over-week
  const last7 = charts.dailyActivity.slice(-7).reduce((s, d) => s + d.count, 0);
  const prev7 = charts.dailyActivity.slice(-14, -7).reduce((s, d) => s + d.count, 0);
  const weekChange = prev7 > 0 ? (((last7 - prev7) / prev7) * 100).toFixed(0) : 0;

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="admin-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: '#908fa0' }}>Video / ngày (TB)</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#818cf8', marginTop: 4 }}>{avgPerDay.toFixed(1)}</div>
        </div>
        <div className="admin-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: '#908fa0' }}>Tỷ lệ thành công</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#10b981', marginTop: 4 }}>{successRate}%</div>
        </div>
        <div className="admin-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: '#908fa0' }}>7 ngày gần nhất</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#62d6ed', marginTop: 4 }}>{last7} <span style={{ fontSize: 14, color: weekChange >= 0 ? '#10b981' : '#f43f5e' }}>{weekChange >= 0 ? '↑' : '↓'}{weekChange}%</span></div>
        </div>
        <div className="admin-card" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: '#908fa0' }}>Subtitle entries</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b', marginTop: 4 }}>{formatNumber(overview.totalSubtitleEntries)}</div>
        </div>
      </div>

      {/* Daily Activity Full Chart */}
      <div className="admin-card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#dfe2eb' }}>📊 Video xử lý theo ngày (30 ngày)</h3>
        <MiniBarChart data={charts.dailyActivity} color="#818cf8" height={160} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#908fa0' }}>
          <span>{charts.dailyActivity[0]?.date}</span>
          <span>Tổng: {charts.dailyActivity.reduce((s, d) => s + d.count, 0)} video</span>
          <span>{charts.dailyActivity[charts.dailyActivity.length - 1]?.date}</span>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="admin-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#dfe2eb' }}>🔧 Engine sử dụng</h3>
          <DonutChart data={charts.engineDistribution} size={160} />
        </div>
        <div className="admin-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#dfe2eb' }}>🌐 Ngôn ngữ phổ biến</h3>
          {charts.languagePairs.slice(0, 8).map((lp, i) => {
            const pct = Math.round((lp.count / totalVids) * 100);
            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                  <span style={{ color: '#c7c4d7' }}>{lp.pair}</span>
                  <span style={{ color: '#908fa0' }}>{lp.count} ({pct}%)</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: '#1c2026', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: 'linear-gradient(90deg, #818cf8, #62d6ed)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Storage Summary */}
      <div className="admin-card" style={{ padding: 20, marginTop: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#dfe2eb' }}>💾 Dung lượng lưu trữ</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: '#908fa0' }}>Tasks data</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#818cf8' }}>{(overview.totalStorageMB / 1024).toFixed(2)} GB</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#908fa0' }}>Rendered videos</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#62d6ed' }}>{(overview.renderedStorageMB / 1024).toFixed(2)} GB</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#908fa0' }}>Tổng cộng</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{((overview.totalStorageMB + overview.renderedStorageMB) / 1024).toFixed(2)} GB</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYSTEM TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SystemTab({ stats }) {
  if (!stats?.systemInfo) return <div style={{ textAlign: 'center', padding: 60, color: '#908fa0' }}>Đang tải...</div>;
  const sys = stats.systemInfo;

  const infoRows = [
    { label: 'Hostname', value: sys.hostname, icon: '🖥️' },
    { label: 'OS', value: `${sys.platform} ${sys.release} (${sys.arch})`, icon: '💻' },
    { label: 'CPU', value: `${sys.cpuModel} (${sys.cpuCores} cores)`, icon: '🔲' },
    { label: 'RAM', value: `${sys.usedMemGB} / ${sys.totalMemGB} GB (${sys.memUsagePercent}%)`, icon: '📊' },
    { label: 'Node.js', value: sys.nodeVersion, icon: '🟢' },
    { label: 'Uptime', value: `${sys.uptime} giờ`, icon: '⏱️' },
  ];

  return (
    <div>
      <div className="admin-card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 15, color: '#dfe2eb' }}>🖥️ Thông tin hệ thống</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {infoRows.map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#181c22', borderRadius: 10 }}>
              <span style={{ fontSize: 20 }}>{row.icon}</span>
              <span style={{ color: '#908fa0', width: 100, flexShrink: 0, fontSize: 13 }}>{row.label}</span>
              <span style={{ color: '#dfe2eb', fontSize: 14, fontFamily: 'monospace' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RAM Usage Bar */}
      <div className="admin-card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#dfe2eb' }}>📊 Sử dụng RAM</h3>
        <div style={{ height: 24, borderRadius: 12, background: '#1c2026', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%', borderRadius: 12,
            width: `${sys.memUsagePercent}%`,
            background: sys.memUsagePercent > 85 ? 'linear-gradient(90deg, #f43f5e, #f59e0b)' : 'linear-gradient(90deg, #818cf8, #62d6ed)',
            transition: 'width 0.5s ease'
          }} />
          <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 12, fontWeight: 600, color: '#fff' }}>
            {sys.memUsagePercent}%
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#908fa0' }}>
          <span>0 GB</span>
          <span>{sys.usedMemGB} / {sys.totalMemGB} GB</span>
          <span>{sys.totalMemGB} GB</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="admin-card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, color: '#dfe2eb' }}>⚡ Hành động nhanh</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="admin-btn" onClick={() => window.location.reload()}>🔄 Refresh dữ liệu</button>
          <button className="admin-btn" onClick={() => window.open('/dashboard', '_blank')}>🌐 Mở Dashboard chính</button>
          <button className="admin-btn" style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899)' }}
            onClick={async () => {
              if (!confirm('Xóa tất cả video đã render? Hành động này không thể hoàn tác!')) return;
              try {
                const res = await fetch('/api/admin/rendered');
                const data = await res.json();
                for (const v of data.videos || []) {
                  await fetch('/api/admin/rendered', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: v.name }) });
                }
                alert('Đã xóa tất cả video render!');
                window.location.reload();
              } catch (err) { alert('Lỗi: ' + err.message); }
            }}>
            🗑️ Xóa tất cả render
          </button>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USERS TAB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function PlanBadge({ plan }) {
  const map = {
    free: { label: 'Free', bg: '#908fa020', color: '#908fa0' },
    pro: { label: 'PRO', bg: '#f59e0b20', color: '#f59e0b' },
    enterprise: { label: 'Enterprise', bg: '#818cf820', color: '#818cf8' },
  };
  const s = map[plan] || map.free;
  return <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
}

function RoleBadge({ role }) {
  const color = role === 'admin' ? '#f43f5e' : '#62d6ed';
  return <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: `${color}15`, color, border: `1px solid ${color}30` }}>{role}</span>;
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'user', plan: 'free' });
  const [expandedUser, setExpandedUser] = useState(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, search, plan: planFilter, status: statusFilter });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setPagination(data.pagination || {});
      setSummary(data.summary || {});
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [search, planFilter, statusFilter]);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  const handleDelete = async (email) => {
    if (!confirm(`Xóa user ${email}?\nTất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.`)) return;
    setDeleting(email);
    try {
      await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      fetchUsers(pagination.page);
    } catch (err) { console.error(err); }
    setDeleting(null);
  };

  const handleUpdateUser = async (email, updates) => {
    try {
      await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, ...updates }) });
      fetchUsers(pagination.page);
      setEditingUser(null);
    } catch (err) { console.error(err); }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.email.includes('@')) return;
    try {
      await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });
      setShowAddModal(false);
      setNewUser({ email: '', name: '', role: 'user', plan: 'free' });
      fetchUsers(1);
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Tổng users', value: summary.total || 0, icon: '👥', color: '#818cf8' },
          { label: 'Active', value: summary.active || 0, icon: '✅', color: '#10b981' },
          { label: 'PRO', value: summary.pro || 0, icon: '⭐', color: '#f59e0b' },
          { label: 'Enterprise', value: summary.enterprise || 0, icon: '💎', color: '#a78bfa' },
          { label: 'Mới (7 ngày)', value: summary.newThisWeek || 0, icon: '🆕', color: '#62d6ed' },
          { label: 'Suspended', value: summary.suspended || 0, icon: '🚫', color: '#f43f5e' },
        ].map((c, i) => (
          <div key={i} className="admin-card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#908fa0', marginBottom: 4 }}>{c.icon} {c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters + Add */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="🔍 Tìm kiếm theo tên, email..." value={search} onChange={e => setSearch(e.target.value)} className="admin-input" style={{ flex: 1, minWidth: 220 }} />
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="admin-select">
          <option value="all">Tất cả plan</option>
          <option value="free">Free</option>
          <option value="pro">PRO</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="admin-select">
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button className="admin-btn" onClick={() => setShowAddModal(true)}>➕ Thêm user</button>
      </div>

      {/* Users Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Role</th>
                <th>Plan</th>
                <th>Tasks</th>
                <th>OCR</th>
                <th>Dịch</th>
                <th>TTS</th>
                <th>Voice</th>
                <th>Render</th>
                <th>Lưu trữ</th>
                <th>Đăng nhập</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: '#908fa0' }}>Đang tải...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={12} style={{ textAlign: 'center', padding: 40, color: '#908fa0' }}>Không có người dùng</td></tr>
              ) : users.map((u, i) => (
                <tr key={u.id || i} style={{ cursor: 'pointer' }} onClick={() => setExpandedUser(expandedUser === u.email ? null : u.email)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 16, background: 'linear-gradient(135deg, #818cf8, #62d6ed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {(u.name || u.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name || '—'}</div>
                        <div style={{ fontSize: 11, color: '#908fa0' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><RoleBadge role={u.role} /></td>
                  <td><PlanBadge plan={u.plan} /></td>
                  <td style={{ color: '#c7c4d7', textAlign: 'center' }}>{u.stats?.tasksCreated || 0}</td>
                  <td style={{ color: '#62d6ed', textAlign: 'center', fontSize: 12 }}>{formatNumber(u.stats?.ocrCharacters || 0)}</td>
                  <td style={{ color: '#818cf8', textAlign: 'center', fontSize: 12 }}>{formatNumber(u.stats?.translatedCharacters || 0)}</td>
                  <td style={{ color: '#a78bfa', textAlign: 'center', fontSize: 12 }}>{formatNumber(u.stats?.ttsCharacters || 0)}</td>
                  <td style={{ color: '#10b981', textAlign: 'center' }}>{u.stats?.voiceoversCreated || 0}</td>
                  <td style={{ color: '#ec4899', textAlign: 'center' }}>{u.stats?.videosRendered || 0}</td>
                  <td style={{ color: '#f59e0b', textAlign: 'center', fontSize: 12 }}>{u.stats?.totalStorageMB || 0} MB</td>
                  <td style={{ color: '#908fa0', fontSize: 11 }}>
                    <div>{u.loginCount || 0} lần</div>
                    <div>{timeAgo(u.lastLoginAt)}</div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="admin-btn-sm" style={{ color: '#818cf8' }} title="Sửa" onClick={() => setEditingUser(u)}>✏️</button>
                      <button className="admin-btn-sm" style={{ color: u.status === 'suspended' ? '#10b981' : '#f59e0b' }} title={u.status === 'suspended' ? 'Mở khóa' : 'Khóa'}
                        onClick={() => handleUpdateUser(u.email, { status: u.status === 'suspended' ? 'active' : 'suspended' })}>
                        {u.status === 'suspended' ? '🔓' : '🔒'}
                      </button>
                      <button className="admin-btn-sm" style={{ color: '#f43f5e' }} onClick={() => handleDelete(u.email)} disabled={deleting === u.email} title="Xóa">
                        {deleting === u.email ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded User Details */}
      {expandedUser && (() => {
        const u = users.find(usr => usr.email === expandedUser);
        if (!u) return null;
        const s = u.stats || {};
        return (
          <div className="admin-card" style={{ padding: 24, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 24, background: 'linear-gradient(135deg, #818cf8, #62d6ed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700 }}>
                  {(u.name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#dfe2eb' }}>{u.name}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#908fa0' }}>{u.email} • Đăng ký {formatDate(u.createdAt)}</p>
                </div>
              </div>
              <button className="admin-btn-sm" onClick={() => setExpandedUser(null)} style={{ fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {[
                { label: 'Tasks tạo', value: s.tasksCreated || 0, icon: '📋', color: '#818cf8' },
                { label: 'Video upload', value: s.videosUploaded || 0, icon: '📤', color: '#62d6ed' },
                { label: 'Video render', value: s.videosRendered || 0, icon: '🎞️', color: '#ec4899' },
                { label: 'Subtitles', value: formatNumber(s.subtitlesExtracted || 0), icon: '📝', color: '#10b981' },
                { label: 'Ký tự OCR', value: formatNumber(s.ocrCharacters || 0), icon: '🔍', color: '#62d6ed' },
                { label: 'Ký tự dịch', value: formatNumber(s.translatedCharacters || 0), icon: '🌐', color: '#818cf8' },
                { label: 'Ký tự TTS', value: formatNumber(s.ttsCharacters || 0), icon: '🗣️', color: '#a78bfa' },
                { label: 'Lồng tiếng', value: s.voiceoversCreated || 0, icon: '🎤', color: '#f59e0b' },
                { label: 'Phút xử lý', value: s.totalMinutesProcessed || 0, icon: '⏱️', color: '#10b981' },
                { label: 'Lưu trữ', value: `${s.totalStorageMB || 0} MB`, icon: '💾', color: '#f59e0b' },
              ].map((c, i) => (
                <div key={i} style={{ padding: '12px 14px', background: '#181c22', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: '#908fa0', marginBottom: 3 }}>{c.icon} {c.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button className="admin-btn-sm" disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)}>← Trước</button>
          <span style={{ color: '#908fa0', fontSize: 13 }}>Trang {pagination.page} / {pagination.totalPages} ({pagination.total} users)</span>
          <button className="admin-btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchUsers(pagination.page + 1)}>Sau →</button>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }} onClick={() => setEditingUser(null)}>
          <div style={{ background: '#161b22', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: 28, width: 420, maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#dfe2eb' }}>✏️ Chỉnh sửa: {editingUser.name}</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#908fa0', marginBottom: 6 }}>Tên</label>
              <input className="admin-input" style={{ width: '100%' }} value={editingUser.name || ''} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#908fa0', marginBottom: 6 }}>Role</label>
              <select className="admin-select" style={{ width: '100%' }} value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#908fa0', marginBottom: 6 }}>Plan</label>
              <select className="admin-select" style={{ width: '100%' }} value={editingUser.plan} onChange={e => setEditingUser({ ...editingUser, plan: e.target.value })}>
                <option value="free">Free</option>
                <option value="pro">PRO</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#908fa0', marginBottom: 6 }}>Trạng thái</label>
              <select className="admin-select" style={{ width: '100%' }} value={editingUser.status} onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="admin-btn-sm" style={{ flex: 1, padding: 12 }} onClick={() => setEditingUser(null)}>Hủy</button>
              <button className="admin-btn" style={{ flex: 1 }} onClick={() => handleUpdateUser(editingUser.email, { name: editingUser.name, role: editingUser.role, plan: editingUser.plan, status: editingUser.status })}>💾 Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }} onClick={() => setShowAddModal(false)}>
          <div style={{ background: '#161b22', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: 28, width: 420, maxWidth: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#dfe2eb' }}>➕ Thêm người dùng mới</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#908fa0', marginBottom: 6 }}>Email *</label>
              <input className="admin-input" style={{ width: '100%' }} placeholder="user@email.com" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#908fa0', marginBottom: 6 }}>Tên</label>
              <input className="admin-input" style={{ width: '100%' }} placeholder="Họ và tên" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#908fa0', marginBottom: 6 }}>Role</label>
                <select className="admin-select" style={{ width: '100%' }} value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#908fa0', marginBottom: 6 }}>Plan</label>
                <select className="admin-select" style={{ width: '100%' }} value={newUser.plan} onChange={e => setNewUser({ ...newUser, plan: e.target.value })}>
                  <option value="free">Free</option>
                  <option value="pro">PRO</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="admin-btn-sm" style={{ flex: 1, padding: 12 }} onClick={() => setShowAddModal(false)}>Hủy</button>
              <button className="admin-btn" style={{ flex: 1 }} onClick={handleAddUser}>➕ Tạo user</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN ADMIN PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: #0d1117;
          color: #dfe2eb;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        .admin-sidebar {
          width: ${sidebarCollapsed ? '64px' : '240px'};
          background: #10141a;
          border-right: 1px solid rgba(255,255,255,0.04);
          display: flex;
          flex-direction: column;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 100;
          overflow: hidden;
        }
        .admin-sidebar-logo {
          padding: 20px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .admin-sidebar-logo h1 {
          font-size: 16px;
          font-weight: 700;
          background: linear-gradient(135deg, #c0c1ff, #62d6ed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          white-space: nowrap;
          margin: 0;
        }
        .admin-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          color: #908fa0;
          font-size: 14px;
          transition: all 0.2s;
          border-left: 3px solid transparent;
          white-space: nowrap;
        }
        .admin-nav-item:hover {
          background: rgba(192,193,255,0.05);
          color: #c0c1ff;
        }
        .admin-nav-item.active {
          background: rgba(192,193,255,0.08);
          color: #c0c1ff;
          border-left-color: #818cf8;
        }
        .admin-main {
          flex: 1;
          margin-left: ${sidebarCollapsed ? '64px' : '240px'};
          transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .admin-header {
          padding: 16px 32px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #10141a;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .admin-content {
          padding: 24px 32px;
        }
        .admin-card {
          background: #161b22;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.04);
          transition: border-color 0.2s;
        }
        .admin-card:hover {
          border-color: rgba(255,255,255,0.08);
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .admin-table th {
          text-align: left;
          padding: 12px 16px;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #908fa0;
          background: #181c22;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          white-space: nowrap;
        }
        .admin-table td {
          padding: 10px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.02);
          color: #dfe2eb;
        }
        .admin-table tbody tr:hover {
          background: rgba(192,193,255,0.03);
        }
        .admin-input {
          background: #1c2026;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 10px 14px;
          color: #dfe2eb;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .admin-input:focus {
          border-color: #818cf8;
        }
        .admin-select {
          background: #1c2026;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          padding: 10px 14px;
          color: #dfe2eb;
          font-size: 14px;
          outline: none;
          cursor: pointer;
        }
        .admin-select option {
          background: #1c2026;
          color: #dfe2eb;
        }
        .admin-btn {
          background: linear-gradient(135deg, #818cf8, #6366f1);
          border: none;
          border-radius: 8px;
          padding: 10px 18px;
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .admin-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
        }
        .admin-btn-sm {
          background: none;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 6px;
          padding: 5px 10px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.15s;
        }
        .admin-btn-sm:hover {
          background: rgba(255,255,255,0.05);
        }
        .admin-btn-sm:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .admin-collapse-btn {
          background: none;
          border: none;
          color: #908fa0;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          font-size: 18px;
          transition: all 0.2s;
        }
        .admin-collapse-btn:hover {
          background: rgba(255,255,255,0.05);
          color: #dfe2eb;
        }
        .admin-live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          animation: pulse-dot 2s infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(16,185,129,0); }
        }
        @media (max-width: 768px) {
          .admin-sidebar { width: 64px !important; }
          .admin-main { margin-left: 64px !important; }
          .admin-content { padding: 16px; }
          .admin-header { padding: 12px 16px; }
        }
      `}</style>

      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-logo">
            <span style={{ fontSize: 24 }}>🎬</span>
            {!sidebarCollapsed && <h1>B2Vision Admin</h1>}
          </div>
          <nav style={{ flex: 1, padding: '8px 0' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`admin-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{tab.label.split(' ')[0]}</span>
                {!sidebarCollapsed && <span>{tab.label.split(' ').slice(1).join(' ')}</span>}
              </button>
            ))}
          </nav>
          <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <button className="admin-collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ width: '100%' }}>
              {sidebarCollapsed ? '→' : '← Thu gọn'}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="admin-main">
          <header className="admin-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
                {TABS.find(t => t.id === activeTab)?.label}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#908fa0' }}>
                B2Vision Platform Administration
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="admin-live-dot" />
              <span style={{ fontSize: 12, color: '#10b981' }}>Live</span>
              <span style={{ fontSize: 12, color: '#908fa0' }}>Auto-refresh 30s</span>
            </div>
          </header>

          <div className="admin-content">
            {activeTab === 'overview' && <OverviewTab stats={stats} />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'tasks' && <TasksTab />}
            {activeTab === 'rendered' && <RenderedTab />}
            {activeTab === 'analytics' && <AnalyticsTab stats={stats} />}
            {activeTab === 'system' && <SystemTab stats={stats} />}
          </div>
        </main>
      </div>
    </>
  );
}

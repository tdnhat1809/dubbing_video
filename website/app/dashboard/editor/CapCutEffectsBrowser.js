'use client';
import { useState, useEffect, useMemo } from 'react';

const CATEGORY_META = {
  transitions: { icon: '🔀', label: 'Transitions', desc: 'Hiệu ứng chuyển cảnh' },
  video_effects_scene: { icon: '🎬', label: 'Scene Effects', desc: 'Hiệu ứng cảnh' },
  video_effects_character: { icon: '👤', label: 'Character Effects', desc: 'Hiệu ứng nhân vật' },
  text_intro_animations: { icon: '✍️', label: 'Text Intro', desc: 'Animation chữ vào' },
  text_outro_animations: { icon: '📝', label: 'Text Outro', desc: 'Animation chữ ra' },
  text_loop_animations: { icon: '🔄', label: 'Text Loop', desc: 'Animation chữ lặp' },
  video_intro_animations: { icon: '🎥', label: 'Video Intro', desc: 'Animation video vào' },
  video_outro_animations: { icon: '🎞️', label: 'Video Outro', desc: 'Animation video ra' },
  video_group_animations: { icon: '🎭', label: 'Group Animations', desc: 'Animation nhóm' },
};

// Maps effect name keywords to CSS animation names
const ANIM_KEYWORD_MAP = [
  { kw: ['fade', 'dissolve', 'black'], anim: 'ccFade' },
  { kw: ['slide', 'wipe', 'sweep'], anim: 'ccSlide' },
  { kw: ['zoom', 'scale', 'inhale'], anim: 'ccZoom' },
  { kw: ['rotate', 'spin', 'swirl', 'cw'], anim: 'ccRotate' },
  { kw: ['shake', 'wobble'], anim: 'ccShake' },
  { kw: ['blur', 'mosaic'], anim: 'ccBlur' },
  { kw: ['flash', 'blink', 'flicker', 'glow'], anim: 'ccFlash' },
  { kw: ['flip'], anim: 'ccFlip' },
  { kw: ['bounce', 'pull', 'push', 'up', 'down'], anim: 'ccBounce' },
  { kw: ['glitch', 'rainbow', 'shimmer', 'twinkle'], anim: 'ccGlitch' },
  { kw: ['fold', 'right', 'left', 'bottom'], anim: 'ccSlide' },
  { kw: ['mix', 'montage', 'snippets'], anim: 'ccMix' },
  { kw: ['particles', 'woosh'], anim: 'ccParticle' },
  { kw: ['smoke', 'camera'], anim: 'ccFade' },
];

function getAnimForEffect(label) {
  const lower = label.toLowerCase();
  for (const entry of ANIM_KEYWORD_MAP) {
    if (entry.kw.some(k => lower.includes(k))) return entry.anim;
  }
  // Fallback based on hash
  const anims = ['ccFade','ccSlide','ccZoom','ccBounce','ccRotate','ccFlash'];
  const hash = lower.split('').reduce((a,b) => a + b.charCodeAt(0), 0);
  return anims[hash % anims.length];
}

const EFFECTS_CSS = `
@keyframes ccFade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.15; }
}
@keyframes ccSlide {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(0); }
  100% { transform: translateX(100%); }
}
@keyframes ccZoom {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.6); }
}
@keyframes ccRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes ccShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px) rotate(-2deg); }
  40% { transform: translateX(4px) rotate(2deg); }
  60% { transform: translateX(-3px) rotate(-1deg); }
  80% { transform: translateX(3px) rotate(1deg); }
}
@keyframes ccBlur {
  0%, 100% { filter: blur(0px); }
  50% { filter: blur(6px); }
}
@keyframes ccFlash {
  0%, 100% { opacity: 1; background-position: 0% 50%; }
  25% { opacity: 0.2; }
  50% { opacity: 1; background-position: 100% 50%; }
  75% { opacity: 0.3; }
}
@keyframes ccFlip {
  0% { transform: perspective(200px) rotateY(0deg); }
  50% { transform: perspective(200px) rotateY(180deg); }
  100% { transform: perspective(200px) rotateY(360deg); }
}
@keyframes ccBounce {
  0%, 100% { transform: translateY(0); }
  30% { transform: translateY(-8px); }
  50% { transform: translateY(0); }
  70% { transform: translateY(-4px); }
}
@keyframes ccGlitch {
  0%, 100% { transform: translate(0); filter: hue-rotate(0deg); }
  20% { transform: translate(-3px, 2px); filter: hue-rotate(90deg); }
  40% { transform: translate(3px, -2px); filter: hue-rotate(180deg); }
  60% { transform: translate(-2px, -1px); filter: hue-rotate(270deg); }
  80% { transform: translate(2px, 1px); filter: hue-rotate(360deg); }
}
@keyframes ccMix {
  0% { clip-path: inset(0 100% 0 0); }
  50% { clip-path: inset(0 0 0 0); }
  100% { clip-path: inset(0 0 0 100%); }
}
@keyframes ccParticle {
  0% { transform: scale(0) rotate(0deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
  100% { transform: scale(0) rotate(360deg); opacity: 0; }
}
`;

const PREVIEW_COLORS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
];

export default function CapCutEffectsBrowser({ isOpen, onClose, taskId, onExport }) {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('transitions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEffects, setSelectedEffects] = useState({});
  const [previewEffect, setPreviewEffect] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  useEffect(() => {
    if (isOpen && !catalog) {
      fetch('/api/capcut-effects')
        .then(r => r.json())
        .then(data => {
          if (data.success) setCatalog(data.catalog);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen, catalog]);

  const filteredEffects = useMemo(() => {
    if (!catalog || !catalog[activeCategory]) return [];
    const effects = catalog[activeCategory];
    if (!searchQuery) return effects;
    const q = searchQuery.toLowerCase();
    return effects.filter(e => e.label.toLowerCase().includes(q) || e.id.toLowerCase().includes(q));
  }, [catalog, activeCategory, searchQuery]);

  const totalSelected = Object.values(selectedEffects).filter(Boolean).length;

  const toggleEffect = (category, effectId) => {
    const key = `${category}:${effectId}`;
    setSelectedEffects(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = { category, effectId };
      return next;
    });
  };

  const handleExport = async () => {
    if (!taskId) return;
    setExporting(true);
    setExportResult(null);
    try {
      const sel = Object.values(selectedEffects);
      const transition = sel.find(s => s.category === 'transitions');
      const videoEffect = sel.find(s => s.category.startsWith('video_effects'));
      const textIntro = sel.find(s => s.category === 'text_intro_animations');

      const res = await fetch('/api/export-capcut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          effects: {
            transition: transition?.effectId || null,
            videoEffect: videoEffect?.effectId || null,
            textIntro: textIntro?.effectId || null,
            addSubtitle: true,
            addDubbedAudio: true,
          },
        }),
      });
      const data = await res.json();
      setExportResult(data);
      if (data.success && onExport) onExport(data);
    } catch (err) {
      setExportResult({ error: err.message });
    }
    setExporting(false);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <style>{EFFECTS_CSS}</style>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={{ fontSize: 24 }}>🎬</span>
            <h2 style={styles.title}>CapCut Effects Browser</h2>
            <span style={styles.badge}>{catalog ? Object.values(catalog).flat().length : 0} effects</span>
          </div>
          <div style={styles.headerRight}>
            {totalSelected > 0 && (
              <span style={styles.selectedBadge}>{totalSelected} selected</span>
            )}
            <button style={styles.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Search */}
        <div style={styles.searchBar}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            style={styles.searchInput}
            placeholder="Tìm hiệu ứng..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button style={styles.clearBtn} onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <div style={styles.body}>
          {/* Category Sidebar */}
          <div style={styles.sidebar}>
            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const count = catalog?.[key]?.length || 0;
              const hasSelected = Object.values(selectedEffects).some(s => s.category === key);
              return (
                <button
                  key={key}
                  style={{
                    ...styles.catBtn,
                    ...(activeCategory === key ? styles.catBtnActive : {}),
                    ...(hasSelected ? styles.catBtnHasSelected : {}),
                  }}
                  onClick={() => { setActiveCategory(key); setSearchQuery(''); }}
                >
                  <span style={styles.catIcon}>{meta.icon}</span>
                  <div style={styles.catInfo}>
                    <span style={styles.catLabel}>{meta.label}</span>
                    <span style={styles.catCount}>{count}</span>
                  </div>
                  {hasSelected && <span style={styles.catDot}>●</span>}
                </button>
              );
            })}
          </div>

          {/* Effects Grid */}
          <div style={styles.content}>
            <div style={styles.contentHeader}>
              <h3 style={styles.contentTitle}>
                {CATEGORY_META[activeCategory]?.icon} {CATEGORY_META[activeCategory]?.label}
              </h3>
              <span style={styles.contentDesc}>
                {CATEGORY_META[activeCategory]?.desc} — {filteredEffects.length} items
              </span>
            </div>

            {loading ? (
              <div style={styles.loadingState}>
                <div style={styles.spinner} />
                <p>Loading effects catalog...</p>
              </div>
            ) : (
              <div style={styles.grid}>
                {filteredEffects.map((effect, idx) => {
                  const key = `${activeCategory}:${effect.id}`;
                  const isSelected = !!selectedEffects[key];
                  const isPreviewing = previewEffect === key;
                  const bg = PREVIEW_COLORS[idx % PREVIEW_COLORS.length];
                  const animName = getAnimForEffect(effect.label);
                  const animDuration = animName === 'ccRotate' ? '2s' : '1.5s';
                  return (
                    <div
                      key={effect.id}
                      style={{
                        ...styles.effectCard,
                        ...(isSelected ? styles.effectCardSelected : {}),
                        ...(isPreviewing ? styles.effectCardPreview : {}),
                      }}
                      onClick={() => toggleEffect(activeCategory, effect.id)}
                      onMouseEnter={() => setPreviewEffect(key)}
                      onMouseLeave={() => setPreviewEffect(null)}
                    >
                      <div style={{ ...styles.effectThumb, background: bg, overflow: 'hidden', position: 'relative' }}>
                        {/* Animated inner element */}
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'inherit',
                          animation: isPreviewing ? `${animName} ${animDuration} ease-in-out infinite` : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isPreviewing && (
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                              {animName.replace('cc','')}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <div style={styles.checkmark}>✓</div>
                        )}
                      </div>
                      <div style={styles.effectName}>
                        {effect.label.length > 20 ? effect.label.substring(0, 18) + '…' : effect.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        {previewEffect && (
          <div style={styles.previewPanel}>
            <div style={styles.previewBox}>
              <div style={{
                ...styles.previewVisual,
                background: PREVIEW_COLORS[Math.abs(previewEffect.split('').reduce((a,b) => a + b.charCodeAt(0), 0)) % PREVIEW_COLORS.length],
              }}>
                <span style={{ fontSize: 48 }}>
                  {CATEGORY_META[previewEffect.split(':')[0]]?.icon || '✨'}
                </span>
              </div>
              <div style={styles.previewInfo}>
                <strong>{previewEffect.split(':')[1]?.replace(/_/g, ' ')}</strong>
                <span style={styles.previewCat}>{CATEGORY_META[previewEffect.split(':')[0]]?.label}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer - Export */}
        <div style={styles.footer}>
          {exportResult && (
            <div style={{
              ...styles.exportMsg,
              background: exportResult.success ? '#10b981' : '#ef4444',
            }}>
              {exportResult.success
                ? `✅ Draft CapCut đã tạo! Mở CapCut để xem project.`
                : `❌ ${exportResult.error || 'Export failed'}`}
              {exportResult.hint && <div style={{ fontSize: 11, marginTop: 4 }}>{exportResult.hint}</div>}
            </div>
          )}
          <div style={styles.footerActions}>
            <button style={styles.cancelBtn} onClick={onClose}>Đóng</button>
            <button
              style={{
                ...styles.exportBtn,
                opacity: totalSelected === 0 || exporting ? 0.5 : 1,
              }}
              onClick={handleExport}
              disabled={totalSelected === 0 || exporting}
            >
              {exporting ? '⏳ Đang xuất...' : `🎬 Xuất CapCut Draft (${totalSelected} effects)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  modal: {
    background: '#1a1a2e', borderRadius: 16, width: '92vw', maxWidth: 1200, height: '88vh',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(135deg, #16213e 0%, #1a1a2e 100%)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12 },
  title: { margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' },
  badge: {
    background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '4px 10px',
    borderRadius: 20, fontSize: 12, fontWeight: 600,
  },
  selectedBadge: {
    background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '4px 10px',
    borderRadius: 20, fontSize: 12, fontWeight: 600,
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.1)', border: 'none', color: '#999',
    width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16,
  },
  searchBar: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)',
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: '#fff', fontSize: 14, padding: '6px 0',
  },
  clearBtn: {
    background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14,
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar: {
    width: 200, borderRight: '1px solid rgba(255,255,255,0.06)',
    overflowY: 'auto', padding: '8px', flexShrink: 0,
    background: 'rgba(0,0,0,0.15)',
  },
  catBtn: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '10px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
    background: 'transparent', color: '#999', fontSize: 13, textAlign: 'left',
    marginBottom: 2, transition: 'all 0.15s',
  },
  catBtnActive: {
    background: 'rgba(99,102,241,0.15)', color: '#fff',
    boxShadow: 'inset 3px 0 0 #6366f1',
  },
  catBtnHasSelected: { color: '#34d399' },
  catIcon: { fontSize: 18, flexShrink: 0 },
  catInfo: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 },
  catLabel: { fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  catCount: { fontSize: 11, opacity: 0.6 },
  catDot: { color: '#34d399', fontSize: 10 },
  content: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  contentHeader: {
    padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  contentTitle: { margin: 0, fontSize: 15, color: '#fff', fontWeight: 600 },
  contentDesc: { fontSize: 12, color: '#888' },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: 8, padding: 12, overflowY: 'auto', flex: 1,
  },
  effectCard: {
    borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.15s',
    background: 'rgba(255,255,255,0.04)', minHeight: 52,
  },
  effectCardSelected: {
    border: '2px solid #6366f1', boxShadow: '0 0 16px rgba(99,102,241,0.3)',
    background: 'rgba(99,102,241,0.08)',
  },
  effectCardPreview: { transform: 'scale(1.03)', boxShadow: '0 6px 20px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)' },
  effectThumb: {
    height: 28, position: 'relative', overflow: 'hidden',
  },
  effectLabel: {
    fontSize: 11, fontWeight: 700, color: '#fff', textAlign: 'center',
    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
    padding: '0 6px', lineHeight: 1.2,
  },
  effectName: {
    padding: '6px 8px', fontSize: 11, color: '#ddd', textAlign: 'center',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    fontWeight: 500, background: 'rgba(0,0,0,0.2)',
  },
  previewOverlay: {
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  previewText: { color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: 1 },
  checkmark: {
    position: 'absolute', top: 6, right: 6, width: 22, height: 22,
    background: '#6366f1', borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', color: '#fff',
    fontSize: 12, fontWeight: 700,
  },
  effectName: {
    padding: '5px 6px', fontSize: 10, color: '#ccc', textAlign: 'center',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    fontWeight: 500,
  },
  previewPanel: {
    position: 'absolute', bottom: 80, right: 24, width: 220,
    background: '#0f0f23', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  },
  previewBox: { display: 'flex', flexDirection: 'column', gap: 8 },
  previewVisual: {
    height: 100, borderRadius: 8, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  previewInfo: {
    display: 'flex', flexDirection: 'column', gap: 2,
    color: '#fff', fontSize: 13,
  },
  previewCat: { fontSize: 11, color: '#888' },
  loadingState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', flex: 1, color: '#888', gap: 12,
  },
  spinner: {
    width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)',
    borderTopColor: '#6366f1', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 24px',
    background: 'rgba(0,0,0,0.2)',
  },
  footerActions: { display: 'flex', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: {
    padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent', color: '#999', cursor: 'pointer', fontSize: 13,
  },
  exportBtn: {
    padding: '10px 24px', borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
  },
  exportMsg: {
    padding: '8px 14px', borderRadius: 8, color: '#fff',
    fontSize: 13, marginBottom: 10,
  },
};

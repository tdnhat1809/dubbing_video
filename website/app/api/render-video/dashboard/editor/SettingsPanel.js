'use client';
import { useState } from 'react';

const fonts = ['Roboto', 'Be Vietnam Pro', 'Inter', 'Noto Sans SC', 'Arial', 'Montserrat'];
const fontStyles = ['In Đậm', 'Nghiêng', 'Thường', 'In Đậm Nghiêng'];

export default function SettingsPanel({ settings, onSettingsChange }) {
  const s = settings || {};
  const update = (key, val) => onSettingsChange?.({ ...s, [key]: val });

  return (
    <div className="w-[220px] shrink-0 flex flex-col overflow-y-auto custom-scrollbar" style={{ background: '#14141f', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Import Button */}
      <button className="mx-3 mt-3 mb-2 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
        Nhập cài đặt
        <span className="material-symbols-outlined text-sm">expand_more</span>
      </button>

      <div className="px-3 space-y-2.5 pb-4">
        {/* Toggles */}
        {[
          { key: 'autoSave', label: 'Lưu tự động', default: true },
          { key: 'autoScroll', label: 'Cuộn Timeline tự động', default: true },
          { key: 'showDeleted', label: 'Hiện dòng đã xóa trên video', default: false },
          { key: 'hideDeleted', label: 'Ẩn dòng đã xóa', default: true },
          { key: 'showDubCheck', label: 'Hiện hộp đánh dấu lồng tiếng', default: true },
          { key: 'showSecondary', label: 'Hiện dòng văn bản phụ', default: true },
          { key: 'refreshDub', label: 'Làm mới lồng tiếng', default: true },
        ].map(toggle => (
          <div key={toggle.key} className="flex items-center justify-between">
            <span className="text-white/60 text-[11px] leading-tight flex-1 pr-2">{toggle.label}:</span>
            <button
              className={`w-9 h-5 rounded-full relative transition-colors ${(s[toggle.key] ?? toggle.default) ? 'bg-[#6366f1]' : 'bg-white/10'}`}
              onClick={() => update(toggle.key, !(s[toggle.key] ?? toggle.default))}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${(s[toggle.key] ?? toggle.default) ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </div>
        ))}

        {/* Divider */}
        <div className="border-t border-white/5 pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-[11px]">Tốc độ video:</span>
            <input type="number" value={s.videoSpeed ?? 1} onChange={e => update('videoSpeed', parseFloat(e.target.value) || 1)}
              className="w-10 text-center text-white text-xs rounded px-1 py-0.5" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)' }}
              min="0.25" max="4" step="0.25" />
          </div>
          <input type="range" min="25" max="400" value={(s.videoSpeed ?? 1) * 100}
            onChange={e => update('videoSpeed', parseInt(e.target.value) / 100)}
            className="w-full accent-[#62d6ed]" />
        </div>

        {/* Batch edit */}
        <div className="border-t border-white/5 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-white/60 text-[11px]">Chỉnh sửa hàng loạt:</span>
            <input type="checkbox" checked={s.batchEdit ?? true} onChange={e => update('batchEdit', e.target.checked)} className="accent-[#6366f1]" />
          </label>
        </div>

        {/* Font */}
        <div className="border-t border-white/5 pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-[11px]">Font chữ:</span>
            <select value={s.fontFamily ?? 'Roboto'} onChange={e => update('fontFamily', e.target.value)}
              className="text-white text-xs rounded px-1 py-0.5 bg-[#0d1117] border border-white/10 focus:outline-none w-[90px]">
              {fonts.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/60 text-[11px]">Kiểu chữ:</span>
            <select value={s.fontStyle ?? 'In Đậm'} onChange={e => update('fontStyle', e.target.value)}
              className="text-white text-xs rounded px-1 py-0.5 bg-[#0d1117] border border-white/10 focus:outline-none w-[90px]">
              {fontStyles.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/60 text-[11px]">Cỡ viền:</span>
            <input type="number" value={s.borderSize ?? 0} onChange={e => update('borderSize', parseInt(e.target.value) || 0)}
              className="w-10 text-center text-white text-xs rounded px-1 py-0.5" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)' }}
              min="0" max="10" />
          </div>
        </div>

        {/* Color */}
        <div className="border-t border-white/5 pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/60 text-[11px]">Màu chữ:</span>
            <input type="color" value={s.textColor ?? '#ffffff'} onChange={e => update('textColor', e.target.value)}
              className="w-8 h-5 rounded cursor-pointer border-0" style={{ background: 'none' }} />
          </div>

          <div className="flex items-center gap-2">
            <input type="range" min="0" max="100" value={s.textOpacity ?? 100} onChange={e => update('textOpacity', parseInt(e.target.value))}
              className="flex-1 accent-[#62d6ed]" />
            <span className="text-white/50 text-[10px] w-8 text-right">{s.textOpacity ?? 100} %</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white/60 text-[11px]">Màu nền:</span>
            <input type="color" value={s.bgColor ?? '#000000'} onChange={e => update('bgColor', e.target.value)}
              className="w-8 h-5 rounded cursor-pointer border-0" style={{ background: 'none' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

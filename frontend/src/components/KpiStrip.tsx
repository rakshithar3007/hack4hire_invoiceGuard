import React from 'react';

export interface KpiItem {
  key: string;
  label: string;
  value: number | string;
  subtext?: string;
  active?: boolean;
  onClick?: () => void;
  badge?: {
    text: string;
    type?: 'default' | 'warning' | 'danger' | 'success';
  };
}

interface KpiStripProps {
  items: KpiItem[];
  className?: string;
  loading?: boolean;
}

export const KpiStrip: React.FC<KpiStripProps> = ({ items, className = '', loading = false }) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 ${className}`}>
      {items.map((item) => {
        const isClickable = Boolean(item.onClick);
        return (
          <button
            key={item.key}
            type="button"
            disabled={!isClickable || loading}
            onClick={item.onClick}
            className={`text-left p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden transition-all duration-200 group ${
              isClickable
                ? 'hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-300 cursor-pointer active:translate-y-0'
                : 'cursor-default'
            } ${item.active ? 'ring-2 ring-indigo-600 border-indigo-600 bg-indigo-50/20' : ''}`}
          >
            {/* Top Hover Gradient Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase truncate">
                {item.label}
              </span>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                    item.badge.type === 'danger'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : item.badge.type === 'warning'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : item.badge.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {item.badge.text}
                </span>
              )}
            </div>

            <div className="text-2xl font-black text-slate-900 tracking-tight font-sans tabular-nums">
              {loading ? (
                <span className="inline-block w-12 h-6 bg-slate-100 animate-pulse rounded" />
              ) : (
                item.value
              )}
            </div>

            {item.subtext && (
              <p className="text-[11px] text-slate-500 mt-1 truncate group-hover:text-slate-700 transition-colors">
                {item.subtext}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
};

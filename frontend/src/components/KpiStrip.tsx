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
    <div
      className={`bg-white border border-[#E4E8EF] rounded-[6px] divide-y sm:divide-y-0 sm:divide-x divide-[#E4E8EF] flex flex-col sm:flex-row shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden ${className}`}
    >
      {items.map((item) => {
        const isClickable = Boolean(item.onClick);
        return (
          <button
            key={item.key}
            type="button"
            disabled={!isClickable || loading}
            onClick={item.onClick}
            className={`flex-1 p-3.5 text-left transition-colors focus:outline-none focus:bg-[#F7F8FA] ${
              isClickable ? 'hover:bg-[#F7F8FA] cursor-pointer' : 'cursor-default'
            } ${item.active ? 'bg-[#F7F8FA] border-b-2 sm:border-b-0 sm:border-t-2 border-[#2457A6]' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#697386]">
                {item.label}
              </span>
              {item.badge && (
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.2 rounded-[3px] border ${
                    item.badge.type === 'danger'
                      ? 'bg-[#fdf1f1] text-[#C34A4A] border-[#C34A4A]/20'
                      : item.badge.type === 'warning'
                      ? 'bg-[#fdf6e9] text-[#C58A24] border-[#C58A24]/20'
                      : item.badge.type === 'success'
                      ? 'bg-[#edf7f2] text-[#21845B] border-[#21845B]/20'
                      : 'bg-[#F7F8FA] text-[#697386] border-[#E4E8EF]'
                  }`}
                >
                  {item.badge.text}
                </span>
              )}
            </div>
            <div className="text-xl font-bold text-[#172033] tabular-nums tracking-tight">
              {loading ? (
                <span className="inline-block w-8 h-5 bg-[#EEF1F6] animate-pulse rounded-[3px]" />
              ) : (
                item.value
              )}
            </div>
            {item.subtext && (
              <p className="text-[11px] text-[#697386] mt-0.5 truncate">{item.subtext}</p>
            )}
          </button>
        );
      })}
    </div>
  );
};

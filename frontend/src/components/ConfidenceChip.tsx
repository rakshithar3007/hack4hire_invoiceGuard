import React from 'react';
import { Check, AlertCircle, AlertTriangle } from 'lucide-react';

interface ConfidenceChipProps {
  score: number | null | undefined; // Accept 0..1 or 0..100
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export const ConfidenceChip: React.FC<ConfidenceChipProps> = ({
  score,
  size = 'sm',
  showLabel = true,
  className = ''
}) => {
  if (score === null || score === undefined) {
    return <span className="text-[#697386] text-xs">—</span>;
  }

  // Normalize score to 0..100
  const normalized = score <= 1.0 ? score * 100 : score;
  const rounded = Math.round(normalized);

  let style = {
    bg: 'bg-[#edf7f2]',
    text: 'text-[#21845B]',
    border: 'border-[#21845B]/30',
    icon: Check,
    label: 'High'
  };

  if (normalized < 70) {
    style = {
      bg: 'bg-[#fdf1f1]',
      text: 'text-[#C34A4A]',
      border: 'border-[#C34A4A]/30',
      icon: AlertCircle,
      label: 'Low'
    };
  } else if (normalized < 90) {
    style = {
      bg: 'bg-[#fdf6e9]',
      text: 'text-[#C58A24]',
      border: 'border-[#C58A24]/30',
      icon: AlertTriangle,
      label: 'Med'
    };
  }

  const Icon = style.icon;
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono tabular-nums rounded-[4px] border ${style.bg} ${style.text} ${style.border} ${padding} ${className}`}
      title={`Confidence score: ${rounded}% (${style.label})`}
    >
      <Icon size={11} aria-hidden="true" />
      <span>{rounded}%</span>
      {showLabel && <span className="text-[10px] uppercase font-sans font-medium tracking-wider opacity-85">({style.label})</span>}
    </span>
  );
};

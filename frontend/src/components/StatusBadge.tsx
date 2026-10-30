import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  AlertOctagon,
  FileSearch
} from 'lucide-react';

export type BadgeVariant =
  | 'APPROVED'
  | 'PASSED'
  | 'PASS'
  | 'LOW'
  | 'COMPLETED'
  | 'PENDING'
  | 'MEDIUM'
  | 'WARNING'
  | 'REJECTED'
  | 'FAILED'
  | 'FAIL'
  | 'HIGH'
  | 'ESCALATED'
  | 'MANUAL_INVESTIGATION'
  | 'PROCESSING'
  | 'NEUTRAL';

interface StatusBadgeProps {
  status: string | null | undefined;
  size?: 'sm' | 'md';
  customLabel?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  customLabel,
  className = ''
}) => {
  const normStatus = (status || 'PENDING').toUpperCase() as BadgeVariant;
  const label = customLabel || status || 'Pending';

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px] gap-1 font-medium' : 'px-2.5 py-0.5 text-[11px] gap-1.5 font-medium';
  const iconSize = size === 'sm' ? 11 : 12;

  let config = {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700 font-semibold',
    border: 'border-emerald-200/80',
    icon: CheckCircle2,
    pulse: false
  };

  switch (normStatus) {
    case 'APPROVED':
    case 'PASSED':
    case 'PASS':
    case 'LOW':
    case 'COMPLETED':
      config = {
        bg: 'bg-emerald-50/90',
        text: 'text-emerald-700 font-semibold',
        border: 'border-emerald-200/90 shadow-[0_0_8px_rgba(16,185,129,0.08)]',
        icon: normStatus === 'LOW' ? ShieldCheck : CheckCircle2,
        pulse: false
      };
      break;

    case 'PENDING':
      config = {
        bg: 'bg-slate-100/80',
        text: 'text-slate-700 font-medium',
        border: 'border-slate-200',
        icon: Clock,
        pulse: false
      };
      break;

    case 'PROCESSING':
      config = {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700 font-semibold',
        border: 'border-indigo-200/80 shadow-[0_0_8px_rgba(99,102,241,0.12)]',
        icon: Clock,
        pulse: true
      };
      break;

    case 'MEDIUM':
    case 'WARNING':
      config = {
        bg: 'bg-amber-50',
        text: 'text-amber-800 font-semibold',
        border: 'border-amber-200/80 shadow-[0_0_8px_rgba(245,158,11,0.08)]',
        icon: AlertTriangle,
        pulse: false
      };
      break;

    case 'REJECTED':
    case 'FAILED':
    case 'FAIL':
      config = {
        bg: 'bg-rose-50',
        text: 'text-rose-700 font-semibold',
        border: 'border-rose-200/80',
        icon: XCircle,
        pulse: false
      };
      break;

    case 'HIGH':
    case 'ESCALATED':
    case 'MANUAL_INVESTIGATION':
      config = {
        bg: 'bg-rose-50',
        text: 'text-rose-700 font-bold',
        border: 'border-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.14)]',
        icon: normStatus === 'HIGH' ? ShieldAlert : AlertOctagon,
        pulse: true
      };
      break;

    default:
      config = {
        bg: 'bg-slate-100',
        text: 'text-slate-800 font-medium',
        border: 'border-slate-200',
        icon: FileSearch,
        pulse: false
      };
  }

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center rounded-full border whitespace-nowrap shrink-0 transition-all duration-150 ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <Icon size={iconSize} className={`shrink-0 ${config.pulse ? 'animate-pulse' : ''}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};

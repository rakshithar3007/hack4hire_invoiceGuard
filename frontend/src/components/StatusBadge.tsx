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

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';
  const iconSize = size === 'sm' ? 12 : 14;

  let config = {
    bg: 'bg-[#edf7f2]',
    text: 'text-[#21845B]',
    border: 'border-[#21845B]/30',
    icon: CheckCircle2
  };

  switch (normStatus) {
    case 'APPROVED':
    case 'PASSED':
    case 'PASS':
    case 'LOW':
    case 'COMPLETED':
      config = {
        bg: 'bg-[#edf7f2]',
        text: 'text-[#21845B]',
        border: 'border-[#21845B]/30',
        icon: normStatus === 'LOW' ? ShieldCheck : CheckCircle2
      };
      break;

    case 'PENDING':
    case 'PROCESSING':
      config = {
        bg: 'bg-[#F7F8FA]',
        text: 'text-[#697386]',
        border: 'border-[#E4E8EF]',
        icon: Clock
      };
      break;

    case 'MEDIUM':
    case 'WARNING':
      config = {
        bg: 'bg-[#fdf6e9]',
        text: 'text-[#C58A24]',
        border: 'border-[#C58A24]/30',
        icon: AlertTriangle
      };
      break;

    case 'REJECTED':
    case 'FAILED':
    case 'FAIL':
      config = {
        bg: 'bg-[#fdf1f1]',
        text: 'text-[#C34A4A]',
        border: 'border-[#C34A4A]/30',
        icon: XCircle
      };
      break;

    case 'HIGH':
    case 'ESCALATED':
    case 'MANUAL_INVESTIGATION':
      config = {
        bg: 'bg-[#fdf1f1]',
        text: 'text-[#C34A4A]',
        border: 'border-[#C34A4A]/40 font-semibold',
        icon: normStatus === 'HIGH' ? ShieldAlert : AlertOctagon
      };
      break;

    default:
      config = {
        bg: 'bg-[#F7F8FA]',
        text: 'text-[#172033]',
        border: 'border-[#E4E8EF]',
        icon: FileSearch
      };
  }

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center font-medium rounded-[4px] border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <Icon size={iconSize} className="shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};

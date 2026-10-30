import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonValue?: string;
  onReasonChange?: (val: string) => void;
  minReasonLength?: number;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  requireReason = false,
  reasonLabel = 'Reason / Justification',
  reasonPlaceholder = 'Enter explanation...',
  reasonValue = '',
  onReasonChange,
  minReasonLength = 5,
  loading = false,
  onConfirm,
  onCancel
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const isReasonValid = !requireReason || (reasonValue.trim().length >= minReasonLength);

  let confirmBtnStyle = 'bg-[#2457A6] hover:bg-[#1c4482] text-white';
  if (variant === 'danger') {
    confirmBtnStyle = 'bg-[#C34A4A] hover:bg-[#a63e3e] text-white';
  } else if (variant === 'warning') {
    confirmBtnStyle = 'bg-[#C58A24] hover:bg-[#a5731c] text-white';
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md bg-white border border-[#E4E8EF] rounded-[6px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E4E8EF] bg-[#F7F8FA]">
          <div className="flex items-center gap-2">
            {variant === 'danger' && <AlertTriangle size={16} className="text-[#C34A4A]" />}
            {variant === 'warning' && <AlertTriangle size={16} className="text-[#C58A24]" />}
            <h3 id="confirm-dialog-title" className="text-sm font-bold text-[#172033]">
              {title}
            </h3>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="text-[#697386] hover:text-[#172033] p-1 rounded-[4px] hover:bg-[#EEF1F6] cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="text-xs text-[#172033] leading-relaxed">{description}</div>

          {requireReason && (
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-semibold text-[#697386] uppercase tracking-wider">
                {reasonLabel} <span className="text-[#C34A4A]">*</span>
              </label>
              <textarea
                rows={3}
                value={reasonValue}
                onChange={(e) => onReasonChange && onReasonChange(e.target.value)}
                placeholder={reasonPlaceholder}
                disabled={loading}
                className="w-full text-xs p-2.5 rounded-[4px] border border-[#E4E8EF] bg-white text-[#172033] focus:border-[#2457A6] focus:ring-1 focus:ring-[#2457A6] focus:outline-none placeholder:text-[#697386]/60 resize-none"
              />
              {requireReason && reasonValue.trim().length < minReasonLength && (
                <p className="text-[11px] text-[#C34A4A]">
                  Minimum {minReasonLength} characters required ({reasonValue.trim().length}/{minReasonLength})
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-3 border-t border-[#E4E8EF] bg-[#F7F8FA]">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium rounded-[4px] border border-[#E4E8EF] bg-white text-[#172033] hover:bg-[#F7F8FA] cursor-pointer transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading || !isReasonValid}
            onClick={onConfirm}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-[4px] cursor-pointer transition disabled:opacity-40 disabled:cursor-not-allowed ${confirmBtnStyle}`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

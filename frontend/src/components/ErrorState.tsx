import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load content',
  message = 'An error occurred while fetching information from the server.',
  onRetry,
  className = ''
}) => {
  return (
    <div
      role="alert"
      className={`p-6 rounded-[6px] border border-[#C34A4A]/25 bg-[#fdf1f1] text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-9 h-9 rounded-[4px] bg-white border border-[#C34A4A]/30 flex items-center justify-center text-[#C34A4A] mb-2.5">
        <AlertCircle size={18} />
      </div>
      <h4 className="text-xs font-bold text-[#172033] mb-1">{title}</h4>
      <p className="text-xs text-[#697386] max-w-sm mb-3">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] border border-[#E4E8EF] bg-white text-[#172033] hover:bg-[#F7F8FA] cursor-pointer transition"
        >
          <RefreshCw size={12} />
          <span>Retry Request</span>
        </button>
      )}
    </div>
  );
};

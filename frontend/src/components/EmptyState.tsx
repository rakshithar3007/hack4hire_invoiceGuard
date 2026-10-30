import React from 'react';
import { Inbox, FileX } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records available',
  description = 'There is currently no data to display.',
  icon,
  action,
  className = ''
}) => {
  return (
    <div className={`p-8 text-center flex flex-col items-center justify-center ${className}`}>
      <div className="w-10 h-10 rounded-[6px] bg-[#F7F8FA] border border-[#E4E8EF] flex items-center justify-center text-[#697386] mb-3">
        {icon || <Inbox size={20} />}
      </div>
      <h4 className="text-xs font-bold text-[#172033] mb-1">{title}</h4>
      <p className="text-xs text-[#697386] max-w-sm mb-4 leading-normal">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-3 py-1.5 text-xs font-semibold rounded-[4px] bg-[#2457A6] text-white hover:bg-[#1c4482] cursor-pointer transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

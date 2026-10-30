import React from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';

export interface StepItem {
  key: string;
  label: string;
  count?: number;
  status: 'completed' | 'active' | 'pending' | 'failed' | 'warning';
  onClick?: () => void;
}

interface PipelineStepperProps {
  steps: StepItem[];
  className?: string;
  activeKey?: string;
}

export const PipelineStepper: React.FC<PipelineStepperProps> = ({
  steps,
  className = '',
  activeKey
}) => {
  return (
    <div
      className={`bg-white border border-[#E4E8EF] rounded-[6px] p-2.5 flex flex-wrap items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
    >
      {steps.map((step, idx) => {
        const isClickable = Boolean(step.onClick);
        const isCurrent = activeKey === step.key;

        let statusStyle = 'bg-[#F7F8FA] text-[#697386] border-[#E4E8EF]';
        let icon = <span className="w-1.5 h-1.5 rounded-full bg-[#697386]" />;

        if (step.status === 'completed') {
          statusStyle = 'bg-[#edf7f2] text-[#21845B] border-[#21845B]/30';
          icon = <Check size={11} strokeWidth={3} />;
        } else if (step.status === 'active') {
          statusStyle = 'bg-[#2457A6] text-white border-[#2457A6] font-semibold';
          icon = <Clock size={11} />;
        } else if (step.status === 'failed') {
          statusStyle = 'bg-[#fdf1f1] text-[#C34A4A] border-[#C34A4A]/30 font-semibold';
          icon = <AlertCircle size={11} />;
        } else if (step.status === 'warning') {
          statusStyle = 'bg-[#fdf6e9] text-[#C58A24] border-[#C58A24]/30 font-semibold';
          icon = <AlertCircle size={11} />;
        }

        return (
          <React.Fragment key={step.key}>
            <button
              type="button"
              disabled={!isClickable}
              onClick={step.onClick}
              className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-[4px] border text-xs transition-colors ${statusStyle} ${
                isClickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'
              } ${isCurrent ? 'ring-2 ring-[#2457A6] ring-offset-1' : ''}`}
            >
              <span className="shrink-0">{icon}</span>
              <span>{step.label}</span>
              {step.count !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-[3px] text-[10px] font-mono tabular-nums ${
                    step.status === 'active' ? 'bg-white/20 text-white' : 'bg-black/5'
                  }`}
                >
                  {step.count}
                </span>
              )}
            </button>
            {idx < steps.length - 1 && (
              <span className="text-[#697386] text-xs font-mono select-none" aria-hidden="true">
                ›
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

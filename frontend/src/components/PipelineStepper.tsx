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
      className={`bg-white border border-slate-200/90 rounded-xl p-3 flex flex-wrap items-center gap-2 shadow-xs ${className}`}
    >
      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
        <span>AP Processing Engine:</span>
      </div>

      {steps.map((step, idx) => {
        const isClickable = Boolean(step.onClick);
        const isCurrent = activeKey === step.key;

        let statusStyle = 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100';
        let icon = <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />;

        if (step.status === 'completed') {
          statusStyle = 'bg-emerald-50/90 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80';
          icon = <Check size={12} strokeWidth={3} className="text-emerald-600" />;
        } else if (step.status === 'active') {
          statusStyle = 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent font-semibold shadow-xs';
          icon = <Clock size={12} className="text-white" />;
        } else if (step.status === 'failed') {
          statusStyle = 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100';
          icon = <AlertCircle size={12} className="text-rose-600" />;
        } else if (step.status === 'warning') {
          statusStyle = 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
          icon = <AlertCircle size={12} className="text-amber-600" />;
        }

        return (
          <React.Fragment key={step.key}>
            <button
              type="button"
              disabled={!isClickable}
              onClick={step.onClick}
              className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs transition-all duration-150 ${statusStyle} ${
                isClickable ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0' : 'cursor-default'
              } ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
            >
              <span className="shrink-0">{icon}</span>
              <span className="font-medium">{step.label}</span>
              {step.count !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums ${
                    step.status === 'active' ? 'bg-white/20 text-white' : 'bg-black/5 text-slate-700'
                  }`}
                >
                  {step.count}
                </span>
              )}
            </button>
            {idx < steps.length - 1 && (
              <span className="text-slate-300 text-xs font-bold select-none" aria-hidden="true">
                →
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

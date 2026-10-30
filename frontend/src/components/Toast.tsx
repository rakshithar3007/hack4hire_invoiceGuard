import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (type: ToastType, title: string, message?: string) => void;
  showToast: (type: ToastType, title: string, message?: string) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const toast = {
    success: (title: string, message?: string) => addToast('success', title, message),
    error: (title: string, message?: string) => addToast('error', title, message),
    warning: (title: string, message?: string) => addToast('warning', title, message),
    info: (title: string, message?: string) => addToast('info', title, message)
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, showToast: addToast, removeToast, toast }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => {
          let style = {
            border: 'border-[#21845B]/30',
            icon: <CheckCircle2 size={16} className="text-[#21845B] shrink-0" />
          };

          if (t.type === 'error') {
            style = {
              border: 'border-[#C34A4A]/30',
              icon: <AlertCircle size={16} className="text-[#C34A4A] shrink-0" />
            };
          } else if (t.type === 'warning') {
            style = {
              border: 'border-[#C58A24]/30',
              icon: <AlertTriangle size={16} className="text-[#C58A24] shrink-0" />
            };
          } else if (t.type === 'info') {
            style = {
              border: 'border-[#2457A6]/30',
              icon: <Info size={16} className="text-[#2457A6] shrink-0" />
            };
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto bg-white border ${style.border} rounded-[6px] p-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-start gap-2.5 animate-in slide-in-from-bottom-2 duration-150`}
            >
              {style.icon}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#172033]">{t.title}</p>
                {t.message && (
                  <p className="text-[11px] text-[#697386] mt-0.5 leading-normal">{t.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-[#697386] hover:text-[#172033] p-0.5 rounded cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

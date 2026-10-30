import React from 'react';
import { RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useServerStatus } from '../contexts/ServerStatusContext';

export const ServerStatusBanner: React.FC = () => {
  const { serverState, elapsedSeconds, checkServer } = useServerStatus();

  if (serverState === 'connected') {
    return null;
  }

  if (serverState === 'waking_up') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-[#fdf6e9] border-b border-[#C58A24]/30 px-4 py-2 text-xs text-[#C58A24] flex items-center justify-between shadow-xs z-50 shrink-0"
      >
        <div className="flex items-center gap-2">
          <RefreshCw size={13} className="animate-spin text-[#C58A24] shrink-0" />
          <span className="font-semibold text-[#172033]">Connecting to server...</span>
          <span className="hidden sm:inline text-[#697386]">
            Render Free backend is waking up ({elapsedSeconds}s). First request may take 25–45s.
          </span>
          <span className="sm:hidden text-[#697386]">Waking up ({elapsedSeconds}s)</span>
        </div>
        <button
          type="button"
          onClick={() => checkServer()}
          className="px-2 py-0.5 rounded-[4px] border border-[#C58A24]/40 bg-white text-[#C58A24] hover:bg-[#F7F8FA] cursor-pointer text-[11px] font-semibold transition shrink-0"
        >
          Check Now
        </button>
      </div>
    );
  }

  if (serverState === 'offline') {
    return (
      <div
        role="alert"
        className="bg-[#fdf1f1] border-b border-[#C34A4A]/30 px-4 py-2 text-xs text-[#C34A4A] flex items-center justify-between shadow-xs z-50 shrink-0"
      >
        <div className="flex items-center gap-2">
          <WifiOff size={14} className="text-[#C34A4A] shrink-0" />
          <span className="font-semibold text-[#172033]">Backend timeout.</span>
          <span className="text-[#697386]">
            Render Free host has not completed waking up ({elapsedSeconds}s). Verify service status or click retry.
          </span>
        </div>
        <button
          type="button"
          onClick={() => checkServer()}
          className="px-2 py-0.5 rounded-[4px] border border-[#C34A4A]/40 bg-white text-[#C34A4A] hover:bg-[#F7F8FA] cursor-pointer text-[11px] font-semibold transition shrink-0"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return null;
};

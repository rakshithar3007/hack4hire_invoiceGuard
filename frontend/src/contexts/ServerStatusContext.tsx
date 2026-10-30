import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export type ServerState = 'checking' | 'connected' | 'waking_up' | 'offline';

interface ServerStatusContextType {
  serverState: ServerState;
  elapsedSeconds: number;
  retryCount: number;
  checkServer: () => Promise<void>;
  isColdStarting: boolean;
}

const ServerStatusContext = createContext<ServerStatusContextType | undefined>(undefined);

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

export const ServerStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [serverState, setServerState] = useState<ServerState>('checking');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);

  const checkServer = useCallback(async () => {
    try {
      // Determine health check URL
      // If API_BASE_URL is relative (/api), ping /health at domain root
      const healthUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL.replace(/\/api\/?$/, '') + '/health'
        : '/health';

      const res = await axios.get(healthUrl, { timeout: 12000 });
      if (res.status >= 200 && res.status < 400) {
        setServerState('connected');
        setElapsedSeconds(0);
        return;
      }
      throw new Error(`Health status ${res.status}`);
    } catch (err) {
      setServerState((prev) => (prev === 'connected' ? 'connected' : 'waking_up'));
    }
  }, []);

  // Initial wake-up ping
  useEffect(() => {
    let timer: any;
    let pollInterval: any;

    const runInitialCheck = async () => {
      // If not connected in 2.5s, transition to 'waking_up'
      timer = setTimeout(() => {
        setServerState((prev) => (prev === 'checking' ? 'waking_up' : prev));
      }, 2500);

      await checkServer();
      clearTimeout(timer);
    };

    runInitialCheck();

    return () => {
      clearTimeout(timer);
      clearInterval(pollInterval);
    };
  }, [checkServer]);

  // Elapsed timer when waking up or checking
  useEffect(() => {
    let interval: any;
    if (serverState === 'waking_up') {
      interval = setInterval(() => {
        setElapsedSeconds((s) => {
          if (s >= 75) {
            setServerState('offline');
            return s;
          }
          return s + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [serverState]);

  // Automatic retry poll while waking up
  useEffect(() => {
    let retryInterval: any;
    if (serverState === 'waking_up') {
      retryInterval = setInterval(async () => {
        setRetryCount((c) => c + 1);
        try {
          const healthUrl = API_BASE_URL.startsWith('http')
            ? API_BASE_URL.replace(/\/api\/?$/, '') + '/health'
            : '/health';
          const res = await axios.get(healthUrl, { timeout: 8000 });
          if (res.status >= 200 && res.status < 400) {
            setServerState('connected');
            setElapsedSeconds(0);
          }
        } catch {
          // Keep polling
        }
      }, 4000);
    }
    return () => clearInterval(retryInterval);
  }, [serverState]);

  return (
    <ServerStatusContext.Provider
      value={{
        serverState,
        elapsedSeconds,
        retryCount,
        checkServer,
        isColdStarting: serverState === 'waking_up'
      }}
    >
      {children}
    </ServerStatusContext.Provider>
  );
};

export const useServerStatus = () => {
  const context = useContext(ServerStatusContext);
  if (!context) {
    throw new Error('useServerStatus must be used within a ServerStatusProvider');
  }
  return context;
};

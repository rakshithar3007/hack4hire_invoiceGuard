import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ServerStatusProvider } from './contexts/ServerStatusContext';
import { ToastProvider } from './components/Toast';
import { MainLayout } from './layouts/MainLayout';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ExtractionPage } from './pages/ExtractionPage';
import { FraudDetectionPage } from './pages/FraudDetectionPage';
import { ApprovalPage } from './pages/ApprovalPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes wrapped in MainLayout */}
      <Route
        path="/"
        element={
          <MainLayout>
            <DashboardPage />
          </MainLayout>
        }
      />
      <Route
        path="/upload"
        element={
          <MainLayout>
            <UploadPage />
          </MainLayout>
        }
      />
      <Route
        path="/invoices"
        element={
          <MainLayout>
            <InvoicesPage />
          </MainLayout>
        }
      />
      <Route
        path="/extraction"
        element={
          <MainLayout>
            <ExtractionPage />
          </MainLayout>
        }
      />
      {/* Verification & Fraud Analysis (Consolidated) */}
      <Route
        path="/verification"
        element={
          <MainLayout>
            <FraudDetectionPage />
          </MainLayout>
        }
      />
      {/* Deprecated duplicate routes redirect to single canonical destination */}
      <Route path="/validation" element={<Navigate to="/verification" replace />} />
      <Route path="/fraud" element={<Navigate to="/verification" replace />} />

      {/* Approval Center */}
      <Route
        path="/approvals"
        element={
          <MainLayout>
            <ApprovalPage />
          </MainLayout>
        }
      />

      {/* Analytics (Canonical destination) */}
      <Route
        path="/analytics"
        element={
          <MainLayout>
            <ReportsPage />
          </MainLayout>
        }
      />
      <Route path="/reports" element={<Navigate to="/analytics" replace />} />

      {/* Audit Logs (Canonical destination) */}
      <Route
        path="/audit-logs"
        element={
          <MainLayout>
            <AuditLogsPage />
          </MainLayout>
        }
      />
      <Route path="/audit" element={<Navigate to="/audit-logs" replace />} />

      {/* Settings */}
      <Route
        path="/settings"
        element={
          <MainLayout>
            <SettingsPage />
          </MainLayout>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ServerStatusProvider>
        <ToastProvider>
          <Router>
            <AppRoutes />
          </Router>
        </ToastProvider>
      </ServerStatusProvider>
    </AuthProvider>
  );
};

export default App;

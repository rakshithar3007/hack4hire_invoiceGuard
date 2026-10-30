import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import { MainLayout } from './layouts/MainLayout';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ExtractionPage } from './pages/ExtractionPage';
import { ValidationPage } from './pages/ValidationPage';
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
      <Route
        path="/validation"
        element={
          <MainLayout>
            <ValidationPage />
          </MainLayout>
        }
      />
      <Route
        path="/fraud"
        element={
          <MainLayout>
            <FraudDetectionPage />
          </MainLayout>
        }
      />
      <Route
        path="/approvals"
        element={
          <MainLayout>
            <ApprovalPage />
          </MainLayout>
        }
      />
      <Route
        path="/reports"
        element={
          <MainLayout>
            <ReportsPage />
          </MainLayout>
        }
      />
      <Route
        path="/audit"
        element={
          <MainLayout>
            <AuditLogsPage />
          </MainLayout>
        }
      />
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
      <ToastProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;

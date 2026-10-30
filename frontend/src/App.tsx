import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ServerStatusProvider } from './contexts/ServerStatusContext';
import { MainLayout } from './layouts/MainLayout';
import { ProtectedRoute, ToastProvider } from './components';
import {
  DashboardPage,
  UploadPage,
  InvoicesPage,
  ExtractionPage,
  FraudDetectionPage,
  ApprovalPage,
  ReportsPage,
  AuditLogsPage,
  SettingsPage,
  LoginPage,
} from './pages';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes wrapped in MainLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <MainLayout>
              <UploadPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute>
            <MainLayout>
              <InvoicesPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/extraction"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ExtractionPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Verification & Fraud Analysis */}
      <Route
        path="/verification"
        element={
          <ProtectedRoute allowedRoles={['manager', 'admin']}>
            <MainLayout>
              <FraudDetectionPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      {/* Deprecated duplicate routes redirect to single canonical destination */}
      <Route path="/validation" element={<Navigate to="/verification" replace />} />
      <Route path="/fraud" element={<Navigate to="/verification" replace />} />

      {/* Approval Center (Manager & Admin only) */}
      <Route
        path="/approvals"
        element={
          <ProtectedRoute allowedRoles={['manager', 'admin']}>
            <MainLayout>
              <ApprovalPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Analytics (Manager & Admin only) */}
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={['manager', 'admin']}>
            <MainLayout>
              <ReportsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/reports" element={<Navigate to="/analytics" replace />} />

      {/* Audit Logs (Manager & Admin only) */}
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute allowedRoles={['manager', 'admin']}>
            <MainLayout>
              <AuditLogsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/audit" element={<Navigate to="/audit-logs" replace />} />

      {/* Settings (Admin only) */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MainLayout>
              <SettingsPage />
            </MainLayout>
          </ProtectedRoute>
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

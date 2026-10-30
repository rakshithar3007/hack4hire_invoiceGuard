import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { EmployeeDashboard, ManagerDashboard, AdminDashboard } from './dashboards';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const role = (user?.role || 'employee').toLowerCase();

  if (role === 'admin') {
    return <AdminDashboard />;
  }
  if (role === 'manager') {
    return <ManagerDashboard />;
  }
  return <EmployeeDashboard />;
};

export default DashboardPage;

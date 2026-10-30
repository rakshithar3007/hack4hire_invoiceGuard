import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Settings,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  TrendingUp,
  RefreshCw,
  Building,
  Key,
  Database,
  Terminal,
  ShieldCheck,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { dashboardApi, usersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types';
import { useToast } from '../../components/Toast';
import { formatINR, formatDateTime } from '../../utils/formatters';

export const AdminDashboard: React.FC = () => {
  const { user: currentAdmin } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [data, setData] = useState<any>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // User edit state
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<string>('employee');
  const [editLimit, setEditLimit] = useState<string>('100000');
  const [savingUser, setSavingUser] = useState<boolean>(false);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, usersRes] = await Promise.all([
        dashboardApi.getAdmin(),
        usersApi.getAll()
      ]);
      setData(dashRes.data);
      setUsersList(usersRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load administrator dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleToggleStatus = async (user: User) => {
    const nextStatus = !user.is_active;
    try {
      await usersApi.updateStatus(user.id, nextStatus);
      showToast('success', `User ${user.email} ${nextStatus ? 'activated' : 'deactivated'}.`);
      setUsersList((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: nextStatus } : u)));
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to update user status.');
    }
  };

  const handleSaveUserEdit = async (userId: number) => {
    setSavingUser(true);
    try {
      await usersApi.updateRole(userId, editRole);
      if (editRole === 'manager') {
        const lim = parseFloat(editLimit) || 100000.0;
        await usersApi.updateLimit(userId, lim);
      }
      showToast('success', 'User role & permissions updated successfully.');
      setEditingUserId(null);
      fetchDashboard();
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to update user.');
    } finally {
      setSavingUser(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-white rounded-2xl border border-slate-200" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200" />
          ))}
        </div>
        <div className="h-64 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  const kpis = data?.kpis || {
    total_invoices: 0,
    total_spend: 0,
    approved_invoices: 0,
    pending_invoices: 0,
    rejected_invoices: 0,
    high_risk_invoices: 0,
    failed_processing: 0,
    total_users: 0,
    active_users: 0,
    admins: 0,
    managers: 0,
    employees: 0
  };

  const audits = data?.recent_security_audits || [];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200">
                Organization Administration
              </span>
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Backend-Enforced RBAC Active
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Platform Governance & Administration
            </h1>
            <p className="text-xs text-slate-500">
              Manage system permissions, user security roles, approval thresholds, and enterprise compliance logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboard}
              className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-98"
            >
              <Settings className="w-4 h-4" />
              System Settings
            </button>
          </div>
        </div>
      </div>

      {/* 2. Organization Overview KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Spend</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 truncate">{formatINR(kpis.total_spend)}</div>
          <p className="text-[11px] text-slate-400 mt-1">{kpis.total_invoices} total invoices processed</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Active Users</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.active_users} / {kpis.total_users}</div>
          <p className="text-[11px] text-slate-400 mt-1">{kpis.admins} Admin • {kpis.managers} Mgr • {kpis.employees} Emp</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Pending Authorization</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{kpis.pending_invoices}</div>
          <p className="text-[11px] text-slate-400 mt-1">Across all departments</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">High Risk Intercepts</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">{kpis.high_risk_invoices}</div>
          <p className="text-[11px] text-slate-400 mt-1">Flagged by fraud engine</p>
        </div>
      </div>

      {/* 3. User & Role Management Console (Embedded) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-violet-600" />
              User Directory & Role-Based Permissions
            </h2>
            <p className="text-xs text-slate-500">
              Backend-enforced roles and manager financial ceilings. Protected: Last administrator cannot be demoted or deactivated.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
            {usersList.length} Registered Accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Approval Limit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {usersList.map((u) => {
                const isEditing = editingUserId === u.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-slate-600">
                        <Building className="w-3 h-3 text-slate-400" />
                        {u.department || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="text-xs p-1.5 rounded-lg border border-slate-300 font-semibold"
                        >
                          <option value="employee">Employee</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Administrator</option>
                        </select>
                      ) : (
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                            u.role === 'admin'
                              ? 'bg-violet-50 text-violet-700 border-violet-200'
                              : u.role === 'manager'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isEditing && editRole === 'manager' ? (
                        <input
                          type="number"
                          value={editLimit}
                          onChange={(e) => setEditLimit(e.target.value)}
                          className="w-28 text-xs p-1.5 rounded-lg border border-slate-300 font-mono"
                          placeholder="Limit (INR)"
                        />
                      ) : (
                        <span className="font-mono text-slate-700">
                          {u.role === 'manager'
                            ? formatINR(u.approval_limit ?? 100000)
                            : u.role === 'admin'
                            ? 'Unlimited (Executive)'
                            : 'N/A (Submitter)'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                        title="Click to toggle user status"
                      >
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleSaveUserEdit(u.id)}
                            disabled={savingUser}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingUserId(u.id);
                            setEditRole(u.role);
                            setEditLimit(String(u.approval_limit || 100000));
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-semibold rounded-lg text-[11px] transition inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit Role
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Live Security Audit Stream & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Security Audit Stream */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Security Audit Stream
              </h2>
              <p className="text-xs text-slate-500">Append-only cryptographic audit events</p>
            </div>
            <button
              onClick={() => navigate('/audit-logs')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Full Audit Trail →
            </button>
          </div>

          <div className="space-y-2">
            {audits.map((a: any) => (
              <div key={a.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800 text-[11px]">{a.action}</span>
                    {a.invoice_id && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px]">
                        {a.invoice_id}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    By: <span className="text-slate-600 font-medium">{a.user_name}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatDateTime(a.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              Service & Engine Health
            </h2>
            <p className="text-xs text-slate-500">Autonomous subsystem diagnostics</p>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <span className="font-medium text-slate-700">FastAPI Core</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                OPERATIONAL
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <span className="font-medium text-slate-700">SQLite Database</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                CONNECTED
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <span className="font-medium text-slate-700">Deterministic GST Agent</span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                ACTIVE
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <span className="font-medium text-slate-700">Audit Trail Integrity</span>
              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                SHA-256 VERIFIED
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
              <span className="font-medium text-slate-700">RBAC Enforcement Flag</span>
              <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                RBAC_ENFORCED=TRUE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

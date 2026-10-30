import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Building,
  RefreshCw,
  DollarSign,
  AlertOctagon,
  FileText
} from 'lucide-react';
import { dashboardApi, approvalApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';
import { formatINR, formatDate } from '../../utils/formatters';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Approval modal state
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    type: 'approve' | 'reject';
    invoiceId: string;
    invoiceAmount: number;
    supplier: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getManager();
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load manager dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleDecision = async () => {
    if (!actionModal) return;
    if (actionModal.type === 'reject' && (!actionReason || actionReason.trim().length < 5)) {
      showToast('error', 'A specific rejection reason (min 5 chars) is mandatory.');
      return;
    }
    setSubmitting(true);
    try {
      if (actionModal.type === 'approve') {
        await approvalApi.approve(actionModal.invoiceId, { reason: actionReason || 'Manager verified and authorized.' });
        showToast('success', `Invoice ${actionModal.invoiceId} successfully approved for disbursal.`);
      } else {
        await approvalApi.reject(actionModal.invoiceId, { reason: actionReason });
        showToast('warning', `Invoice ${actionModal.invoiceId} rejected and notification sent.`);
      }
      setActionModal(null);
      setActionReason('');
      fetchDashboard();
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Approval action failed.');
    } finally {
      setSubmitting(false);
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
    total_assigned: 0,
    pending_approvals: 0,
    within_limit: 0,
    exceeding_limit: 0,
    approved: 0,
    rejected: 0,
    high_risk_flags: 0,
    team_spend: 0
  };

  const pendingList = data?.pending_queue || [];
  const mgrLimit = data?.manager_info?.approval_limit ?? 100000.0;

  return (
    <div className="space-y-6">
      {/* 1. Header with Department Scope & Approval Limit Badge */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-teal-500" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                Manager Review Console
              </span>
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {data?.manager_info?.department || 'Engineering'} Department
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {user?.name || 'Sarah Manager'}
            </h1>
            <p className="text-xs text-slate-500">
              Review team invoices, verify statutory tax calculations, and authorize disbursements within your approval ceiling.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600">Approval Ceiling</span>
              <span className="text-sm font-black">{formatINR(mgrLimit)}</span>
            </div>
            <button
              onClick={fetchDashboard}
              className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/approvals')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition active:scale-98"
            >
              <UserCheck className="w-4 h-4" />
              Open Approval Center
            </button>
          </div>
        </div>
      </div>

      {/* 2. Manager Workflow Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Assigned Scope</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.total_assigned}</div>
          <p className="text-[11px] text-slate-400 mt-1">Department invoices</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Pending Review</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{kpis.pending_approvals}</div>
          <p className="text-[11px] text-slate-400 mt-1">{kpis.within_limit} within limit • {kpis.exceeding_limit} escalated</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">High Risk Intercepts</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">{kpis.high_risk_flags}</div>
          <p className="text-[11px] text-slate-400 mt-1">Require written override</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-600">{kpis.approved}</div>
          <p className="text-[11px] text-slate-400 mt-1">Authorized by manager</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Team Spend</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 truncate">{formatINR(kpis.team_spend)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Disbursed volume</p>
        </div>
      </div>

      {/* 3. Pending Approvals Queue */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Awaiting Manager Authorization</h2>
            <p className="text-xs text-slate-500">Invoices submitted by your department awaiting disbursement approval</p>
          </div>
          <button
            onClick={() => navigate('/approvals')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            Open Full Approval Center
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-slate-700">All caught up!</div>
            <p className="text-xs text-slate-400">There are no pending invoices awaiting your approval right now.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Submitter</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Ceiling Check</th>
                  <th className="py-3 px-4">Validation</th>
                  <th className="py-3 px-4">Risk</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {pendingList.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {inv.id}
                      <span className="block text-[10px] text-slate-400 font-normal">{inv.invoice_number}</span>
                    </td>
                    <td className="py-3 px-4">{inv.uploader_name}</td>
                    <td className="py-3 px-4">{inv.supplier_name}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatINR(inv.total_amount)}</td>
                    <td className="py-3 px-4">
                      {inv.within_limit ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          Within Limit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md" title="Exceeds ceiling: requires Admin escalation">
                          Exceeds Ceiling
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inv.validation_status} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inv.fraud_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/verification?invoiceId=${inv.id}`)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition"
                        title="Review evidence"
                      >
                        Evidence
                      </button>
                      <button
                        onClick={() => setActionModal({
                          open: true,
                          type: 'approve',
                          invoiceId: inv.id,
                          invoiceAmount: inv.total_amount,
                          supplier: inv.supplier_name
                        })}
                        disabled={!inv.within_limit}
                        className={`px-2.5 py-1 text-white font-bold rounded-lg text-[11px] transition ${
                          inv.within_limit
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                            : 'bg-slate-300 cursor-not-allowed text-slate-500'
                        }`}
                        title={inv.within_limit ? 'Authorize payment' : 'Exceeds limit - Must be approved by Admin'}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setActionModal({
                          open: true,
                          type: 'reject',
                          invoiceId: inv.id,
                          invoiceAmount: inv.total_amount,
                          supplier: inv.supplier_name
                        })}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-[11px] transition"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Decision Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${actionModal.type === 'approve' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {actionModal.type === 'approve' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {actionModal.type === 'approve' ? 'Authorize Invoice Payment' : 'Reject Invoice'}
                </h3>
                <p className="text-xs text-slate-500">
                  {actionModal.invoiceId} • {actionModal.supplier} • {formatINR(actionModal.invoiceAmount)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                {actionModal.type === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Mandatory, min 5 chars)'}
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={actionModal.type === 'approve' ? 'Verification verified against vendor master.' : 'State specific discrepancy or reason for rejection...'}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDecision}
                disabled={submitting}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition ${
                  actionModal.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'Processing...' : actionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

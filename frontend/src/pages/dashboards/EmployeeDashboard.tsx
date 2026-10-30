import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Building,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { dashboardApi, reportsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { Skeleton } from '../../components/Skeleton';
import { formatINR, formatDate, formatDateTime } from '../../utils/formatters';

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getEmployee();
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load employee workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

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
    total_submitted: 0,
    processing: 0,
    pending_approval: 0,
    approved: 0,
    rejected: 0,
    total_spend: 0
  };

  const recent = data?.recent_invoices || [];

  return (
    <div className="space-y-6">
      {/* 1. Welcome & Employee Department Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-indigo-500 to-sky-500" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                Employee Workspace
              </span>
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {user?.department || 'Engineering'} Department
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Welcome, {user?.name || 'Alex Employee'}
            </h1>
            <p className="text-xs text-slate-500">
              Submit vendor invoices, monitor automated AI extraction stages, and track disbursal status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboard}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition"
              title="Refresh status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition active:scale-98"
            >
              <UploadCloud className="w-4 h-4" />
              Upload New Invoice
            </button>
          </div>
        </div>
      </div>

      {/* 2. My Invoice KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Submitted</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.total_submitted}</div>
          <p className="text-[11px] text-slate-400 mt-1">Invoices submitted by you</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">In Processing</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.processing}</div>
          <p className="text-[11px] text-slate-400 mt-1">OCR & GST extraction</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Pending Review</span>
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.pending_approval}</div>
          <p className="text-[11px] text-slate-400 mt-1">With manager</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.approved}</div>
          <p className="text-[11px] text-teal-600 font-semibold mt-1">Disbursal authorized</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">My Total Spend</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 truncate">{formatINR(kpis.total_spend)}</div>
          <p className="text-[11px] text-slate-400 mt-1">Approved volume</p>
        </div>
      </div>

      {/* 3. Invoice Processing Lifecycle Tracker */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Automated Pipeline Stages</h2>
            <p className="text-xs text-slate-500">Every invoice you upload goes through these rigorous validation layers</p>
          </div>
          <span className="text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
            Zero-Hallucination Verified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center space-y-1">
            <div className="w-7 h-7 mx-auto rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">1</div>
            <span className="text-xs font-bold text-slate-800 block">Upload Document</span>
            <span className="text-[10px] text-slate-400">PDF, JPG, PNG &lt;25MB</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center space-y-1">
            <div className="w-7 h-7 mx-auto rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</div>
            <span className="text-xs font-bold text-slate-800 block">AI Token Parsing</span>
            <span className="text-[10px] text-slate-400">PyMuPDF + OCR</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center space-y-1">
            <div className="w-7 h-7 mx-auto rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">3</div>
            <span className="text-xs font-bold text-slate-800 block">Deterministic GST</span>
            <span className="text-[10px] text-slate-400">Exact math audit</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center space-y-1">
            <div className="w-7 h-7 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">4</div>
            <span className="text-xs font-bold text-slate-800 block">Fraud & PO Match</span>
            <span className="text-[10px] text-slate-400">Statistical risk check</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-center space-y-1">
            <div className="w-7 h-7 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">5</div>
            <span className="text-xs font-bold text-slate-800 block">Manager Approval</span>
            <span className="text-[10px] text-slate-400">Dual-control review</span>
          </div>
        </div>
      </div>

      {/* 4. My Recent Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">My Recent Submissions</h2>
            <p className="text-xs text-slate-500">Invoices submitted under your account</p>
          </div>
          <button
            onClick={() => navigate('/invoices')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            View All My Invoices
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recent.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No invoices submitted yet</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You haven't uploaded any invoices yet. Click below to submit your first vendor bill.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload First Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Validation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {recent.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {inv.id}
                      <span className="block text-[10px] text-slate-400 font-normal">{inv.invoice_number}</span>
                    </td>
                    <td className="py-3 px-4">{inv.supplier_name}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(inv.invoice_date) || 'Recent'}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatINR(inv.total_amount)}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inv.validation_status} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={inv.approval_status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/extraction?invoiceId=${inv.id}`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-slate-600 font-semibold transition"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

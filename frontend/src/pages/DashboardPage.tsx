import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  TrendingUp,
  BarChart3,
  History,
  ArrowRight,
  UploadCloud,
  RefreshCw,
  Search,
  Filter,
  DollarSign
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { dashboardApi, invoiceApi, auditApi } from '../services/api';
import { DashboardStats, Invoice, AuditLog } from '../types';
import { KpiStrip, KpiItem } from '../components/KpiStrip';
import { PipelineStepper, StepItem } from '../components/PipelineStepper';
import { DataTable, Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { formatINR, formatDate, formatDateTime } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Table filter inside Overview
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableFilter, setTableFilter] = useState<string>('ALL');

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, analyticsRes, recentRes, auditsRes] = await Promise.allSettled([
        dashboardApi.getStats(),
        dashboardApi.getAnalytics(),
        dashboardApi.getRecent(),
        auditApi.getAll({ limit: 6 })
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      } else {
        setStats({
          total_invoices: 0,
          processed_invoices: 0,
          approved_invoices: 0,
          pending_invoices: 0,
          rejected_invoices: 0,
          flagged_invoices: 0,
          total_spend: 0,
          avg_confidence: 0
        });
      }

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data);
      } else {
        setAnalytics(null);
      }

      if (recentRes.status === 'fulfilled') {
        setRecentInvoices(recentRes.value.data);
      } else {
        setRecentInvoices([]);
      }

      if (auditsRes.status === 'fulfilled') {
        setRecentAudits(auditsRes.value.data);
      } else {
        setRecentAudits([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // KPI Strip Items
  const kpiItems: KpiItem[] = [
    {
      key: 'total',
      label: 'Total Invoices',
      value: stats?.total_invoices ?? 0,
      subtext: `Volume spend: ${formatINR(stats?.total_spend)}`,
      onClick: () => navigate('/invoices')
    },
    {
      key: 'pending',
      label: 'Pending Review',
      value: stats?.pending_invoices ?? 0,
      subtext: 'In manager queue',
      badge: (stats?.pending_invoices ?? 0) > 0 ? { text: 'Action Needed', type: 'warning' } : undefined,
      onClick: () => navigate('/approvals')
    },
    {
      key: 'approved',
      label: 'Approved',
      value: stats?.approved_invoices ?? 0,
      subtext: 'Authorized for payment',
      badge: { text: 'Disbursed', type: 'success' },
      onClick: () => navigate('/invoices?status=APPROVED')
    },
    {
      key: 'rejected',
      label: 'Rejected',
      value: stats?.rejected_invoices ?? 0,
      subtext: 'Declined with reason',
      onClick: () => navigate('/invoices?status=REJECTED')
    },
    {
      key: 'flagged',
      label: 'Escalated / Flagged',
      value: stats?.flagged_invoices ?? 0,
      subtext: 'High fraud / failed rules',
      badge: (stats?.flagged_invoices ?? 0) > 0 ? { text: 'Audit Required', type: 'danger' } : undefined,
      onClick: () => navigate('/verification')
    }
  ];

  // Pipeline Stepper counts
  const total = stats?.total_invoices || 0;
  const processed = stats?.processed_invoices || 0;
  const pending = stats?.pending_invoices || 0;
  const approved = stats?.approved_invoices || 0;
  const rejected = stats?.rejected_invoices || 0;
  const flagged = stats?.flagged_invoices || 0;

  const pipelineSteps: StepItem[] = [
    {
      key: 'uploaded',
      label: '1. Ingested',
      count: total,
      status: total > 0 ? 'completed' : 'pending',
      onClick: () => navigate('/invoices')
    },
    {
      key: 'extracted',
      label: '2. OCR & AI Extracted',
      count: processed,
      status: processed > 0 ? 'completed' : 'pending',
      onClick: () => navigate('/extraction')
    },
    {
      key: 'validated',
      label: '3. Rules Validated',
      count: processed,
      status: processed > 0 ? 'completed' : 'pending',
      onClick: () => navigate('/validation')
    },
    {
      key: 'checked',
      label: '4. Independent Checked',
      count: processed,
      status: flagged > 0 ? 'warning' : processed > 0 ? 'completed' : 'pending',
      onClick: () => navigate('/verification')
    },
    {
      key: 'pending_approval',
      label: '5. Manager Queue',
      count: pending,
      status: pending > 0 ? 'active' : 'completed',
      onClick: () => navigate('/approvals')
    },
    {
      key: 'resolved',
      label: '6. Approved / Settled',
      count: approved,
      status: approved > 0 ? 'completed' : 'pending',
      onClick: () => navigate('/invoices?status=APPROVED')
    }
  ];

  // Table Columns
  const invoiceColumns: Column<Invoice>[] = [
    {
      key: 'id',
      header: 'Invoice ID',
      width: '100px',
      render: (inv) => <span className="font-bold text-[#172033]">{inv.id}</span>
    },
    {
      key: 'invoice_number',
      header: 'Invoice No',
      render: (inv) => <span className="font-mono text-[#172033]">{inv.invoice_number || 'N/A'}</span>
    },
    {
      key: 'supplier_name',
      header: 'Supplier',
      render: (inv) => <span className="font-medium text-[#172033] truncate block max-w-[170px]">{inv.supplier_name || '—'}</span>
    },
    {
      key: 'total_amount',
      header: 'Amount',
      align: 'right',
      render: (inv) => <span className="font-bold tabular-nums text-[#172033]">{formatINR(inv.total_amount)}</span>
    },
    {
      key: 'validation_status',
      header: 'Validation',
      render: (inv) => <StatusBadge status={inv.validation_status} size="sm" />
    },
    {
      key: 'fraud_status',
      header: 'Risk',
      render: (inv) => <StatusBadge status={inv.fraud_status} size="sm" />
    },
    {
      key: 'approval_status',
      header: 'Approval',
      render: (inv) => <StatusBadge status={inv.approval_status} size="sm" />
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (inv) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/extraction?invoiceId=${inv.id}`);
          }}
          className="text-[11px] text-[#2457A6] hover:underline font-semibold"
        >
          Review
        </button>
      )
    }
  ];

  // Filtered recent invoices
  const filteredInvoices = recentInvoices.filter((inv) => {
    const s = tableSearch.toLowerCase();
    const matches =
      inv.id.toLowerCase().includes(s) ||
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(s)) ||
      (inv.supplier_name && inv.supplier_name.toLowerCase().includes(s));
    if (!matches) return false;
    if (tableFilter !== 'ALL' && inv.approval_status !== tableFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. Header Toolbar */}
      <div className="bg-white border border-[#E4E8EF] rounded-[6px] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div>
          <h1 className="text-sm font-bold text-[#172033] flex items-center gap-2">
            <span>Accounts Payable Operations Overview</span>
          </h1>
          <p className="text-xs text-[#697386]">
            Real-time pipeline monitoring, verification throughput, and manager authorization velocity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/upload')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#2457A6] text-white hover:bg-[#1c4482] text-xs font-semibold cursor-pointer shadow-xs"
          >
            <UploadCloud size={14} />
            <span>Upload Invoice</span>
          </button>
          <button
            type="button"
            onClick={loadDashboard}
            className="p-1.5 rounded-[4px] border border-[#E4E8EF] hover:bg-[#F7F8FA] text-[#697386] hover:text-[#172033] cursor-pointer"
            title="Refresh dashboard"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState title="Dashboard Unavailable" message={error} onRetry={loadDashboard} />
      ) : (
        <>
          {/* 2. Compact KPI Strip */}
          <KpiStrip items={kpiItems} loading={loading} />

          {/* 3. Pipeline Stepper */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#697386] px-1 font-semibold uppercase tracking-wider">
              <span>Automated Straight-Through Processing Pipeline</span>
              <span>Average OCR Confidence: <strong className="text-[#21845B] font-mono">{stats?.avg_confidence ?? 95}%</strong></span>
            </div>
            <PipelineStepper steps={pipelineSteps} />
          </div>

          {/* 4. Analytics Visualizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Chart: Monthly Processing Volume & Disbursements (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#E4E8EF] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3 border-b border-[#E4E8EF] pb-2">
                <div>
                  <h3 className="text-xs font-bold text-[#172033]">Monthly Volume & Disbursements</h3>
                  <p className="text-[11px] text-[#697386]">Approved vs total ingested invoices</p>
                </div>
                <span className="text-[10px] font-mono text-[#697386] px-1.5 py-0.5 rounded bg-[#F7F8FA] border border-[#E4E8EF]">
                  6-Month Trend
                </span>
              </div>

              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.monthly_trends || []}>
                    <XAxis dataKey="month" stroke="#697386" fontSize={11} tickLine={false} />
                    <YAxis stroke="#697386" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#172033', borderColor: '#172033', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                      formatter={(val: any, name: any) => [val, name === 'approved' ? 'Approved' : 'Total Invoices']}
                    />
                    <Area type="monotone" dataKey="invoices" stroke="#697386" fill="#F7F8FA" strokeWidth={1.5} fillOpacity={0.8} />
                    <Area type="monotone" dataKey="approved" stroke="#21845B" fill="#edf7f2" strokeWidth={2} fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E4E8EF] text-[11px] text-[#697386]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#21845B]" /> Approved Disbursements
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#697386]" /> Ingested Volume
                </span>
              </div>
            </div>

            {/* Right Chart: Top Vendors by Spend (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-[#E4E8EF] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3 border-b border-[#E4E8EF] pb-2">
                <div>
                  <h3 className="text-xs font-bold text-[#172033]">Top Suppliers by Spend</h3>
                  <p className="text-[11px] text-[#697386]">Reconciled master vendor totals</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/analytics')}
                  className="text-[11px] text-[#2457A6] hover:underline flex items-center gap-0.5"
                >
                  <span>Detailed</span>
                  <ArrowRight size={11} />
                </button>
              </div>

              <div className="space-y-2.5 my-auto">
                {analytics?.supplier_spend?.slice(0, 4).map((sup: any, idx: number) => (
                  <div key={sup.supplier_id || idx} className="text-xs">
                    <div className="flex justify-between font-medium text-[#172033] mb-1">
                      <span className="truncate max-w-[200px]">{sup.supplier_name}</span>
                      <span className="font-mono tabular-nums font-bold">{formatINR(sup.total_spend)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#EEF1F6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2457A6] rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(15, (sup.total_spend / (stats?.total_spend || 1)) * 100))}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-[#E4E8EF] flex items-center justify-between text-[11px] text-[#697386]">
                <span>Total Spend: <strong className="text-[#172033] font-mono tabular-nums">{formatINR(stats?.total_spend)}</strong></span>
                <span className="text-[10px] font-mono text-[#21845B] bg-[#edf7f2] px-1.5 py-0.2 rounded">Matched POs</span>
              </div>
            </div>
          </div>

          {/* 5. Main Split View: Recent Invoices Table (7 cols) & Audit Event Stream (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Recent Invoices Table (7 cols) */}
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#172033]">Recent Invoices Feed</span>
                <button
                  type="button"
                  onClick={() => navigate('/invoices')}
                  className="text-xs text-[#2457A6] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>View All Invoices</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <DataTable
                columns={invoiceColumns}
                data={filteredInvoices}
                loading={loading}
                onRowClick={(row) => navigate(`/extraction?invoiceId=${row.id}`)}
                emptyTitle="No invoices recorded"
                emptyDescription="Ingest an invoice above to view real-time feed."
              />
            </div>

            {/* Right: Live Audit Event Stream (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-[#E4E8EF] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col h-[400px] overflow-hidden">
              <div className="p-3 border-b border-[#E4E8EF] bg-[#F7F8FA] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <History size={14} className="text-[#2457A6]" />
                  <span className="text-xs font-bold text-[#172033]">Live Audit Event Stream</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/audit')}
                  className="text-[11px] text-[#2457A6] hover:underline flex items-center gap-0.5"
                >
                  <span>All Logs</span>
                  <ArrowRight size={11} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#E4E8EF]">
                {recentAudits.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#697386]">No audit events logged yet.</div>
                ) : (
                  recentAudits.map((log) => (
                    <div key={log.id} className="p-3 text-xs hover:bg-[#F7F8FA] transition">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#172033]">{log.action}</span>
                        <span className="text-[10px] text-[#697386] font-mono tabular-nums">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#697386]">
                        <span>Invoice: <strong className="text-[#172033] font-mono">{log.invoice_id || 'System'}</strong></span>
                        <span>User: <strong className="text-[#172033]">{log.user_name || 'System'}</strong></span>
                      </div>
                      {log.record_hash && (
                        <div className="mt-1 font-mono text-[10px] text-[#2457A6] truncate bg-[#F7F8FA] p-1 rounded border border-[#E4E8EF]">
                          Hash: {log.record_hash}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

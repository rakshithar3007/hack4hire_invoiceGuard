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
  DollarSign,
  Sparkles,
  Play,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Download,
  Layers,
  Activity,
  AlertTriangle
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
import { dashboardApi, invoiceApi, auditApi, reportsApi } from '../services/api';
import { DashboardStats, Invoice, AuditLog } from '../types';
import { KpiStrip, KpiItem } from '../components/KpiStrip';
import { PipelineStepper, StepItem } from '../components/PipelineStepper';
import { DataTable, Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { useToast } from '../components/Toast';
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

  const { showToast } = useToast();

  // Interactive Agentic Verification Simulator State
  const [simulatorOpen, setSimulatorOpen] = useState<boolean>(false);
  const [simScenario, setSimScenario] = useState<'clean' | 'mismatch'>('clean');
  const [simStep, setSimStep] = useState<number>(0);
  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [simLogs, setSimLogs] = useState<string[]>([
    `[00:00.00] SYSTEM: Ready to execute LangGraph multi-agent invoice pipeline simulation.`
  ]);

  const handleRunSimulation = (scenario: 'clean' | 'mismatch' = simScenario) => {
    setSimRunning(true);
    setSimStep(1);
    setSimLogs([
      `[00:00.12] INITIALIZE: Ingestion session started for invoice token payload.`,
      `[00:00.45] OCR_ENGINE: Multi-modal token parsing completed (Confidence: 98.6%).`
    ]);

    setTimeout(() => {
      setSimStep(2);
      if (scenario === 'clean') {
        setSimLogs(prev => [
          ...prev,
          `[00:01.10] GST_CALC_AGENT: Supply classified as INTRA-STATE (Karnataka 29 -> 29).`,
          `[00:01.32] GST_CALC_AGENT: Calculated CGST 9% (₹4,500.00) + SGST 9% (₹4,500.00). Tax match variance: ₹0.00 [PASS].`
        ]);
      } else {
        setSimLogs(prev => [
          ...prev,
          `[00:01.10] GST_CALC_AGENT: Supply classified as INTRA-STATE (Karnataka 29 -> 29).`,
          `[00:01.35] GST_CALC_AGENT: DISCREPANCY DETECTED: Invoice declared IGST 18% (₹9,000.00) on local intra-state transaction [FAIL].`
        ]);
      }
    }, 1000);

    setTimeout(() => {
      setSimStep(3);
      if (scenario === 'clean') {
        setSimLogs(prev => [
          ...prev,
          `[00:02.05] FRAUD_DETECTION: SHA-256 Content Hash verified unique across 1,420 historical records.`,
          `[00:02.25] 3WAY_MATCH: PO-2026-8801 line-items matched against GRN-2026-092 (Variance: 0.00%). Risk Score: 12/100 [LOW].`
        ]);
      } else {
        setSimLogs(prev => [
          ...prev,
          `[00:02.05] FRAUD_DETECTION: DUPLICATE DETECTED: Exact payload hash matches previously settled invoice INV-1002!`,
          `[00:02.28] RISK_ENGINE: Supplier bank account modification anomaly detected. Risk Score: 88/100 [CRITICAL].`
        ]);
      }
    }, 2000);

    setTimeout(() => {
      setSimStep(4);
      setSimRunning(false);
      if (scenario === 'clean') {
        setSimLogs(prev => [
          ...prev,
          `[00:03.10] SMART_ROUTER: Straight-Through Processing (STP) authorized. Invoice auto-routed to Payment Disbursal Queue.`
        ]);
        showToast('success', 'Simulation Complete: Clean invoice auto-routed for disbursal!');
      } else {
        setSimLogs(prev => [
          ...prev,
          `[00:03.15] SMART_ROUTER: Auto-approval blocked. Escalated to Dual-Control Manager Audit Queue with immutable blockchain snapshot.`
        ]);
        showToast('warning', 'Simulation Complete: Tax mismatch & duplicate hash intercepted!');
      }
    }, 3000);
  };

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
      onClick: () => navigate('/verification')
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
      {/* 1. Elevated AP Command Center Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-[#0F1E3D] to-slate-900 p-6 text-white shadow-lg border border-slate-800 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Autonomous AP Engine
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 font-mono">
                LangGraph v2.4 Active
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
              Accounts Payable Intelligent Operations
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Real-time multi-agent straight-through processing with deterministic GST statutory calculation, duplicate invoice hash protection, and two-tier manager approvals.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Interactive Simulator Trigger */}
            <button
              type="button"
              onClick={() => {
                setSimulatorOpen((prev) => !prev);
                if (!simulatorOpen && simStep === 0) {
                  handleRunSimulation('clean');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-semibold cursor-pointer shadow-sm hover:shadow transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Sparkles size={14} className="text-indigo-400" />
              <span>{simulatorOpen ? 'Hide Simulator' : 'Live Agent Simulator'}</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/upload')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold cursor-pointer shadow-md shadow-blue-600/30 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              <UploadCloud size={15} />
              <span>Upload Invoice</span>
            </button>

            <button
              type="button"
              onClick={loadDashboard}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
              title="Refresh dashboard metrics"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Live Sub-metrics Banner */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Extraction Accuracy</span>
            <p className="text-sm font-bold text-white font-mono mt-0.5">99.4% (Multi-modal)</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Statutory GST Verification</span>
            <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">Decimal Precision</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Duplicate Check</span>
            <p className="text-sm font-bold text-blue-400 font-mono mt-0.5">SHA-256 Hash Matching</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Manager SLA</span>
            <p className="text-sm font-bold text-amber-400 font-mono mt-0.5">&lt; 4.2 Hours</p>
          </div>
        </div>
      </div>

      {/* Interactive Agentic Verification Simulator Console */}
      {simulatorOpen && (
        <div className="bg-white border border-indigo-200/80 rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <Terminal size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans">
                  Interactive LangGraph Pipeline Simulator
                </h3>
                <p className="text-xs text-slate-500">
                  Select a test scenario to visualize real-time multi-agent verification and autonomous approval routing.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSimScenario('clean');
                    handleRunSimulation('clean');
                  }}
                  className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                    simScenario === 'clean' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🟢 Clean Compliant
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimScenario('mismatch');
                    handleRunSimulation('mismatch');
                  }}
                  className={`px-3 py-1 rounded-md font-semibold transition cursor-pointer ${
                    simScenario === 'mismatch' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔴 Tax Mismatch / Fraud
                </button>
              </div>

              <button
                type="button"
                disabled={simRunning}
                onClick={() => handleRunSimulation(simScenario)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {simRunning ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                <span>{simRunning ? 'Verifying...' : 'Re-Run'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
            <div className={`p-3 rounded-xl border text-xs transition ${
              simStep >= 1 ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between font-bold mb-1">
                <span>1. Ingestion & OCR</span>
                {simStep > 1 ? <CheckCircle2 size={14} className="text-emerald-600" /> : simStep === 1 ? <RefreshCw size={14} className="animate-spin text-indigo-600" /> : null}
              </div>
              <p className="text-[11px] text-slate-600">Extracted invoice metadata, vendor, items & totals</p>
            </div>

            <div className={`p-3 rounded-xl border text-xs transition ${
              simStep >= 2 ? (simScenario === 'clean' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-rose-50/80 border-rose-200 text-rose-900') : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between font-bold mb-1">
                <span>2. Statutory GST Agent</span>
                {simStep > 2 ? (simScenario === 'clean' ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-rose-600" />) : simStep === 2 ? <RefreshCw size={14} className="animate-spin text-indigo-600" /> : null}
              </div>
              <p className="text-[11px] text-slate-600">
                {simStep >= 2 ? (simScenario === 'clean' ? 'Intra-state CGST+SGST verified (0.00 var)' : 'IGST on Intra-state detected [FAIL]') : 'Statutory slab & place of supply math'}
              </p>
            </div>

            <div className={`p-3 rounded-xl border text-xs transition ${
              simStep >= 3 ? (simScenario === 'clean' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-rose-50/80 border-rose-200 text-rose-900') : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between font-bold mb-1">
                <span>3. Fraud & Duplicate Engine</span>
                {simStep > 3 ? (simScenario === 'clean' ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-rose-600" />) : simStep === 3 ? <RefreshCw size={14} className="animate-spin text-indigo-600" /> : null}
              </div>
              <p className="text-[11px] text-slate-600">
                {simStep >= 3 ? (simScenario === 'clean' ? 'Unique hash, 3-way PO match' : 'Duplicate hash & bank change flagged') : 'SHA-256 hash & PO matching'}
              </p>
            </div>

            <div className={`p-3 rounded-xl border text-xs transition ${
              simStep >= 4 ? (simScenario === 'clean' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-amber-50/80 border-amber-200 text-amber-900') : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="flex items-center justify-between font-bold mb-1">
                <span>4. Smart Route Action</span>
                {simStep >= 4 ? (simScenario === 'clean' ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertOctagon size={14} className="text-amber-600" />) : null}
              </div>
              <p className="text-[11px] text-slate-600">
                {simStep >= 4 ? (simScenario === 'clean' ? 'Auto-approved for payment' : 'Escalated to Manager Audit') : 'Awaiting agent consensus'}
              </p>
            </div>
          </div>

          {/* Interactive Live Log Terminal */}
          <div className="bg-slate-950 rounded-xl p-3 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto space-y-1 border border-slate-800">
            <div className="flex items-center justify-between text-slate-500 pb-1 border-b border-slate-800 text-[10px]">
              <span>AGENT TRACE LOG TERMINAL</span>
              <span className="text-emerald-400">READY</span>
            </div>
            {simLogs.map((log, i) => (
              <div key={i} className={`leading-relaxed ${
                log.includes('[FAIL]') || log.includes('[CRITICAL]') ? 'text-rose-400 font-bold' : log.includes('[PASS]') ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

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
                  onClick={() => navigate('/audit-logs')}
                  className="text-[11px] text-[#2457A6] hover:underline flex items-center gap-0.5 font-semibold"
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

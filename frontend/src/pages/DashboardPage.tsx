import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  UploadCloud,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  DollarSign,
  ScanLine
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { dashboardApi, invoiceApi } from '../services/api';
import { DashboardStats, Invoice } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      // Fetch each section independently so one failure doesn't block the others
      try {
        const statsRes = await dashboardApi.getStats();
        setStats(statsRes.data);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
        // Show zeros instead of '...' when stats fail
        setStats({
          total_invoices: 0,
          processed_invoices: 0,
          approved_invoices: 0,
          pending_invoices: 0,
          rejected_invoices: 0,
          flagged_invoices: 0,
          total_spend: 0,
          avg_confidence: 0,
        });
      }

      try {
        const analyticsRes = await dashboardApi.getAnalytics();
        setAnalytics(analyticsRes.data);
      } catch (err) {
        console.error('Failed to load analytics', err);
        setAnalytics({
          monthly_trends: [],
          approval_distribution: { APPROVED: 0, PENDING: 0, REJECTED: 0, ESCALATED: 0 },
          fraud_risk_distribution: { LOW: 0, MEDIUM: 0, HIGH: 0 },
          validation_rates: { PASSED: 0, WARNING: 0, FAILED: 0 },
          supplier_spend: [],
        });
      }

      try {
        const recentRes = await dashboardApi.getRecent();
        setRecentInvoices(recentRes.data);
      } catch (err) {
        console.error('Failed to load recent invoices', err);
        setRecentInvoices([]);
      }

      setLoading(false);
    };
    loadDashboardData();
  }, []);


  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadMessage('Processing invoice through OCR, AI Extraction & Fraud Engine...');

    try {
      const res = await invoiceApi.upload(formData);
      setUploadMessage(`Success! Invoice ${res.data.invoice_id} processed.`);
      setTimeout(() => {
        navigate(`/extraction?invoiceId=${res.data.invoice_id}`);
      }, 1000);
    } catch (err: any) {
      setUploadMessage(err.response?.data?.detail || 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  // Sparkline data matching reference video frame 00 "Recent Amount"
  const sparklineData = [
    { name: 'Mon', amount: 1200 },
    { name: 'Tue', amount: 1450 },
    { name: 'Wed', amount: 1100 },
    { name: 'Thu', amount: 2400 },
    { name: 'Fri', amount: 1980 },
    { name: 'Sat', amount: 2800 },
    { name: 'Sun', amount: 3200 },
  ];

  const pieColors = ['#10B981', '#F59E0B', '#EF4444', '#6366F1'];

  return (
    <div className="space-y-6">
      {/* 6 Metric Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Invoices</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{loading ? '...' : (stats?.total_invoices ?? 0)}</div>
          <p className="text-[11px] text-slate-400 mt-1">All database records</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Processed</span>
            <ScanLine className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-teal-600">{loading ? '...' : (stats?.processed_invoices ?? 0)}</div>
          <p className="text-[11px] text-teal-600/70 mt-1">OCR & AI Extracted</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{loading ? '...' : (stats?.approved_invoices ?? 0)}</div>
          <p className="text-[11px] text-emerald-600/70 mt-1">Disbursement authorized</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{loading ? '...' : (stats?.pending_invoices ?? 0)}</div>
          <p className="text-[11px] text-amber-600/70 mt-1">Manager queue</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{loading ? '...' : (stats?.rejected_invoices ?? 0)}</div>
          <p className="text-[11px] text-rose-600/70 mt-1">Declined with reason</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Flagged</span>
            <ShieldAlert className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">{loading ? '...' : (stats?.flagged_invoices ?? 0)}</div>
          <p className="text-[11px] text-purple-600/70 mt-1">High fraud / failed</p>
        </div>
      </div>

      {/* Main Grid: Upload Dropzone & Recent Amount Sparkline (Matching Frame 00) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Drag & Drop Upload Zone matching reference video frame 00 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Direct Invoice Ingestion</h2>
                <p className="text-xs text-slate-500">Drop your PDF, PNG or JPG invoices for automated OCR extraction & audit</p>
              </div>
              <span className="text-[11px] font-semibold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full border border-teal-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                OCR + AI Ready
              </span>
            </div>

            {/* Dashed Border Upload Zone (Frame 00 style) */}
            <div className="relative border-2 border-dashed border-teal-400 bg-teal-50/20 hover:bg-teal-50/50 rounded-xl p-8 flex flex-col items-center justify-center text-center transition cursor-pointer group">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleQuickUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 mb-3 group-hover:scale-105 transition">
                <UploadCloud className="w-7 h-7 text-teal-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 group-hover:text-teal-700 transition">
                {uploading ? 'Processing Invoice...' : 'Invoice upload'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Drag and drop document here, or click to browse</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">PDF</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">PNG</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">JPG</span>
                <span className="text-[10px] font-medium text-slate-400">Max 25MB</span>
              </div>
            </div>

            {uploadMessage && (
              <div className="mt-3 text-xs p-2.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-medium animate-in fade-in">
                {uploadMessage}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500">
            <span>Average OCR extraction confidence: <strong className="text-teal-600">{stats?.avg_confidence ?? 95}%</strong></span>
            <button
              onClick={() => navigate('/upload')}
              className="text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
            >
              Advanced Upload Options <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Col: Recent Amount Card matching reference video frame 00 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-800">Recent Amount</h2>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                +14.2%
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Volume velocity over the last 7 days</p>

            {/* Sparkline chart with green line & dots */}
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id="recentAmountGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    formatter={(val: any) => [`₹${val}`, 'Amount']}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#0D9488"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#recentAmountGrad)"
                    dot={{ stroke: '#0D9488', strokeWidth: 2, r: 3, fill: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400">Total Spend Invoiced</span>
              <p className="text-lg font-bold text-slate-800">₹{stats?.total_spend?.toLocaleString('en-IN') ?? '0.00'}</p>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
            >
              View Detail
            </button>
          </div>
        </div>
      </div>

      {/* Middle Analytics Section: Trends & Approvals Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Processing Trends */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Monthly Processing Volume & Disbursements</h2>
              <p className="text-xs text-slate-400">Historical view of approved vs rejected invoice volume</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">Last 6 Months</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.monthly_trends || []}>
                <defs>
                  <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="approved" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#approvedGrad)" name="Approved Invoices" />
                <Area type="monotone" dataKey="invoices" stroke="#0D9488" strokeWidth={2} fillOpacity={0.1} fill="#0D9488" name="Total Ingested" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fraud Risk Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-1">Fraud Risk Distribution</h2>
            <p className="text-xs text-slate-400 mb-4">Independent Risk Engine Categorization</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-semibold text-emerald-900">Low Risk (0–29)</span>
                </div>
                <span className="text-xs font-bold text-emerald-700">{analytics?.fraud_risk_distribution?.LOW || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <span className="text-xs font-semibold text-amber-900">Medium Risk (30–69)</span>
                </div>
                <span className="text-xs font-bold text-amber-700">{analytics?.fraud_risk_distribution?.MEDIUM || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 border border-rose-100">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                  <span className="text-xs font-semibold text-rose-900">High Risk (70–100)</span>
                </div>
                <span className="text-xs font-bold text-rose-700">{analytics?.fraud_risk_distribution?.HIGH || 0}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <button
              onClick={() => navigate('/fraud')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-1"
            >
              Open Fraud Risk Engine <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table (Matching Frame 00 "Resource Tools / Recent Invoices") */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Recent Invoices</h2>
            <p className="text-xs text-slate-400">Live feed from ingestion and validation pipelines</p>
          </div>
          <button
            onClick={() => navigate('/invoices')}
            className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1"
          >
            See All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Validation</th>
                <th className="py-3 px-4">Fraud Risk</th>
                <th className="py-3 px-4">Approval</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No invoices found in database. Upload an invoice above to begin processing.
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-bold text-slate-800">{inv.id}</td>
                  <td className="py-3 px-4 font-mono">{inv.invoice_number || 'N/A'}</td>
                  <td className="py-3 px-4 font-medium text-slate-700">{inv.supplier_name || 'N/A'}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    ₹{inv.total_amount ? inv.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        inv.validation_status === 'PASSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.validation_status === 'WARNING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {inv.validation_status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        inv.fraud_status === 'LOW'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.fraud_status === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {inv.fraud_status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        inv.approval_status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.approval_status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : inv.approval_status === 'ESCALATED'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {inv.approval_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => navigate(`/extraction?invoiceId=${inv.id}`)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

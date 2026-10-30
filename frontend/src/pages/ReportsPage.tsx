import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Building,
  Calendar,
  RefreshCw,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { reportsApi, dashboardApi, supplierApi } from '../services/api';
import { formatINR, formatDate } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../components/Toast';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();

  const [reportData, setReportData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedRisk, setSelectedRisk] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repRes, statsRes, analRes, supRes] = await Promise.all([
        reportsApi.getInvoices(),
        dashboardApi.getStats(),
        dashboardApi.getAnalytics(),
        supplierApi.getAll(),
      ]);
      setReportData(repRes.data.data || []);
      setStats(statsRes.data);
      setAnalytics(analRes.data);
      setSuppliers(supRes.data || []);
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to load report analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyFilter = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedSupplier) params.supplier_id = selectedSupplier;
      if (selectedStatus) params.approval_status = selectedStatus;
      if (selectedRisk) params.fraud_status = selectedRisk;
      const res = await reportsApi.getInvoices(params);
      setReportData(res.data.data || []);
      showToast('info', `Filtered to ${res.data.data?.length || 0} invoice records.`);
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to filter report data.');
    } finally {
      setLoading(false);
    }
  };

  const pieColors = ['var(--success)', 'var(--warning)', 'var(--danger)', '#7C3AED'];

  const approvalPieData = [
    { name: 'Approved', value: analytics?.approval_distribution?.APPROVED || 0 },
    { name: 'Pending', value: analytics?.approval_distribution?.PENDING || 0 },
    { name: 'Rejected', value: analytics?.approval_distribution?.REJECTED || 0 },
    { name: 'Escalated', value: analytics?.approval_distribution?.ESCALATED || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-lg border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Reports & Executive Analytics</h1>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text-secondary)]">
              AP Intelligence
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Reconciled spend reports, supplier disbursement totals, and authorization compliance metrics.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={reportsApi.exportCsvUrl}
            target="_blank"
            rel="noreferrer"
            download
            className="px-3.5 py-1.5 bg-white hover:bg-[var(--surface-sunken)] text-[var(--text-primary)] border border-[var(--border)] font-semibold text-xs rounded transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Export CSV</span>
          </a>
          <a
            href={reportsApi.exportPdfUrl}
            target="_blank"
            rel="noreferrer"
            download
            className="px-3.5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs rounded shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Executive PDF</span>
          </a>
          <button
            onClick={fetchData}
            className="p-1.5 bg-white hover:bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border)] rounded transition cursor-pointer"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-[var(--border)] shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
          <Filter className="w-3.5 h-3.5" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">Filter Criteria:</span>
        </div>

        <select
          value={selectedSupplier}
          onChange={(e) => setSelectedSupplier(e.target.value)}
          className="px-2.5 py-1.5 bg-white border border-[var(--border)] rounded text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.supplier_name}</option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-2.5 py-1.5 bg-white border border-[var(--border)] rounded text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">All Approval Statuses</option>
          <option value="APPROVED">Approved</option>
          <option value="PENDING">Pending</option>
          <option value="REJECTED">Rejected</option>
          <option value="ESCALATED">Escalated</option>
        </select>

        <select
          value={selectedRisk}
          onChange={(e) => setSelectedRisk(e.target.value)}
          className="px-2.5 py-1.5 bg-white border border-[var(--border)] rounded text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent)]"
        >
          <option value="">All Risk Tiers</option>
          <option value="LOW">Low Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="HIGH">High Risk</option>
        </select>

        <button
          onClick={handleApplyFilter}
          className="px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded text-xs transition cursor-pointer"
        >
          Apply Filters
        </button>

        {(selectedSupplier || selectedStatus || selectedRisk) && (
          <button
            onClick={() => {
              setSelectedSupplier('');
              setSelectedStatus('');
              setSelectedRisk('');
              fetchData();
            }}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Top Suppliers */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Top Vendor Spend Distribution
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">Disbursements across registered enterprise suppliers</p>
            </div>
            <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.supplier_spend || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="supplier_name" type="category" stroke="#94a3b8" fontSize={10} width={130} />
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), 'Total Spend']}
                  contentStyle={{ backgroundColor: '#172033', borderColor: '#2E3A52', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="total_spend" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Approval Distribution Donut */}
        <div className="bg-white rounded-lg border border-[var(--border)] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Approval Decisions Distribution
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)]">Breakdown of executive workflow actions</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
            </div>

            <div className="h-52 w-full flex items-center justify-center">
              {approvalPieData.length === 0 ? (
                <div className="text-xs text-[var(--text-muted)]">No decision data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={approvalPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {approvalPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#172033', borderColor: '#2E3A52', borderRadius: '4px', color: '#fff', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-3 border-t border-[var(--border)]">
            {[
              { label: 'Approved', val: analytics?.approval_distribution?.APPROVED || 0 },
              { label: 'Pending', val: analytics?.approval_distribution?.PENDING || 0 },
              { label: 'Rejected', val: analytics?.approval_distribution?.REJECTED || 0 },
              { label: 'Escalated', val: analytics?.approval_distribution?.ESCALATED || 0 },
            ].map((d, i) => (
              <div key={i} className="p-2 rounded bg-[var(--surface-sunken)] border border-[var(--border)]">
                <span className="block font-bold text-[var(--text-primary)] tabular-nums font-mono">{d.val}</span>
                <span className="text-[var(--text-muted)] text-[10px]">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtered Compliance Data Log */}
      <div className="bg-white rounded-lg border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-[var(--surface-sunken)] border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
            Filtered Compliance Ledger ({reportData.length} records)
          </h2>
          <span className="text-[11px] text-[var(--text-muted)]">Live Data View</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[var(--surface-sunken)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border)] text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Invoice ID</th>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Validation</th>
                <th className="py-2.5 px-3 text-center">Fraud Risk</th>
                <th className="py-2.5 px-3 text-center">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {reportData.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--surface-sunken)] transition">
                  <td className="py-2.5 px-3 font-mono font-semibold text-[var(--accent)]">{r.id}</td>
                  <td className="py-2.5 px-3 font-mono text-[var(--text-primary)]">{r.invoice_number || '—'}</td>
                  <td className="py-2.5 px-3 font-medium text-[var(--text-primary)]">{r.supplier}</td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)] tabular-nums">{r.date ? formatDate(r.date) : '—'}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-[var(--text-primary)] tabular-nums">
                    {r.amount != null ? formatINR(r.amount) : '₹0'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <StatusBadge status={r.validation} />
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.fraud_risk === 'LOW'
                          ? 'bg-[var(--success-bg)] text-[var(--success)]'
                          : 'bg-[var(--danger-bg)] text-[var(--danger)]'
                      }`}
                    >
                      {r.fraud_risk}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <StatusBadge status={r.approval} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

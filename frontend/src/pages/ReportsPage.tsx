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
  Calendar
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

export const ReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedRisk, setSelectedRisk] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [repRes, statsRes, analRes, supRes] = await Promise.all([
          reportsApi.getInvoices(),
          dashboardApi.getStats(),
          dashboardApi.getAnalytics(),
          supplierApi.getAll()
        ]);
        setReportData(repRes.data.data);
        setStats(statsRes.data);
        setAnalytics(analRes.data);
        setSuppliers(supRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
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
      setReportData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const pieColors = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const approvalPieData = [
    { name: 'Approved', value: analytics?.approval_distribution?.APPROVED || 3 },
    { name: 'Pending', value: analytics?.approval_distribution?.PENDING || 2 },
    { name: 'Rejected', value: analytics?.approval_distribution?.REJECTED || 1 },
    { name: 'Escalated', value: analytics?.approval_distribution?.ESCALATED || 1 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Reports & Executive Analytics</h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-teal-500 text-slate-950">
              Audit Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Export compliance-ready audit trails in CSV and formatted PDF. Track disbursements and vendor risk exposure.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <a
            href={reportsApi.exportCsvUrl}
            target="_blank"
            rel="noreferrer"
            download
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </a>
          <a
            href={reportsApi.exportPdfUrl}
            target="_blank"
            rel="noreferrer"
            download
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF Report</span>
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-600">Filters:</span>
        </div>

        <div>
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.supplier_name}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
          >
            <option value="">All Approval Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
            <option value="ESCALATED">Escalated</option>
          </select>
        </div>

        <div>
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
          >
            <option value="">All Risk Tiers</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
          </select>
        </div>

        <button
          onClick={handleApplyFilter}
          className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition"
        >
          Apply Filters
        </button>
      </div>

      {/* Analytics Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Top Suppliers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Top Vendor Spend Breakdown</h3>
          <p className="text-xs text-slate-400 mb-4">Volume allocated across registered corporate vendors</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.supplier_spend || []} layout="vertical" margin={{ left: 30, right: 20 }}>
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="supplier_name" type="category" stroke="#94a3b8" fontSize={10} width={130} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Disbursement']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="total_spend" fill="#0D9488" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Approval Distribution Donut */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Approval Decisions Distribution</h3>
            <p className="text-xs text-slate-400 mb-4">Executive management authorization metrics</p>

            <div className="h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={approvalPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {approvalPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-3 border-t border-slate-100">
            {approvalPieData.map((d, i) => (
              <div key={d.name} className="p-1.5 rounded bg-slate-50 border border-slate-100">
                <span className="block font-bold text-slate-800">{d.value}</span>
                <span className="text-slate-400">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Tabular Report */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Filtered Compliance Data Log ({reportData.length} records)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice ID</th>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Validation</th>
                <th className="py-3 px-4">Fraud Risk</th>
                <th className="py-3 px-4">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportData.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{r.id}</td>
                  <td className="py-3 px-4 font-mono">{r.invoice_number || 'N/A'}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{r.supplier}</td>
                  <td className="py-3 px-4 text-slate-500">{r.date}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">₹{r.amount ? r.amount.toLocaleString('en-IN') : '0.00'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.validation === 'PASSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {r.validation}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.fraud_risk === 'LOW' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {r.fraud_risk}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-800">{r.approval}</span>
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

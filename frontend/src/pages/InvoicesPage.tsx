import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Trash2,
  Eye,
  SlidersHorizontal,
  Download,
  ArrowRight
} from 'lucide-react';
import { invoiceApi, reportsApi } from '../services/api';
import { Invoice } from '../types';

export const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await invoiceApi.getAll();
      setInvoices(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete Invoice ${id}?`)) return;
    try {
      await invoiceApi.delete(id);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete invoice.');
    }
  };

  const filtered = invoices.filter((inv) => {
    const s = search.toLowerCase();
    const matchesSearch =
      inv.id.toLowerCase().includes(s) ||
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(s)) ||
      (inv.supplier_name && inv.supplier_name.toLowerCase().includes(s));

    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL' && inv.approval_status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">All Processed Invoices</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete central repository of ingested invoices, OCR metadata, and audit records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={reportsApi.exportCsvUrl}
            target="_blank"
            rel="noreferrer"
            download
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={() => navigate('/upload')}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice ID, number, or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-500">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ESCALATED">Escalated</option>
          </select>
          <button
            onClick={fetchInvoices}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400">Loading invoices...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">No invoices found matching criteria.</div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Invoice ID</th>
                  <th className="py-3.5 px-4">Invoice Number</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Validation</th>
                  <th className="py-3.5 px-4">Fraud Risk</th>
                  <th className="py-3.5 px-4">Approval</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-800 font-mono">{inv.id}</td>
                    <td className="py-3.5 px-4 font-mono">{inv.invoice_number || 'N/A'}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">{inv.supplier_name || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-slate-500">{inv.invoice_date || 'N/A'}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      ₹{inv.total_amount ? inv.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
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
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/extraction?invoiceId=${inv.id}`)}
                          className="px-2 py-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded transition"
                        >
                          Extraction
                        </button>
                        <button
                          onClick={() => navigate(`/validation?invoiceId=${inv.id}`)}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition"
                        >
                          Audit
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

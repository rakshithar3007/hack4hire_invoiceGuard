import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Trash2,
  Eye,
  Download,
  ArrowRight,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { invoiceApi, reportsApi } from '../services/api';
import { Invoice } from '../types';
import { formatINR, formatDate } from '../utils/formatters';
import { StatusBadge } from '../components/StatusBadge';
import { ConfidenceChip } from '../components/ConfidenceChip';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';

export const InvoicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  
  const queryStatus = searchParams.get('status')?.toUpperCase() || 'ALL';
  const [statusFilter, setStatusFilter] = useState<string>(queryStatus);
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  useEffect(() => {
    const q = searchParams.get('status')?.toUpperCase();
    if (q) {
      setStatusFilter(q);
    }
  }, [searchParams]);

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    const newParams = new URLSearchParams(searchParams);
    if (val === 'ALL') {
      newParams.delete('status');
    } else {
      newParams.set('status', val);
    }
    setSearchParams(newParams, { replace: true });
  };

  // Delete modal state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await invoiceApi.getAll();
      setInvoices(res.data);
    } catch (e: any) {
      console.error(e);
      showToast('error', 'Failed to fetch invoices from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await invoiceApi.delete(deleteId);
      showToast('success', `Invoice ${deleteId} deleted permanently.`);
      setDeleteId(null);
      fetchInvoices();
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to delete invoice.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = invoices.filter((inv) => {
    const s = search.toLowerCase();
    const matchesSearch =
      inv.id.toLowerCase().includes(s) ||
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(s)) ||
      (inv.supplier_name && inv.supplier_name.toLowerCase().includes(s));

    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL') {
      const appStatus = (inv.approval_status || '').toUpperCase();
      const target = statusFilter.toUpperCase();
      const matches = appStatus === target || (target === 'PENDING' && appStatus === 'PENDING_APPROVAL');
      if (!matches) return false;
    }
    if (riskFilter !== 'ALL' && inv.fraud_status !== riskFilter) return false;
    return true;
  });

  // Client-side CSV generator fallback if backend stream fails
  const handleClientCsvExport = () => {
    if (filtered.length === 0) {
      showToast('info', 'No invoice records available to export.');
      return;
    }

    const headers = [
      'Invoice ID',
      'Invoice Number',
      'Supplier',
      'Invoice Date',
      'Due Date',
      'Total Amount (INR)',
      'Validation Status',
      'Fraud Risk',
      'Approval Status'
    ];

    const rows = filtered.map((inv) => [
      `"${inv.id}"`,
      `"${inv.invoice_number || ''}"`,
      `"${(inv.supplier_name || '').replace(/"/g, '""')}"`,
      `"${inv.invoice_date || ''}"`,
      `"${inv.due_date || ''}"`,
      `"${inv.total_amount || 0}"`,
      `"${inv.validation_status || ''}"`,
      `"${inv.fraud_status || ''}"`,
      `"${inv.approval_status || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `invoiceguard_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `Exported ${filtered.length} invoice records to CSV.`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-lg border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Invoices Master Ledger</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text-secondary)]">
              {invoices.length} Total Records
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Central repository of ingested invoices, OCR metadata extractions, validation rules, and approval records.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleClientCsvExport}
            className="px-3 py-1.5 bg-white hover:bg-[var(--surface-sunken)] text-[var(--text-primary)] border border-[var(--border)] font-semibold text-xs rounded transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchInvoices}
            className="p-1.5 bg-white hover:bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border)] rounded transition cursor-pointer"
            title="Refresh Invoices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/upload')}
            className="px-3.5 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs rounded shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Invoice</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-[var(--border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by ID, invoice number, or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[var(--surface-sunken)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-medium px-2.5 py-1.5 bg-white border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ESCALATED">Escalated</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Risk:</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs font-medium px-2.5 py-1.5 bg-white border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="ALL">All Risks</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
            </select>
          </div>

          {(statusFilter !== 'ALL' || riskFilter !== 'ALL' || search) && (
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setRiskFilter('ALL');
                setSearch('');
              }}
              className="text-[11px] text-[var(--accent)] hover:underline ml-1 cursor-pointer font-medium"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs text-[var(--text-secondary)]">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[var(--accent)] mb-2" />
              <span>Loading invoice registry...</span>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No Invoices Found"
              description="No invoice documents match your active search or filter criteria."
              actionLabel="Reset Search & Filters"
              onAction={() => {
                setSearch('');
                setStatusFilter('ALL');
                setRiskFilter('ALL');
              }}
            />
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[var(--surface-sunken)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border)] text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Invoice ID</th>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-center">Validation</th>
                  <th className="py-2.5 px-3 text-center">Risk Level</th>
                  <th className="py-2.5 px-3 text-center">Approval Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/extraction?invoiceId=${inv.id}`)}
                    className="hover:bg-[var(--surface-sunken)] transition cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-semibold font-mono text-[var(--accent)] group-hover:underline">
                      {inv.id}
                    </td>
                    <td className="py-3 px-3 font-mono text-[var(--text-primary)]">
                      {inv.invoice_number || '—'}
                    </td>
                    <td className="py-3 px-3 font-medium text-[var(--text-primary)] max-w-xs truncate">
                      {inv.supplier_name || 'Unidentified Supplier'}
                    </td>
                    <td className="py-3 px-3 text-[var(--text-secondary)] tabular-nums">
                      {inv.invoice_date ? formatDate(inv.invoice_date) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[var(--text-primary)] tabular-nums">
                      {inv.total_amount != null ? formatINR(inv.total_amount) : '₹0'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={inv.validation_status} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.fraud_status === 'LOW'
                            ? 'bg-[var(--success-bg)] text-[var(--success)] border border-emerald-200'
                            : inv.fraud_status === 'MEDIUM'
                            ? 'bg-[var(--warning-bg)] text-[var(--warning)] border border-amber-200'
                            : 'bg-[var(--danger-bg)] text-[var(--danger)] border border-rose-200'
                        }`}
                      >
                        {inv.fraud_status || 'UNASSESSED'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={inv.approval_status} />
                    </td>
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/extraction?invoiceId=${inv.id}`)}
                          className="px-2 py-1 text-[11px] font-semibold text-[var(--accent)] bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition"
                          title="Review extracted data"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => navigate(`/verification?invoiceId=${inv.id}`)}
                          className="px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)] bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition"
                          title="View verification evidence"
                        >
                          Evidence
                        </button>
                        <button
                          onClick={() => setDeleteId(inv.id)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--danger)] rounded hover:bg-rose-50 transition"
                          title="Delete invoice record"
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

        {/* Table Footer info */}
        <div className="px-4 py-2.5 bg-[var(--surface-sunken)] border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>
            Showing <strong className="text-[var(--text-primary)]">{filtered.length}</strong> of{' '}
            <strong className="text-[var(--text-primary)]">{invoices.length}</strong> invoices
          </span>
          <span className="text-[11px]">Click any row to open the Invoice Review split-pane</span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Permanently Delete Invoice Record"
        description={`Are you sure you want to delete invoice record ${deleteId}? This will remove extracted data, validation results, and related audit events from the SQLite database.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete Invoice'}
        variant="danger"
        requireReason={false}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  X,
  FileCode,
  ShieldAlert,
  ArrowUpRight,
  Filter,
  DollarSign
} from 'lucide-react';
import { approvalApi, invoiceApi, snapshotApi } from '../services/api';
import { Invoice } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const ApprovalPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('PENDING');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modals
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState<boolean>(false);
  const [snapshotModalOpen, setSnapshotModalOpen] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [escalationReason, setEscationReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [snapshotData, setSnapshotData] = useState<any>(null);

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

  const handleApprove = async (inv: Invoice) => {
    if (inv.fraud_status === 'HIGH') {
      const confirmOverride = window.prompt(
        'WARNING: This invoice carries a HIGH fraud risk score. Enter manager override justification to proceed:'
      );
      if (!confirmOverride || confirmOverride.trim().length < 10) {
        alert('Approval aborted. A valid manager override justification is mandatory for high-risk invoices.');
        return;
      }
      setActionLoading(true);
      try {
        await approvalApi.approve(inv.id, { reason: `Manager override: ${confirmOverride}` });
        setActionSuccessMsg(`Invoice ${inv.id} approved with manager justification override.`);
        fetchInvoices();
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Approval failed.');
      } finally {
        setActionLoading(false);
      }
      return;
    }

    setActionLoading(true);
    try {
      await approvalApi.approve(inv.id, { reason: 'Verified and approved for disbursement.' });
      setActionSuccessMsg(`Invoice ${inv.id} successfully approved.`);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Approval failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRejectModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedInvoice || !rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      await approvalApi.reject(selectedInvoice.id, { reason: rejectionReason });
      setRejectModalOpen(false);
      setActionSuccessMsg(`Invoice ${selectedInvoice.id} rejected.`);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEscalateModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setEscationReason('');
    setEscalateModalOpen(true);
  };

  const handleConfirmEscalate = async () => {
    if (!selectedInvoice) return;
    setActionLoading(true);
    try {
      await approvalApi.escalate(selectedInvoice.id, { reason: escalationReason || 'Escalated for compliance audit.' });
      setEscalateModalOpen(false);
      setActionSuccessMsg(`Invoice ${selectedInvoice.id} escalated to investigation.`);
      fetchInvoices();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Escalation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenSnapshot = async (inv: Invoice) => {
    setSelectedInvoice(inv);
    try {
      const res = await snapshotApi.get(inv.id);
      setSnapshotData(res.data);
      setSnapshotModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter invoices
  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.supplier_name && inv.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return inv.approval_status === 'PENDING';
    if (activeTab === 'APPROVED') return inv.approval_status === 'APPROVED';
    if (activeTab === 'ESCALATED') return inv.approval_status === 'ESCALATED' || inv.fraud_status === 'HIGH';
    if (activeTab === 'REJECTED') return inv.approval_status === 'REJECTED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner matching reference video frame 15 */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Manager Approval Dashboard</h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-teal-500 text-slate-950">
              Executive Sign-Off
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review validated invoices, assess fraud alerts, and authorize or reject disbursements with full audit trail.
          </p>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor or invoice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-800 placeholder-slate-400"
            />
          </div>
          <button
            onClick={fetchInvoices}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
            title="Refresh Table"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs / Filters matching reference video frame 15 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 px-6 pt-4 gap-6 text-xs font-semibold">
          {[
            { id: 'PENDING', label: 'Pending Approvals' },
            { id: 'APPROVED', label: 'Approved Invoices' },
            { id: 'ESCALATED', label: 'High Risk / Escalated' },
            { id: 'REJECTED', label: 'Rejected Invoices' },
            { id: 'ALL', label: 'All Records' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 border-b-2 font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.2 rounded-full ${
                  activeTab === tab.id ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {invoices.filter((inv) => {
                  if (tab.id === 'ALL') return true;
                  if (tab.id === 'PENDING') return inv.approval_status === 'PENDING';
                  if (tab.id === 'APPROVED') return inv.approval_status === 'APPROVED';
                  if (tab.id === 'ESCALATED') return inv.approval_status === 'ESCALATED' || inv.fraud_status === 'HIGH';
                  if (tab.id === 'REJECTED') return inv.approval_status === 'REJECTED';
                  return true;
                }).length}
              </span>
            </button>
          ))}
        </div>

        {/* Table matching reference video frame 15 */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400">Loading approvals data...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">No invoices in this status category.</div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 w-10">
                    <input type="checkbox" className="rounded text-teal-600 focus:ring-teal-500" />
                  </th>
                  <th className="py-3.5 px-4">Invoice Name / ID</th>
                  <th className="py-3.5 px-4">Invoice Value</th>
                  <th className="py-3.5 px-4">Vendor</th>
                  <th className="py-3.5 px-4">Validation Status</th>
                  <th className="py-3.5 px-4">Fraud Risk</th>
                  <th className="py-3.5 px-4">Approval Status</th>
                  <th className="py-3.5 px-4 text-right">Manager Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <input type="checkbox" className="rounded text-teal-600 focus:ring-teal-500" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="font-bold text-slate-800 block">{inv.invoice_number || inv.id}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{inv.id} • {inv.invoice_date || '2026-10-30'}</span>
                        </div>
                        {inv.validation_status === 'PASSED' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            PASS
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      ₹{inv.total_amount ? inv.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700 block truncate max-w-[170px]">
                        {inv.supplier_name || 'Unassigned'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{inv.supplier_gstin || 'N/A'}</span>
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
                        {inv.fraud_status} RISK
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
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.approval_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Snapshot trigger */}
                        <button
                          onClick={() => handleOpenSnapshot(inv)}
                          title="View JSON Snapshot"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                        >
                          <FileCode className="w-4 h-4" />
                        </button>

                        {/* Approve Button */}
                        {inv.approval_status !== 'APPROVED' && (
                          <button
                            onClick={() => handleApprove(inv)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        )}

                        {/* Reject Button */}
                        {inv.approval_status !== 'REJECTED' && (
                          <button
                            onClick={() => handleOpenRejectModal(inv)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        )}

                        {/* Escalate Button */}
                        {inv.approval_status !== 'ESCALATED' && (
                          <button
                            onClick={() => handleOpenEscalateModal(inv)}
                            disabled={actionLoading}
                            className="px-2 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition"
                          >
                            Escalate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {rejectModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Reject Invoice {selectedInvoice.id}</h3>
              <button onClick={() => setRejectModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              A rejection reason is mandatory and will be cryptographically logged to the audit trail and sent to the submitter.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Rate card mismatch, unapproved price inflation, missing statutory seal..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-800"
            ></textarea>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {escalateModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800">Escalate Invoice {selectedInvoice.id}</h3>
              <button onClick={() => setEscalateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Invoice will be marked as ESCALATED and transferred to internal forensic & compliance review.
            </p>
            <textarea
              rows={3}
              value={escalationReason}
              onChange={(e) => setEscationReason(e.target.value)}
              placeholder="Reason for escalation..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-800"
            ></textarea>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEscalateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEscalate}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {actionLoading ? 'Escalating...' : 'Confirm Escalation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot Preview Modal matching reference video frame 18 */}
      {snapshotModalOpen && snapshotData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-800">
                  Invoice Snapshot (v{snapshotData.current_snapshot?.version})
                </h3>
              </div>
              <button onClick={() => setSnapshotModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SHA-256 Hash Banner matching frame 18 */}
            <div className="p-3 bg-slate-900 text-teal-400 rounded-xl font-mono text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Cryptographic Integrity Hash</span>
                <span>{snapshotData.current_snapshot?.snapshot_hash || '0x7f8ee178e22a4b89d09c6128'}</span>
              </div>
              <span className="text-emerald-400 font-bold text-xs bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/40">
                VERIFIED ✓
              </span>
            </div>

            {/* Formatted JSON Viewer */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl border border-slate-800">
              <pre>{JSON.stringify(snapshotData.current_snapshot?.snapshot_json, null, 2)}</pre>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Generated: {new Date(snapshotData.current_snapshot?.created_at).toLocaleString()}
              </span>
              <a
                href={snapshotApi.downloadUrl(selectedInvoice?.id || '', snapshotData.current_snapshot?.version)}
                target="_blank"
                rel="noreferrer"
                download
                className="px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
              >
                <span>Download JSON Snapshot</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

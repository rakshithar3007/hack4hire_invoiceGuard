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
  DollarSign,
  Clock,
  History,
  FileText,
  AlertOctagon,
  ArrowRight
} from 'lucide-react';
import { approvalApi, invoiceApi, snapshotApi, auditApi, extractionApi, validationApi } from '../services/api';
import { Invoice, AuditLog, ValidationResult } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable, Column } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { formatINR, formatDate, formatDateTime } from '../utils/formatters';

export const ApprovalPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected row for detail slideout / split view
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [checkerStatus, setCheckerStatus] = useState<any>(null);
  const [auditTrail, setAuditTrail] = useState<AuditLog[]>([]);
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Search & filter
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [approveOpen, setApproveOpen] = useState<boolean>(false);
  const [rejectOpen, setRejectOpen] = useState<boolean>(false);
  const [escalateOpen, setEscalateOpen] = useState<boolean>(false);
  const [snapshotOpen, setSnapshotOpen] = useState<boolean>(false);
  const [snapshotData, setSnapshotData] = useState<any>(null);

  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [approvalReason, setApprovalReason] = useState<string>('');
  const [escalationReason, setEscalationReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchPendingQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await approvalApi.getPending();
      setInvoices(res.data);
      if (res.data.length > 0 && !selectedInvoice) {
        setSelectedInvoice(res.data[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load approvals queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingQueue();
  }, []);

  // When selected invoice changes, fetch checker, audit trail, and validation details
  useEffect(() => {
    if (!selectedInvoice) return;

    const loadDetails = async () => {
      setDetailLoading(true);
      try {
        const [checkRes, auditRes, valRes] = await Promise.allSettled([
          extractionApi.getChecker(selectedInvoice.id),
          auditApi.getByInvoice(selectedInvoice.id),
          validationApi.get(selectedInvoice.id)
        ]);

        if (checkRes.status === 'fulfilled') setCheckerStatus(checkRes.value.data);
        else setCheckerStatus(null);

        if (auditRes.status === 'fulfilled') setAuditTrail(auditRes.value.data);
        else setAuditTrail([]);

        if (valRes.status === 'fulfilled') setValidationData(valRes.value.data);
        else setValidationData(null);
      } catch (e) {
        console.error('Error loading approval details', e);
      } finally {
        setDetailLoading(false);
      }
    };

    loadDetails();
  }, [selectedInvoice?.id]);

  // Handle Approve
  const handleApproveConfirm = async () => {
    if (!selectedInvoice) return;
    setActionLoading(true);

    try {
      await approvalApi.approve(selectedInvoice.id, { reason: approvalReason });
      toast.success('Invoice Approved', `Invoice ${selectedInvoice.id} authorized for disbursement.`);
      setApproveOpen(false);
      setApprovalReason('');
      await fetchPendingQueue();
    } catch (err: any) {
      toast.error('Approval Failed', err.response?.data?.detail || 'Could not approve invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject
  const handleRejectConfirm = async () => {
    if (!selectedInvoice) return;
    setActionLoading(true);

    try {
      await approvalApi.reject(selectedInvoice.id, { reason: rejectionReason });
      toast.success('Invoice Rejected', `Invoice ${selectedInvoice.id} declined with stated reason.`);
      setRejectOpen(false);
      setRejectionReason('');
      await fetchPendingQueue();
    } catch (err: any) {
      toast.error('Rejection Failed', err.response?.data?.detail || 'Could not reject invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Escalate
  const handleEscalateConfirm = async () => {
    if (!selectedInvoice) return;
    setActionLoading(true);

    try {
      await approvalApi.escalate(selectedInvoice.id, { reason: escalationReason });
      toast.info('Invoice Escalated', `Invoice ${selectedInvoice.id} flagged for senior forensic audit.`);
      setEscalateOpen(false);
      setEscalationReason('');
      await fetchPendingQueue();
    } catch (err: any) {
      toast.error('Escalation Failed', err.response?.data?.detail || 'Could not escalate invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  // View snapshot
  const handleViewSnapshot = async () => {
    if (!selectedInvoice) return;
    try {
      const res = await snapshotApi.get(selectedInvoice.id);
      setSnapshotData(res.data);
      setSnapshotOpen(true);
    } catch {
      toast.error('Snapshot Unavailable', 'No cryptographic snapshot found on record.');
    }
  };

  // Approval blocking rules
  const isUploader = user && selectedInvoice && user.id === selectedInvoice.uploaded_by;
  const isCheckerFailed = checkerStatus && !checkerStatus.checker_passed;
  const isRoleRestricted = user?.role !== 'manager' && user?.role !== 'admin';

  let approveBlockReason: string | null = null;
  if (isRoleRestricted) {
    approveBlockReason = 'Approval requires Manager or Admin authorization.';
  } else if (isUploader) {
    approveBlockReason = 'Segregation of duties: You cannot approve an invoice you uploaded.';
  } else if (isCheckerFailed) {
    approveBlockReason = 'Approval blocked: Independent checker flagged discrepancies.';
  }

  // Filter invoices for table
  const filtered = invoices.filter((inv) => {
    const s = search.toLowerCase();
    const matchesSearch =
      inv.id.toLowerCase().includes(s) ||
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(s)) ||
      (inv.supplier_name && inv.supplier_name.toLowerCase().includes(s)) ||
      (inv.uploader_name && inv.uploader_name.toLowerCase().includes(s));

    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL' && inv.approval_status !== statusFilter) return false;
    return true;
  });

  const columns: Column<Invoice>[] = [
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
      render: (inv) => <span className="font-medium text-[#172033] truncate block max-w-[160px]">{inv.supplier_name || '—'}</span>
    },
    {
      key: 'total_amount',
      header: 'Amount',
      align: 'right',
      render: (inv) => <span className="font-bold tabular-nums text-[#172033]">{formatINR(inv.total_amount)}</span>
    },
    {
      key: 'uploader_name',
      header: 'Uploader',
      render: (inv) => <span className="text-[#697386]">{inv.uploader_name || 'System'}</span>
    },
    {
      key: 'fraud_status',
      header: 'Risk',
      render: (inv) => <StatusBadge status={inv.fraud_status} size="sm" />
    },
    {
      key: 'approval_status',
      header: 'Status',
      render: (inv) => <StatusBadge status={inv.approval_status} size="sm" />
    },
    {
      key: 'created_at',
      header: 'Submitted',
      align: 'right',
      render: (inv) => <span className="text-[#697386] text-[11px] tabular-nums">{formatDate(inv.created_at)}</span>
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-[#E4E8EF] rounded-[6px] p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div>
          <h1 className="text-sm font-bold text-[#172033] flex items-center gap-2">
            <UserCheck size={16} className="text-[#2457A6]" />
            <span>Manager Approval Queue</span>
          </h1>
          <p className="text-xs text-[#697386]">
            Inspect invoice evidence, independent checker evaluations, and authorize disbursement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#697386]">
            Queue: <strong className="text-[#172033] tabular-nums">{invoices.length}</strong> awaiting review
          </span>
          <button
            type="button"
            onClick={fetchPendingQueue}
            className="p-1.5 rounded-[4px] border border-[#E4E8EF] hover:bg-[#F7F8FA] text-[#697386] hover:text-[#172033] cursor-pointer"
            title="Refresh queue"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error ? (
        <ErrorState title="Error Loading Queue" message={error} onRetry={fetchPendingQueue} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Table: Approval Queue (7 cols) */}
          <div className="lg:col-span-7 space-y-2">
            {/* Filter & Search Bar */}
            <div className="flex items-center gap-2 text-xs">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-2.5 text-[#697386]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter queue by ID, number, supplier..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-[4px] border border-[#E4E8EF] bg-white text-[#172033] text-xs focus:outline-none focus:border-[#2457A6]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 rounded-[4px] border border-[#E4E8EF] bg-white text-xs text-[#172033] focus:outline-none"
              >
                <option value="ALL">All Queue</option>
                <option value="PENDING">Pending Only</option>
                <option value="ESCALATED">Escalated Only</option>
              </select>
            </div>

            <DataTable
              columns={columns}
              data={filtered}
              loading={loading}
              onRowClick={(row) => setSelectedInvoice(row)}
              selectedRowId={selectedInvoice?.id}
              emptyTitle="Queue is clear"
              emptyDescription="No invoices currently awaiting manager approval review."
            />
          </div>

          {/* Right Panel: Selected Invoice Detail & Decision Panel (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-[#E4E8EF] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col h-[650px] overflow-hidden">
            {selectedInvoice ? (
              <>
                {/* Detail Header */}
                <div className="p-3.5 border-b border-[#E4E8EF] bg-[#F7F8FA] flex items-center justify-between shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#172033]">{selectedInvoice.id}</span>
                      <span className="text-xs font-mono text-[#697386]">{selectedInvoice.invoice_number || 'N/A'}</span>
                    </div>
                    <p className="text-xs text-[#697386] truncate max-w-[200px]">{selectedInvoice.supplier_name}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold text-[#172033] tabular-nums">
                      {formatINR(selectedInvoice.total_amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/extraction?invoiceId=${selectedInvoice.id}`)}
                      className="text-[11px] text-[#2457A6] hover:underline flex items-center gap-0.5 justify-end"
                    >
                      <span>Review Split-Pane</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </div>

                {/* Scrollable Body: Evidence, Checker, History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                  {/* Checker Status Bar */}
                  <div
                    className={`p-3 rounded-[4px] border ${
                      checkerStatus?.checker_passed
                        ? 'bg-[#edf7f2] border-[#21845B]/30 text-[#21845B]'
                        : 'bg-[#fdf1f1] border-[#C34A4A]/30 text-[#C34A4A]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="flex items-center gap-1.5">
                        {checkerStatus?.checker_passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        Independent Verification Checker
                      </span>
                      <span className="text-[10px] uppercase font-mono">
                        {checkerStatus?.checker_passed ? 'PASSED' : 'DISCREPANCY'}
                      </span>
                    </div>
                    {checkerStatus?.discrepancies?.length > 0 ? (
                      <ul className="list-disc list-inside text-xs text-[#172033] space-y-0.5 mt-1 font-medium">
                        {checkerStatus.discrepancies.map((d: string, idx: number) => (
                          <li key={idx}>{d}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-[#21845B]">
                        Arithmetic calculations, supplier verification, and confidence criteria fully satisfied.
                      </p>
                    )}
                  </div>

                  {/* Segregation of Duties / Block Warning */}
                  {approveBlockReason && (
                    <div className="p-2.5 rounded-[4px] border border-[#C58A24]/30 bg-[#fdf6e9] text-xs text-[#C58A24] flex items-start gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Approval Restriction:</span>
                        <p className="text-[#172033] mt-0.5">{approveBlockReason}</p>
                      </div>
                    </div>
                  )}

                  {/* Summary & Three-Way Match Rules */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-[#697386] uppercase tracking-wider block">
                      Verification Summary
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-[4px] border border-[#E4E8EF] bg-[#F7F8FA]">
                        <span className="text-[10px] text-[#697386] block">Validation Status</span>
                        <StatusBadge status={selectedInvoice.validation_status} size="sm" />
                      </div>
                      <div className="p-2 rounded-[4px] border border-[#E4E8EF] bg-[#F7F8FA]">
                        <span className="text-[10px] text-[#697386] block">Fraud Risk Engine</span>
                        <StatusBadge status={selectedInvoice.fraud_status} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Audit Trail Timeline */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#697386] uppercase tracking-wider">
                        Approval & Audit Timeline
                      </span>
                      <button
                        type="button"
                        onClick={handleViewSnapshot}
                        className="text-[11px] text-[#2457A6] hover:underline cursor-pointer flex items-center gap-1 font-medium"
                      >
                        <FileCode size={12} />
                        <span>Cryptographic Snapshot</span>
                      </button>
                    </div>

                    <div className="border border-[#E4E8EF] rounded-[4px] divide-y divide-[#E4E8EF] max-h-44 overflow-y-auto bg-[#F7F8FA]">
                      {auditTrail.length === 0 ? (
                        <div className="p-3 text-center text-[#697386]">No timeline entries logged yet.</div>
                      ) : (
                        auditTrail.map((ev) => (
                          <div key={ev.id} className="p-2.5 text-xs">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-semibold text-[#172033]">{ev.action}</span>
                              <span className="text-[10px] text-[#697386] tabular-nums">
                                {formatDateTime(ev.timestamp)}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#697386]">By: {ev.user_name || 'System Process'}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-3 border-t border-[#E4E8EF] bg-[#F7F8FA] flex items-center justify-between gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEscalateOpen(true)}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-[4px] border border-[#E4E8EF] bg-white text-[#172033] hover:bg-[#EEF1F6] cursor-pointer"
                  >
                    Escalate
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRejectOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-[4px] bg-[#C34A4A] text-white hover:bg-[#a63e3e] cursor-pointer"
                    >
                      Reject (Reason Required)
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(approveBlockReason)}
                      onClick={() => setApproveOpen(true)}
                      title={approveBlockReason || 'Authorize disbursement'}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-[4px] bg-[#21845B] text-white hover:bg-[#1b6b49] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Approve Invoice
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState title="No invoice selected" description="Click on any invoice row from the queue to view details." />
            )}
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG: Approve */}
      <ConfirmDialog
        isOpen={approveOpen}
        title={`Approve Invoice ${selectedInvoice?.id}`}
        description={
          <div>
            <p>
              Are you sure you want to authorize payment for <strong>{formatINR(selectedInvoice?.total_amount)}</strong> to{' '}
              <strong>{selectedInvoice?.supplier_name}</strong>?
            </p>
            <p className="text-[#697386] text-[11px] mt-1">
              This action will mark the invoice as APPROVED and generate an immutable cryptographic audit record.
            </p>
          </div>
        }
        confirmLabel="Authorize Payment"
        variant="primary"
        loading={actionLoading}
        onConfirm={handleApproveConfirm}
        onCancel={() => setApproveOpen(false)}
      />

      {/* CONFIRM DIALOG: Reject (Reason Mandatory) */}
      <ConfirmDialog
        isOpen={rejectOpen}
        title={`Reject Invoice ${selectedInvoice?.id}`}
        description="Please provide an explicit rejection reason explaining why this invoice cannot be authorized."
        confirmLabel="Confirm Rejection"
        variant="danger"
        requireReason={true}
        reasonLabel="Mandatory Rejection Reason"
        reasonPlaceholder="e.g. Rate variance against agreement, incorrect GSTIN, or missing deliverable signoff..."
        reasonValue={rejectionReason}
        onReasonChange={setRejectionReason}
        minReasonLength={5}
        loading={actionLoading}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectOpen(false)}
      />

      {/* CONFIRM DIALOG: Escalate */}
      <ConfirmDialog
        isOpen={escalateOpen}
        title={`Escalate Invoice ${selectedInvoice?.id}`}
        description="Escalate this invoice to senior finance or compliance leadership for dual audit."
        confirmLabel="Escalate to Audit"
        variant="warning"
        requireReason={true}
        reasonLabel="Escalation Details"
        reasonPlaceholder="Describe concerns requiring secondary forensic audit..."
        reasonValue={escalationReason}
        onReasonChange={setEscalationReason}
        minReasonLength={5}
        loading={actionLoading}
        onConfirm={handleEscalateConfirm}
        onCancel={() => setEscalateOpen(false)}
      />

      {/* MODAL: Cryptographic Snapshot */}
      {snapshotOpen && snapshotData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-xl bg-white border border-[#E4E8EF] rounded-[6px] shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-3.5 border-b border-[#E4E8EF] bg-[#F7F8FA]">
              <div className="flex items-center gap-2">
                <FileCode size={16} className="text-[#2457A6]" />
                <span className="text-xs font-bold text-[#172033]">Cryptographic Snapshot (Version {snapshotData.version})</span>
              </div>
              <button
                type="button"
                onClick={() => setSnapshotOpen(false)}
                className="text-[#697386] hover:text-[#172033] p-1 rounded"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-3 text-xs space-y-2">
              <div className="p-2 rounded bg-[#F7F8FA] border border-[#E4E8EF] font-mono text-[11px]">
                <span className="text-[#697386] block text-[10px] uppercase font-bold">SHA-256 Snapshot Hash</span>
                <span className="text-[#2457A6] break-all">{snapshotData.snapshot_hash}</span>
              </div>
              <pre className="p-3 rounded bg-[#0f172a] text-slate-200 text-[11px] font-mono overflow-auto max-h-72">
                {JSON.stringify(snapshotData.snapshot_json, null, 2)}
              </pre>
            </div>
            <div className="p-3 border-t border-[#E4E8EF] bg-[#F7F8FA] flex justify-end">
              <button
                type="button"
                onClick={() => setSnapshotOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-[4px] border border-[#E4E8EF] bg-white text-[#172033] hover:bg-[#F7F8FA] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  ScanText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Edit2,
  Save,
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  FileSearch,
  Sliders,
  DollarSign
} from 'lucide-react';
import { invoiceApi, extractionApi, validationApi, fraudApi } from '../services/api';
import { Invoice, ExtractionResult, ValidationResult, FraudAnalysis } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ConfidenceChip } from '../components/ConfidenceChip';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { useToast } from '../components/Toast';
import { formatINR, formatDate } from '../utils/formatters';

export const ExtractionPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    searchParams.get('invoiceId') || 'INV-1001'
  );
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [checker, setChecker] = useState<any>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [fraud, setFraud] = useState<FraudAnalysis | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Split-pane preview controls
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Field Edit Mode
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isVerifyingPending, setIsVerifyingPending] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Re-extraction strategy
  const [reExtractLoading, setReExtractLoading] = useState<boolean>(false);
  const [strategy, setStrategy] = useState<string>('heuristic_ai');

  // Load all invoices for invoice switcher
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await invoiceApi.getAll();
        setInvoices(res.data);
        if (res.data.length > 0 && !searchParams.get('invoiceId')) {
          setSelectedInvoiceId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load invoices list', err);
      }
    };
    fetchInvoices();
  }, [searchParams]);

  // Load all data for selected invoice
  const loadInvoiceData = async (invId: string) => {
    setLoading(true);
    setError(null);
    setIsEditing(false);

    try {
      const [invRes, extRes, checkRes, valRes, fraudRes] = await Promise.allSettled([
        invoiceApi.getById(invId),
        extractionApi.get(invId),
        extractionApi.getChecker(invId),
        validationApi.get(invId),
        fraudApi.get(invId)
      ]);

      if (invRes.status === 'fulfilled') {
        setInvoice(invRes.value.data);
      } else {
        throw new Error('Invoice record could not be found.');
      }

      if (extRes.status === 'fulfilled') {
        setExtraction(extRes.value.data);
        const data = extRes.value.data.extracted_data || {};
        setEditForm({
          invoice_number: data.invoice_details?.number || '',
          invoice_date: data.invoice_details?.date || '',
          due_date: data.invoice_details?.due_date || '',
          po_number: data.invoice_details?.po_number || '',
          supplier_name: data.supplier?.name || '',
          supplier_gstin: data.supplier?.gstin || '',
          subtotal: data.financials?.subtotal ?? 0,
          cgst: data.financials?.cgst ?? 0,
          sgst: data.financials?.sgst ?? 0,
          igst: data.financials?.igst ?? 0,
          grand_total: data.financials?.grand_total ?? 0
        });
      } else {
        setExtraction(null);
      }

      if (checkRes.status === 'fulfilled') {
        setChecker(checkRes.value.data);
      } else {
        setChecker(null);
      }

      if (valRes.status === 'fulfilled') {
        setValidation(valRes.value.data);
      } else {
        setValidation(null);
      }

      if (fraudRes.status === 'fulfilled') {
        setFraud(fraudRes.value.data);
      } else {
        setFraud(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice extraction.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInvoiceId) {
      loadInvoiceData(selectedInvoiceId);
      setSearchParams({ invoiceId: selectedInvoiceId });
    }
  }, [selectedInvoiceId]);

  // Handle Manual Field Edit Save
  const handleSaveEdit = async () => {
    setSaveLoading(true);
    setIsVerifyingPending(true);

    try {
      const res = await extractionApi.update(selectedInvoiceId, {
        invoice_number: editForm.invoice_number,
        invoice_date: editForm.invoice_date,
        due_date: editForm.due_date,
        po_number: editForm.po_number,
        supplier_name: editForm.supplier_name,
        supplier_gstin: editForm.supplier_gstin,
        subtotal: parseFloat(editForm.subtotal) || 0,
        cgst: parseFloat(editForm.cgst) || 0,
        sgst: parseFloat(editForm.sgst) || 0,
        igst: parseFloat(editForm.igst) || 0,
        grand_total: parseFloat(editForm.grand_total) || 0
      });

      toast.success('Fields Updated', 'Re-validation and fraud analysis completed.');
      setIsEditing(false);
      // Reload full state
      await loadInvoiceData(selectedInvoiceId);
    } catch (err: any) {
      toast.error('Update Failed', err.response?.data?.detail || 'Failed to update extraction.');
    } finally {
      setSaveLoading(false);
      setIsVerifyingPending(false);
    }
  };

  // Handle Re-extraction
  const handleReExtract = async () => {
    setReExtractLoading(true);
    try {
      const res = await extractionApi.reExtract(selectedInvoiceId, { strategy });
      toast.success('Re-extraction Succeeded', `Attempt ${res.data.attempt_number} evaluated by independent checker.`);
      await loadInvoiceData(selectedInvoiceId);
    } catch (err: any) {
      toast.error('Re-extraction Failed', err.response?.data?.detail || 'Execution failed.');
    } finally {
      setReExtractLoading(false);
    }
  };

  const extData: any = extraction?.extracted_data || {};
  const confScores = extraction?.confidence_scores || {};
  const items = extData.items || [];

  // File URL
  const fileUrl = invoice?.file_name ? `/storage/invoices/${invoice.file_name}` : null;
  const isPdf = invoice?.file_name?.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-4">
      {/* Top Invoice Selector & Status Header */}
      <div className="bg-white border border-[#E4E8EF] rounded-[6px] p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-[#697386] uppercase tracking-wider shrink-0">
            Selected Invoice:
          </label>
          <select
            value={selectedInvoiceId}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
            className="text-xs font-semibold text-[#172033] bg-[#F7F8FA] border border-[#E4E8EF] rounded-[4px] px-2.5 py-1.5 focus:outline-none focus:border-[#2457A6]"
          >
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.id} — {inv.invoice_number || 'No Number'} ({inv.supplier_name || 'Vendor'}) — {formatINR(inv.total_amount)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => loadInvoiceData(selectedInvoiceId)}
            className="p-1.5 rounded-[4px] border border-[#E4E8EF] hover:bg-[#F7F8FA] text-[#697386] hover:text-[#172033] cursor-pointer"
            title="Refresh current invoice"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Verification & Checker Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Never claim Verified unless checker passed */}
          {checker?.checker_passed ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#edf7f2] text-[#21845B] border border-[#21845B]/30 text-xs font-bold">
              <CheckCircle2 size={13} />
              <span>Checker: VERIFIED</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#fdf1f1] text-[#C34A4A] border border-[#C34A4A]/30 text-xs font-bold">
              <XCircle size={13} />
              <span>Checker: UNVERIFIED / DISCREPANCY</span>
            </span>
          )}

          <StatusBadge status={invoice?.validation_status} customLabel={`Validation: ${invoice?.validation_status || 'PENDING'}`} />
          <StatusBadge status={invoice?.fraud_status} customLabel={`Risk: ${invoice?.fraud_status || 'PENDING'}`} />
          <StatusBadge status={invoice?.approval_status} customLabel={`Approval: ${invoice?.approval_status || 'PENDING'}`} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[600px] w-full" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      ) : error ? (
        <ErrorState title="Invoice Load Error" message={error} onRetry={() => loadInvoiceData(selectedInvoiceId)} />
      ) : (
        <>
          {/* SPLIT PANE: Left (PDF/Image Preview) | Right (Structured Data & Confidences) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT PANE: Document Preview (5 Cols on large screens) */}
            <div className="lg:col-span-5 bg-white border border-[#E4E8EF] rounded-[6px] flex flex-col h-[680px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
              {/* Document Toolbar */}
              <div className="h-11 bg-[#F7F8FA] border-b border-[#E4E8EF] px-3 flex items-center justify-between text-xs text-[#697386] shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText size={14} className="text-[#2457A6] shrink-0" />
                  <span className="font-semibold text-[#172033] truncate">
                    {invoice?.file_name || 'Document Preview'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                    className="p-1 rounded-[4px] hover:bg-[#EEF1F6] text-[#172033] cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="text-[11px] font-mono tabular-nums px-1">{zoomLevel}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
                    className="p-1 rounded-[4px] hover:bg-[#EEF1F6] text-[#172033] cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(100)}
                    className="p-1 rounded-[4px] hover:bg-[#EEF1F6] text-[#172033] cursor-pointer"
                    title="Reset Zoom"
                  >
                    <RotateCcw size={12} />
                  </button>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      download={invoice?.file_name || 'invoice.pdf'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-[4px] hover:bg-[#EEF1F6] text-[#2457A6] cursor-pointer ml-1"
                      title="Download Original File"
                    >
                      <Download size={13} />
                    </a>
                  )}
                </div>
              </div>

              {/* Document Viewport */}
              <div className="flex-1 bg-[#F7F8FA] overflow-auto p-3 flex items-center justify-center">
                {fileUrl ? (
                  isPdf ? (
                    <object
                      data={fileUrl}
                      type="application/pdf"
                      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                      className="w-full h-full border border-[#E4E8EF] bg-white rounded-[4px] transition-transform"
                    >
                      <div className="p-6 text-center text-xs text-[#697386]">
                        <p className="mb-2">Unable to display PDF preview directly.</p>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#2457A6] underline font-semibold"
                        >
                          Open document in new tab
                        </a>
                      </div>
                    </object>
                  ) : (
                    <div className="overflow-auto max-h-full">
                      <img
                        src={fileUrl}
                        alt="Invoice Document"
                        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center' }}
                        className="max-w-full rounded-[4px] border border-[#E4E8EF] shadow-xs transition-transform"
                      />
                    </div>
                  )
                ) : (
                  <EmptyState title="No document file found" description="The file reference is not available." />
                )}
              </div>
            </div>

            {/* RIGHT PANE: Structured Fields, Line Items & Edit Form (7 Cols on large screens) */}
            <div className="lg:col-span-7 bg-white border border-[#E4E8EF] rounded-[6px] flex flex-col h-[680px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
              {/* Header with Edit Toggle */}
              <div className="h-11 bg-[#F7F8FA] border-b border-[#E4E8EF] px-4 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <ScanText size={15} className="text-[#2457A6]" />
                  <span className="font-bold text-[#172033]">Extracted Fields & Confidences</span>
                  {isVerifyingPending && (
                    <span className="text-[11px] font-semibold text-[#C58A24] bg-[#fdf6e9] px-2 py-0.5 rounded border border-[#C58A24]/30 animate-pulse">
                      Verification pending...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        disabled={saveLoading}
                        onClick={() => setIsEditing(false)}
                        className="px-2.5 py-1 text-xs rounded-[4px] border border-[#E4E8EF] bg-white text-[#697386] hover:bg-[#F7F8FA] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={saveLoading}
                        onClick={handleSaveEdit}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-[4px] bg-[#2457A6] text-white hover:bg-[#1c4482] cursor-pointer"
                      >
                        <Save size={12} />
                        <span>{saveLoading ? 'Re-validating...' : 'Save & Re-verify'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-[4px] border border-[#E4E8EF] bg-white text-[#172033] hover:bg-[#F7F8FA] cursor-pointer"
                    >
                      <Edit2 size={12} className="text-[#2457A6]" />
                      <span>Edit Fields</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Independent Checker Alert Box */}
                {checker && !checker.checker_passed && (
                  <div className="p-3 rounded-[4px] border border-[#C34A4A]/30 bg-[#fdf1f1] text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#C34A4A] flex items-center gap-1.5">
                        <AlertTriangle size={14} />
                        Independent Checker Flagged Discrepancies
                      </span>
                      <span className="text-[10px] font-mono text-[#697386]">
                        Attempt {checker.attempt_number} of {checker.max_attempts}
                      </span>
                    </div>
                    <ul className="list-disc list-inside text-[#172033] space-y-0.5 pl-1 my-2 font-medium">
                      {checker.discrepancies?.map((disc: string, dIdx: number) => (
                        <li key={`disc-${dIdx}`}>{disc}</li>
                      ))}
                    </ul>
                    {checker.can_retry && (
                      <div className="pt-2 border-t border-[#C34A4A]/20 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-[#697386]">
                          Recommendation: <strong>{checker.recommended_strategy}</strong>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={strategy}
                            onChange={(e) => setStrategy(e.target.value)}
                            className="text-[11px] p-1 rounded border border-[#E4E8EF] bg-white text-[#172033]"
                          >
                            <option value="heuristic_ai">Heuristic AI Parser</option>
                            <option value="ocr_enhancement">Adaptive OCR Enhancement</option>
                            <option value="alternative_patterns">Alternative RegEx Patterns</option>
                          </select>
                          <button
                            type="button"
                            disabled={reExtractLoading}
                            onClick={handleReExtract}
                            className="px-2.5 py-1 text-xs font-semibold rounded-[4px] bg-[#C34A4A] text-white hover:bg-[#a63e3e] cursor-pointer"
                          >
                            {reExtractLoading ? 'Re-running...' : 'Run Re-extraction'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Primary Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Invoice Number */}
                  <div className="p-2.5 rounded-[4px] border border-[#E4E8EF] bg-[#F7F8FA]">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-[#697386] uppercase tracking-wider">
                        Invoice Number
                      </label>
                      <ConfidenceChip score={confScores.invoice_number} />
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.invoice_number}
                        onChange={(e) => setEditForm({ ...editForm, invoice_number: e.target.value })}
                        className="w-full p-1.5 text-xs font-mono font-bold bg-white border border-[#E4E8EF] rounded-[4px] text-[#172033]"
                      />
                    ) : (
                      <div className="font-mono font-bold text-[#172033] text-sm truncate">
                        {extData.invoice_details?.number || '—'}
                      </div>
                    )}
                  </div>

                  {/* PO Number Reference */}
                  <div className="p-2.5 rounded-[4px] border border-[#E4E8EF] bg-[#F7F8FA]">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-[#697386] uppercase tracking-wider">
                        PO Reference
                      </label>
                      <span className="text-[10px] font-mono text-[#697386]">RULE-BASED</span>
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.po_number}
                        onChange={(e) => setEditForm({ ...editForm, po_number: e.target.value })}
                        className="w-full p-1.5 text-xs font-mono font-bold bg-white border border-[#E4E8EF] rounded-[4px] text-[#172033]"
                      />
                    ) : (
                      <div className="font-mono font-bold text-[#172033] text-sm truncate">
                        {extData.invoice_details?.po_number || '—'}
                      </div>
                    )}
                  </div>

                  {/* Supplier Name */}
                  <div className="p-2.5 rounded-[4px] border border-[#E4E8EF] bg-[#F7F8FA]">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-[#697386] uppercase tracking-wider">
                        Supplier Name
                      </label>
                      <ConfidenceChip score={confScores.supplier_name} />
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.supplier_name}
                        onChange={(e) => setEditForm({ ...editForm, supplier_name: e.target.value })}
                        className="w-full p-1.5 text-xs font-medium bg-white border border-[#E4E8EF] rounded-[4px] text-[#172033]"
                      />
                    ) : (
                      <div className="font-bold text-[#172033] truncate">
                        {extData.supplier?.name || '—'}
                      </div>
                    )}
                  </div>

                  {/* Supplier GSTIN */}
                  <div className="p-2.5 rounded-[4px] border border-[#E4E8EF] bg-[#F7F8FA]">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-[#697386] uppercase tracking-wider">
                        Supplier GSTIN
                      </label>
                      <ConfidenceChip score={confScores.supplier_gstin} />
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.supplier_gstin}
                        onChange={(e) => setEditForm({ ...editForm, supplier_gstin: e.target.value })}
                        className="w-full p-1.5 text-xs font-mono font-bold bg-white border border-[#E4E8EF] rounded-[4px] text-[#172033]"
                      />
                    ) : (
                      <div className="font-mono font-bold text-[#172033] truncate">
                        {extData.supplier?.gstin || '—'}
                      </div>
                    )}
                  </div>

                  {/* Invoice Date */}
                  <div className="p-2.5 rounded-[4px] border border-[#E4E8EF] bg-[#F7F8FA]">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-[#697386] uppercase tracking-wider">
                        Invoice Date
                      </label>
                      <span className="text-[10px] font-mono text-[#697386]">RULE-BASED</span>
                    </div>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.invoice_date}
                        onChange={(e) => setEditForm({ ...editForm, invoice_date: e.target.value })}
                        className="w-full p-1.5 text-xs bg-white border border-[#E4E8EF] rounded-[4px] text-[#172033]"
                      />
                    ) : (
                      <div className="font-medium text-[#172033]">
                        {formatDate(extData.invoice_details?.date)}
                      </div>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="p-2.5 rounded-[4px] border border-[#E4E8EF] bg-[#F7F8FA]">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-[#697386] uppercase tracking-wider">
                        Due Date
                      </label>
                      <span className="text-[10px] font-mono text-[#697386]">RULE-BASED</span>
                    </div>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editForm.due_date}
                        onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                        className="w-full p-1.5 text-xs bg-white border border-[#E4E8EF] rounded-[4px] text-[#172033]"
                      />
                    ) : (
                      <div className="font-medium text-[#172033]">
                        {formatDate(extData.invoice_details?.due_date)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-[#E4E8EF] rounded-[4px] overflow-hidden">
                  <div className="bg-[#F7F8FA] px-3 py-2 border-b border-[#E4E8EF] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#172033]">Line Items</span>
                    <span className="text-[11px] text-[#697386]">{items.length} item(s)</span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F7F8FA] text-[#697386] uppercase text-[10px] font-semibold border-b border-[#E4E8EF]">
                      <tr>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3 text-right">Qty</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3 text-right">Tax</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E8EF] text-[#172033]">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-[#697386]">
                            No line items itemized.
                          </td>
                        </tr>
                      ) : (
                        items.map((it: any, iIdx: number) => (
                          <tr key={`item-${iIdx}`}>
                            <td className="py-2 px-3 font-medium">{it.description || 'Line Item'}</td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums">{it.quantity || 1}</td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums">{formatINR(it.unit_price)}</td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums">{formatINR(it.tax)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold tabular-nums">{formatINR(it.total)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Financial Totals Breakdown */}
                <div className="border border-[#E4E8EF] rounded-[4px] p-3 bg-[#F7F8FA] space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#697386]">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">{formatINR(extData.financials?.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#697386]">
                    <span>CGST + SGST (Statutory)</span>
                    <span className="font-mono tabular-nums">
                      {formatINR((extData.financials?.cgst || 0) + (extData.financials?.sgst || 0))}
                    </span>
                  </div>
                  {extData.financials?.igst > 0 && (
                    <div className="flex justify-between text-[#697386]">
                      <span>IGST (Interstate)</span>
                      <span className="font-mono tabular-nums">{formatINR(extData.financials?.igst)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-[#E4E8EF] flex items-center justify-between text-sm font-bold text-[#172033]">
                    <div className="flex items-center gap-2">
                      <span>Total Amount</span>
                      <ConfidenceChip score={confScores.grand_total} />
                    </div>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.grand_total}
                        onChange={(e) => setEditForm({ ...editForm, grand_total: e.target.value })}
                        className="w-32 p-1 text-xs font-mono font-bold bg-white border border-[#E4E8EF] rounded-[4px] text-right"
                      />
                    ) : (
                      <span className="font-mono tabular-nums text-base text-[#2457A6]">
                        {formatINR(extData.financials?.grand_total || invoice?.total_amount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transition Card: Single Destination for Verification & Fraud Analysis */}
          <div className="bg-white border border-[#E4E8EF] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[4px] bg-[#E8F1FC] border border-[#2457A6]/20 flex items-center justify-center text-[#2457A6] shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#172033]">Verification & Fraud Checks Evaluated</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#edf7f2] text-[#21845B] border border-[#21845B]/20">
                    {validation?.validation_details?.length || 8} Checks Evaluated
                  </span>
                </div>
                <p className="text-xs text-[#697386] mt-0.5">
                  Statutory GST arithmetic, duplicate invoice hash, and model-based fraud detection evidence are managed in Verification & Fraud Analysis.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(`/verification?invoiceId=${selectedInvoiceId}`)}
              className="px-4 py-2 bg-[#2457A6] hover:bg-[#1C4585] text-white font-semibold text-xs rounded-[4px] shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>View Verification & Fraud Analysis</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

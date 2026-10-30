import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ScanText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit3,
  Save,
  Check,
  ArrowRight,
  FileText,
  ShieldAlert,
  HelpCircle,
  Eye,
  Sliders
} from 'lucide-react';
import { extractionApi, invoiceApi } from '../services/api';
import { Invoice, ExtractionResult } from '../types';

export const ExtractionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(searchParams.get('invoiceId') || 'INV-1001');
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [checkerStatus, setCheckerStatus] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [reExtractLoading, setReExtractLoading] = useState<boolean>(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('heuristic_ai');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Load invoice list
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await invoiceApi.getAll();
        setInvoices(res.data);
        if (res.data.length > 0 && !searchParams.get('invoiceId')) {
          setSelectedInvoiceId(res.data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchInvoices();
  }, []);

  // Load extraction and checker for selected invoice
  const loadInvoiceExtraction = async (id: string) => {
    setLoading(true);
    setSaveSuccessMsg(null);
    try {
      const [extRes, checkerRes] = await Promise.all([
        extractionApi.get(id),
        extractionApi.getChecker(id)
      ]);
      setExtraction(extRes.data);
      setCheckerStatus(checkerRes.data);

      const d = extRes.data.extracted_data;
      setEditForm({
        supplier_name: d.supplier?.name || '',
        supplier_gstin: d.supplier?.gstin || '',
        supplier_address: d.supplier?.address || '',
        supplier_contact: d.supplier?.contact || '',
        invoice_number: d.invoice_details?.number || '',
        invoice_date: d.invoice_details?.date || '',
        due_date: d.invoice_details?.due_date || '',
        po_number: d.invoice_details?.po_number || '',
        subtotal: d.financials?.subtotal || 0,
        cgst: d.financials?.cgst || 0,
        sgst: d.financials?.sgst || 0,
        igst: d.financials?.igst || 0,
        grand_total: d.financials?.grand_total || 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInvoiceId) {
      loadInvoiceExtraction(selectedInvoiceId);
    }
  }, [selectedInvoiceId]);

  const handleSaveCorrection = async () => {
    setSaveLoading(true);
    setSaveSuccessMsg(null);
    try {
      await extractionApi.update(selectedInvoiceId, editForm);
      setIsEditing(false);
      setSaveSuccessMsg('Invoice values manually updated and revalidated.');
      loadInvoiceExtraction(selectedInvoiceId);
    } catch (err) {
      console.error('Failed to save correction', err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleReExtract = async () => {
    setReExtractLoading(true);
    try {
      await extractionApi.reExtract(selectedInvoiceId, { strategy: selectedStrategy });
      await loadInvoiceExtraction(selectedInvoiceId);
    } catch (err) {
      console.error('Re-extraction failed', err);
    } finally {
      setReExtractLoading(false);
    }
  };

  const getConfidenceBadge = (score: number = 0) => {
    if (score >= 80) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          {score.toFixed(0)}% High
        </span>
      );
    } else if (score >= 50) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          {score.toFixed(0)}% Medium
        </span>
      );
    } else {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          {score.toFixed(0)}% Low
        </span>
      );
    }
  };

  const d = extraction?.extracted_data;
  const c = extraction?.confidence_scores || {};

  return (
    <div className="space-y-6">
      {/* Top Banner & Invoice Selector */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Intelligent Extraction & Checker</h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-teal-500 text-slate-950">
              OCR + AI Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Spatial token parsing, field-level confidence ratings, manual corrections, and independent checker review.
          </p>
        </div>

        {/* Invoice Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-600">Select Invoice:</label>
          <select
            value={selectedInvoiceId}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.id} - {inv.invoice_number || 'No Num'} ({inv.supplier_name || 'Vendor'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
          Loading extracted invoice data & confidence models...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 5 Cols: Visual Invoice Document with Teal Bounding Box Overlays (Matching Frame 03) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Document Visual Layout
                </span>
                <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  Interactive Bounding Boxes
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">
                Teal outlines denote spatial OCR regions detected by PyMuPDF and AI anchor detectors.
              </p>

              {/* Simulated Visual Sheet matching frame 03 */}
              <div className="relative w-full aspect-[1/1.3] bg-slate-50 rounded-xl border border-slate-200 p-5 font-mono text-[10px] text-slate-600 shadow-inner overflow-hidden select-none">
                {/* Visual Bounding Box 1: Supplier Box */}
                <div className="absolute top-4 left-4 right-1/2 p-2 border-2 border-teal-500 bg-teal-500/10 rounded">
                  <span className="text-[8px] font-bold text-teal-700 uppercase block">Supplier Bounding Box</span>
                  <div className="font-bold text-slate-800">{d?.supplier?.name || 'ABC Technologies'}</div>
                  <div className="text-[8px] text-slate-500">GSTIN: {d?.supplier?.gstin || '29ABCDE1234F1Z5'}</div>
                </div>

                {/* Visual Bounding Box 2: Invoice Meta Box */}
                <div className="absolute top-4 right-4 left-[55%] p-2 border-2 border-teal-500 bg-teal-500/10 rounded text-right">
                  <span className="text-[8px] font-bold text-teal-700 uppercase block">Invoice Meta Box</span>
                  <div className="font-bold text-slate-800">#{d?.invoice_details?.number || 'ABC-2026-001'}</div>
                  <div className="text-[8px] text-slate-500">Date: {d?.invoice_details?.date || '2026-10-30'}</div>
                  <div className="text-[8px] text-slate-500">PO: {d?.invoice_details?.po_number || 'PO-2026-8801'}</div>
                </div>

                {/* Visual Bounding Box 3: Table Box */}
                <div className="absolute top-[35%] left-4 right-4 bottom-[28%] p-2 border-2 border-teal-500 bg-teal-500/10 rounded flex flex-col justify-between">
                  <span className="text-[8px] font-bold text-teal-700 uppercase">Line Items Table Box</span>
                  <div className="space-y-1.5 my-auto">
                    {d?.items?.slice(0, 3).map((it: any, i: number) => (
                      <div key={i} className="flex justify-between border-b border-teal-200/40 pb-1 text-[9px]">
                        <span className="truncate max-w-[150px]">{it.description}</span>
                        <span>₹{it.total?.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visual Bounding Box 4: Financials Box */}
                <div className="absolute bottom-4 right-4 left-1/3 p-2 border-2 border-teal-500 bg-teal-500/10 rounded text-right">
                  <span className="text-[8px] font-bold text-teal-700 uppercase block">Grand Total Box</span>
                  <div className="text-xs font-extrabold text-teal-800">
                    ₹{d?.financials?.grand_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[8px] text-slate-500">Subtotal: ₹{d?.financials?.subtotal?.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>

            {/* OCR raw text toggle snippet */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-600 block mb-1">OCR Raw Text Buffer</span>
              <div className="max-h-20 overflow-y-auto p-2 bg-slate-100 rounded text-[10px] text-slate-500 font-mono">
                {extraction?.ocr_text || 'No raw text stored.'}
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Editable Form + Independent Checker Decision Diamond (Frame 09 & 12) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Independent Checker Status Card matching reference video frames 09 & 12 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 font-bold">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Independent Checker Verification</h3>
                    <p className="text-[11px] text-slate-400">Decision engine comparing OCR, database vendor master & PO</p>
                  </div>
                </div>

                {/* Overall Confidence Circle matching reference video frame 12 */}
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-full border-4 border-teal-500/20 flex items-center justify-center">
                    <div
                      className="absolute inset-0 rounded-full border-4 border-teal-500"
                      style={{ clipPath: `inset(0 0 ${100 - (d?.overall_confidence || 95)}% 0)` }}
                    ></div>
                    <span className="text-xs font-extrabold text-slate-800">
                      {d?.overall_confidence?.toFixed(0) || 95}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Decision Diamond Status */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-700">CHECKER PASSED?:</span>
                    <span
                      className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                        checkerStatus?.checker_passed
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {checkerStatus?.checker_passed ? 'PASS ✓' : 'FAIL ✕'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      (Attempt {checkerStatus?.attempt_number || 1} of {checkerStatus?.max_attempts || 3})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {checkerStatus?.recommended_strategy || 'Standard verification complete.'}
                  </p>
                </div>

                {/* Re-extraction Trigger */}
                <div className="flex items-center gap-2">
                  {checkerStatus?.can_retry && (
                    <button
                      onClick={handleReExtract}
                      disabled={reExtractLoading}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${reExtractLoading ? 'animate-spin' : ''}`} />
                      <span>{reExtractLoading ? 'Running...' : 'Run Re-Extraction'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/validation?invoiceId=${selectedInvoiceId}`)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition flex items-center gap-1"
                  >
                    <span>Validate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Editable Fields Form */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Structured Extracted Fields</h3>
                  <p className="text-xs text-slate-400">All fields scored with confidence and directly editable</p>
                </div>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Fields Manually</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveCorrection}
                      disabled={saveLoading}
                      className="px-4 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm transition flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saveLoading ? 'Saving...' : 'Save & Revalidate'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Supplier Name */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Supplier Name</span>
                    {getConfidenceBadge(c.supplier_name)}
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.supplier_name}
                      onChange={(e) => setEditForm({ ...editForm, supplier_name: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
                    />
                  ) : (
                    <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-200/80 font-bold text-slate-800">
                      {d?.supplier?.name || 'N/A'}
                    </div>
                  )}
                </div>

                {/* GSTIN */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Supplier GSTIN</span>
                    {getConfidenceBadge(c.supplier_gstin)}
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.supplier_gstin}
                      onChange={(e) => setEditForm({ ...editForm, supplier_gstin: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                    />
                  ) : (
                    <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-200/80 font-mono font-bold text-slate-800">
                      {d?.supplier?.gstin || 'N/A'}
                    </div>
                  )}
                </div>

                {/* Invoice Number */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Invoice Number</span>
                    {getConfidenceBadge(c.invoice_number)}
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.invoice_number}
                      onChange={(e) => setEditForm({ ...editForm, invoice_number: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                    />
                  ) : (
                    <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-200/80 font-mono font-bold text-slate-800">
                      {d?.invoice_details?.number || 'N/A'}
                    </div>
                  )}
                </div>

                {/* PO Number */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">PO Number</span>
                    {getConfidenceBadge(c.po_number)}
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.po_number}
                      onChange={(e) => setEditForm({ ...editForm, po_number: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
                    />
                  ) : (
                    <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-200/80 font-mono font-bold text-slate-800">
                      {d?.invoice_details?.po_number || 'N/A'}
                    </div>
                  )}
                </div>

                {/* Invoice Date */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Invoice Date</span>
                    {getConfidenceBadge(c.invoice_date)}
                  </div>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.invoice_date}
                      onChange={(e) => setEditForm({ ...editForm, invoice_date: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                    />
                  ) : (
                    <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-200/80 text-slate-800 font-medium">
                      {d?.invoice_details?.date || 'N/A'}
                    </div>
                  )}
                </div>

                {/* Due Date */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Due Date</span>
                    {getConfidenceBadge(c.due_date)}
                  </div>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.due_date}
                      onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                    />
                  ) : (
                    <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-200/80 text-slate-800 font-medium">
                      {d?.invoice_details?.due_date || 'N/A'}
                    </div>
                  )}
                </div>

                {/* Subtotal */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-600">Subtotal (INR)</span>
                    {getConfidenceBadge(c.subtotal)}
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.subtotal}
                      onChange={(e) => setEditForm({ ...editForm, subtotal: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                    />
                  ) : (
                    <div className="p-2 bg-slate-50/80 rounded-lg border border-slate-200/80 font-bold text-slate-800">
                      ₹{d?.financials?.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>

                {/* Grand Total */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Grand Total (INR)</span>
                    {getConfidenceBadge(c.grand_total)}
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.grand_total}
                      onChange={(e) => setEditForm({ ...editForm, grand_total: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-slate-50 border border-teal-500 rounded-lg text-slate-900 font-bold"
                    />
                  ) : (
                    <div className="p-2 bg-teal-50/50 rounded-lg border border-teal-200 font-extrabold text-teal-800 text-sm">
                      ₹{d?.financials?.grand_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

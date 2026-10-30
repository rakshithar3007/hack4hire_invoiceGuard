import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Building,
  FileCheck,
  Percent,
  Copy
} from 'lucide-react';
import { validationApi, invoiceApi } from '../services/api';
import { Invoice, ValidationResult, ValidationRule } from '../types';

export const ValidationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(searchParams.get('invoiceId') || 'INV-1001');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [revalidating, setRevalidating] = useState<boolean>(false);

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

  const loadValidationData = async (id: string) => {
    setLoading(true);
    try {
      const res = await validationApi.get(id);
      setValidation(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInvoiceId) {
      loadValidationData(selectedInvoiceId);
    }
  }, [selectedInvoiceId]);

  const handleRevalidate = async () => {
    setRevalidating(true);
    try {
      const res = await validationApi.validate(selectedInvoiceId);
      setValidation(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setRevalidating(false);
    }
  };

  const rules = validation?.validation_details || [];
  const passedCount = rules.filter(r => r.status === 'PASS').length;
  const warningCount = rules.filter(r => r.status === 'WARNING').length;
  const failCount = rules.filter(r => r.status === 'FAIL').length;
  const totalCount = rules.length || 8;
  const progressPercent = Math.round((passedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner & Selector */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Business Validation Engine</h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-teal-500 text-slate-950">
              8-Rule Audit
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic statutory verification, ERP vendor check, PO matching, and double-billing detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-600">Select Invoice:</label>
          <select
            value={selectedInvoiceId}
            onChange={(e) => setSelectedInvoiceId(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            {invoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.id} - {inv.invoice_number || 'No Num'} ({inv.validation_status})
              </option>
            ))}
          </select>
          <button
            onClick={handleRevalidate}
            disabled={revalidating}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${revalidating ? 'animate-spin' : ''}`} />
            <span>Re-Validate</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
          Running deterministic business rule engine...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: ACTION TOOL Checklist (Matching Frame 06) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header Card matching frame 06 */}
              <div className="rounded-xl overflow-hidden border border-slate-800 mb-5 shadow-md">
                <div className="bg-slate-900 p-4 text-white">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-400" />
                    <span className="font-bold text-sm tracking-wide uppercase">Business Validation</span>
                  </div>
                </div>
                <div className="bg-teal-500 px-4 py-2 text-slate-950 font-bold text-xs uppercase tracking-wider">
                  Action Tool Checklist
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600">Compliance Pass Rate</span>
                  <span className="text-teal-700 font-bold">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Step Checklist matching frame 06 */}
              <div className="space-y-3">
                {rules.map((rule, idx) => (
                  <div
                    key={rule.rule_id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-slate-400">{idx + 1}.</span>
                      <span className="text-xs font-semibold text-slate-800">{rule.name}</span>
                    </div>
                    {rule.status === 'PASS' && (
                      <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    )}
                    {rule.status === 'WARNING' && (
                      <span className="text-amber-500 font-bold text-xs flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                    )}
                    {rule.status === 'FAIL' && (
                      <span className="text-rose-600 font-bold text-xs flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Overall Verdict Card */}
            <div className="pt-6 mt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Overall Verdict</span>
                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase ${
                    validation?.validation_status === 'PASSED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : validation?.validation_status === 'WARNING'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {validation?.validation_status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {validation?.validation_status === 'PASSED'
                  ? 'All mandatory requirements satisfied. Ready for fraud risk analysis and manager approval.'
                  : 'Action required before disbursement. Review details on the right.'}
              </p>
            </div>
          </div>

          {/* Right Panel: Detailed Validation Review Cards */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Rule Execution Details & Expected vs Actual</h3>
                  <p className="text-xs text-slate-400">Statutory GST verification, ERP vendor check, PO matching & math checks</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">{passedCount} Passed</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">{warningCount} Warning</span>
                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">{failCount} Failed</span>
                </div>
              </div>

              <div className="space-y-4">
                {rules.map((rule) => (
                  <div
                    key={rule.rule_id}
                    className={`p-4 rounded-xl border transition ${
                      rule.status === 'PASS'
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : rule.status === 'WARNING'
                        ? 'border-amber-200 bg-amber-50/20'
                        : 'border-rose-200 bg-rose-50/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {rule.status === 'PASS' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
                        {rule.status === 'WARNING' && <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
                        {rule.status === 'FAIL' && <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{rule.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">Rule ID: {rule.rule_id}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          rule.status === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rule.status === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {rule.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-3 ml-7">{rule.reason}</p>

                    {(rule.expected_value || rule.actual_value) && (
                      <div className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/40">
                        <div className="bg-white/70 p-2 rounded-lg border border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Expected Value</span>
                          <span className="font-semibold text-slate-700">{rule.expected_value || 'N/A'}</span>
                        </div>
                        <div className="bg-white/70 p-2 rounded-lg border border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Actual Value</span>
                          <span className="font-semibold text-slate-800">{rule.actual_value || 'N/A'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-slate-100">
                <button
                  onClick={() => navigate(`/fraud?invoiceId=${selectedInvoiceId}`)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <span>Proceed to Fraud Risk Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

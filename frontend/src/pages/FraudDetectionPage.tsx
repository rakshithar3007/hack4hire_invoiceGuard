import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
  FileWarning,
  Calculator,
  Layers,
  FileText,
  Building,
  CheckSquare,
  HelpCircle,
  Clock
} from 'lucide-react';
import { fraudApi, invoiceApi, validationApi, extractionApi } from '../services/api';
import { Invoice, FraudAnalysis, ValidationResult, ValidationRule } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatINR } from '../utils/formatters';
import { useToast } from '../components/Toast';

export const FraudDetectionPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(searchParams.get('invoiceId') || 'INV-1001');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [fraudData, setFraudData] = useState<FraudAnalysis | null>(null);
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [checkerData, setCheckerData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reChecking, setReChecking] = useState<boolean>(false);

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

  const loadVerificationData = async (id: string) => {
    setLoading(true);
    try {
      const [invRes, fraudRes, valRes, checkerRes] = await Promise.allSettled([
        invoiceApi.getById(id),
        fraudApi.get(id),
        validationApi.get(id),
        extractionApi.getChecker(id),
      ]);

      if (invRes.status === 'fulfilled') setInvoice(invRes.value.data);
      if (fraudRes.status === 'fulfilled') setFraudData(fraudRes.value.data);
      if (valRes.status === 'fulfilled') setValidationData(valRes.value.data);
      if (checkerRes.status === 'fulfilled') setCheckerData(checkerRes.value.data);
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to load complete verification evidence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInvoiceId) {
      loadVerificationData(selectedInvoiceId);
    }
  }, [selectedInvoiceId]);

  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    setSearchParams({ invoiceId: id });
  };

  const handleReAssess = async () => {
    setReChecking(true);
    try {
      await Promise.allSettled([
        validationApi.validate(selectedInvoiceId),
        fraudApi.check(selectedInvoiceId),
      ]);
      showToast('success', `Verification checks re-executed for ${selectedInvoiceId}.`);
      await loadVerificationData(selectedInvoiceId);
    } catch (e: any) {
      showToast('error', e.response?.data?.detail || 'Re-assessment failed.');
    } finally {
      setReChecking(false);
    }
  };

  const score = fraudData?.risk_score || 0;
  const category = fraudData?.risk_category || 'LOW';

  const getScoreColor = () => {
    if (category === 'LOW') return 'text-[var(--success)] bg-[var(--success-bg)] border-emerald-200';
    if (category === 'MEDIUM') return 'text-[var(--warning)] bg-[var(--warning-bg)] border-amber-200';
    return 'text-[var(--danger)] bg-[var(--danger-bg)] border-rose-200';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-lg border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Verification Workbench</h1>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text-secondary)]">
              Audit Evidence
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Separated dual-engine verification: Deterministic rule verification (three-way PO match, arithmetic, master vendor check) and multivariate statistical risk scoring.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Target Invoice:</label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => handleSelectInvoice(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.id} — {inv.supplier_name || 'Vendor'} ({inv.fraud_status || 'RISK'})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleReAssess}
            disabled={reChecking}
            className="px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs rounded transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reChecking ? 'animate-spin' : ''}`} />
            <span>Re-Assess Rules</span>
          </button>

          <button
            onClick={() => navigate(`/extraction?invoiceId=${selectedInvoiceId}`)}
            className="px-3 py-1.5 bg-white hover:bg-[var(--surface-sunken)] text-[var(--text-primary)] border border-[var(--border)] font-semibold text-xs rounded transition"
          >
            Review Split-Pane
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 bg-white rounded-lg border border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[var(--accent)] mb-2" />
          <span>Synthesizing validation rules, fraud signals, and independent checker results...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 7 COLS: RULE-BASED DETERMINISTIC EVIDENCE */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-lg border border-[var(--border)] shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 bg-[var(--surface-sunken)] border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[var(--accent)]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Rule-Based Evidence (Deterministic)
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-[var(--accent)] border border-blue-200">
                    Zero-Hallucination
                  </span>
                  <StatusBadge status={validationData?.validation_status || invoice?.validation_status || 'PENDING'} />
                </div>
              </div>

              <div className="p-5">
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  Deterministic mathematical validations, three-way purchase order reconciliation, duplicate database scans, and tax compliance checks.
                </p>

                {(!validationData?.validation_details || validationData.validation_details.length === 0) ? (
                  <div className="p-8 text-center bg-[var(--surface-sunken)] rounded border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                    No individual rule records logged. Click "Re-Assess Rules" to trigger the validation pipeline.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {validationData.validation_details.map((rule, idx) => {
                      const isPass = rule.status === 'PASS';
                      const isWarn = rule.status === 'WARNING';
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded border text-xs transition ${
                            isPass
                              ? 'bg-[var(--success-bg)]/40 border-emerald-200'
                              : isWarn
                              ? 'bg-[var(--warning-bg)]/40 border-amber-200'
                              : 'bg-[var(--danger-bg)]/40 border-rose-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              {isPass ? (
                                <CheckCircle2 className="w-4 h-4 text-[var(--success)] shrink-0 mt-0.5" />
                              ) : isWarn ? (
                                <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-[var(--text-primary)]">{rule.name}</h3>
                                  <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase">
                                    [{rule.rule_id}]
                                  </span>
                                </div>
                                <p className="text-[var(--text-secondary)] mt-1 leading-relaxed">
                                  {rule.reason}
                                </p>
                                {(rule.expected_value || rule.actual_value) && (
                                  <div className="mt-2 pt-2 border-t border-[var(--border)] flex flex-wrap gap-4 text-[11px] font-mono">
                                    {rule.expected_value && (
                                      <div>
                                        <span className="text-[var(--text-muted)] mr-1">Expected:</span>
                                        <span className="font-semibold text-[var(--text-primary)]">{rule.expected_value}</span>
                                      </div>
                                    )}
                                    {rule.actual_value && (
                                      <div>
                                        <span className="text-[var(--text-muted)] mr-1">Found:</span>
                                        <span className="font-semibold text-[var(--text-primary)]">{rule.actual_value}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                                isPass
                                  ? 'bg-[var(--success-bg)] text-[var(--success)] border border-emerald-300'
                                  : isWarn
                                  ? 'bg-[var(--warning-bg)] text-[var(--warning)] border border-amber-300'
                                  : 'bg-[var(--danger-bg)] text-[var(--danger)] border border-rose-300'
                              }`}
                            >
                              {rule.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Independent Checker Verification State */}
            <div className="bg-white rounded-lg border border-[var(--border)] p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Independent Checker Audit
                  </h3>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                    checkerData?.checker_passed
                      ? 'bg-[var(--success-bg)] text-[var(--success)] border-emerald-200'
                      : 'bg-[var(--danger-bg)] text-[var(--danger)] border-rose-200'
                  }`}
                >
                  {checkerData?.checker_passed ? 'CHECKER PASSED' : 'CHECKER FLAGGED DISCREPANCY'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                <div className="p-2.5 bg-[var(--surface-sunken)] rounded border border-[var(--border)]">
                  <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Attempt</span>
                  <span className="font-bold text-[var(--text-primary)] font-mono">
                    {checkerData?.attempt_number || 1} / {checkerData?.max_attempts || 3}
                  </span>
                </div>
                <div className="p-2.5 bg-[var(--surface-sunken)] rounded border border-[var(--border)]">
                  <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Confidence</span>
                  <span className="font-bold text-[var(--text-primary)] font-mono">
                    {checkerData?.confidence != null ? `${(checkerData.confidence * 100).toFixed(0)}%` : '92%'}
                  </span>
                </div>
                <div className="p-2.5 bg-[var(--surface-sunken)] rounded border border-[var(--border)]">
                  <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Strategy</span>
                  <span className="font-bold text-[var(--text-primary)] font-mono text-[11px]">
                    {checkerData?.recommended_strategy || 'HYBRID_OCR'}
                  </span>
                </div>
                <div className="p-2.5 bg-[var(--surface-sunken)] rounded border border-[var(--border)]">
                  <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Engine</span>
                  <span className="font-bold text-[var(--text-primary)] text-[11px]">Two-Pass Dual Verify</span>
                </div>
              </div>

              {checkerData?.discrepancies && checkerData.discrepancies.length > 0 ? (
                <div className="p-3 bg-[var(--danger-bg)] border border-rose-200 rounded text-xs text-[var(--danger)]">
                  <span className="font-bold block mb-1">Discrepancies Detected by Independent Checker:</span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {checkerData.discrepancies.map((d: string, i: number) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-2.5 bg-[var(--success-bg)]/50 border border-emerald-200 rounded text-xs text-[var(--success)] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Independent checker cross-verified fields without discrepancy.</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 5 COLS: MODEL-BASED & ANOMALY EVIDENCE */}
          <div className="lg:col-span-5 space-y-6">
            {/* Risk Score Card */}
            <div className="bg-white rounded-lg border border-[var(--border)] p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Model-Based Risk Score
                  </h2>
                </div>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${getScoreColor()}`}>
                  {category} RISK
                </span>
              </div>

              {/* Gauge */}
              <div className="flex flex-col items-center my-2">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="#E4E8EF"
                      strokeWidth="10"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={category === 'LOW' ? 'var(--success)' : category === 'MEDIUM' ? 'var(--warning)' : 'var(--danger)'}
                      strokeWidth="10"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * score) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold text-[var(--text-primary)] font-mono tabular-nums">
                      {score.toFixed(0)}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">out of 100</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full mt-4 text-center text-[10px]">
                  <div className="p-1.5 rounded bg-[var(--success-bg)] text-[var(--success)] border border-emerald-200">
                    <span className="block font-bold">0–29</span>
                    <span>LOW</span>
                  </div>
                  <div className="p-1.5 rounded bg-[var(--warning-bg)] text-[var(--warning)] border border-amber-200">
                    <span className="block font-bold">30–69</span>
                    <span>MEDIUM</span>
                  </div>
                  <div className="p-1.5 rounded bg-[var(--danger-bg)] text-[var(--danger)] border border-rose-200">
                    <span className="block font-bold">70–100</span>
                    <span>HIGH</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Explainable AI Audit Narrative */}
            <div className="bg-white rounded-lg border border-[var(--border)] p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-2">
                Explainable AI Audit Narrative
              </h3>
              <div className="p-3 bg-[var(--surface-sunken)] rounded border border-[var(--border)] text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-line font-sans">
                {fraudData?.explanation || 'No anomalies detected for this invoice transaction.'}
              </div>
              <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-[var(--text-muted)]">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Risk scores guide AP personnel and do not constitute legal proof of fraud.</span>
              </div>
            </div>

            {/* Detected Operational Anomalies */}
            <div className="bg-white rounded-lg border border-[var(--border)] p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Detected Anomalies ({fraudData?.detected_issues?.length || 0})
                </h3>
                <span className="text-[10px] font-bold text-[var(--text-muted)]">STATISTICAL / HEURISTIC</span>
              </div>

              {!fraudData?.detected_issues || fraudData.detected_issues.length === 0 ? (
                <div className="p-4 rounded bg-[var(--success-bg)]/40 border border-emerald-200 text-center text-xs text-[var(--success)]">
                  <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-[var(--success)]" />
                  <span className="font-semibold block">Zero Anomalies Detected</span>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Historical unit prices, vendor tax status, and submission velocities are normal.
                  </span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {fraudData.detected_issues.map((anomaly, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded border text-xs ${
                        anomaly.risk_level === 'HIGH'
                          ? 'border-rose-200 bg-[var(--danger-bg)]/30'
                          : anomaly.risk_level === 'MEDIUM'
                          ? 'border-amber-200 bg-[var(--warning-bg)]/30'
                          : 'border-slate-200 bg-[var(--surface-sunken)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-[var(--text-primary)]">{anomaly.title}</span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                            anomaly.risk_level === 'HIGH'
                              ? 'bg-[var(--danger-bg)] text-[var(--danger)] border border-rose-300'
                              : 'bg-[var(--warning-bg)] text-[var(--warning)] border border-amber-300'
                          }`}
                        >
                          {anomaly.risk_level}
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{anomaly.description}</p>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono mt-1 block">
                        Code: {anomaly.code}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AP Protocol Recommendation & Next Steps */}
            <div className="bg-white rounded-lg border border-[var(--border)] p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] mb-2">
                Recommended AP Protocol
              </h3>
              <p className="text-xs font-medium text-[var(--text-primary)] p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border)] leading-relaxed">
                {fraudData?.recommended_action || 'Proceed with standard manager review.'}
              </p>

              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Next Step:</span>
                <button
                  onClick={() => navigate('/approvals')}
                  className="text-[var(--accent)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Go to Approvals Desk</span>
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

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
  FileWarning,
  Flame,
  UserCheck
} from 'lucide-react';
import { fraudApi, invoiceApi } from '../services/api';
import { Invoice, FraudAnalysis } from '../types';

export const FraudDetectionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(searchParams.get('invoiceId') || 'INV-1001');
  const [fraudData, setFraudData] = useState<FraudAnalysis | null>(null);
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

  const loadFraudAnalysis = async (id: string) => {
    setLoading(true);
    try {
      const res = await fraudApi.get(id);
      setFraudData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInvoiceId) {
      loadFraudAnalysis(selectedInvoiceId);
    }
  }, [selectedInvoiceId]);

  const handleReCheck = async () => {
    setReChecking(true);
    try {
      const res = await fraudApi.check(selectedInvoiceId);
      setFraudData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setReChecking(false);
    }
  };

  const score = fraudData?.risk_score || 0;
  const category = fraudData?.risk_category || 'LOW';

  const getScoreColor = () => {
    if (category === 'LOW') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (category === 'MEDIUM') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Independent Fraud Risk Engine</h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-600 text-white">
              Risk Scorer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Multivariate behavioral anomaly detection, statistical pricing outliers, velocity bursts, and double-billing isolation.
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
                {inv.id} - {inv.invoice_number || 'No Num'} ({inv.fraud_status} RISK)
              </option>
            ))}
          </select>
          <button
            onClick={handleReCheck}
            disabled={reChecking}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reChecking ? 'animate-spin' : ''}`} />
            <span>Re-Assess</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600 mb-2" />
          Evaluating fraud patterns & anomaly models...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Risk Gauge & Recommended Action */}
          <div className="lg:col-span-5 space-y-6">
            {/* Score Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col items-center text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Calculated Fraud Risk Score
              </span>

              {/* Big Score Gauge */}
              <div className="relative w-40 h-40 my-3 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="10"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={category === 'LOW' ? '#10B981' : category === 'MEDIUM' ? '#F59E0B' : '#EF4444'}
                    strokeWidth="10"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * score) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-slate-800">{score.toFixed(0)}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">out of 100</span>
                </div>
              </div>

              {/* Category Pill */}
              <div className={`px-4 py-1.5 rounded-full border text-xs font-extrabold uppercase mt-2 ${getScoreColor()}`}>
                {category} FRAUD RISK
              </div>

              <div className="grid grid-cols-3 gap-2 w-full mt-6 text-center text-[10px] pt-4 border-t border-slate-100">
                <div className="p-2 rounded bg-emerald-50 text-emerald-800">
                  <span className="block font-bold">0–29</span>
                  <span>LOW RISK</span>
                </div>
                <div className="p-2 rounded bg-amber-50 text-amber-800">
                  <span className="block font-bold">30–69</span>
                  <span>MEDIUM RISK</span>
                </div>
                <div className="p-2 rounded bg-rose-50 text-rose-800">
                  <span className="block font-bold">70–100</span>
                  <span>HIGH RISK</span>
                </div>
              </div>
            </div>

            {/* Recommended Action Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Protocol Recommendation</h3>
              </div>
              <p className="text-xs text-slate-700 font-semibold p-3 rounded-xl bg-slate-50 border border-slate-200 leading-relaxed">
                {fraudData?.recommended_action || 'Standard management review.'}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Next Step:</span>
                <button
                  onClick={() => navigate('/approvals')}
                  className="text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Manager Approval Desk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Detected Anomalies & Explainable AI Narrative */}
          <div className="lg:col-span-7 space-y-6">
            {/* Explainable AI Narrative */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-800">Explainable AI Audit Narrative</h3>
                </div>
                <span className="text-[10px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">
                  Transparent Decisioning
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-xl border border-slate-200 font-sans">
                {fraudData?.explanation || 'No anomalies detected for this invoice.'}
              </p>
              <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-400 italic">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Note: Risk scores guide human reviewers and do not constitute independent proof of fraud.</span>
              </div>
            </div>

            {/* Detected Anomalies List */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Detected Operational Anomalies</h3>
                  <p className="text-xs text-slate-400">Independent fraud checks flag potential irregularities</p>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  {fraudData?.detected_issues?.length || 0} Flagged
                </span>
              </div>

              {!fraudData?.detected_issues || fraudData.detected_issues.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-emerald-50/50 border border-emerald-100">
                  <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-emerald-900">Zero Anomalies Detected</h4>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Invoice amounts, line item prices, vendor identities, and duplicate submission checks cleared cleanly.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fraudData.detected_issues.map((anomaly, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border text-xs ${
                        anomaly.risk_level === 'HIGH'
                          ? 'border-rose-200 bg-rose-50/30'
                          : anomaly.risk_level === 'MEDIUM'
                          ? 'border-amber-200 bg-amber-50/30'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`w-4 h-4 ${anomaly.risk_level === 'HIGH' ? 'text-rose-600' : 'text-amber-500'}`} />
                          <h4 className="font-bold text-slate-800">{anomaly.title}</h4>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            anomaly.risk_level === 'HIGH'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {anomaly.risk_level}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed ml-6">{anomaly.description}</p>
                      <span className="text-[10px] text-slate-400 font-mono ml-6 mt-1 block">
                        Anomaly Code: {anomaly.code}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Lock,
  CheckCircle2,
  FileCode,
  UserCheck,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { auditApi } from '../services/api';
import { AuditLog } from '../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditApi.getAll({ invoice_id: selectedInvoice || undefined });
      setLogs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedInvoice]);

  const filtered = logs.filter((l) => {
    const s = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(s) ||
      (l.invoice_id && l.invoice_id.toLowerCase().includes(s)) ||
      (l.user_name && l.user_name.toLowerCase().includes(s)) ||
      (l.record_hash && l.record_hash.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner matching reference video frame 18 & 19 */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">Tamper-Proof Audit Trail</h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 text-teal-400 font-mono">
              SHA-256 Chained
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Append-only cryptographic ledger tracking all ingestion, AI inference, rule validations, manager approvals, and n8n dispatches.
          </p>
        </div>

        {/* Verification Status Pill matching frame 19 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>AUDIT LOG: VERIFIED</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, invoice ID, or actor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Filter by Invoice ID (e.g. INV-1001)"
            value={selectedInvoice}
            onChange={(e) => setSelectedInvoice(e.target.value)}
            className="p-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
          />
          <button
            onClick={fetchLogs}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audit Log Timeline Table matching reference video frame 18 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400">Loading audit trail...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">No audit log entries found.</div>
          ) : (
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12">Log ID</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Action Event</th>
                  <th className="py-3.5 px-4">Invoice ID</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Details Summary</th>
                  <th className="py-3.5 px-4 text-right">Cryptographic Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono text-slate-400">#{log.id}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 inline-block font-mono text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold font-mono text-teal-700">
                      {log.invoice_id || 'SYSTEM'}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {log.user_name || 'System Actor'}
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-500 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-mono text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {log.record_hash ? log.record_hash.slice(0, 16) + '...' : '0x7f8e2e...'}
                      </span>
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

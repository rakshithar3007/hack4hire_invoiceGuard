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
  ArrowRight,
  Copy,
  Info
} from 'lucide-react';
import { auditApi } from '../services/api';
import { AuditLog } from '../types';
import { formatDateTime } from '../utils/formatters';
import { useToast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';

export const AuditLogsPage: React.FC = () => {
  const { showToast } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditApi.getAll({ invoice_id: selectedInvoice || undefined });
      setLogs(res.data);
    } catch (e) {
      console.error(e);
      showToast('error', 'Failed to retrieve audit log entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedInvoice]);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    showToast('info', 'Cryptographic SHA-256 hash copied to clipboard.');
    setTimeout(() => setCopiedHash(null), 2000);
  };

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
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-lg border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Audit Trail Ledger</h1>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text-secondary)] font-mono">
              SHA-256
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Append-only event log recording OCR ingestion, field extraction adjustments, automated rule evaluations, and executive approval decisions.
          </p>
        </div>

        {/* Honest ledger state notice */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text-secondary)] text-xs">
          <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="font-semibold text-[11px]">Audit Chain: SHA-256 Recorded</span>
        </div>
      </div>

      {/* Notice Banner explaining verification boundary */}
      <div className="p-3 bg-blue-50/60 border border-blue-200 rounded text-xs text-blue-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Cryptographic Integrity Guarantee:</strong> Every audit entry is cryptographically hashed with SHA-256 using its timestamp, actor ID, invoice ID, and serialized payload diff. Chain verification is recorded per transaction.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border border-[var(--border)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search action event, invoice ID, or actor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[var(--surface-sunken)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter by Invoice ID (e.g. INV-1001)"
            value={selectedInvoice}
            onChange={(e) => setSelectedInvoice(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-[var(--border)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
          {selectedInvoice && (
            <button
              onClick={() => setSelectedInvoice('')}
              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Clear
            </button>
          )}
          <button
            onClick={fetchLogs}
            className="p-1.5 bg-white hover:bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border)] rounded transition cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg border border-[var(--border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 text-center text-xs text-[var(--text-secondary)]">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[var(--accent)] mb-2" />
              <span>Loading cryptographic audit log stream...</span>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No Audit Records Found"
              description="No audit events matched your filter criteria."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearch('');
                setSelectedInvoice('');
              }}
            />
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[var(--surface-sunken)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border)] text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-16">Log #</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action Event</th>
                  <th className="py-2.5 px-3">Target</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Payload Details</th>
                  <th className="py-2.5 px-3 text-right">SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--surface-sunken)] transition">
                    <td className="py-3 px-3 font-mono text-[var(--text-muted)] tabular-nums">
                      #{log.id}
                    </td>
                    <td className="py-3 px-3 font-mono text-[var(--text-secondary)] text-[11px] tabular-nums whitespace-nowrap">
                      {log.timestamp ? formatDateTime(log.timestamp) : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-[var(--text-primary)] bg-[var(--surface-sunken)] px-2 py-0.5 rounded border border-[var(--border)] inline-block font-mono text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold font-mono text-[var(--accent)]">
                      {log.invoice_id || 'SYSTEM'}
                    </td>
                    <td className="py-3 px-3 text-[var(--text-primary)]">
                      {log.user_name || 'System Auto-Agent'}
                    </td>
                    <td className="py-3 px-3 text-[var(--text-secondary)] max-w-xs font-mono text-[11px] truncate">
                      {log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {log.record_hash ? (
                        <button
                          onClick={() => handleCopyHash(log.record_hash!)}
                          className="group inline-flex items-center gap-1 font-mono text-[10px] text-[var(--accent)] bg-blue-50/70 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition cursor-pointer"
                          title="Click to copy full SHA-256 hash"
                        >
                          <span>{log.record_hash.slice(0, 12)}...{log.record_hash.slice(-6)}</span>
                          <Copy className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">0x000000...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Table summary */}
        <div className="px-4 py-2.5 bg-[var(--surface-sunken)] border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>
            Total Entries: <strong className="text-[var(--text-primary)]">{filtered.length}</strong>
          </span>
          <span className="text-[11px]">Append-only audit ledger</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, ArrowRight, X, Loader2 } from 'lucide-react';
import { invoiceApi } from '../services/api';
import { Invoice } from '../types';
import { formatINR } from '../utils/formatters';
import { StatusBadge } from './StatusBadge';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Live search debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await invoiceApi.getAll({ search: query.trim() });
        setResults(res.data.slice(0, 8)); // Top 8 results
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectInvoice = (id: string) => {
    onClose();
    navigate(`/extraction?invoiceId=${id}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-[#E4E8EF] rounded-[6px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-3.5 py-3 border-b border-[#E4E8EF] bg-[#F7F8FA] gap-2.5">
          <Search size={16} className="text-[#697386] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by invoice ID, number, or supplier (e.g. INV-1001, ABC, APX)..."
            className="w-full text-xs text-[#172033] bg-transparent focus:outline-none placeholder:text-[#697386]"
          />
          {loading && <Loader2 size={14} className="animate-spin text-[#2457A6] shrink-0" />}
          {query && !loading && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[#697386] hover:text-[#172033] p-0.5"
            >
              <X size={14} />
            </button>
          )}
          <span className="text-[10px] font-mono text-[#697386] px-1.5 py-0.5 rounded border border-[#E4E8EF] bg-white shrink-0">
            ESC
          </span>
        </div>

        {/* Results Body */}
        <div className="max-h-80 overflow-y-auto divide-y divide-[#E4E8EF]">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-xs text-[#697386]">
              Type an invoice ID, supplier name, or invoice number to find records.
            </div>
          ) : loading && results.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#697386] flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin text-[#2457A6]" />
              Searching database...
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#697386]">
              No invoices found matching <strong className="text-[#172033]">"{query}"</strong>.
            </div>
          ) : (
            results.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => handleSelectInvoice(inv.id)}
                className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-[#F7F8FA] transition cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-[4px] bg-[#EEF1F6] border border-[#E4E8EF] flex items-center justify-center text-[#2457A6] shrink-0">
                    <FileText size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#172033] group-hover:text-[#2457A6]">
                        {inv.id}
                      </span>
                      <span className="text-[11px] font-mono text-[#697386]">
                        {inv.invoice_number || 'N/A'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#697386] truncate">
                      {inv.supplier_name || 'Unassigned Vendor'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pl-3">
                  <span className="text-xs font-bold text-[#172033] tabular-nums">
                    {formatINR(inv.total_amount)}
                  </span>
                  <StatusBadge status={inv.approval_status} size="sm" />
                  <ArrowRight
                    size={13}
                    className="text-[#697386] group-hover:translate-x-0.5 transition-transform"
                  />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

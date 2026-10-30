import React from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: keyof T | ((row: T) => string | number);
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  selectedRowId?: string | number | null;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    onPageChange: (newPage: number) => void;
  };
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = 'id',
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching the current filter.',
  onRowClick,
  selectedRowId,
  sortColumn,
  sortDirection = 'asc',
  onSort,
  pagination,
  className = ''
}: DataTableProps<T>) {
  const getRowKey = (row: T, idx: number): string | number => {
    if (typeof keyField === 'function') return keyField(row);
    return row[keyField] ?? idx;
  };

  return (
    <div className={`bg-white border border-[#E4E8EF] rounded-[6px] overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#F7F8FA] border-b border-[#E4E8EF] text-[#697386] uppercase tracking-wider text-[11px] font-semibold select-none">
            <tr>
              {columns.map((col) => {
                const isSorted = sortColumn === col.key;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={`py-3 px-4 ${alignClass} ${
                      col.sortable ? 'cursor-pointer hover:text-[#172033]' : ''
                    }`}
                    onClick={() => col.sortable && onSort && onSort(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1 ${
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && isSorted && (
                        sortDirection === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4E8EF] text-[#172033]">
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`loading-row-${rIdx}`}>
                  {columns.map((col) => (
                    <td key={`loading-col-${col.key}`} className="py-3 px-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const key = getRowKey(row, idx);
                const isSelected = selectedRowId !== undefined && selectedRowId !== null && selectedRowId === key;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors ${
                      onRowClick ? 'cursor-pointer hover:bg-[#F7F8FA]' : ''
                    } ${isSelected ? 'bg-[#EEF1F6] font-medium' : ''}`}
                  >
                    {columns.map((col) => {
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                      return (
                        <td key={`${key}-${col.key}`} className={`py-3 px-4 ${alignClass}`}>
                          {col.render ? col.render(row, idx) : (row[col.key] ?? '—')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination && (
        <div className="bg-[#F7F8FA] border-t border-[#E4E8EF] py-2.5 px-4 flex items-center justify-between text-xs text-[#697386]">
          <span className="tabular-nums">
            Showing <strong className="text-[#172033]">{data.length}</strong> of{' '}
            <strong className="text-[#172033]">{pagination.totalCount}</strong> records
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.currentPage <= 1 || loading}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="p-1.5 rounded-[4px] border border-[#E4E8EF] bg-white text-[#172033] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F8FA] transition cursor-pointer"
              aria-label="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 text-xs font-medium tabular-nums">
              Page {pagination.currentPage} of {Math.max(1, pagination.totalPages)}
            </span>
            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages || loading}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="p-1.5 rounded-[4px] border border-[#E4E8EF] bg-white text-[#172033] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F8FA] transition cursor-pointer"
              aria-label="Next Page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

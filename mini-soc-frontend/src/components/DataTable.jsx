import { useEffect, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

// Reusable table with sorting and pagination.
// columns: [{ key, label, sortable, sortValue(row), render(row), className }]
export default function DataTable({ columns, rows, pageSize = 8, onRowClick, emptyMessage = 'No records match your filters.', defaultSort = null, paginate = true }) {
  const [sort, setSort] = useState(defaultSort); // { key, dir }
  const [page, setPage] = useState(1);

  // Go back to page 1 whenever the rows change (new search or filter).
  useEffect(() => setPage(1), [rows]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const get = (r) => (col.sortValue ? col.sortValue(r) : r[col.key]);
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const result = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort.dir === 'asc' ? result : -result;
    });
  }, [rows, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, totalPages);
  const visible = paginate ? sorted.slice((current - 1) * pageSize, current * pageSize) : sorted;
  const from = sorted.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, sorted.length);

  const toggleSort = (key) => {
    setSort((prev) => (prev && prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-slate-400">
              {columns.map((col) => {
                const active = sort && sort.key === col.key;
                const SortIcon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown;
                return (
                  <th key={col.key} className={`px-4 py-3 font-medium ${col.className || ''}`} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    {col.sortable ? (
                      <button type="button" onClick={() => toggleSort(col.key)} className="inline-flex items-center gap-1 rounded hover:text-slate-100">
                        {col.label}
                        <SortIcon size={13} className={active ? 'text-cyan-300' : 'text-slate-600'} />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr
                key={row.id || row.ip || i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-line/60 transition-colors last:border-0 hover:bg-raised/60 ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 align-middle ${col.className || ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paginate && sorted.length > pageSize && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-slate-400 sm:flex-row">
          <span>
            Showing {from}-{to} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" className="btn-ghost !px-2 !py-1" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Previous page">
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - current) <= 1)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center gap-1">
                  {idx > 0 && p - arr[idx - 1] > 1 && <span className="px-1">...</span>}
                  <button
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === current ? 'page' : undefined}
                    className={`min-w-[28px] rounded px-2 py-1 ${p === current ? 'bg-cyan-500 text-slate-950' : 'bg-raised hover:bg-line'}`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button type="button" className="btn-ghost !px-2 !py-1" disabled={current === totalPages} onClick={() => setPage(current + 1)} aria-label="Next page">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

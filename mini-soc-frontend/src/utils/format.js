export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, timeZone: 'UTC',
  }) + ' UTC';

export const fmtShortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });

export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

export const dateKey = (iso) => iso.slice(0, 10);

export const severityRank = { Critical: 4, High: 3, Medium: 2, Low: 1 };

// Download rows as a CSV file. columns = [{ key, label }]
export function downloadCsv(filename, rows, columns) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [columns.map((c) => escape(c.label)).join(',')];
  rows.forEach((r) => lines.push(columns.map((c) => escape(r[c.key])).join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

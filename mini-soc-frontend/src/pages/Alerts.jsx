import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';
import { useSocData } from '../context/SocDataContext';
import { ALERT_STATUSES } from '../data/mockAlerts';
import { SEVERITIES } from '../data/mockLogs';
import { fmtDateTime, severityRank } from '../utils/format';

export default function Alerts() {
  const navigate = useNavigate();
  const { alerts, setAlertStatus } = useSocData();
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('All');
  const [status, setStatus] = useState('All');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts.filter((a) => {
      if (severity !== 'All' && a.severity !== severity) return false;
      if (status !== 'All' && a.status !== status) return false;
      if (!q) return true;
      return [a.id, a.name, a.sourceIp].some((v) => v.toLowerCase().includes(q));
    });
  }, [alerts, search, severity, status]);

  const hasFilters = search || severity !== 'All' || status !== 'All';

  const columns = [
    { key: 'id', label: 'Alert ID', sortable: true, render: (a) => <span className="font-mono text-xs">{a.id}</span> },
    { key: 'name', label: 'Alert name', sortable: true, render: (a) => <span className="font-medium text-slate-100">{a.name}</span> },
    { key: 'severity', label: 'Severity', sortable: true, sortValue: (a) => severityRank[a.severity], render: (a) => <SeverityBadge severity={a.severity} /> },
    { key: 'sourceIp', label: 'Source IP', sortable: true, render: (a) => <span className="font-mono text-xs">{a.sourceIp}</span> },
    { key: 'detectedAt', label: 'Detection time', sortable: true, render: (a) => <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(a.detectedAt)}</span> },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (a) => (
        // stopPropagation: changing status should not open the details page
        <select
          value={a.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setAlertStatus(a.id, e.target.value)}
          className="rounded-md border border-line bg-raised px-2 py-1 text-xs text-slate-100"
          aria-label={`Status of ${a.id}`}
        >
          {ALERT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      ),
    },
  ];

  const counts = ALERT_STATUSES.map((s) => ({ s, n: alerts.filter((a) => a.status === s).length }));

  return (
    <div>
      <PageHeader title="Alerts" description="Review alerts and update their status as you investigate. Sample data only: these are not real detections." />

      <div className="mb-4 flex flex-wrap gap-2">
        {counts.map(({ s, n }) => (
          <button key={s} type="button" onClick={() => setStatus(status === s ? 'All' : s)}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${status === s ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' : 'border-line bg-panel text-slate-300 hover:bg-raised'}`}>
            {s}: <span className="font-semibold tabular-nums">{n}</span>
          </button>
        ))}
      </div>

      <section className="card mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <label htmlFor="al-search" className="label">Search</label>
            <Search size={16} className="pointer-events-none absolute bottom-2.5 left-3 text-slate-500" />
            <input id="al-search" className="input !pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Alert ID, name or IP" />
          </div>
          <div>
            <label htmlFor="al-sev" className="label">Severity</label>
            <select id="al-sev" className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option>All</option>
              {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="al-status" className="label">Status</label>
            <select id="al-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All</option>
              {ALERT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {hasFilters && (
          <button type="button" onClick={() => { setSearch(''); setSeverity('All'); setStatus('All'); }} className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline">
            <X size={13} /> Clear all filters
          </button>
        )}
      </section>

      <section className="card">
        <DataTable columns={columns} rows={filtered} pageSize={8} defaultSort={{ key: 'detectedAt', dir: 'desc' }} onRowClick={(a) => navigate(`/alerts/${a.id}`)} />
      </section>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Search, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { useSocData } from '../context/SocDataContext';
import { EVENT_TYPES, SEVERITIES } from '../data/mockLogs';
import { dateKey, downloadCsv, fmtDateTime, severityRank } from '../utils/format';

export default function SecurityLogs() {
  const navigate = useNavigate();
  const { logs } = useSocData();
  const [params] = useSearchParams();

  // The navbar search sends the user here with ?q=...
  const [search, setSearch] = useState(params.get('q') || '');
  const [eventType, setEventType] = useState('All');
  const [severity, setSeverity] = useState('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (eventType !== 'All' && l.eventType !== eventType) return false;
      if (severity !== 'All' && l.severity !== severity) return false;
      if (from && dateKey(l.timestamp) < from) return false;
      if (to && dateKey(l.timestamp) > to) return false;
      if (!q) return true;
      return [l.id, l.sourceIp, l.username, l.eventType, l.status].some((v) => v.toLowerCase().includes(q));
    });
  }, [logs, search, eventType, severity, from, to]);

  const hasFilters = search || eventType !== 'All' || severity !== 'All' || from || to;
  const clear = () => { setSearch(''); setEventType('All'); setSeverity('All'); setFrom(''); setTo(''); };

  const columns = [
    { key: 'timestamp', label: 'Timestamp', sortable: true, render: (l) => <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(l.timestamp)}</span> },
    { key: 'sourceIp', label: 'Source IP', sortable: true, render: (l) => <span className="font-mono text-xs">{l.sourceIp}</span> },
    { key: 'eventType', label: 'Event type', sortable: true, render: (l) => <span className="text-slate-100">{l.eventType}</span> },
    { key: 'username', label: 'Username', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (l) => <StatusBadge status={l.status} /> },
    { key: 'severity', label: 'Severity', sortable: true, sortValue: (l) => severityRank[l.severity], render: (l) => <SeverityBadge severity={l.severity} /> },
  ];

  const exportCsv = () =>
    downloadCsv('security_logs.csv', filtered, [
      { key: 'id', label: 'event_id' }, { key: 'timestamp', label: 'timestamp' }, { key: 'sourceIp', label: 'source_ip' },
      { key: 'eventType', label: 'event_type' }, { key: 'username', label: 'username' }, { key: 'status', label: 'status' }, { key: 'severity', label: 'severity' },
    ]);

  return (
    <div>
      <PageHeader
        title="Security logs"
        description="Search, filter and sort the events collected from your systems. Select a row to see the full log."
        actions={<button type="button" className="btn-ghost" onClick={exportCsv} disabled={filtered.length === 0}><Download size={16} /> Export CSV</button>}
      />

      <section className="card mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <label htmlFor="log-search" className="label">Search</label>
            <Search size={16} className="pointer-events-none absolute bottom-2.5 left-3 text-slate-500" />
            <input id="log-search" className="input !pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="IP, user, event ID or type" />
          </div>
          <div>
            <label htmlFor="log-type" className="label">Event type</label>
            <select id="log-type" className="input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
              <option>All</option>
              {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="log-sev" className="label">Severity</label>
            <select id="log-sev" className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option>All</option>
              {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="log-from" className="label">From date</label>
            <input id="log-from" type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="log-to" className="label">To date</label>
            <input id="log-to" type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {hasFilters && (
          <button type="button" onClick={clear} className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline">
            <X size={13} /> Clear all filters
          </button>
        )}
      </section>

      <section className="card">
        <DataTable columns={columns} rows={filtered} pageSize={10} defaultSort={{ key: 'timestamp', dir: 'desc' }} onRowClick={(l) => navigate(`/logs/${l.id}`)} />
      </section>
    </div>
  );
}

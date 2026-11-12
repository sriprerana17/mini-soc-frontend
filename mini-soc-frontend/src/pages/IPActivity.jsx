import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Search, Undo2, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { useSocData } from '../context/SocDataContext';
import { buildIpStats } from '../utils/ipStats';
import { fmtDateTime } from '../utils/format';

const STATUS_OPTIONS = ['High Risk', 'Suspicious', 'Normal', 'Blocked'];

export default function IPActivity() {
  const { logs, alerts } = useSocData();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [blocked, setBlocked] = useState([]); // IPs the analyst blocked in this session (UI only)

  const stats = useMemo(
    () => buildIpStats(logs, alerts).map((s) => (blocked.includes(s.ip) ? { ...s, status: 'Blocked' } : s)),
    [logs, alerts, blocked]
  );

  const filtered = useMemo(() => {
    const q = search.trim();
    return stats.filter((s) => (status === 'All' || s.status === status) && (!q || s.ip.includes(q)));
  }, [stats, search, status]);

  const toggleBlock = (ip) => setBlocked((b) => (b.includes(ip) ? b.filter((x) => x !== ip) : [...b, ip]));

  const columns = [
    { key: 'ip', label: 'IP address', sortable: true, render: (s) => <Link to={`/logs?q=${s.ip}`} className="font-mono text-xs text-cyan-300 hover:underline">{s.ip}</Link> },
    { key: 'events', label: 'Events', sortable: true, className: 'tabular-nums' },
    { key: 'failedLogins', label: 'Failed logins', sortable: true, className: 'tabular-nums' },
    { key: 'alerts', label: 'Alerts', sortable: true, className: 'tabular-nums' },
    {
      key: 'riskScore', label: 'Risk score', sortable: true,
      render: (s) => (
        <div className="flex items-center gap-2">
          <span className="w-7 tabular-nums">{s.riskScore}</span>
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-raised">
            <span className={`block h-full ${s.riskScore >= 70 ? 'bg-red-500' : s.riskScore >= 40 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${s.riskScore}%` }} />
          </span>
        </div>
      ),
    },
    { key: 'lastSeen', label: 'Last seen', sortable: true, render: (s) => <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(s.lastSeen)}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'action', label: 'Action',
      render: (s) => {
        const isBlocked = blocked.includes(s.ip);
        return (
          <button type="button" onClick={() => toggleBlock(s.ip)} className={isBlocked ? 'btn-ghost !px-2.5 !py-1 text-xs' : 'btn-danger !px-2.5 !py-1 text-xs'}>
            {isBlocked ? <><Undo2 size={13} /> Unblock</> : <><Ban size={13} /> Block</>}
          </button>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="IP activity" description="See which source IP addresses are most active and which carry the highest risk. Blocking here only changes this screen; it does not touch a real firewall." />

      <section className="card mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <label htmlFor="ip-search" className="label">Search IP address</label>
            <Search size={16} className="pointer-events-none absolute bottom-2.5 left-3 text-slate-500" />
            <input id="ip-search" className="input !pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="For example 185.220" />
          </div>
          <div>
            <label htmlFor="ip-status" className="label">Status</label>
            <select id="ip-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>All</option>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {(search || status !== 'All') && (
          <button type="button" onClick={() => { setSearch(''); setStatus('All'); }} className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-300 hover:underline">
            <X size={13} /> Clear all filters
          </button>
        )}
      </section>

      <section className="card">
        <DataTable columns={columns} rows={filtered} pageSize={10} defaultSort={{ key: 'riskScore', dir: 'desc' }} />
      </section>
    </div>
  );
}

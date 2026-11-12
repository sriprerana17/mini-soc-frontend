import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RotateCcw, StickyNote } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import { useSocData } from '../context/SocDataContext';
import { ALERT_STATUSES } from '../data/mockAlerts';
import { getUser } from '../services/auth';
import { fmtDateTime } from '../utils/format';

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-100">{children}</dd>
    </div>
  );
}

export default function AlertDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { alerts, logs, setAlertStatus, addNote } = useSocData();
  const [note, setNote] = useState('');

  const alert = alerts.find((a) => a.id === id);
  if (!alert) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-100">Alert {id} was not found.</p>
        <Link to="/alerts" className="btn-ghost mt-4"><ArrowLeft size={16} /> Back to alerts</Link>
      </div>
    );
  }

  const relatedLogs = logs.filter((l) => alert.logIds.includes(l.id));
  const closed = alert.status === 'Resolved' || alert.status === 'False Positive';
  const scoreColor = alert.riskScore >= 80 ? 'bg-red-500' : alert.riskScore >= 50 ? 'bg-orange-500' : 'bg-emerald-500';

  const submitNote = (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    const user = getUser();
    addNote(alert.id, note.trim(), user ? `${user.name} (${user.role})` : 'Analyst');
    setNote('');
  };

  const logColumns = [
    { key: 'id', label: 'Event ID', render: (l) => <span className="font-mono text-xs">{l.id}</span> },
    { key: 'timestamp', label: 'Timestamp', render: (l) => <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(l.timestamp)}</span> },
    { key: 'eventType', label: 'Event type' },
    { key: 'username', label: 'Username' },
    { key: 'status', label: 'Status', render: (l) => <StatusBadge status={l.status} /> },
  ];

  return (
    <div>
      <Link to="/alerts" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100"><ArrowLeft size={15} /> Alerts</Link>
      <PageHeader
        title={alert.name}
        description={`${alert.id} - sample alert for demonstration, not a real detection.`}
        actions={
          closed ? (
            <button type="button" className="btn-ghost" onClick={() => setAlertStatus(alert.id, 'Open')}><RotateCcw size={16} /> Reopen alert</button>
          ) : (
            <button type="button" className="btn-success" onClick={() => setAlertStatus(alert.id, 'Resolved')}><CheckCircle2 size={16} /> Mark as resolved</button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h3 className="card-title mb-4">Alert information</h3>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Alert ID"><span className="font-mono">{alert.id}</span></Field>
            <Field label="Detection time">{fmtDateTime(alert.detectedAt)}</Field>
            <Field label="Severity"><SeverityBadge severity={alert.severity} /></Field>
            <Field label="Status">
              <select value={alert.status} onChange={(e) => setAlertStatus(alert.id, e.target.value)} className="rounded-md border border-line bg-raised px-2 py-1 text-sm" aria-label="Alert status">
                {ALERT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Source IP"><Link to="/ip-activity" className="font-mono text-cyan-300 hover:underline">{alert.sourceIp}</Link></Field>
            <Field label="Risk score">
              <div className="flex items-center gap-3">
                <span className="w-8 tabular-nums">{alert.riskScore}</span>
                <span className="h-2 w-32 overflow-hidden rounded-full bg-raised"><span className={`block h-full ${scoreColor}`} style={{ width: `${alert.riskScore}%` }} /></span>
              </div>
            </Field>
            <div className="sm:col-span-2"><Field label="Detection rule">{alert.rule}</Field></div>
          </dl>
        </section>

        <section className="card p-5">
          <h3 className="card-title mb-3">Why this alert was generated</h3>
          <p className="text-sm leading-6 text-slate-300">{alert.explanation}</p>
        </section>

        <section className="card lg:col-span-3">
          <h3 className="card-title p-5 pb-2">Related security logs ({relatedLogs.length})</h3>
          <DataTable columns={logColumns} rows={relatedLogs} paginate={false} onRowClick={(l) => navigate(`/logs/${l.id}`)} />
        </section>

        <section className="card p-5 lg:col-span-3">
          <h3 className="card-title mb-4 flex items-center gap-2"><StickyNote size={16} className="text-cyan-300" /> Investigation notes</h3>
          {alert.notes.length === 0 && <p className="mb-4 text-sm text-slate-500">No notes yet. Write what you checked and what you found.</p>}
          <ul className="mb-4 space-y-3">
            {alert.notes.map((n, i) => (
              <li key={i} className="rounded-md border border-line bg-bg p-3">
                <p className="text-sm text-slate-200">{n.text}</p>
                <p className="mt-1.5 text-xs text-slate-500">{n.author} - {fmtDateTime(n.time)}</p>
              </li>
            ))}
          </ul>
          <form onSubmit={submitNote}>
            <label htmlFor="note" className="label">Add a note</label>
            <textarea id="note" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: Checked firewall logs, IP is not on the allow list." />
            <button type="submit" className="btn-primary mt-3" disabled={!note.trim()}>Save note</button>
          </form>
        </section>
      </div>
    </div>
  );
}

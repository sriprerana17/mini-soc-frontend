import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { useSocData } from '../context/SocDataContext';
import { fmtDateTime } from '../utils/format';

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-100">{children}</dd>
    </div>
  );
}

export default function LogDetails() {
  const { id } = useParams();
  const { logs, alerts } = useSocData();
  const log = logs.find((l) => l.id === id);

  if (!log) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-100">Log {id} was not found.</p>
        <Link to="/logs" className="btn-ghost mt-4"><ArrowLeft size={16} /> Back to security logs</Link>
      </div>
    );
  }

  const related = alerts.filter((a) => a.logIds.includes(log.id));

  return (
    <div>
      <Link to="/logs" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100"><ArrowLeft size={15} /> Security logs</Link>
      <PageHeader title={`Log ${log.id}`} description={log.eventType} />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h3 className="card-title mb-4">Event information</h3>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Event ID"><span className="font-mono">{log.id}</span></Field>
            <Field label="Timestamp">{fmtDateTime(log.timestamp)}</Field>
            <Field label="Source IP"><Link className="font-mono text-cyan-300 hover:underline" to="/ip-activity">{log.sourceIp}</Link></Field>
            <Field label="Destination IP"><span className="font-mono">{log.destinationIp}</span></Field>
            <Field label="Username">{log.username}</Field>
            <Field label="Event type">{log.eventType}</Field>
            <Field label="Status"><StatusBadge status={log.status} /></Field>
            <Field label="Severity"><SeverityBadge severity={log.severity} /></Field>
          </dl>
          <div className="mt-6 border-t border-line pt-5">
            <h4 className="text-xs text-slate-500">Event description</h4>
            <p className="mt-1.5 text-sm text-slate-200">{log.description}</p>
          </div>
        </section>

        <section className="card p-5">
          <h3 className="card-title mb-3">Related alerts</h3>
          {related.length === 0 ? (
            <p className="text-sm text-slate-500">No alerts are linked to this log.</p>
          ) : (
            <ul className="space-y-2">
              {related.map((a) => (
                <li key={a.id}>
                  <Link to={`/alerts/${a.id}`} className="block rounded-md border border-line p-3 hover:bg-raised">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-100">{a.name}</span>
                      <SeverityBadge severity={a.severity} />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono">{a.id}</span>
                      <StatusBadge status={a.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 lg:col-span-3">
          <h3 className="card-title mb-3">Raw log data</h3>
          <pre className="overflow-x-auto rounded-md border border-line bg-bg p-4 font-mono text-xs leading-6 text-slate-300">{log.rawLog}</pre>
        </section>
      </div>
    </div>
  );
}

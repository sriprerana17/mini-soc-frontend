import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Database, Globe, RefreshCw, ScrollText, ShieldAlert } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { useSocData } from '../context/SocDataContext';
import { getLog } from '../services/api';
import { fmtDateTime } from '../utils/format';

function Field({ label, children }) {
  return (
    <div className="rounded-lg border border-line bg-raised/40 p-3">
      <dt className="text-[11px] font-mono uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-100">{children}</dd>
    </div>
  );
}

export default function LogDetails() {
  const { id } = useParams();
  const { logs, alerts } = useSocData();
  const [fetchedLog, setFetchedLog] = useState(null);
  const [loadingLog, setLoadingLog] = useState(false);

  const contextLog = (logs || []).find((l) => String(l.id) === String(id));
  const log = contextLog || fetchedLog;

  useEffect(() => {
    if (!contextLog && id) {
      setLoadingLog(true);
      getLog(id)
        .then((l) => setFetchedLog(l))
        .catch((err) => console.error('Could not fetch log:', err))
        .finally(() => setLoadingLog(false));
    }
  }, [id, contextLog]);

  if (loadingLog) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        <RefreshCw size={18} className="animate-spin text-twilight-cyan mr-2" />
        Loading security event record...
      </div>
    );
  }

  if (!log) {
    return (
      <div className="card p-10 text-center space-y-4">
        <ScrollText size={36} className="mx-auto text-slate-500" />
        <h2 className="text-lg font-bold text-slate-100">Log #{id} Not Found</h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          The requested event record does not exist in the database.
        </p>
        <Link to="/logs" className="btn-ghost inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Return to Security Logs
        </Link>
      </div>
    );
  }

  const relatedAlerts = (alerts || []).filter(
    (a) => (a.logIds && a.logIds.map(String).includes(String(log.id))) || String(a.sourceIp) === String(log.sourceIp)
  );

  return (
    <div className="space-y-6">
      <Link
        to="/logs"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-twilight-cyan transition-colors"
      >
        <ArrowLeft size={15} /> Back to Security Logs
      </Link>

      <PageHeader
        title={`Log Event #${log.id}: ${log.eventType}`}
        description={`Recorded at ${fmtDateTime(log.timestamp)}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Event Type">
          <span className="text-twilight-cyan">{log.eventType}</span>
        </Field>
        <Field label="Severity">
          <div className="mt-1">
            <SeverityBadge severity={log.severity} />
          </div>
        </Field>
        <Field label="Execution Status">
          <div className="mt-1">
            <StatusBadge status={log.status} />
          </div>
        </Field>
        <Field label="Recorded Timestamp">
          <span className="font-mono text-xs">{fmtDateTime(log.timestamp)}</span>
        </Field>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6 space-y-4">
            <h2 className="card-title text-base border-b border-line pb-3">
              <Database size={18} className="text-twilight-cyan" />
              Event Network Metadata
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Source IP Address">
                <span className="font-mono text-twilight-cyan">{log.sourceIp}</span>
              </Field>
              <Field label="Target / Destination IP">
                <span className="font-mono text-slate-300">{log.destinationIp || 'Internal Gateway'}</span>
              </Field>
              <Field label="Associated User / Account">
                <span className="font-mono text-slate-300">{log.username || 'N/A'}</span>
              </Field>
              <Field label="Event Description">
                <span className="text-xs text-slate-300">{log.description}</span>
              </Field>
            </div>
          </section>

          <section className="card p-6 space-y-3">
            <h2 className="card-title text-base border-b border-line pb-3">
              <ScrollText size={18} className="text-twilight-violet" />
              Raw Syslog Payload
            </h2>
            <pre className="rounded-lg border border-line bg-bg p-4 font-mono text-xs text-slate-300 overflow-x-auto">
              {log.rawLog || log.details || `${log.timestamp} [${log.eventType}] src=${log.sourceIp} dst=${log.destinationIp} status=${log.status}`}
            </pre>
          </section>
        </div>

        {/* Related Alerts */}
        <section className="card p-6 space-y-4 h-fit">
          <h2 className="card-title text-base border-b border-line pb-3">
            <ShieldAlert size={18} className="text-twilight-pink" />
            Correlated Alerts ({relatedAlerts.length})
          </h2>
          {relatedAlerts.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-4 text-center">
              No active alerts linked to this event.
            </p>
          ) : (
            <div className="space-y-3">
              {relatedAlerts.map((a) => (
                <Link
                  key={a.id}
                  to={`/alerts/${a.id}`}
                  className="block rounded-lg border border-line bg-raised/50 p-3 hover:border-twilight-cyan/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Alert #{a.id}</span>
                    <SeverityBadge severity={a.severity} />
                  </div>
                  <p className="text-xs text-slate-300 mt-1 font-medium">{a.name}</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Globe,
  RotateCcw,
  ShieldAlert,
  StickyNote,
  Send,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import { useSocData } from '../context/SocDataContext';
import { getAlert, updateAlertStatus, addAlertNote } from '../services/api';
import { ALERT_STATUSES } from '../data/mockAlerts';
import { getUser } from '../services/auth';
import { fmtDateTime } from '../utils/format';

function Field({ label, children }) {
  return (
    <div className="rounded-lg border border-line bg-raised/40 p-3">
      <dt className="text-[11px] font-mono uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-100">{children}</dd>
    </div>
  );
}

export default function AlertDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { alerts, logs, setAlertStatus, refreshData } = useSocData();
  const [fetchedAlert, setFetchedAlert] = useState(null);
  const [loadingAlert, setLoadingAlert] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Match from context or fallback to direct API call
  const contextAlert = (alerts || []).find((a) => String(a.id) === String(id));
  const alert = contextAlert || fetchedAlert;

  useEffect(() => {
    if (!contextAlert && id) {
      setLoadingAlert(true);
      getAlert(id)
        .then((data) => setFetchedAlert(data))
        .catch((err) => console.error('Could not fetch alert:', err))
        .finally(() => setLoadingAlert(false));
    }
  }, [id, contextAlert]);

  if (loadingAlert) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        <RefreshCw size={18} className="animate-spin text-twilight-cyan mr-2" />
        Loading alert details...
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="card p-10 text-center space-y-4">
        <ShieldAlert size={36} className="mx-auto text-twilight-pink" />
        <h2 className="text-lg font-bold text-slate-100">Alert #{id} Not Found</h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          The requested alert record could not be found in SQLite.
        </p>
        <Link to="/alerts" className="btn-ghost inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Return to Alerts List
        </Link>
      </div>
    );
  }

  const relatedLogs = (logs || []).filter((l) => {
    if (alert.logIds && alert.logIds.length > 0) {
      return alert.logIds.map(String).includes(String(l.id));
    }
    return String(l.sourceIp) === String(alert.sourceIp);
  });

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      if (setAlertStatus) {
        setAlertStatus(alert.id, newStatus);
      } else {
        await updateAlertStatus(alert.id, newStatus);
      }
      if (fetchedAlert) {
        setFetchedAlert((prev) => (prev ? { ...prev, status: newStatus } : prev));
      }
      if (refreshData) {
        refreshData();
      }
    } catch (err) {
      console.error('Failed to update alert status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const submitNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setSubmittingNote(true);
    const user = getUser();
    const authorName = user?.name ? `${user.name} (${user.role || 'SOC Analyst'})` : 'SOC Analyst';
    const newNote = {
      text: noteText.trim(),
      author: authorName,
      time: new Date().toISOString(),
    };

    try {
      await addAlertNote(alert.id, newNote);
      setNoteText('');
      if (fetchedAlert) {
        setFetchedAlert((prev) => ({
          ...prev,
          notes: [...(prev.notes || []), newNote],
        }));
      }
      if (refreshData) {
        refreshData();
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const logColumns = [
    { key: 'id', label: 'ID', render: (l) => <span className="font-mono text-xs">#{l.id}</span> },
    { key: 'timestamp', label: 'Timestamp', render: (l) => <span className="font-mono text-xs text-slate-400">{fmtDateTime(l.timestamp)}</span> },
    { key: 'eventType', label: 'Event Type', render: (l) => <span className="font-medium text-slate-200">{l.eventType}</span> },
    { key: 'sourceIp', label: 'Source IP', render: (l) => <span className="font-mono text-xs text-twilight-cyan">{l.sourceIp}</span> },
    { key: 'status', label: 'Status', render: (l) => <StatusBadge status={l.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/alerts"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-twilight-cyan transition-colors"
        >
          <ArrowLeft size={15} /> Back to Security Alerts
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Triage:</span>
          <select
            value={alert.status}
            disabled={updatingStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-line bg-raised px-3 py-1 text-xs font-semibold text-slate-100 focus:border-twilight-cyan"
          >
            {ALERT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <PageHeader
        title={`Alert #${alert.id}: ${alert.name}`}
        description={`Detected on ${alert.sourceIp} via rule: ${alert.rule}`}
      />

      {/* Key Metric Fields Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Severity Level">
          <div className="mt-1">
            <SeverityBadge severity={alert.severity} />
          </div>
        </Field>
        <Field label="Current Status">
          <div className="mt-1">
            <StatusBadge status={alert.status} />
          </div>
        </Field>
        <Field label="Source IP Address">
          <span className="font-mono text-twilight-cyan">{alert.sourceIp}</span>
        </Field>
        <Field label="Detection Time">
          <span className="font-mono text-xs text-slate-300">{fmtDateTime(alert.detectedAt)}</span>
        </Field>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Description & Associated Logs */}
        <div className="space-y-6 lg:col-span-2">
          {/* Explanation Card */}
          <section className="card p-6 space-y-3">
            <h2 className="card-title text-base border-b border-line pb-3">
              <ShieldAlert size={18} className="text-twilight-cyan" />
              Incident Description & Telemetry
            </h2>
            <p className="text-sm text-slate-200 leading-relaxed">
              {alert.explanation || alert.description || 'Suspicious activity flagged by detection threshold.'}
            </p>
            <div className="rounded-lg border border-line bg-raised/30 p-3 font-mono text-xs text-slate-400">
              <span className="text-twilight-violet block font-semibold mb-1">DETECTION RULE</span>
              {alert.rule}
            </div>
          </section>

          {/* Related Logs Table */}
          <section className="card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="card-title text-base">
                <Globe size={18} className="text-twilight-violet" />
                Correlated Security Logs ({relatedLogs.length})
              </h2>
              <span className="text-xs text-slate-400 font-mono">Host: {alert.sourceIp}</span>
            </div>
            <DataTable
              columns={logColumns}
              rows={relatedLogs}
              pageSize={5}
              defaultSort={{ key: 'timestamp', dir: 'desc' }}
              onRowClick={(l) => navigate(`/logs/${l.id}`)}
              emptyMessage="No direct logs attached to this alert signature."
            />
          </section>
        </div>

        {/* Right Column: Analyst Notes */}
        <section className="card p-6 flex flex-col space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <StickyNote size={18} className="text-twilight-amber" />
            <h2 className="card-title text-base">Analyst Case Notes</h2>
          </div>

          {/* Notes list */}
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {(!alert.notes || alert.notes.length === 0) ? (
              <p className="text-center py-6 text-xs text-slate-500 font-mono">
                No investigation notes added yet.
              </p>
            ) : (
              alert.notes.map((n, idx) => (
                <div key={idx} className="rounded-lg border border-line bg-raised/60 p-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="font-semibold text-twilight-cyan">{n.author || 'Analyst'}</span>
                    <span>{fmtDateTime(n.time)}</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{n.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Add note form */}
          <form onSubmit={submitNote} className="border-t border-line pt-3 space-y-2">
            <textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Record forensic observation, containment action, or triage note..."
              className="input !text-xs resize-none"
            />
            <button
              type="submit"
              disabled={submittingNote || !noteText.trim()}
              className="btn-primary w-full !py-1.5 text-xs font-semibold"
            >
              {submittingNote ? 'Saving Note...' : 'Add Case Note'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

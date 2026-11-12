// One badge for every kind of status: alerts, logs and IPs.
const styles = {
  // alert status
  Open: 'bg-red-500/10 text-red-300 border-red-500/30',
  Investigating: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  Resolved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  'False Positive': 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  // log status
  Success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  Failed: 'bg-red-500/10 text-red-300 border-red-500/30',
  Blocked: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  // ip status
  'High Risk': 'bg-red-500/10 text-red-300 border-red-500/30',
  Suspicious: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  Normal: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  // upload status
  Processed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  Rejected: 'bg-red-500/10 text-red-300 border-red-500/30',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${styles[status] || 'bg-slate-500/10 text-slate-300 border-slate-500/30'}`}>
      {status}
    </span>
  );
}

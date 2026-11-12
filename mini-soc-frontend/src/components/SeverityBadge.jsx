const styles = {
  Critical: 'bg-red-500/15 text-red-300 border-red-500/30',
  High: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  Medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export default function SeverityBadge({ severity }) {
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${styles[severity] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'}`}>
      {severity}
    </span>
  );
}

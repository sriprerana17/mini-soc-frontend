const styles = {
  // alert status
  Open: 'bg-twilight-pink/15 text-twilight-pink border-twilight-pink/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
  Investigating: 'bg-twilight-cyan/15 text-twilight-cyan border-twilight-cyan/40 shadow-[0_0_10px_rgba(0,245,255,0.2)]',
  Resolved: 'bg-twilight-emerald/15 text-emerald-300 border-twilight-emerald/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
  'False Positive': 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  // log status
  Success: 'bg-twilight-emerald/15 text-emerald-300 border-twilight-emerald/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
  Failed: 'bg-twilight-pink/15 text-twilight-pink border-twilight-pink/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
  Blocked: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  // ip status
  'High Risk': 'bg-twilight-pink/15 text-twilight-pink border-twilight-pink/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
  Suspicious: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
  Normal: 'bg-twilight-emerald/15 text-emerald-300 border-twilight-emerald/40',
  // upload status
  Processed: 'bg-twilight-emerald/15 text-emerald-300 border-twilight-emerald/40',
  Rejected: 'bg-twilight-pink/15 text-twilight-pink border-twilight-pink/40',
};

export default function StatusBadge({ status }) {
  const norm = status || 'Open';
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium font-mono ${
        styles[norm] || 'bg-slate-500/10 text-slate-300 border-slate-500/30'
      }`}
    >
      {norm}
    </span>
  );
}

const styles = {
  Critical: 'bg-twilight-pink/15 text-twilight-pink border-twilight-pink/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]',
  High: 'bg-orange-500/15 text-orange-300 border-orange-500/40 shadow-[0_0_12px_rgba(249,115,22,0.2)]',
  Medium: 'bg-twilight-amber/15 text-amber-300 border-twilight-amber/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
  Low: 'bg-twilight-emerald/15 text-emerald-300 border-twilight-emerald/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]',
};

const dots = {
  Critical: 'bg-twilight-pink animate-pulse',
  High: 'bg-orange-400',
  Medium: 'bg-amber-400',
  Low: 'bg-emerald-400',
};

export default function SeverityBadge({ severity }) {
  const norm = severity || 'Medium';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider font-mono ${
        styles[norm] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[norm] || 'bg-slate-400'}`} />
      {norm}
    </span>
  );
}

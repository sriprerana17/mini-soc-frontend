const tones = {
  cyan: 'text-cyan-300 bg-cyan-500/10',
  red: 'text-red-300 bg-red-500/10',
  orange: 'text-orange-300 bg-orange-500/10',
  green: 'text-emerald-300 bg-emerald-500/10',
};

export default function StatCard({ icon: Icon, label, value, hint, tone = 'cyan' }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-50">{value}</p>
        </div>
        <span className={`rounded-md p-2 ${tones[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
      {hint && <p className="mt-3 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

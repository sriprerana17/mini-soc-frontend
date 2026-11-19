const tones = {
  cyan: {
    icon: 'text-twilight-cyan bg-twilight-cyan/15 border border-twilight-cyan/40 shadow-glow-cyan',
    val: 'text-white',
    bar: 'bg-twilight-cyan',
  },
  violet: {
    icon: 'text-twilight-violet bg-twilight-violet/15 border border-twilight-violet/40 shadow-glow-violet',
    val: 'text-white',
    bar: 'bg-twilight-violet',
  },
  red: {
    icon: 'text-twilight-pink bg-twilight-pink/15 border border-twilight-pink/40 shadow-glow-magenta',
    val: 'text-rose-100',
    bar: 'bg-twilight-pink',
  },
  pink: {
    icon: 'text-twilight-pink bg-twilight-pink/15 border border-twilight-pink/40 shadow-glow-magenta',
    val: 'text-rose-100',
    bar: 'bg-twilight-pink',
  },
  orange: {
    icon: 'text-orange-400 bg-orange-500/15 border border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.2)]',
    val: 'text-orange-100',
    bar: 'bg-orange-400',
  },
  amber: {
    icon: 'text-amber-400 bg-amber-500/15 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
    val: 'text-amber-100',
    bar: 'bg-amber-400',
  },
  green: {
    icon: 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
    val: 'text-emerald-100',
    bar: 'bg-emerald-400',
  },
};

export default function StatCard({ icon: Icon, label, value, hint, tone = 'cyan' }) {
  const currentTone = tones[tone] || tones.cyan;
  return (
    <div className="card card-glow p-5 relative overflow-hidden group">
      {/* Subtle top ambient indicator */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${currentTone.bar} opacity-70`} />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className={`text-3xl font-bold font-mono tabular-nums ${currentTone.val}`}>
            {value}
          </p>
        </div>
        <span className={`rounded-xl p-2.5 transition-transform duration-200 group-hover:scale-105 ${currentTone.icon}`}>
          <Icon size={20} />
        </span>
      </div>
      {hint && <p className="mt-3 text-xs text-slate-400 font-medium">{hint}</p>}
    </div>
  );
}

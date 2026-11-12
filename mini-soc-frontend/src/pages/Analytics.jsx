import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '../components/PageHeader';
import { useSocData } from '../context/SocDataContext';
import { ATTACK_TYPE_KEYS } from '../data/mockAnalytics';
import { buildIpStats } from '../utils/ipStats';
import { fmtShortDate } from '../utils/format';
import { COLORS, SEVERITY_COLORS, axisProps, gridProps, tooltipStyle } from '../utils/chartTheme';

const presets = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
];

function ChartCard({ title, note, children }) {
  return (
    <section className="card p-4">
      <h3 className="card-title">{title}</h3>
      {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
      <div className="mt-4 h-64">{children}</div>
    </section>
  );
}

export default function Analytics() {
  const { analytics, logs, alerts } = useSocData();
  const [preset, setPreset] = useState(14);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const custom = from || to;
  const range = useMemo(() => {
    if (custom) return analytics.filter((d) => (!from || d.date >= from) && (!to || d.date <= to));
    return analytics.slice(-preset);
  }, [analytics, preset, from, to, custom]);

  const timeline = range.map((d) => ({ ...d, label: fmtShortDate(d.date) }));

  const sum = (key) => range.reduce((t, d) => t + d[key], 0);
  const severityData = ['Critical', 'High', 'Medium', 'Low'].map((s) => ({ name: s, value: sum(s.toLowerCase()) }));
  const attackData = ATTACK_TYPE_KEYS.map((a) => ({ name: a.label, value: sum(a.key) })).sort((a, b) => b.value - a.value);
  const topIps = useMemo(() => buildIpStats(logs, alerts).sort((a, b) => b.riskScore - a.riskScore).slice(0, 6), [logs, alerts]);

  const pickPreset = (days) => { setPreset(days); setFrom(''); setTo(''); };

  return (
    <div>
      <PageHeader title="Analytics" description="Trends in security events, alerts and logins over the selected period." />

      <section className="card mb-4 flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Date presets">
          {presets.map((p) => (
            <button key={p.days} type="button" onClick={() => pickPreset(p.days)}
              className={`rounded-md border px-3 py-2 text-sm transition-colors ${!custom && preset === p.days ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' : 'border-line bg-raised text-slate-300 hover:bg-line'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="an-from" className="label">From</label>
            <input id="an-from" type="date" className="input" value={from} min={analytics[0]?.date} max={to || analytics[analytics.length - 1]?.date} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="an-to" className="label">To</label>
            <input id="an-to" type="date" className="input" value={to} min={from || analytics[0]?.date} max={analytics[analytics.length - 1]?.date} onChange={(e) => setTo(e.target.value)} />
          </div>
          {custom && <button type="button" className="btn-ghost" onClick={() => pickPreset(14)}>Reset dates</button>}
        </div>
      </section>

      {range.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-400">No data in this date range. Choose dates between {analytics[0]?.date} and {analytics[analytics.length - 1]?.date}.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <ChartCard title="Security events over time">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ left: -15, right: 8, top: 4 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="events" name="All events" stroke={COLORS.cyan} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="loginFailed" name="Failed logins" stroke={COLORS.orange} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="Alerts by severity">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
                  {severityData.map((d) => <Cell key={d.name} fill={SEVERITY_COLORS[d.name]} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Most common attack types">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attackData} layout="vertical" margin={{ left: 20, right: 8 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" {...axisProps} />
                <YAxis type="category" dataKey="name" width={130} {...axisProps} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value" name="Detections" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top suspicious IP addresses" note="Risk score from the loaded sample logs. Not affected by the date filter.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topIps} layout="vertical" margin={{ left: 20, right: 8 }}>
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" domain={[0, 100]} {...axisProps} />
                <YAxis type="category" dataKey="ip" width={110} {...axisProps} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="riskScore" name="Risk score" radius={[0, 4, 4, 0]}>
                  {topIps.map((d) => <Cell key={d.ip} fill={d.riskScore >= 70 ? COLORS.red : d.riskScore >= 40 ? COLORS.orange : COLORS.green} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Login success vs failure">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline} margin={{ left: -15, right: 8, top: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="loginSuccess" name="Successful" stackId="a" fill={COLORS.green} />
                <Bar dataKey="loginFailed" name="Failed" stackId="a" fill={COLORS.red} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, Database, Globe, ScrollText, ShieldAlert } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { useSocData } from '../context/SocDataContext';
import { buildIpStats } from '../utils/ipStats';
import { fmtDateTime, fmtShortDate, fmtTime, severityRank } from '../utils/format';
import { SEVERITY_COLORS, COLORS, axisProps, gridProps, tooltipStyle } from '../utils/chartTheme';

const services = [
  { name: 'Log collector', status: 'Operational', ok: true },
  { name: 'Detection engine', status: 'Operational', ok: true },
  { name: 'Database (SQLite)', status: 'Not connected', ok: false },
  { name: 'Backend API', status: 'Not connected', ok: false },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { logs, alerts, analytics } = useSocData();

  const ipStats = useMemo(() => buildIpStats(logs, alerts), [logs, alerts]);
  const highRiskIps = ipStats.filter((s) => s.riskScore >= 70).length;
  const criticalOpen = alerts.filter((a) => a.severity === 'Critical' && a.status !== 'Resolved' && a.status !== 'False Positive').length;

  const week = analytics.slice(-7).map((d) => ({ ...d, label: fmtShortDate(d.date) }));

  const severityData = ['Critical', 'High', 'Medium', 'Low']
    .map((s) => ({ name: s, value: alerts.filter((a) => a.severity === s).length }))
    .filter((d) => d.value > 0);

  const recentAlerts = useMemo(() => [...alerts].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)).slice(0, 6), [alerts]);
  const recentLogs = logs.slice(0, 6);

  const alertColumns = [
    { key: 'name', label: 'Alert', render: (a) => <span className="font-medium text-slate-100">{a.name}</span> },
    { key: 'severity', label: 'Severity', render: (a) => <SeverityBadge severity={a.severity} />, sortValue: (a) => severityRank[a.severity] },
    { key: 'sourceIp', label: 'Source IP', render: (a) => <span className="font-mono text-xs">{a.sourceIp}</span> },
    { key: 'detectedAt', label: 'Detected', render: (a) => <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(a.detectedAt)}</span> },
    { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Security overview" description="Summary of the sample logs and alerts loaded in this demo." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ScrollText} label="Total security logs" value={logs.length} hint="Loaded from sample data" tone="cyan" />
        <StatCard icon={ShieldAlert} label="Total alerts" value={alerts.length} hint={`${alerts.filter((a) => a.status === 'Open').length} still open`} tone="orange" />
        <StatCard icon={AlertTriangle} label="Critical alerts" value={criticalOpen} hint="Not yet resolved" tone="red" />
        <StatCard icon={Globe} label="High-risk IP addresses" value={highRiskIps} hint="Risk score 70 or higher" tone="green" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h3 className="card-title">Security activity, last 7 days</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={week} margin={{ left: -15, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="evFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="events" name="All events" stroke={COLORS.cyan} fill="url(#evFill)" strokeWidth={2} />
                <Area type="monotone" dataKey="loginFailed" name="Failed logins" stroke={COLORS.orange} fill="none" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-4">
          <h3 className="card-title">Alerts by severity</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
                  {severityData.map((d) => <Cell key={d.name} fill={SEVERITY_COLORS[d.name]} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between p-4 pb-2">
            <h3 className="card-title">Recent security alerts</h3>
            <Link to="/alerts" className="text-xs text-cyan-300 hover:underline">View all</Link>
          </div>
          <DataTable columns={alertColumns} rows={recentAlerts} paginate={false} onRowClick={(a) => navigate(`/alerts/${a.id}`)} />
          <p className="border-t border-line px-4 py-2.5 text-xs text-slate-500">These are sample alerts for the demo, not real detections.</p>
        </section>

        <div className="space-y-4">
          <section className="card p-4">
            <h3 className="card-title flex items-center gap-2"><Activity size={16} className="text-cyan-300" /> Recent activity</h3>
            <ul className="mt-3 space-y-3">
              {recentLogs.map((l) => (
                <li key={l.id}>
                  <Link to={`/logs/${l.id}`} className="block rounded-md p-1.5 hover:bg-raised">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-200">{l.eventType}</span>
                      <span className="text-xs text-slate-500">{fmtTime(l.timestamp)}</span>
                    </div>
                    <span className="font-mono text-xs text-slate-500">{l.sourceIp} / {l.username}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-4">
            <h3 className="card-title flex items-center gap-2"><Database size={16} className="text-cyan-300" /> System status</h3>
            <ul className="mt-3 space-y-2.5">
              {services.map((s) => (
                <li key={s.name} className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  <span className={`flex items-center gap-2 text-xs ${s.ok ? 'text-emerald-300' : 'text-slate-500'}`}>
                    <span className={`h-2 w-2 rounded-full ${s.ok ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">Status is simulated until the backend is connected.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

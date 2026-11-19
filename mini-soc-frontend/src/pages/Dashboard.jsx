import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Database,
  Globe,
  ScrollText,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import { useSocData } from '../context/SocDataContext';
import { getUser } from '../services/auth';
import { buildIpStats } from '../utils/ipStats';
import {
  fmtDateTime,
  fmtShortDate,
  fmtTime,
  severityRank,
} from '../utils/format';
import {
  SEVERITY_COLORS,
  COLORS,
  axisProps,
  gridProps,
  tooltipStyle,
} from '../utils/chartTheme';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logs, alerts, analytics, error, refreshData } = useSocData();
  const currentUser = getUser();

  const services = [
    { name: 'Log Ingestion Parser', status: 'Operational', ok: true },
    { name: 'Brute-Force Detection Engine', status: 'Operational', ok: true },
    {
      name: 'SQLite Database',
      status: error ? 'Disconnected' : 'Connected',
      ok: !error,
    },
    {
      name: 'FastAPI Backend',
      status: error ? 'Degraded' : 'Active',
      ok: !error,
    },
  ];

  const ipStats = useMemo(() => buildIpStats(logs || [], alerts || []), [logs, alerts]);
  const highRiskIps = ipStats.filter((item) => item.riskScore >= 70).length;

  const criticalOpen = (alerts || []).filter(
    (alert) =>
      alert.severity === 'Critical' &&
      alert.status !== 'Resolved' &&
      alert.status !== 'False Positive'
  ).length;

  const week = (analytics || [])
    .slice(-7)
    .map((item) => ({
      ...item,
      label: fmtShortDate(item.date),
    }));

  const severityData = ['Critical', 'High', 'Medium', 'Low']
    .map((severity) => ({
      name: severity,
      value: (alerts || []).filter((alert) => alert.severity === severity).length,
    }))
    .filter((item) => item.value > 0);

  const recentAlerts = useMemo(
    () =>
      [...(alerts || [])]
        .sort((a, b) => (b.detectedAt || '').localeCompare(a.detectedAt || ''))
        .slice(0, 6),
    [alerts]
  );

  const recentLogs = (logs || []).slice(0, 6);

  const alertColumns = [
    {
      key: 'name',
      label: 'Detection Rule / Threat',
      render: (alert) => (
        <span className="font-semibold text-slate-100 hover:text-twilight-cyan transition-colors">
          {alert.name}
        </span>
      ),
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (alert) => <SeverityBadge severity={alert.severity} />,
      sortValue: (alert) => severityRank[alert.severity] ?? 0,
    },
    {
      key: 'sourceIp',
      label: 'Source IP',
      render: (alert) => (
        <span className="font-mono text-xs text-twilight-cyan bg-raised px-2 py-0.5 rounded border border-line">
          {alert.sourceIp}
        </span>
      ),
    },
    {
      key: 'detectedAt',
      label: 'Detection Time',
      render: (alert) => (
        <span className="whitespace-nowrap text-xs text-slate-400 font-mono">
          {fmtDateTime(alert.detectedAt)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (alert) => <StatusBadge status={alert.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Analyst Info & Ingest Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Terminal Overview"
          description="Real-time telemetry, threat correlation engine, and automated incident triage."
        />

        <div className="flex items-center gap-3">
          <Link to="/upload" className="btn-primary !py-2 !px-3.5 text-xs">
            <UploadCloud size={15} /> Ingest Logs (CSV)
          </Link>
          <button
            type="button"
            onClick={() => refreshData && refreshData()}
            className="btn-ghost !py-2 !px-3 text-xs"
            title="Refresh SOC Telemetry"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Primary Statistics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ScrollText}
          label="Total Security Logs"
          value={(logs || []).length}
          hint="Persisted in SQLite database"
          tone="cyan"
        />

        <StatCard
          icon={ShieldAlert}
          label="Triggered Alerts"
          value={(alerts || []).length}
          hint={`${(alerts || []).filter((a) => a.status === 'Open').length} currently awaiting triage`}
          tone="violet"
        />

        <StatCard
          icon={AlertTriangle}
          label="Critical Threats"
          value={criticalOpen}
          hint="Active high-risk escalations"
          tone="red"
        />

        <StatCard
          icon={Globe}
          label="High-Risk IP Targets"
          value={highRiskIps}
          hint="Observed malicious behavior"
          tone="orange"
        />
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline Chart */}
        <section className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="card-title text-base">
              <Activity size={18} className="text-twilight-cyan" />
              Event Volume Timeline (Last 7 Days)
            </h3>
            <span className="text-xs text-slate-400 font-mono">SQLite Ingestion Trends</span>
          </div>

          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={week} margin={{ left: -15, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="cyanFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.cyan} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.cyan} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="violetFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.violet} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.violet} stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

                <Area
                  type="monotone"
                  dataKey="events"
                  name="Total Security Events"
                  stroke={COLORS.cyan}
                  fill="url(#cyanFill)"
                  strokeWidth={2}
                />

                <Area
                  type="monotone"
                  dataKey="loginFailed"
                  name="Failed Login Attempts"
                  stroke={COLORS.pink}
                  fill="url(#violetFill)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Severity Donut Chart */}
        <section className="card p-6">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="card-title text-base">
              <ShieldAlert size={18} className="text-twilight-violet" />
              Threat Severity Ratio
            </h3>
            <span className="text-xs text-slate-400 font-mono">Active Rules</span>
          </div>

          <div className="mt-4 h-64">
            {severityData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-500 font-mono">
                No alerts recorded in database.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {severityData.map((item) => (
                      <Cell key={item.name} fill={SEVERITY_COLORS[item.name]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {/* Recent Alerts & Telemetry Feed */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Alerts Table */}
        <section className="card p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="card-title text-base">
              <ShieldAlert size={18} className="text-twilight-cyan" />
              Latest Security Alerts
            </h3>
            <Link to="/alerts" className="text-xs text-twilight-cyan hover:underline font-semibold">
              View all alerts &rarr;
            </Link>
          </div>

          <DataTable
            columns={alertColumns}
            rows={recentAlerts}
            paginate={false}
            onRowClick={(alert) => navigate(`/alerts/${alert.id}`)}
            emptyMessage="No security alerts generated yet. Upload CSV logs to trigger detection rules."
          />
        </section>

        {/* System & Telemetry Health */}
        <div className="space-y-6">
          {/* Recent Event Stream */}
          <section className="card p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <h3 className="card-title text-base">
                <Activity size={18} className="text-twilight-violet" />
                Live Syslog Activity
              </h3>
              <Link to="/logs" className="text-xs text-twilight-violet hover:underline">
                All Logs
              </Link>
            </div>

            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {(recentLogs || []).length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500 font-mono">
                  No logs available.
                </p>
              ) : (
                recentLogs.map((log) => (
                  <li key={log.id}>
                    <Link
                      to={`/logs/${log.id}`}
                      className="block rounded-lg border border-transparent p-2 hover:border-line hover:bg-raised/60 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{log.eventType}</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {fmtTime(log.timestamp)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="text-twilight-cyan">{log.sourceIp}</span>
                        <span>{log.username || 'System'}</span>
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>

          {/* Infrastructure Health */}
          <section className="card p-6 space-y-3">
            <h3 className="card-title text-base border-b border-line pb-2">
              <Database size={18} className="text-twilight-cyan" />
              SOC Engine Status
            </h3>

            <ul className="space-y-2 font-mono text-xs">
              {services.map((service) => (
                <li
                  key={service.name}
                  className="flex items-center justify-between rounded-lg bg-raised/30 p-2"
                >
                  <span className="text-slate-300">{service.name}</span>
                  <span
                    className={`flex items-center gap-1.5 font-semibold ${
                      service.ok ? 'text-emerald-400' : 'text-twilight-pink'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        service.ok ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-twilight-pink'
                      }`}
                    />
                    {service.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

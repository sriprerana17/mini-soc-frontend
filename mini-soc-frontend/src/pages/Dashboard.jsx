
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Database,
  Globe,
  ScrollText,
  ShieldAlert,
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

function getUserInitials(user) {
  const email = user?.email?.trim();

  if (email) {
    return email.charAt(0).toUpperCase();
  }

  return user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';
}

function getDisplayName(user) {
  const email = user?.email?.trim();

  if (email && email.includes('@')) {
    return email.split('@')[0];
  }

  return user?.name || 'User';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { logs, alerts, analytics, error } = useSocData();

  const currentUser = getUser();
  const displayName = getDisplayName(currentUser);
  const userInitial = getUserInitials(currentUser);

  const services = [
    { name: 'Log collector', status: 'Operational', ok: true },
    { name: 'Detection engine', status: 'Operational', ok: true },
    {
      name: 'Database (SQLite)',
      status: error ? 'Disconnected' : 'Connected',
      ok: !error,
    },
    {
      name: 'Backend API',
      status: error ? 'Disconnected' : 'Operational',
      ok: !error,
    },
  ];

  const ipStats = useMemo(() => buildIpStats(logs, alerts), [logs, alerts]);

  const highRiskIps = ipStats.filter(
    (item) => item.riskScore >= 70
  ).length;

  const criticalOpen = alerts.filter(
    (alert) =>
      alert.severity === 'Critical' &&
      alert.status !== 'Resolved' &&
      alert.status !== 'False Positive'
  ).length;

  const week = analytics
    .slice(-7)
    .map((item) => ({
      ...item,
      label: fmtShortDate(item.date),
    }));

  const severityData = ['Critical', 'High', 'Medium', 'Low']
    .map((severity) => ({
      name: severity,
      value: alerts.filter(
        (alert) => alert.severity === severity
      ).length,
    }))
    .filter((item) => item.value > 0);

  const recentAlerts = useMemo(
    () =>
      [...alerts]
        .sort((a, b) =>
          (b.detectedAt || '').localeCompare(a.detectedAt || '')
        )
        .slice(0, 6),
    [alerts]
  );

  const recentLogs = logs.slice(0, 6);

  const alertColumns = [
    {
      key: 'name',
      label: 'Alert',
      render: (alert) => (
        <span className="font-medium text-slate-100">
          {alert.name}
        </span>
      ),
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (alert) => (
        <SeverityBadge severity={alert.severity} />
      ),
      sortValue: (alert) => severityRank[alert.severity],
    },
    {
      key: 'sourceIp',
      label: 'Source IP',
      render: (alert) => (
        <span className="font-mono text-xs">
          {alert.sourceIp}
        </span>
      ),
    },
    {
      key: 'detectedAt',
      label: 'Detected',
      render: (alert) => (
        <span className="whitespace-nowrap text-xs text-slate-400">
          {fmtDateTime(alert.detectedAt)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (alert) => (
        <StatusBadge status={alert.status} />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Security overview"
          description="Summary of security logs and alerts."
        />

        {/* User profile */}
        <div
          className="flex items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2"
          title={currentUser?.email || 'User profile'}
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/15 text-sm font-bold text-cyan-300"
            aria-label={`User initial: ${userInitial}`}
          >
            {userInitial}
          </div>

          <div className="min-w-0">
            <p className="max-w-40 truncate text-sm font-semibold text-slate-100">
              {displayName}
            </p>

            <p className="text-xs text-slate-400">
              {currentUser?.role || 'Analyst'}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ScrollText}
          label="Total security logs"
          value={logs.length}
          hint="Stored in SQLite database"
          tone="cyan"
        />

        <StatCard
          icon={ShieldAlert}
          label="Total alerts"
          value={alerts.length}
          hint={`${alerts.filter((a) => a.status === 'Open').length} still open`}
          tone="orange"
        />

        <StatCard
          icon={AlertTriangle}
          label="Critical alerts"
          value={criticalOpen}
          hint="Not yet resolved"
          tone="red"
        />

        <StatCard
          icon={Globe}
          label="High-risk IP addresses"
          value={highRiskIps}
          hint="Risk score 70 or higher"
          tone="green"
        />
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h3 className="card-title">
            Security activity, last 7 days
          </h3>

          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={week}
                margin={{ left: -15, right: 8, top: 4 }}
              >
                <defs>
                  <linearGradient
                    id="evFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={COLORS.cyan}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="100%"
                      stopColor={COLORS.cyan}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />

                <Area
                  type="monotone"
                  dataKey="events"
                  name="All events"
                  stroke={COLORS.cyan}
                  fill="url(#evFill)"
                  strokeWidth={2}
                />

                <Area
                  type="monotone"
                  dataKey="loginFailed"
                  name="Failed logins"
                  stroke={COLORS.orange}
                  fill="none"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-4">
          <h3 className="card-title">
            Alerts by severity
          </h3>

          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="none"
                >
                  {severityData.map((item) => (
                    <Cell
                      key={item.name}
                      fill={SEVERITY_COLORS[item.name]}
                    />
                  ))}
                </Pie>

                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Recent alerts and activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between p-4 pb-2">
            <h3 className="card-title">
              Recent security alerts
            </h3>

            <Link
              to="/alerts"
              className="text-xs text-cyan-300 hover:underline"
            >
              View all
            </Link>
          </div>

          <DataTable
            columns={alertColumns}
            rows={recentAlerts}
            paginate={false}
            onRowClick={(alert) =>
              navigate(`/alerts/${alert.id}`)
            }
          />

          <p className="border-t border-line px-4 py-2.5 text-xs text-slate-500">
            Live alerts detected by backend detection rules.
          </p>
        </section>

        <div className="space-y-4">
          <section className="card p-4">
            <h3 className="card-title flex items-center gap-2">
              <Activity
                size={16}
                className="text-cyan-300"
              />
              Recent activity
            </h3>

            <ul className="mt-3 space-y-3">
              {recentLogs.map((log) => (
                <li key={log.id}>
                  <Link
                    to={`/logs/${log.id}`}
                    className="block rounded-md p-1.5 hover:bg-raised"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-200">
                        {log.eventType}
                      </span>

                      <span className="text-xs text-slate-500">
                        {fmtTime(log.timestamp)}
                      </span>
                    </div>

                    <span className="font-mono text-xs text-slate-500">
                      {log.sourceIp} / {log.username}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* System status */}
          <section className="card p-4">
            <h3 className="card-title flex items-center gap-2">
              <Database
                size={16}
                className="text-cyan-300"
              />
              System status
            </h3>

            <ul className="mt-3 space-y-2.5">
              {services.map((service) => (
                <li
                  key={service.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{service.name}</span>

                  <span
                    className={`flex items-center gap-2 text-xs ${
                      service.ok
                        ? 'text-emerald-300'
                        : 'text-slate-500'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        service.ok
                          ? 'bg-emerald-400'
                          : 'bg-slate-600'
                      }`}
                    />

                    {service.status}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-3 text-xs text-slate-500">
              Connected to FastAPI backend and SQLite database.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

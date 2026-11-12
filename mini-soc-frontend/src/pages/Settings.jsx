import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { getUser } from '../services/auth';

const STORAGE_KEY = 'minisoc_settings';

const defaults = {
  profile: { name: '', email: '', team: 'Blue Team' },
  preferences: { timezone: 'UTC', rowsPerPage: '10', dateFormat: 'DD MMM YYYY' },
  notifications: { criticalAlerts: true, highAlerts: true, dailySummary: false, uploadResults: true },
  rules: { bruteForce: true, portScan: true, unusualLogin: true, privilegeEscalation: true },
  thresholds: { failedLogins: 10, windowMinutes: 10, portScanPorts: 15, criticalScore: 90, workStart: 6, workEnd: 20 },
};

function loadSettings() {
  const user = getUser();
  const base = { ...defaults, profile: { ...defaults.profile, name: user?.name || '', email: user?.email || '' } };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return base;
    return Object.fromEntries(Object.keys(base).map((k) => [k, { ...base[k], ...(saved[k] || {}) }]));
  } catch {
    return base;
  }
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-sm text-slate-100">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative h-5 w-9 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-cyan-500 peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-400/70 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
    </label>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="card p-5">
      <h3 className="card-title">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return undefined;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  const set = (group, key, value) => setSettings((s) => ({ ...s, [group]: { ...s[group], [key]: value } }));
  const num = (group, key) => (e) => set(group, key, e.target.value === '' ? '' : Number(e.target.value));

  const save = (e) => {
    e.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(loadSettings());
    setSaved(false);
  };

  const t = settings.thresholds;
  const thresholdFields = [
    { key: 'failedLogins', label: 'Failed logins before an alert', min: 3, max: 100 },
    { key: 'windowMinutes', label: 'Time window (minutes)', min: 1, max: 120 },
    { key: 'portScanPorts', label: 'Ports scanned before an alert', min: 5, max: 200 },
    { key: 'criticalScore', label: 'Risk score treated as critical', min: 50, max: 100 },
    { key: 'workStart', label: 'Working hours start (UTC hour)', min: 0, max: 23 },
    { key: 'workEnd', label: 'Working hours end (UTC hour)', min: 0, max: 23 },
  ];

  return (
    <form onSubmit={save}>
      <PageHeader
        title="Settings"
        description="Settings are saved in this browser only. The backend will apply them when it is connected."
        actions={
          <>
            <button type="button" className="btn-ghost" onClick={reset}>Reset to defaults</button>
            <button type="submit" className="btn-primary">Save settings</button>
          </>
        }
      />

      {saved && (
        <div role="status" className="mb-4 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <CheckCircle2 size={16} /> Settings saved.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Analyst profile">
          <div className="space-y-4">
            <div>
              <label htmlFor="s-name" className="label">Full name</label>
              <input id="s-name" className="input" value={settings.profile.name} onChange={(e) => set('profile', 'name', e.target.value)} />
            </div>
            <div>
              <label htmlFor="s-email" className="label">Email</label>
              <input id="s-email" type="email" className="input" value={settings.profile.email} onChange={(e) => set('profile', 'email', e.target.value)} />
            </div>
            <div>
              <label htmlFor="s-team" className="label">Team</label>
              <input id="s-team" className="input" value={settings.profile.team} onChange={(e) => set('profile', 'team', e.target.value)} />
            </div>
          </div>
        </Section>

        <Section title="Account preferences">
          <div className="space-y-4">
            <div>
              <label htmlFor="s-tz" className="label">Time zone</label>
              <select id="s-tz" className="input" value={settings.preferences.timezone} onChange={(e) => set('preferences', 'timezone', e.target.value)}>
                <option>UTC</option><option>Asia/Kolkata (IST)</option><option>Europe/London</option><option>America/New_York</option>
              </select>
            </div>
            <div>
              <label htmlFor="s-rows" className="label">Rows per page</label>
              <select id="s-rows" className="input" value={settings.preferences.rowsPerPage} onChange={(e) => set('preferences', 'rowsPerPage', e.target.value)}>
                <option>10</option><option>25</option><option>50</option>
              </select>
            </div>
            <div>
              <label htmlFor="s-date" className="label">Date format</label>
              <select id="s-date" className="input" value={settings.preferences.dateFormat} onChange={(e) => set('preferences', 'dateFormat', e.target.value)}>
                <option>DD MMM YYYY</option><option>YYYY-MM-DD</option><option>MM/DD/YYYY</option>
              </select>
            </div>
          </div>
        </Section>

        <Section title="Notification preferences">
          <div className="divide-y divide-line">
            <Toggle label="Critical alerts" description="Tell me when a critical alert is created" checked={settings.notifications.criticalAlerts} onChange={(v) => set('notifications', 'criticalAlerts', v)} />
            <Toggle label="High severity alerts" checked={settings.notifications.highAlerts} onChange={(v) => set('notifications', 'highAlerts', v)} />
            <Toggle label="Daily summary" description="One message each morning with yesterday's activity" checked={settings.notifications.dailySummary} onChange={(v) => set('notifications', 'dailySummary', v)} />
            <Toggle label="Upload results" checked={settings.notifications.uploadResults} onChange={(v) => set('notifications', 'uploadResults', v)} />
          </div>
        </Section>

        <Section title="Detection rules" description="Turn rules off if they create too many false alarms.">
          <div className="divide-y divide-line">
            <Toggle label="Brute force login" description="RULE-001" checked={settings.rules.bruteForce} onChange={(v) => set('rules', 'bruteForce', v)} />
            <Toggle label="Port scan" description="RULE-002" checked={settings.rules.portScan} onChange={(v) => set('rules', 'portScan', v)} />
            <Toggle label="Unusual login time" description="RULE-004" checked={settings.rules.unusualLogin} onChange={(v) => set('rules', 'unusualLogin', v)} />
            <Toggle label="Privilege escalation" description="RULE-006" checked={settings.rules.privilegeEscalation} onChange={(v) => set('rules', 'privilegeEscalation', v)} />
          </div>
        </Section>

        <div className="lg:col-span-2">
          <Section title="Alert thresholds" description="Values the detection rules use to decide when to create an alert.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {thresholdFields.map((f) => (
                <div key={f.key}>
                  <label htmlFor={`t-${f.key}`} className="label">{f.label}</label>
                  <input id={`t-${f.key}`} type="number" min={f.min} max={f.max} className="input" value={t[f.key]} onChange={num('thresholds', f.key)} />
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </form>
  );
}

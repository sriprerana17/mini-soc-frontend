import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useSocData } from '../context/SocDataContext';
import { getUser, logout } from '../services/auth';
import SeverityBadge from './SeverityBadge';

function pageTitle(path) {
  if (path === '/') return 'Dashboard';
  if (path.startsWith('/logs/')) return 'Log Details';
  if (path.startsWith('/logs')) return 'Security Logs';
  if (path.startsWith('/alerts/')) return 'Alert Details';
  if (path.startsWith('/alerts')) return 'Security Alerts';
  if (path.startsWith('/analytics')) return 'Analytics';
  if (path.startsWith('/ip-activity')) return 'IP Activity Matrix';
  if (path.startsWith('/upload')) return 'Upload Logs';
  if (path.startsWith('/settings')) return 'Settings';
  return 'MiniSOC';
}

function useClickOutside(ref, close) {
  useEffect(() => {
    const handler = (e) => ref.current && !ref.current.contains(e.target) && close();
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, close]);
}

export default function Navbar({ onMenuClick }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { alerts } = useSocData();
  const user = getUser();

  const [query, setQuery] = useState('');
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const bellRef = useRef(null);
  const userRef = useRef(null);
  useClickOutside(bellRef, () => setBellOpen(false));
  useClickOutside(userRef, () => setUserOpen(false));

  const openAlerts = (alerts || []).filter((a) => a.status === 'Open');
  const criticalCount = openAlerts.filter((a) => a.severity === 'Critical').length;
  const latest = openAlerts
    .filter((a) => a.severity === 'Critical' || a.severity === 'High')
    .slice(0, 4);

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(query.trim() ? `/logs?q=${encodeURIComponent(query.trim())}` : '/logs');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line/80 bg-bg/85 px-4 backdrop-blur-md sm:px-6 shadow-md shadow-black/20">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-400 hover:bg-raised hover:text-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Page Title */}
      <div className="hidden sm:flex items-center gap-2">
        <h1 className="text-base font-bold text-white tracking-wide">{pageTitle(pathname)}</h1>
      </div>

      {/* Global Search Bar */}
      <form onSubmit={submitSearch} className="relative ml-auto w-full max-w-xs sm:ml-6 sm:max-w-md" role="search">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search logs by IP, event or user..."
          className="input !pl-10 !py-1.5 !text-xs font-mono"
          aria-label="Search security logs"
        />
      </form>

      {/* Notifications / Alerts Bell */}
      <div ref={bellRef} className="relative">
        <button
          type="button"
          onClick={() => setBellOpen((o) => !o)}
          className="relative rounded-lg p-2 text-slate-400 hover:bg-raised hover:text-twilight-cyan transition-colors"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {openAlerts.length > 0 && (
            <span
              className={`absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-md ${
                criticalCount > 0 ? 'bg-twilight-pink shadow-glow-magenta animate-pulse' : 'bg-orange-500'
              }`}
            >
              {openAlerts.length}
            </span>
          )}
        </button>

        {bellOpen && (
          <div className="card absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] p-3 shadow-2xl border-line/90">
            <div className="flex items-center justify-between border-b border-line pb-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Active Threats</span>
              <span className="text-xs font-mono font-semibold text-twilight-pink">
                {openAlerts.length} open
              </span>
            </div>

            {latest.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-slate-400 font-mono">
                No high-priority active threats.
              </p>
            ) : (
              <div className="space-y-1.5">
                {latest.map((a) => (
                  <Link
                    key={a.id}
                    to={`/alerts/${a.id}`}
                    onClick={() => setBellOpen(false)}
                    className="flex items-start justify-between gap-2 rounded-lg p-2 hover:bg-raised/70 transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-slate-100">{a.name}</span>
                      <span className="font-mono text-[11px] text-twilight-cyan">{a.sourceIp}</span>
                    </div>
                    <SeverityBadge severity={a.severity} />
                  </Link>
                ))}
              </div>
            )}

            <Link
              to="/alerts"
              onClick={() => setBellOpen(false)}
              className="mt-2 block rounded-lg bg-raised/70 py-1.5 text-center text-xs font-semibold text-twilight-cyan hover:bg-raised transition-colors"
            >
              Open Alerts Console &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* User Dropdown */}
      <div ref={userRef} className="relative">
        <button
          type="button"
          onClick={() => setUserOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-raised/70 transition-colors border border-transparent hover:border-line"
          aria-label="User menu"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-twilight-cyan/20 to-twilight-violet/20 border border-twilight-cyan/40 text-xs font-bold text-twilight-cyan shadow-glow-cyan">
            {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
          </span>
          <span className="hidden text-left md:block">
            <span className="block text-xs font-semibold leading-tight text-slate-100">
              {user?.name || 'Analyst'}
            </span>
            <span className="block text-[10px] font-mono leading-tight text-twilight-cyan">
              {user?.role || 'SOC Analyst'}
            </span>
          </span>
          <ChevronDown size={14} className="hidden text-slate-500 md:block" />
        </button>

        {userOpen && (
          <div className="card absolute right-0 mt-2 w-56 p-2 shadow-2xl border-line/90">
            <div className="border-b border-line px-2 py-2">
              <p className="truncate text-xs font-bold text-white">{user?.name || 'SOC Analyst'}</p>
              <p className="truncate text-[11px] font-mono text-slate-400">{user?.email}</p>
            </div>
            <Link
              to="/settings"
              onClick={() => setUserOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-raised hover:text-white transition-colors"
            >
              <SettingsIcon size={14} /> System Settings
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-twilight-pink hover:bg-twilight-pink/15 transition-colors"
            >
              <LogOut size={14} /> Terminate Session
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

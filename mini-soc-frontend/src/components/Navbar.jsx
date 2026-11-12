import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, Search, Settings as SettingsIcon } from 'lucide-react';
import { useSocData } from '../context/SocDataContext';
import { getUser, logout } from '../services/auth';
import SeverityBadge from './SeverityBadge';

function pageTitle(path) {
  if (path === '/') return 'Dashboard';
  if (path.startsWith('/logs/')) return 'Log Details';
  if (path.startsWith('/logs')) return 'Security Logs';
  if (path.startsWith('/alerts/')) return 'Alert Details';
  if (path.startsWith('/alerts')) return 'Alerts';
  if (path.startsWith('/analytics')) return 'Analytics';
  if (path.startsWith('/ip-activity')) return 'IP Activity';
  if (path.startsWith('/upload')) return 'Upload Logs';
  if (path.startsWith('/settings')) return 'Settings';
  return 'MiniSOC';
}

// Closes a dropdown when the user clicks anywhere outside it.
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

  const openAlerts = alerts.filter((a) => a.status === 'Open');
  const latest = openAlerts.filter((a) => a.severity === 'Critical' || a.severity === 'High').slice(0, 4);

  const submitSearch = (e) => {
    e.preventDefault();
    navigate(query.trim() ? `/logs?q=${encodeURIComponent(query.trim())}` : '/logs');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur sm:px-6">
      <button type="button" onClick={onMenuClick} className="rounded p-1.5 text-slate-400 hover:text-slate-100 lg:hidden" aria-label="Open menu">
        <Menu size={22} />
      </button>

      <h1 className="hidden text-base font-semibold sm:block">{pageTitle(pathname)}</h1>

      <form onSubmit={submitSearch} className="relative ml-auto w-full max-w-xs sm:ml-6 sm:max-w-sm" role="search">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search logs by IP, user or event"
          className="input !pl-9"
          aria-label="Search security logs"
        />
      </form>

      <div ref={bellRef} className="relative">
        <button type="button" onClick={() => setBellOpen((o) => !o)} className="relative rounded-md p-2 text-slate-400 hover:bg-raised hover:text-slate-100" aria-label="Notifications">
          <Bell size={20} />
          {openAlerts.length > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {openAlerts.length}
            </span>
          )}
        </button>
        {bellOpen && (
          <div className="card absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] p-2 shadow-xl">
            <p className="px-2 py-1.5 text-xs font-medium text-slate-400">{openAlerts.length} open alerts</p>
            {latest.length === 0 && <p className="px-2 py-4 text-center text-sm text-slate-500">No high-priority alerts.</p>}
            {latest.map((a) => (
              <Link key={a.id} to={`/alerts/${a.id}`} onClick={() => setBellOpen(false)} className="flex items-start justify-between gap-2 rounded-md px-2 py-2 hover:bg-raised">
                <span>
                  <span className="block text-sm text-slate-100">{a.name}</span>
                  <span className="font-mono text-xs text-slate-500">{a.sourceIp}</span>
                </span>
                <SeverityBadge severity={a.severity} />
              </Link>
            ))}
            <Link to="/alerts" onClick={() => setBellOpen(false)} className="mt-1 block rounded-md px-2 py-2 text-center text-sm text-cyan-300 hover:bg-raised">
              View all alerts
            </Link>
          </div>
        )}
      </div>

      <div ref={userRef} className="relative">
        <button type="button" onClick={() => setUserOpen((o) => !o)} className="flex items-center gap-2 rounded-md p-1.5 hover:bg-raised" aria-label="User menu">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-semibold text-cyan-300">
            {(user?.name || 'A').charAt(0)}
          </span>
          <span className="hidden text-left md:block">
            <span className="block text-sm font-medium leading-tight text-slate-100">{user?.name || 'Analyst'}</span>
            <span className="block text-xs leading-tight text-slate-500">{user?.role || 'SOC Analyst'}</span>
          </span>
          <ChevronDown size={14} className="hidden text-slate-500 md:block" />
        </button>
        {userOpen && (
          <div className="card absolute right-0 mt-2 w-52 p-1.5 shadow-xl">
            <div className="border-b border-line px-2 py-2">
              <p className="truncate text-sm text-slate-100">{user?.email}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
            <Link to="/settings" onClick={() => setUserOpen(false)} className="mt-1 flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-raised">
              <SettingsIcon size={15} /> Settings
            </Link>
            <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-red-300 hover:bg-red-500/10">
              <LogOut size={15} /> Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

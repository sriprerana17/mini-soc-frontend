import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ScrollText, ShieldAlert, BarChart3, Globe, UploadCloud, Settings,
  ShieldCheck, PanelLeftClose, PanelLeftOpen, X,
} from 'lucide-react';

export const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/logs', label: 'Security Logs', icon: ScrollText },
  { to: '/alerts', label: 'Alerts', icon: ShieldAlert },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/ip-activity', label: 'IP Activity', icon: Globe },
  { to: '/upload', label: 'Upload Logs', icon: UploadCloud },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onClose }) {
  const hideLabel = collapsed ? 'lg:hidden' : '';

  return (
    <>
      {/* dark overlay behind the mobile menu */}
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-panel transition-all duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-300">
              <ShieldCheck size={20} />
            </span>
            <span className={`text-lg font-semibold tracking-tight text-slate-50 ${hideLabel}`}>MiniSOC</span>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-100 lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-400 hover:bg-raised hover:text-slate-100'
                } ${collapsed ? 'lg:justify-center' : ''}`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span className={hideLabel}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-line p-3 lg:block">
          <button
            type="button"
            onClick={onToggle}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-raised hover:text-slate-100 ${collapsed ? 'justify-center' : ''}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

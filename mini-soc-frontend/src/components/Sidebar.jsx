import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScrollText,
  ShieldAlert,
  BarChart3,
  Globe,
  UploadCloud,
  Settings,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Sparkles,
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
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line/80 bg-[#090e1e]/95 backdrop-blur-lg transition-all duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
        aria-label="Main navigation"
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-line/80 px-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-twilight-cyan/20 to-twilight-violet/20 border border-twilight-cyan/40 text-twilight-cyan shadow-glow-cyan">
              <ShieldCheck size={20} />
            </span>
            <div className={hideLabel}>
              <span className="text-base font-bold tracking-wider text-slate-50">
                MINI<span className="text-twilight-cyan">SOC</span>
              </span>
              <span className="block text-[9px] font-mono uppercase tracking-widest text-slate-400">
                Sentinel Suite
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'border border-twilight-cyan/40 bg-gradient-to-r from-twilight-cyan/15 to-twilight-violet/10 text-twilight-cyan shadow-glow-cyan'
                    : 'text-slate-400 hover:border-line hover:bg-raised/70 hover:text-slate-100'
                } ${collapsed ? 'lg:justify-center' : ''}`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span className={hideLabel}>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="hidden border-t border-line/80 p-3 lg:block">
          <button
            type="button"
            onClick={onToggle}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-raised hover:text-slate-100 ${
              collapsed ? 'justify-center' : ''
            }`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            {!collapsed && <span>Collapse Sidebar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

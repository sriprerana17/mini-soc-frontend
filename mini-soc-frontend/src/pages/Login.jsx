import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Lock, Mail, AlertCircle } from 'lucide-react';
import { isAuthenticated, login } from '../services/auth';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});

  if (isAuthenticated()) return <Navigate to="/" replace />;

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = 'Enter your email address.';
    else if (!emailPattern.test(email.trim())) next.email = 'Enter a valid email, for example analyst@college.edu.';
    if (!password) next.password = 'Enter your password.';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters.';
    return next;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    login(email.trim(), remember);
    navigate('/');
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-panel p-10 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-300">
            <ShieldCheck size={22} />
          </span>
          <span className="text-xl font-semibold text-slate-50">MiniSOC</span>
        </div>

        <div>
          <h1 className="max-w-md text-3xl font-semibold leading-tight">Monitor logs, review alerts and investigate suspicious activity in one place.</h1>
          <p className="mt-4 max-w-md text-sm text-slate-400">A college project: a small Security Operations Center dashboard built with React.</p>

          <div className="mt-8 max-w-md rounded-lg border border-line bg-bg p-4 font-mono text-xs leading-6 text-slate-400">
            <p className="mb-2 font-sans text-[11px] text-slate-500">Sample log lines (demo data)</p>
            <p><span className="text-emerald-400">OK </span> sshd: Accepted publickey for jsmith</p>
            <p><span className="text-red-400">ERR</span> sshd: Failed password for admin</p>
            <p><span className="text-orange-400">BLK</span> fw-edge01: SYN scan blocked, 45.155.205.233</p>
            <p><span className="text-cyan-400">INF</span> detector: rule RULE-001 evaluated</p>
          </div>
        </div>

        <p className="text-xs text-slate-500">Demo mode. Any valid email and a password of 6+ characters will sign you in.</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-300">
              <ShieldCheck size={20} />
            </span>
            <span className="text-lg font-semibold text-slate-50">MiniSOC</span>
          </div>

          <h2 className="text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-slate-400">Use your analyst account to open the dashboard.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="analyst@college.edu" className={`input !pl-9 ${errors.email ? '!border-red-500/60' : ''}`} aria-invalid={!!errors.email} />
              </div>
              {errors.email && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-300"><AlertCircle size={13} /> {errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className={`input !pl-9 !pr-10 ${errors.password ? '!border-red-500/60' : ''}`} aria-invalid={!!errors.password} />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-100" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-300"><AlertCircle size={13} /> {errors.password}</p>
              )}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-line bg-raised accent-cyan-500" />
              Remember me on this device
            </label>

            <button type="submit" className="btn-primary w-full">Sign in</button>
          </form>
        </div>
      </div>
    </div>
  );
}

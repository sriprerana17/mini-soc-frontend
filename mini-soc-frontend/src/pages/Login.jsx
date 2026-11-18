
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { isAuthenticated, setSession } from '../services/auth';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    const next = {};

    if (!email.trim() || !emailPattern.test(email.trim())) {
      next.email = 'Enter a valid email address.';
    }

    if (!password) {
      next.password = 'Please enter your password.';
    } else if (password.length < 6) {
      next.password = 'Password must be at least 6 characters.';
    }

    setErrors(next);

    if (Object.keys(next).length > 0) return;

    const user = {
      id: 'demo-user',
      name: 'Analyst',
      email: email.trim().toLowerCase(),
      role: 'analyst',
    };

    setSession('demo-session-token', user, remember);
    navigate('/', { replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden flex-col justify-between border-r border-line bg-panel p-10 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-300">
            <ShieldCheck size={22} />
          </span>
          <span className="text-xl font-semibold text-slate-50">
            MiniSOC
          </span>
        </div>

        <div>
          <h1 className="max-w-md text-3xl font-semibold leading-tight">
            Monitor logs, review alerts and investigate suspicious activity
            in one place.
          </h1>

          <p className="mt-4 text-sm text-slate-400">
            Your centralized security monitoring dashboard.
          </p>

          <div className="mt-8 rounded-lg border border-line bg-bg p-4 font-mono text-xs leading-6 text-slate-400">
            <p>
              <span className="text-emerald-400">OK </span>
              sshd: Accepted publickey
            </p>
            <p>
              <span className="text-red-400">ERR </span>
              sshd: Failed password
            </p>
            <p>
              <span className="text-orange-400">WARN </span>
              Multiple failed logins
            </p>
            <p>
              <span className="text-cyan-400">INFO </span>
              Security detector running
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          MiniSOC — Security Operations Center
        </p>
      </div>

      {/* Login form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <ShieldCheck size={25} className="text-cyan-300" />
            <span className="text-lg font-semibold text-slate-50">
              MiniSOC
            </span>
          </div>

          <h2 className="text-2xl font-semibold">Sign in</h2>

          <p className="mt-2 text-sm text-slate-400">
            Enter your email and password to access your MiniSOC dashboard.
          </p>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-8 space-y-5"
          >
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>

              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@college.edu"
                  autoComplete="email"
                  className={`input !pl-9 ${
                    errors.email ? '!border-red-500/60' : ''
                  }`}
                  aria-invalid={Boolean(errors.email)}
                />
              </div>

              {errors.email && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-300">
                  <AlertCircle size={13} />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>

              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`input !pl-9 !pr-10 ${
                    errors.password ? '!border-red-500/60' : ''
                  }`}
                  aria-invalid={Boolean(errors.password)}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-100"
                  aria-label={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>

              {errors.password && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-300">
                  <AlertCircle size={13} />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember me */}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-cyan-500"
              />
              Remember me on this device
            </label>

            <button type="submit" className="btn-primary w-full">
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { isAuthenticated, loginUser } from '../services/auth';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const validate = () => {
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
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await loginUser(email, password, remember);
      navigate('/', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setServerError(detail);
      } else {
        setServerError('Invalid email or password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-bg text-slate-100">
      {/* Brand panel with Twilight Sentinel cyberpunk styling */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line/80 bg-gradient-to-b from-[#090e1f] via-[#0d162d] to-[#070b16] p-10 lg:flex">
        {/* Glow orbs */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-twilight-cyan/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-twilight-violet/15 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-twilight-cyan/20 to-twilight-violet/20 border border-twilight-cyan/40 text-twilight-cyan shadow-glow-cyan">
            <ShieldCheck size={24} />
          </span>
          <div>
            <span className="text-xl font-bold tracking-wider text-slate-50">
              MINI<span className="text-twilight-cyan">SOC</span>
            </span>
            <span className="ml-2 rounded border border-twilight-cyan/30 bg-twilight-cyan/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-widest text-twilight-cyan">
              Sentinel v2.0
            </span>
          </div>
        </div>

        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-twilight-cyan/30 bg-twilight-cyan/10 px-3 py-1 text-xs text-twilight-cyan mb-4">
            <Sparkles size={13} />
            <span>Real-Time Security Terminal</span>
          </div>

          <h1 className="max-w-md text-3xl font-bold leading-tight text-white drop-shadow">
            Monitor logs, review alerts, and investigate attacks in one unified terminal.
          </h1>

          <p className="mt-4 max-w-md text-sm text-slate-400 leading-relaxed">
            FastAPI-powered threat detection engine with automated alert correlation, CSV log ingestion, and forensic telemetry.
          </p>

          <div className="mt-8 rounded-xl border border-line bg-panel/80 p-4 font-mono text-xs leading-6 text-slate-300 backdrop-blur shadow-xl">
            <p>
              <span className="text-twilight-emerald font-semibold">[OK] </span>
              sshd: Authentication service active
            </p>
            <p>
              <span className="text-twilight-pink font-semibold">[ERR] </span>
              Repeated failed logins detected
            </p>
            <p>
              <span className="text-twilight-amber font-semibold">[WARN] </span>
              Correlation rule triggered: Brute Force
            </p>
            <p>
              <span className="text-twilight-cyan font-semibold">[INFO] </span>
              Sentinel threat engine operational
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
          <span>MiniSOC &bull; Twilight Sentinel Edition</span>
          <span>College Security Operations</span>
        </div>
      </div>

      {/* Login form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-twilight-cyan/15 text-twilight-cyan border border-twilight-cyan/30">
              <ShieldCheck size={20} />
            </span>
            <span className="text-lg font-bold text-slate-50">
              MINI<span className="text-twilight-cyan">SOC</span>
            </span>
          </div>

          <div className="card p-6 sm:p-8 border-line/90 bg-panel/90 shadow-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-white">Analyst Sign In</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Enter your credentials to access the SOC terminal.
            </p>

            {serverError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-twilight-pink/40 bg-twilight-pink/15 p-3 text-xs text-rose-200">
                <AlertCircle size={16} className="shrink-0 text-twilight-pink mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="label">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@college.edu"
                    autoComplete="email"
                    className={`input !pl-10 ${errors.email ? '!border-twilight-pink/80' : ''}`}
                    aria-invalid={Boolean(errors.email)}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-twilight-pink">
                    <AlertCircle size={12} /> {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="label">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={`input !pl-10 !pr-10 ${errors.password ? '!border-twilight-pink/80' : ''}`}
                    aria-invalid={Boolean(errors.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-100"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-twilight-pink">
                    <AlertCircle size={12} /> {errors.password}
                  </p>
                )}
              </div>

              {/* Remember */}
              <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-line bg-raised accent-twilight-cyan"
                />
                Remember me on this browser
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-2.5 mt-2"
              >
                {submitting ? 'Verifying credentials...' : 'Sign in to Terminal'}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-400">
              Need an analyst account?{' '}
              <Link to="/register" className="font-semibold text-twilight-cyan hover:underline">
                Register here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

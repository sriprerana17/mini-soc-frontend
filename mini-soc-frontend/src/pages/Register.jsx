import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { isAuthenticated, registerUser } from '../services/auth';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const validate = () => {
    const next = {};
    if (!name.trim()) {
      next.name = 'Please enter your full name.';
    }
    if (!email.trim() || !emailPattern.test(email.trim())) {
      next.email = 'Please enter a valid academic or professional email address.';
    }
    if (!password) {
      next.password = 'Please create a secure password.';
    } else if (password.length < 6) {
      next.password = 'Password must be at least 6 characters.';
    }
    if (!confirmPassword) {
      next.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      next.confirmPassword = 'Passwords do not match.';
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
      await registerUser(name, email, password, remember);
      navigate('/', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setServerError(detail);
      } else if (Array.isArray(detail)) {
        setServerError(detail.map((d) => d.msg || d).join(', '));
      } else {
        setServerError('Registration failed. Check your network connection to the SOC backend.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-bg text-slate-100">
      {/* Brand panel with Twilight Sentinel cyberpunk styling */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line/80 bg-gradient-to-b from-[#090e1f] via-[#0d162d] to-[#070b16] p-10 lg:flex">
        {/* Glow orb */}
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
          <div className="inline-flex items-center gap-2 rounded-full border border-twilight-violet/30 bg-twilight-violet/10 px-3 py-1 text-xs text-twilight-violet mb-4">
            <Sparkles size={13} />
            <span>Twilight Cyber Operations Suite</span>
          </div>

          <h1 className="max-w-md text-3xl font-bold leading-tight text-white drop-shadow">
            Create your analyst account and defend the digital skyline.
          </h1>

          <p className="mt-4 max-w-md text-sm text-slate-400 leading-relaxed">
            Register to access high-fidelity security log ingestion, real-time threat triage, automated brute-force alerts, and forensic analytics.
          </p>

          <div className="mt-8 rounded-xl border border-line bg-panel/80 p-4 font-mono text-xs leading-6 text-slate-300 backdrop-blur shadow-xl">
            <div className="flex items-center gap-2 border-b border-line pb-2 mb-2 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-twilight-cyan animate-pulse" />
              <span>TERMINAL TELEMETRY</span>
            </div>
            <p className="text-twilight-cyan">&gt; INITIALIZING ANALYST PROTOCOL...</p>
            <p className="text-emerald-400">&gt; DATABASE CONNECTION: SQLITE ACTIVE</p>
            <p className="text-twilight-violet">&gt; HASHING ENGINE: BCRYPT-SALTED SHA-256</p>
            <p className="text-slate-400">&gt; JWT AUTHORIZATION TOKEN READY</p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
          <span>MiniSOC &bull; Twilight Sentinel Edition</span>
          <span>College Security Operations</span>
        </div>
      </div>

      {/* Registration form */}
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
            <h2 className="text-2xl font-bold tracking-tight text-white">Create an account</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Register as a SOC analyst to monitor security events.
            </p>

            {serverError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-twilight-pink/40 bg-twilight-pink/15 p-3 text-xs text-rose-200">
                <AlertCircle size={16} className="shrink-0 text-twilight-pink mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="reg-name" className="label">Full Name</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="reg-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    autoComplete="name"
                    className={`input !pl-10 ${errors.name ? '!border-twilight-pink/80' : ''}`}
                    aria-invalid={Boolean(errors.name)}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-twilight-pink">
                    <AlertCircle size={12} /> {errors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="reg-email" className="label">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="reg-email"
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
                <label htmlFor="reg-pass" className="label">Password (min 6 chars)</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="reg-pass"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div>
                <label htmlFor="reg-conf-pass" className="label">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="reg-conf-pass"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className={`input !pl-10 !pr-10 ${errors.confirmPassword ? '!border-twilight-pink/80' : ''}`}
                    aria-invalid={Boolean(errors.confirmPassword)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-100"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-twilight-pink">
                    <AlertCircle size={12} /> {errors.confirmPassword}
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
                {submitting ? 'Creating account...' : 'Complete Registration'}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-400">
              Already have an analyst account?{' '}
              <Link to="/login" className="font-semibold text-twilight-cyan hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

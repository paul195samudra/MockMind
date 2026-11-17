import React, { useState } from 'react';
import { Logo } from './Logo';
import { UserRole } from '../types';
import {
  Shield,
  User,
  Mail,
  Lock,
  BookOpen,
  Cpu,
  Award,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Terminal,
  TrendingUp
} from 'lucide-react';

interface LandingPageProps {
  onLogin: (email: string, passwordPlain: string, role: UserRole) => Promise<{ ok: boolean; error?: string }>;
  onRegister: (name: string, email: string, passwordPlain: string) => Promise<{ ok: boolean; error?: string }>;
}

export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<UserRole>('candidate');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const normalEmail = email.toLowerCase().trim();

    if (!normalEmail || !password) {
      setFormError('Please enter both your email address and password.');
      return;
    }

    if (!emailRegex.test(normalEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (isRegistering) {
      if (!name.trim()) {
        setFormError('Please enter your full name to create an account.');
        return;
      }
      if (password.length < 4) {
        setFormError('Password must be at least 4 characters long.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const result = await onRegister(name.trim(), normalEmail, password);
        if (result.ok) {
          setFormSuccess('Account created and signed in.');
          setPassword('');
        } else {
          setFormError(result.error || 'Unable to register this email. Try logging in instead.');
        }
      } else {
        const result = await onLogin(normalEmail, password, role);
        if (!result.ok) {
          setFormError(result.error || 'Invalid email or password.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Unable to reach the authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex flex-col justify-center py-6" id="mockmind_landing_container">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* LEFT SIDE: Value Proposition & Workflow */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-8 bg-slate-900 dark:bg-[#1b0d14] text-white rounded-2xl p-8 lg:p-10 border border-slate-800 dark:border-[#3b1d2c] shadow-sm relative overflow-hidden">
          <div className="space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-white/10 dark:bg-pink-500/10 rounded-xl flex items-center justify-center border border-white/15 dark:border-pink-400/20">
                <Logo className="w-9 h-9" sparkle={false} />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-display tracking-tight text-white">
                  MockMind
                </h1>
                <p className="text-xs text-teal-400 dark:text-pink-300 font-medium tracking-wide">
                  Train Your Mind. Ace Your Interview.
                </p>
              </div>
            </div>

            <div className="space-y-3 max-w-xl">
              <h2 className="text-3xl sm:text-4xl font-bold font-display tracking-tight leading-tight text-white [text-wrap:balance]">
                Structured interview practice with real code execution and rubric feedback.
              </h2>
              <p className="text-sm text-slate-300 dark:text-[#e7c6d7] leading-relaxed">
                Solve algorithmic coding problems, database queries, system design scenarios, and domain-specific case studies in one focused workspace.
              </p>
            </div>
          </div>

          {/* Three-Step Mechanism-to-Outcome Workflow */}
          <div className="rounded-xl border border-slate-800 dark:border-[#3b1d2c] bg-slate-950/50 dark:bg-[#12080d]/70 p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[#b88aa1]">
              How a Practice Session Works
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-semibold text-teal-400 dark:text-pink-400">01. Practice</span>
                <p className="text-xs font-semibold text-white">Timed IDE & Editor</p>
                <p className="text-xs text-slate-400 dark:text-[#b88aa1] leading-relaxed">
                  Write solutions with syntax highlighting, auto-saved drafts, and an interview stopwatch.
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-semibold text-teal-400 dark:text-pink-400">02. Verify</span>
                <p className="text-xs font-semibold text-white">Instant Unit Checks</p>
                <p className="text-xs text-slate-400 dark:text-[#b88aa1] leading-relaxed">
                  Run browser unit tests on coding problems to catch edge cases before submitting.
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-mono font-semibold text-teal-400 dark:text-pink-400">03. Benchmark</span>
                <p className="text-xs font-semibold text-white">Rubric & Diff Review</p>
                <p className="text-xs text-slate-400 dark:text-[#b88aa1] leading-relaxed">
                  Compare your code side-by-side with reference implementations and track domain mastery.
                </p>
              </div>
            </div>
          </div>

          {/* Core Capabilities */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-white/5 border border-white/10 dark:border-[#3b1d2c] rounded-xl space-y-1.5">
              <Terminal className="w-4 h-4 text-indigo-400 dark:text-pink-400" />
              <h4 className="text-xs font-semibold text-white">Multi-Language IDE</h4>
              <p className="text-[11px] text-slate-400 dark:text-[#b88aa1] leading-relaxed">
                TypeScript, JavaScript, Python, SQL, and Java support.
              </p>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 dark:border-[#3b1d2c] rounded-xl space-y-1.5">
              <Cpu className="w-4 h-4 text-teal-400 dark:text-pink-300" />
              <h4 className="text-xs font-semibold text-white">AI Rubric Review</h4>
              <p className="text-[11px] text-slate-400 dark:text-[#b88aa1] leading-relaxed">
                Line-level suggestions, strengths, and missing edge cases.
              </p>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 dark:border-[#3b1d2c] rounded-xl space-y-1.5">
              <TrendingUp className="w-4 h-4 text-amber-400 dark:text-rose-300" />
              <h4 className="text-xs font-semibold text-white">Skill Matrix</h4>
              <p className="text-[11px] text-slate-400 dark:text-[#b88aa1] leading-relaxed">
                Pinpoint strong categories and focus areas over time.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 dark:text-[#b88aa1] flex items-center justify-between border-t border-slate-800 dark:border-[#3b1d2c] pt-4">
            <span>8 Interview Domains · Coding & Conceptual Tracks</span>
            <span className="hidden sm:inline">Automated Assessment Engine</span>
          </div>
        </div>

        {/* RIGHT SIDE: Auth Card */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div
            className="bg-white dark:bg-[#1b0d14] rounded-2xl border border-slate-200 dark:border-[#3b1d2c] shadow-sm p-6 md:p-8 space-y-6"
            id="beginning_auth_box"
          >
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-[#fdf2f8] tracking-tight font-display">
                {isRegistering ? 'Create Candidate Account' : 'Sign In to MockMind'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#b88aa1]">
                {isRegistering
                  ? 'Create an account to save your attempts, scores, and skill analytics.'
                  : 'Sign in to access the practice pool, run unit tests, and review past evaluations.'}
              </p>
            </div>

            {formError && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-500/30 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-500/30 rounded-xl flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isRegistering && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-[#26131d] rounded-xl border border-slate-200 dark:border-[#3b1d2c]">
                    <button
                      type="button"
                      onClick={() => {
                        setRole('candidate');
                        setFormError(null);
                        setFormSuccess(null);
                      }}
                      className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        role === 'candidate'
                          ? 'bg-white dark:bg-[#1b0d14] text-indigo-700 dark:text-pink-300 shadow-xs'
                          : 'text-slate-500 dark:text-[#b88aa1] hover:text-slate-800 dark:hover:text-[#fdf2f8]'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      Candidate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRole('admin');
                        setFormError(null);
                        setFormSuccess(null);
                      }}
                      className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        role === 'admin'
                          ? 'bg-indigo-600 dark:bg-pink-600 text-white shadow-xs'
                          : 'text-slate-500 dark:text-[#b88aa1] hover:text-slate-800 dark:hover:text-[#fdf2f8]'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Platform Admin
                    </button>
                  </div>
                </div>
              )}

              {isRegistering && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 dark:text-[#b88aa1]">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c] focus:bg-white dark:focus:bg-[#160910] focus:border-indigo-500 dark:focus:border-pink-400 rounded-lg outline-none transition-all font-medium text-slate-900 dark:text-[#fdf2f8] placeholder:text-slate-400 dark:placeholder:text-[#8f5d76]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 dark:text-[#b88aa1]">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c] focus:bg-white dark:focus:bg-[#160910] focus:border-indigo-500 dark:focus:border-pink-400 rounded-lg outline-none transition-all font-medium text-slate-900 dark:text-[#fdf2f8] placeholder:text-slate-400 dark:placeholder:text-[#8f5d76]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 dark:text-[#b88aa1]">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c] focus:bg-white dark:focus:bg-[#160910] focus:border-indigo-500 dark:focus:border-pink-400 rounded-lg outline-none transition-all font-medium text-slate-900 dark:text-[#fdf2f8] placeholder:text-slate-400 dark:placeholder:text-[#8f5d76]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-500 active:scale-[0.99] text-xs font-semibold text-white rounded-xl shadow-sm cursor-pointer transition-all disabled:opacity-50 select-none flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : isRegistering ? (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Candidate Account
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    Sign In to Workspace
                  </>
                )}
              </button>
            </form>

            <div className="border-t border-slate-100 dark:border-[#3b1d2c] pt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setFormError(null);
                  setFormSuccess(null);
                }}
                className="text-xs text-indigo-600 dark:text-pink-300 hover:underline font-semibold outline-none cursor-pointer"
              >
                {isRegistering
                  ? 'Already have an account? Sign in'
                  : 'New to MockMind? Create a candidate account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

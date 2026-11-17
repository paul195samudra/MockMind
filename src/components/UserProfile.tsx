import React, { useState } from 'react';
import { User, Submission, QuestionCategory, UserRole } from '../types';
import { Logo } from './Logo';
import { getAuthHeaders } from '../utils/auth';
import {
  User as UserIcon,
  Mail,
  Lock,
  Check,
  TrendingUp,
  Zap,
  AlertTriangle,
  LogOut,
  Calendar,
  GraduationCap,
  Award,
  ChevronRight,
  Shield,
  PlusCircle,
  Terminal,
  Search,
  BarChart3,
  Users,
  MessageSquare,
  Activity
} from 'lucide-react';

interface UserProfileProps {
  currentUser: User | null;
  submissions: Submission[];
  onLogin: (email: string, password: string, role?: UserRole) => Promise<{ ok: boolean; error?: string }>;
  onRegister: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onLogout: () => void;
  onTabChange?: (tab: 'browse' | 'history' | 'create' | 'profile' | 'feedback' | 'admin') => void;
  onPracticeCategory?: (category: QuestionCategory) => void;
  onStartWeakAreasMock?: (categories: QuestionCategory[]) => void;
}

export function UserProfile({
  currentUser,
  submissions,
  onLogin,
  onRegister,
  onLogout,
  onTabChange,
  onPracticeCategory,
  onStartWeakAreasMock
}: UserProfileProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const [adminStats, setAdminStats] = useState<{
    users: User[];
    submissions: Submission[];
    feedbacks: any[];
    loading: boolean;
    error: string | null;
  }>({
    users: [],
    submissions: [],
    feedbacks: [],
    loading: false,
    error: null
  });

  const [candidateSearch, setCandidateSearch] = useState('');

  React.useEffect(() => {
    if (isAdmin && currentUser) {
      setAdminStats((prev) => ({ ...prev, loading: true, error: null }));
      const headers = getAuthHeaders();

      Promise.all([
        fetch('/api/admin/users', { headers }).then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        }),
        fetch('/api/admin/submissions', { headers }).then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        }),
        fetch('/api/admin/feedbacks', { headers }).then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
      ])
        .then(([usersArr, submissionsArr, feedbacksArr]) => {
          setAdminStats({
            users: Array.isArray(usersArr) ? usersArr : [],
            submissions: Array.isArray(submissionsArr) ? submissionsArr : [],
            feedbacks: Array.isArray(feedbacksArr) ? feedbacksArr : [],
            loading: false,
            error: null
          });
        })
        .catch(() => {
          setAdminStats((prev) => ({
            ...prev,
            loading: false,
            error: 'Unable to load platform analytics.'
          }));
        });
    }
  }, [isAdmin, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please enter both your email address and password.');
      return;
    }

    if (isRegistering && !name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const res = await onRegister(name.trim(), email.trim(), password);
        if (!res.ok) {
          setFormError(res.error || 'Email is already registered. Try logging in.');
        } else {
          setName('');
          setEmail('');
          setPassword('');
        }
      } else {
        const res = await onLogin(email.trim(), password);
        if (!res.ok) {
          setFormError(res.error || 'Invalid email or password.');
        } else {
          setEmail('');
          setPassword('');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleForm = () => {
    setIsRegistering(!isRegistering);
    setFormError(null);
    setName('');
    setEmail('');
    setPassword('');
  };

  if (!currentUser) {
    return (
      <div
        className="max-w-md mx-auto my-8 bg-white dark:bg-[#1b0d14] rounded-2xl border border-slate-200 dark:border-[#3b1d2c] shadow-sm overflow-hidden"
        id="auth_portal_card"
      >
        <div className="bg-slate-900 dark:bg-[#160910] p-8 text-center border-b border-slate-800 dark:border-[#3b1d2c]">
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-white/10 dark:bg-pink-500/10 rounded-2xl flex items-center justify-center mb-3 border border-white/15 dark:border-pink-400/20">
              <Logo className="w-10 h-10" sparkle={false} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight font-display">MockMind</h1>
            <p className="text-xs text-teal-400 dark:text-pink-300 font-medium mt-1">
              Train Your Mind. Ace Your Interview.
            </p>
            <h2 className="text-sm font-semibold text-slate-200 mt-3">
              {isRegistering ? 'Create Candidate Account' : 'Sign In'}
            </h2>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-500/30 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {isRegistering && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 dark:text-[#b88aa1]">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] focus:border-indigo-500 dark:focus:border-pink-400 rounded-lg outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Email Address</label>
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
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] focus:border-indigo-500 dark:focus:border-pink-400 rounded-lg outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 dark:text-[#b88aa1]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] focus:border-indigo-500 dark:focus:border-pink-400 rounded-lg outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-500 text-xs font-semibold text-white rounded-xl cursor-pointer transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isRegistering ? (
                'Register Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-[#3b1d2c] text-center">
            <button
              type="button"
              onClick={handleToggleForm}
              className="text-xs text-indigo-600 dark:text-pink-300 hover:underline font-semibold cursor-pointer"
            >
              {isRegistering ? 'Already have an account? Sign in' : 'New candidate? Create an account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chronological sorting for performance timeline
  const chronologicalSubs = [...submissions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const categories: QuestionCategory[] = [
    'Algorithms',
    'Data Structures',
    'System Design',
    'Behavioral',
    'Databases',
    'Pharmacy & Healthcare',
    'Information & Technology',
    'Banking & Finance'
  ];

  const skillProfile = categories.map((cat) => {
    const catSubs = submissions.filter((s) => s.category === cat);
    const count = catSubs.length;
    const avgScore =
      count > 0 ? Math.round(catSubs.reduce((acc, curr) => acc + curr.evaluation.score, 0) / count) : 0;

    const isStrong = count > 0 && avgScore >= 75;
    const label = count === 0 ? 'Unpracticed' : isStrong ? 'Strong Area' : 'Needs Focus';

    return {
      category: cat,
      count,
      avgScore,
      isStrong,
      label,
      noSubmissions: count === 0
    };
  });

  const strongAreas = skillProfile.filter((s) => s.isStrong);
  const weakAreas = skillProfile.filter((s) => !s.isStrong);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6" id="candidate_profile_workspace">
      {/* Header Profile Card */}
      <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-600 dark:bg-pink-600 flex items-center justify-center text-lg font-bold font-display text-white select-none shrink-0">
            {currentUser.name
              ? currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .substring(0, 2)
              : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold font-display text-slate-900 dark:text-[#fdf2f8]">
                {currentUser.name}
              </h2>
              <span className="text-xs font-medium text-indigo-600 dark:text-pink-300 flex items-center gap-1">
                {isAdmin && <Shield className="w-3.5 h-3.5" />}
                {isAdmin ? 'Platform Administrator' : 'Candidate'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-0.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {currentUser.email}
            </p>
            <p className="text-xs text-slate-400 dark:text-[#b88aa1] mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Member since {formatDate(currentUser.registeredAt)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 border border-slate-200 dark:border-[#3b1d2c] hover:border-rose-300 dark:hover:border-rose-500/40 bg-white dark:bg-[#26131d] hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-300 px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-[#e7c6d7] transition-colors cursor-pointer self-start md:self-auto"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {!isAdmin ? (
        <>
          {/* Performance Timeline */}
          <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-[#3b1d2c] pb-3">
              <div>
                <h3 className="text-sm font-bold font-display text-slate-900 dark:text-[#fdf2f8] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-pink-400" />
                  Performance Timeline
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-0.5">
                  Chronological score progression across practice attempts
                </p>
              </div>
              <span className="text-xs font-semibold font-mono tabular-nums text-slate-600 dark:text-[#e7c6d7] bg-slate-50 dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c] px-2.5 py-1 rounded-md">
                {submissions.length} Attempts
              </span>
            </div>

            {chronologicalSubs.length < 2 ? (
              <div className="bg-slate-50 dark:bg-[#160910] rounded-xl p-8 border border-dashed border-slate-200 dark:border-[#3b1d2c] text-center max-w-lg mx-auto my-4">
                <Award className="w-9 h-9 text-slate-300 dark:text-[#b88aa1] mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-[#fdf2f8]">
                  Complete at least two evaluations
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-1 leading-relaxed">
                  Once you have two or more scored attempts, your score progression chart will render here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-full relative py-2">
                  <div className="w-full h-44 overflow-visible">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 600 160" preserveAspectRatio="none">
                      <line x1="0" y1="140" x2="600" y2="140" stroke="currentColor" className="text-slate-200 dark:text-[#3b1d2c]" strokeWidth="1" />
                      <line x1="0" y1="80" x2="600" y2="80" stroke="currentColor" className="text-slate-100 dark:text-[#2a1520]" strokeWidth="1" />
                      <line x1="0" y1="20" x2="600" y2="20" stroke="currentColor" className="text-slate-100 dark:text-[#2a1520]" strokeWidth="1" />

                      <text x="5" y="25" fill="currentColor" className="text-[9px] font-mono text-slate-400 dark:text-[#b88aa1] select-none">100%</text>
                      <text x="5" y="85" fill="currentColor" className="text-[9px] font-mono text-slate-400 dark:text-[#b88aa1] select-none">50%</text>
                      <text x="5" y="145" fill="currentColor" className="text-[9px] font-mono text-slate-400 dark:text-[#b88aa1] select-none">0%</text>

                      {(() => {
                        const width = 600;
                        const height = 160;
                        const paddingLeft = 35;
                        const paddingRight = 15;
                        const paddingTop = 20;
                        const paddingBottom = 20;

                        const chartWidth = width - paddingLeft - paddingRight;
                        const chartHeight = height - paddingTop - paddingBottom;

                        const points = chronologicalSubs.map((sub, idx) => {
                          const score = sub.evaluation.score;
                          const x = paddingLeft + (idx / (chronologicalSubs.length - 1)) * chartWidth;
                          const y = height - paddingBottom - (score / 100) * chartHeight;
                          return { x, y, score, title: sub.questionTitle };
                        });

                        const pathD = points.reduce((acc, pt, idx) => {
                          return acc + (idx === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`);
                        }, '');

                        const areaD = `${pathD} L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`;

                        return (
                          <>
                            <defs>
                              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                                <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            <path d={areaD} fill="url(#scoreGrad)" className="text-indigo-500 dark:text-pink-400" />
                            <path d={pathD} fill="none" stroke="currentColor" className="text-indigo-600 dark:text-pink-400" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

                            {points.map((pt, idx) => (
                              <g key={idx} className="cursor-pointer group/node">
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="4.5"
                                  className="fill-white dark:fill-[#1b0d14] stroke-indigo-600 dark:stroke-pink-400 stroke-[2] transition-all duration-150 group-hover/node:r-[6]"
                                />
                                <foreignObject
                                  x={Math.min(Math.max(pt.x - 55, 10), 480)}
                                  y={Math.max(pt.y - 34, 4)}
                                  width="110"
                                  height="26"
                                  className="pointer-events-none opacity-0 group-hover/node:opacity-100 transition-opacity duration-150"
                                >
                                  <div className="bg-slate-900 dark:bg-[#26131d] text-[10px] text-white font-semibold rounded-md px-1.5 py-0.5 text-center shadow-md border border-slate-700 dark:border-[#3b1d2c] leading-tight">
                                    <span className="block text-indigo-300 dark:text-pink-300 font-bold tabular-nums">{pt.score}%</span>
                                    <span className="block truncate font-normal max-w-[95px] text-[8px] opacity-80">{pt.title}</span>
                                  </div>
                                </foreignObject>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-medium text-slate-400 dark:text-[#b88aa1] font-mono pl-[35px] mt-1 pr-1.5">
                    <span>{new Date(chronologicalSubs[0].timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} (First)</span>
                    <span>{new Date(chronologicalSubs[chronologicalSubs.length - 1].timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} (Latest)</span>
                  </div>
                </div>

                <div className="mt-4 p-3.5 rounded-xl bg-indigo-50/70 dark:bg-[#26131d] border border-indigo-200/70 dark:border-[#3b1d2c] flex items-center gap-2 text-xs">
                  <Check className="w-4 h-4 text-indigo-600 dark:text-pink-400 shrink-0" />
                  <span className="text-slate-700 dark:text-[#e7c6d7]">
                    Latest attempt on <strong className="text-slate-900 dark:text-[#fdf2f8]">{chronologicalSubs[chronologicalSubs.length - 1].questionTitle}</strong> scored{' '}
                    <strong className="text-indigo-700 dark:text-pink-300 tabular-nums">{chronologicalSubs[chronologicalSubs.length - 1].evaluation.score}%</strong>.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Topic Skill Matrix */}
          <h3 className="text-sm font-bold font-display text-slate-900 dark:text-[#fdf2f8] flex items-center gap-2 pt-2">
            <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-pink-400" />
            Domain Skill Matrix
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="skills_grid_breakdown">
            {skillProfile.map((item) => (
              <div
                key={item.category}
                className="rounded-xl border border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#1b0d14] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs mb-1">
                    <span className="text-slate-400 dark:text-[#b88aa1]">Domain</span>
                    <span
                      className={`font-semibold ${
                        item.isStrong
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : item.noSubmissions
                          ? 'text-slate-400 dark:text-[#b88aa1]'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold font-display text-slate-900 dark:text-[#fdf2f8] truncate" title={item.category}>
                    {item.category}
                  </h4>
                </div>

                <div className="mt-4">
                  {item.noSubmissions ? (
                    <div className="space-y-1.5">
                      <div className="text-xs text-slate-400 dark:text-[#b88aa1]">No attempts recorded</div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-[#26131d] rounded-full" />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-[#b88aa1]">Mean Score</span>
                        <span
                          className={`font-bold font-mono tabular-nums ${
                            item.isStrong ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {item.avgScore}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-[#26131d] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.isStrong ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${item.avgScore}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-[#b88aa1] tabular-nums">
                        {item.count} {item.count === 1 ? 'attempt' : 'attempts'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Strong vs Focus Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
            <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                Strong Areas (75%+ Average)
              </h4>

              {strongAreas.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-[#b88aa1] p-4 bg-slate-50 dark:bg-[#160910] rounded-lg">
                  Score 75% or higher in any category to establish a strong area.
                </p>
              ) : (
                <div className="space-y-2">
                  {strongAreas.map((area) => (
                    <div
                      key={area.category}
                      className="flex items-center justify-between text-xs p-2.5 bg-emerald-50/40 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-500/20 rounded-lg"
                    >
                      <span className="font-semibold text-slate-800 dark:text-[#fdf2f8]">{area.category}</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                        {area.avgScore}% avg
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-5">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Focus Targets
                </h4>
                {weakAreas.length > 0 && onStartWeakAreasMock && (
                  <button
                    type="button"
                    onClick={() => onStartWeakAreasMock(weakAreas.map((w) => w.category))}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 dark:bg-pink-600 dark:hover:bg-pink-500 text-white transition-colors cursor-pointer"
                  >
                    Start Weak-Areas Mock
                  </button>
                )}
              </div>

              {weakAreas.length === 0 ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-300 rounded-lg font-medium flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  Every domain meets the 75%+ mastery threshold.
                </div>
              ) : (
                <div className="space-y-2">
                  {weakAreas.map((area) => (
                    <div
                      key={area.category}
                      className="flex items-center justify-between gap-3 text-xs p-2.5 bg-rose-50/40 dark:bg-rose-950/25 border border-rose-200/70 dark:border-rose-500/20 rounded-lg"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800 dark:text-[#fdf2f8] block truncate">{area.category}</span>
                        <span className="block text-[11px] text-slate-500 dark:text-[#b88aa1]">
                          {area.noSubmissions ? 'Not yet practiced' : `${area.avgScore}% avg · Below 75% target`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-rose-700 dark:text-rose-400 font-mono tabular-nums text-[11px]">
                          {area.noSubmissions ? 'New' : `${area.avgScore}%`}
                        </span>
                        {onPracticeCategory && (
                          <button
                            type="button"
                            onClick={() => onPracticeCategory(area.category)}
                            className="px-2.5 py-1 rounded-md bg-white dark:bg-[#26131d] border border-rose-200 dark:border-pink-400/30 text-[11px] font-semibold text-rose-700 dark:text-pink-300 hover:bg-rose-50 dark:hover:bg-[#331a27] transition-colors cursor-pointer"
                          >
                            Practice
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6" id="admin_workspace_analytics">
          <div className="border-b border-slate-200 dark:border-[#3b1d2c] pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#fdf2f8] flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-pink-400" />
              Administrator Overview
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-0.5">
              Platform-wide candidate metrics, activity summaries, and directory lookup.
            </p>
          </div>

          {adminStats.loading ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-[#b88aa1] bg-white dark:bg-[#1b0d14] border border-slate-200 dark:border-[#3b1d2c] rounded-xl flex flex-col items-center gap-3">
              <span className="inline-block w-6 h-6 border-2 border-indigo-600 dark:border-pink-400 border-t-transparent rounded-full animate-spin" />
              <p className="font-mono">Loading platform metrics...</p>
            </div>
          ) : adminStats.error ? (
            <div className="p-4 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-500/30 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{adminStats.error}</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="admin_summary_cards">
                <div className="p-4 bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-[#b88aa1]">Registered Users</span>
                    <Users className="w-4 h-4 text-indigo-500 dark:text-pink-400" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[#fdf2f8] mt-2 font-display">
                    {adminStats.users.length}
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-[#b88aa1]">Evaluations</span>
                    <Activity className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[#fdf2f8] mt-2 font-display">
                    {adminStats.submissions.length}
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-[#b88aa1]">Platform Score Avg</span>
                    <BarChart3 className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[#fdf2f8] mt-2 font-display">
                    {adminStats.submissions.length > 0
                      ? Math.round(
                          adminStats.submissions.reduce((acc, curr) => acc + (curr.evaluation?.score || 0), 0) /
                            adminStats.submissions.length
                        )
                      : 0}
                    %
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-[#b88aa1]">Feedback Reports</span>
                    <MessageSquare className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-[#fdf2f8] mt-2 font-display">
                    {adminStats.feedbacks.length}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                <div className="lg:col-span-1 space-y-3">
                  <h4 className="text-xs font-bold text-slate-600 dark:text-[#e7c6d7] uppercase tracking-wider">
                    Quick Actions
                  </h4>
                  <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-5 space-y-3">
                    <button
                      type="button"
                      onClick={() => onTabChange?.('create')}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-indigo-200 dark:border-[#3b1d2c] bg-indigo-50/50 dark:bg-[#26131d] hover:bg-indigo-50 dark:hover:bg-[#331a27] text-indigo-800 dark:text-pink-200 text-xs font-semibold transition-colors text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <PlusCircle className="w-4 h-4 text-indigo-600 dark:text-pink-400" />
                        Author Custom Question
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onTabChange?.('admin')}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-[#3b1d2c] bg-slate-50 dark:bg-[#26131d] hover:bg-slate-100 dark:hover:bg-[#331a27] text-slate-800 dark:text-[#fdf2f8] text-xs font-semibold transition-colors text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-slate-500 dark:text-[#b88aa1]" />
                        Open Admin Console
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h4 className="text-xs font-bold text-slate-600 dark:text-[#e7c6d7] uppercase tracking-wider">
                      Candidates Directory
                    </h4>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#b88aa1] absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="Search candidates..."
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                        className="bg-white dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-[#fdf2f8] outline-none focus:border-indigo-500 dark:focus:border-pink-400 w-full sm:w-52"
                      />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-[#160910] border-b border-slate-200 dark:border-[#3b1d2c] text-[11px] font-semibold text-slate-500 dark:text-[#b88aa1]">
                            <th className="px-4 py-3">Candidate</th>
                            <th className="px-4 py-3 text-right">Attempts</th>
                            <th className="px-4 py-3 text-right">Avg Score</th>
                            <th className="px-4 py-3">Standing</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#3b1d2c] text-xs">
                          {adminStats.users
                            .filter((u) => {
                              const query = candidateSearch.toLowerCase().trim();
                              if (!query) return true;
                              return (
                                (u.name || '').toLowerCase().includes(query) ||
                                (u.email || '').toLowerCase().includes(query)
                              );
                            })
                            .map((u) => {
                              const userSubs = adminStats.submissions.filter((s) => s.userId === u.id);
                              const attempts = userSubs.length;
                              const avgScoreValue =
                                attempts > 0
                                  ? Math.round(
                                      userSubs.reduce((acc, curr) => acc + (curr.evaluation?.score || 0), 0) / attempts
                                    )
                                  : 0;

                              return (
                                <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-[#26131d]/60 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-slate-900 dark:text-[#fdf2f8]">{u.name}</div>
                                    <div className="text-[11px] text-slate-500 dark:text-[#b88aa1] font-mono">{u.email}</div>
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-[#e7c6d7]">
                                    {attempts}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                                    {attempts > 0 ? `${avgScoreValue}%` : '—'}
                                  </td>
                                  <td className="px-4 py-3 text-xs font-medium">
                                    {attempts === 0 ? (
                                      <span className="text-slate-400 dark:text-[#b88aa1]">No attempts</span>
                                    ) : avgScoreValue >= 85 ? (
                                      <span className="text-emerald-600 dark:text-emerald-400">Strong</span>
                                    ) : avgScoreValue >= 70 ? (
                                      <span className="text-indigo-600 dark:text-pink-300">Proficient</span>
                                    ) : (
                                      <span className="text-rose-600 dark:text-rose-400">Developing</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

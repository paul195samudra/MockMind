import React, { useState, useEffect, useCallback } from 'react';
import { Question, QuestionCategory, Submission, User, UserRole, MockExamConfig } from './types';
import { StatsBanner } from './components/StatsBanner';
import { QuestionCard } from './components/QuestionCard';
import { PracticeDesk } from './components/PracticeDesk';
import { EvaluationStation } from './components/EvaluationStation';
import { PracticeHistory } from './components/PracticeHistory';
import { CustomQuestionBuilder } from './components/CustomQuestionBuilder';
import { UserProfile } from './components/UserProfile';
import { Logo } from './components/Logo';
import { FeedbackSection } from './components/FeedbackSection';
import { AdminPanel } from './components/AdminPanel';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer, ToastItem } from './components/ToastContainer';
import { LandingPage } from './components/LandingPage';
import { MockInterviewModal } from './components/MockInterviewModal';
import { MockInterviewSession } from './components/MockInterviewSession';
import {
  clearAuthSession,
  getAuthHeaders,
  getStoredToken,
  getStoredUser,
  saveAuthSession
} from './utils/auth';
import {
  BookOpen,
  History,
  PlusCircle,
  RefreshCw,
  Library,
  AlertCircle,
  User as UserIcon,
  MessageSquare,
  Shield,
  Sun,
  Moon,
  Search,
  Timer
} from 'lucide-react';

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<Submission | null>(null);
  const [retryDraftOverride, setRetryDraftOverride] = useState<{ answerText: string; codeLanguage?: string } | null>(null);

  // Timed Mock Interview session state
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockPresetTrack, setMockPresetTrack] = useState<'fullstack' | 'algorithms' | 'healthcare' | 'finance' | 'weak'>('fullstack');
  const [activeMockConfig, setActiveMockConfig] = useState<MockExamConfig | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const token = getStoredToken();
    return token ? getStoredUser() : null;
  });

  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'browse' | 'history' | 'create' | 'profile' | 'feedback' | 'admin'>('browse');

  // Question Pool filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unsolved' | 'solved' | 'saved'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'default' | 'difficulty' | 'score'>('default');

  // Async states
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Toast notifications & Delete confirmation modal
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const addToast = useCallback((type: ToastItem['type'], message: string) => {
    const id = Math.random().toString(36).slice(2, 10);
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Theme state: light (day) or dark (night)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Validate stored session token on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      if (currentUser) {
        clearAuthSession();
        setCurrentUser(null);
      }
      return;
    }

    fetch('/api/me', { headers: getAuthHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
          saveAuthSession(data.user, token);
        }
      })
      .catch(() => {
        clearAuthSession();
        setCurrentUser(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchQuestions();
    if (currentUser && getStoredToken()) {
      fetchHistory();
      fetchBookmarks();
    } else {
      setSubmissions([]);
      setBookmarkedIds([]);
    }
  }, [currentUser]);

  const fetchBookmarks = async () => {
    if (!getStoredToken()) return;
    try {
      const res = await fetch('/api/bookmarks', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.bookmarks)) {
          setBookmarkedIds(data.bookmarks);
        }
      }
    } catch {
      // ignore bookmark fetch failure
    }
  };

  const handleToggleBookmark = async (questionId: string) => {
    if (!getStoredToken()) return;
    try {
      const res = await fetch(`/api/bookmarks/${questionId}/toggle`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.bookmarks)) {
          setBookmarkedIds(data.bookmarks);
        }
        addToast('info', data.bookmarked ? 'Saved to bookmarks.' : 'Removed from bookmarks.');
      }
    } catch {
      addToast('error', 'Could not update bookmark.');
    }
  };

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    setErrorText(null);
    try {
      const res = await fetch('/api/questions');
      if (!res.ok) throw new Error('Could not retrieve interview challenges.');
      const data = await res.json();
      setQuestions(data);
    } catch (err: any) {
      setErrorText(err.message || 'Failed connecting to server.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const fetchHistory = async () => {
    if (!getStoredToken()) return;
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/submissions', { headers: getAuthHeaders() });
      if (res.status === 401) {
        clearAuthSession();
        setCurrentUser(null);
        setSubmissions([]);
        return;
      }
      if (!res.ok) throw new Error('Could not retrieve attempt history.');
      const data = await res.json();
      setSubmissions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setActiveSubmission(null);
    setRetryDraftOverride(null);
  };

  const handleBackToPool = () => {
    setSelectedQuestion(null);
    setActiveSubmission(null);
    setRetryDraftOverride(null);
    setActiveMockConfig(null);
    if (currentUser) fetchHistory();
  };

  const handleSubmitAnswer = async (
    answerText: string,
    language?: string,
    durationSeconds?: number,
    hintsUsed?: number
  ) => {
    if (!selectedQuestion) return;
    setSubmittingAnswer(true);
    setErrorText(null);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          questionId: selectedQuestion.id,
          answerText,
          codeLanguage: language,
          durationSeconds,
          hintsUsed
        })
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed running evaluation.');
      }

      const data = await res.json();
      if (data.success && data.submission) {
        setActiveSubmission(data.submission);
        setSubmissions((prev) => [data.submission, ...prev]);
        setRetryDraftOverride(null);
        try {
          localStorage.removeItem(`mockmind_draft_${selectedQuestion.id}`);
        } catch {
          // ignore
        }
        addToast('success', `Evaluated: scored ${data.submission.evaluation.score}%`);
      } else {
        throw new Error('Evaluation service returned an unexpected response.');
      }
    } catch (err: any) {
      setErrorText(err.message || 'Evaluation request failed.');
      addToast('error', err.message || 'Evaluation request failed.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleSaveQuestion = async (newQuestionData: Partial<Question>) => {
    setSavingQuestion(true);
    setErrorText(null);
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(newQuestionData)
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Could not save custom question.');
      }
      const saved = await res.json();
      setQuestions((prev) => [...prev, saved]);
      setActiveTab('browse');
      addToast('success', `"${saved.title}" added to Question Pool.`);
    } catch (err: any) {
      setErrorText(err.message || 'Failed saving custom challenge.');
      addToast('error', err.message || 'Failed saving custom challenge.');
    } finally {
      setSavingQuestion(false);
    }
  };

  const confirmDeleteSubmission = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== id));
        addToast('success', 'Practice record deleted.');
      } else {
        addToast('error', 'Unable to delete practice record.');
      }
    } catch {
      addToast('error', 'Network error while deleting record.');
    }
  };

  const handlePostFeedback = async (payload: {
    userName?: string;
    userEmail?: string;
    rating: number;
    category: 'Bug Report' | 'Feature Request' | 'Question Content Feedback' | 'General Praise' | 'Other';
    message: string;
  }): Promise<boolean> => {
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        addToast('success', 'Feedback submitted. Thank you!');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleLogin = async (
    email: string,
    passwordPlain: string,
    role?: UserRole
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: passwordPlain, role })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || 'Invalid email or password.' };
      }
      if (data.success && data.user && data.token) {
        saveAuthSession(data.user, data.token);
        setCurrentUser(data.user);
        return { ok: true };
      }
      return { ok: false, error: 'Authentication response missing session token.' };
    } catch {
      return { ok: false, error: 'Unable to connect to authentication server.' };
    }
  };

  const handleRegister = async (
    name: string,
    email: string,
    passwordPlain: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: passwordPlain })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || 'Unable to create account.' };
      }
      if (data.success && data.user && data.token) {
        saveAuthSession(data.user, data.token);
        setCurrentUser(data.user);
        addToast('success', 'Welcome to MockMind!');
        return { ok: true };
      }
      return { ok: false, error: 'Registration failed.' };
    } catch {
      return { ok: false, error: 'Unable to connect to registration server.' };
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setSubmissions([]);
    setBookmarkedIds([]);
    setSelectedQuestion(null);
    setActiveSubmission(null);
    setRetryDraftOverride(null);
    setActiveMockConfig(null);
    setActiveTab('browse');
    addToast('info', 'Signed out.');
  };

  const getBestScore = (qId: string) => {
    const qSubs = submissions.filter((s) => s.questionId === qId);
    if (qSubs.length === 0) return undefined;
    return Math.max(...qSubs.map((s) => s.evaluation.score));
  };

  const isSolved = (qId: string) => submissions.some((s) => s.questionId === qId);

  const solvedUniqueCount = questions.filter((q) => isSolved(q.id)).length;
  const progressPercent = questions.length > 0 ? Math.round((solvedUniqueCount / questions.length) * 100) : 0;

  const difficultyWeight: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };

  const filteredQuestions = questions
    .filter((q) => {
      const matchesCat = selectedCategory === 'All' || q.category === selectedCategory;
      const matchesDiff = selectedDifficulty === 'All' || q.difficulty === selectedDifficulty;
      const solved = isSolved(q.id);
      const bookmarked = bookmarkedIds.includes(q.id);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'solved' ? solved : statusFilter === 'unsolved' ? !solved : bookmarked);
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        q.title.toLowerCase().includes(query) ||
        q.description.toLowerCase().includes(query) ||
        q.category.toLowerCase().includes(query) ||
        (q.keywords || []).some((k) => k.toLowerCase().includes(query));
      return matchesCat && matchesDiff && matchesStatus && matchesQuery;
    })
    .sort((a, b) => {
      if (sortBy === 'difficulty') {
        return (difficultyWeight[a.difficulty] || 0) - (difficultyWeight[b.difficulty] || 0);
      }
      if (sortBy === 'score') {
        return (getBestScore(b.id) ?? -1) - (getBestScore(a.id) ?? -1);
      }
      return 0;
    });

  const categoriesList = [
    'All',
    'Algorithms',
    'Data Structures',
    'System Design',
    'Behavioral',
    'Databases',
    'Pharmacy & Healthcare',
    'Information & Technology',
    'Banking & Finance'
  ];

  return (
    <div
      className="bg-slate-50 dark:bg-[#12080d] text-slate-900 dark:text-[#fdf2f8] font-sans min-h-screen flex flex-col justify-between transition-colors"
      id="app_root_viewport"
    >
      {/* Top Navigation */}
      <nav
        id="app_top_nav"
        className="h-16 border-b border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#1b0d14] flex items-center justify-between px-6 md:px-8 flex-shrink-0 relative z-40"
      >
        <div
          className="flex items-center gap-3 cursor-pointer group min-w-0"
          onClick={() => {
            handleBackToPool();
            setActiveTab('browse');
          }}
        >
          <Logo className="w-9 h-9 shrink-0 transition-transform duration-200 group-hover:scale-105" />
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-[#fdf2f8] font-display whitespace-nowrap">
            MockMind
          </span>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-5 shrink-0">
          {currentUser && (
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#b88aa1]">
                <span>Practice Progress</span>
                <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-[#fdf2f8]">
                  {solvedUniqueCount} / {questions.length}
                </span>
              </div>
              <div className="w-40 h-1.5 bg-slate-100 dark:bg-[#26131d] rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 dark:bg-pink-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 border-l pl-5 border-slate-200 dark:border-[#3b1d2c]">
            {/* Single Sun/Moon Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-lg border border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#26131d] text-slate-600 dark:text-pink-300 hover:border-indigo-300 dark:hover:border-pink-400 transition-colors cursor-pointer flex items-center justify-center"
              title={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
              aria-label={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500 fill-amber-100" />
              ) : (
                <Moon className="w-4 h-4 text-pink-300 fill-pink-950" />
              )}
            </button>

            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  handleBackToPool();
                  setActiveTab('profile');
                }}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-[#3b1d2c] bg-indigo-50 dark:bg-[#26131d] hover:bg-indigo-100/70 dark:hover:bg-[#331a27] text-indigo-800 dark:text-[#fdf2f8] transition-colors cursor-pointer whitespace-nowrap"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-600 dark:bg-pink-600 text-white flex items-center justify-center font-bold text-[10px] font-mono">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                </div>
                <span className="max-w-[90px] truncate">{currentUser.name.split(' ')[0]}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const authBox = document.getElementById('beginning_auth_box');
                  if (authBox) {
                    authBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const emailInput = authBox.querySelector('input[type="email"]') as HTMLInputElement | null;
                    if (emailInput) emailInput.focus();
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#26131d] hover:border-indigo-300 dark:hover:border-pink-400 text-slate-700 dark:text-[#fdf2f8] transition-colors cursor-pointer whitespace-nowrap"
              >
                <UserIcon className="w-3.5 h-3.5 text-slate-400 dark:text-pink-300" />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-grow p-6 max-w-7xl mx-auto w-full" id="root_main_arena">
        {!currentUser ? (
          <LandingPage onLogin={handleLogin} onRegister={handleRegister} />
        ) : (
          <>
            {errorText && (
              <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-800 dark:text-rose-200">Notice</p>
                  <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed mt-0.5">{errorText}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorText(null)}
                  className="ml-auto text-xs font-semibold text-rose-500 hover:text-rose-700 dark:text-rose-300 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {activeMockConfig ? (
              <MockInterviewSession
                config={activeMockConfig}
                bookmarkedIds={bookmarkedIds}
                onToggleBookmark={handleToggleBookmark}
                onExit={() => {
                  setActiveMockConfig(null);
                  fetchHistory();
                }}
                onSubmissionsSaved={(newSubs) => {
                  setSubmissions((prev) => [...newSubs, ...prev]);
                  addToast('success', `Graded ${newSubs.length} mock interview responses!`);
                }}
                onInspectSubmission={(sub) => {
                  const q =
                    questions.find((item) => item.id === sub.questionId) ||
                    ({
                      id: sub.questionId,
                      title: sub.questionTitle,
                      category: sub.category,
                      type: sub.type,
                      difficulty: 'Medium',
                      description: 'Full challenge details are recorded below.'
                    } as Question);
                  setActiveMockConfig(null);
                  setSelectedQuestion(q);
                  setActiveSubmission(sub);
                }}
              />
            ) : selectedQuestion ? (
              <div className="space-y-6">
                {!activeSubmission ? (
                  <PracticeDesk
                    question={selectedQuestion}
                    onSubmit={handleSubmitAnswer}
                    isSubmitting={submittingAnswer}
                    onBack={handleBackToPool}
                    isBookmarked={bookmarkedIds.includes(selectedQuestion.id)}
                    onToggleBookmark={handleToggleBookmark}
                    initialDraftOverride={retryDraftOverride}
                  />
                ) : (
                  <EvaluationStation
                    submission={activeSubmission}
                    onRetry={(preloadPrevious = false) => {
                      if (preloadPrevious) {
                        setRetryDraftOverride({
                          answerText: activeSubmission.answerText,
                          codeLanguage: activeSubmission.codeLanguage
                        });
                      } else {
                        setRetryDraftOverride(null);
                      }
                      setActiveSubmission(null);
                    }}
                    onBackToPool={handleBackToPool}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <StatsBanner
                  questions={questions}
                  submissions={submissions}
                  currentUser={currentUser}
                  onTabChange={(tab) => {
                    handleBackToPool();
                    setActiveTab(tab);
                  }}
                />

                {/* Navigation Tabs & Filters */}
                <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-[#3b1d2c] pb-4">
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c] rounded-xl overflow-x-auto max-w-full">
                    <button
                      type="button"
                      onClick={() => {
                        handleBackToPool();
                        setActiveTab('browse');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        activeTab === 'browse'
                          ? 'bg-white dark:bg-[#1b0d14] text-indigo-700 dark:text-pink-300 shadow-xs'
                          : 'text-slate-600 dark:text-[#b88aa1] hover:text-slate-900 dark:hover:text-[#fdf2f8]'
                      }`}
                    >
                      <Library className="w-3.5 h-3.5" />
                      Question Pool
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleBackToPool();
                        setActiveTab('history');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        activeTab === 'history'
                          ? 'bg-white dark:bg-[#1b0d14] text-indigo-700 dark:text-pink-300 shadow-xs'
                          : 'text-slate-600 dark:text-[#b88aa1] hover:text-slate-900 dark:hover:text-[#fdf2f8]'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      Performance Logs
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          handleBackToPool();
                          setActiveTab('create');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          activeTab === 'create'
                            ? 'bg-white dark:bg-[#1b0d14] text-indigo-700 dark:text-pink-300 shadow-xs'
                            : 'text-slate-600 dark:text-[#b88aa1] hover:text-slate-900 dark:hover:text-[#fdf2f8]'
                        }`}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Author Question
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        handleBackToPool();
                        setActiveTab('profile');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        activeTab === 'profile'
                          ? 'bg-white dark:bg-[#1b0d14] text-indigo-700 dark:text-pink-300 shadow-xs'
                          : 'text-slate-600 dark:text-[#b88aa1] hover:text-slate-900 dark:hover:text-[#fdf2f8]'
                      }`}
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      Profile & Analytics
                    </button>
                    {!isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          handleBackToPool();
                          setActiveTab('feedback');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          activeTab === 'feedback'
                            ? 'bg-white dark:bg-[#1b0d14] text-indigo-700 dark:text-pink-300 shadow-xs'
                            : 'text-slate-600 dark:text-[#b88aa1] hover:text-slate-900 dark:hover:text-[#fdf2f8]'
                        }`}
                        id="tab_feedback_btn"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Feedback & Support
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          handleBackToPool();
                          setActiveTab('admin');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          activeTab === 'admin'
                            ? 'bg-white dark:bg-[#1b0d14] text-indigo-700 dark:text-pink-300 shadow-xs'
                            : 'text-slate-600 dark:text-[#b88aa1] hover:text-slate-900 dark:hover:text-[#fdf2f8]'
                        }`}
                        id="tab_admin_btn"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Admin Console
                      </button>
                    )}
                  </div>

                  {/* Question Pool Search & Filters */}
                  {activeTab === 'browse' && (
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-wrap flex-1">
                        <div className="relative flex-1 min-w-[220px] max-w-sm">
                          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#b88aa1] absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search challenges or keywords..."
                            className="w-full bg-white dark:bg-[#1b0d14] border border-slate-200 dark:border-[#3b1d2c] text-xs text-slate-900 dark:text-[#fdf2f8] placeholder:text-slate-400 dark:placeholder:text-[#8f5d76] rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-indigo-500 dark:focus:border-pink-400"
                          />
                        </div>

                        <div className="flex items-center p-0.5 bg-slate-100 dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c] rounded-lg">
                          {(['all', 'unsolved', 'solved', 'saved'] as const).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => setStatusFilter(status)}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize cursor-pointer transition-colors ${
                                statusFilter === status
                                  ? 'bg-white dark:bg-[#1b0d14] text-slate-900 dark:text-[#fdf2f8] shadow-xs'
                                  : 'text-slate-500 dark:text-[#b88aa1] hover:text-slate-800 dark:hover:text-[#fdf2f8]'
                              }`}
                            >
                              {status === 'saved' ? `Saved (${bookmarkedIds.length})` : status}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        <select
                          aria-label="Filter by category"
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="bg-white dark:bg-[#1b0d14] border border-slate-200 dark:border-[#3b1d2c] text-xs text-slate-700 dark:text-[#fdf2f8] rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 dark:focus:border-pink-400 font-medium"
                        >
                          {categoriesList.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat === 'All' ? 'All Categories' : cat}
                            </option>
                          ))}
                        </select>

                        <select
                          aria-label="Filter by difficulty"
                          value={selectedDifficulty}
                          onChange={(e) => setSelectedDifficulty(e.target.value)}
                          className="bg-white dark:bg-[#1b0d14] border border-slate-200 dark:border-[#3b1d2c] text-xs text-slate-700 dark:text-[#fdf2f8] rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 dark:focus:border-pink-400 font-medium"
                        >
                          <option value="All">All Difficulties</option>
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>

                        <select
                          aria-label="Sort questions"
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="bg-white dark:bg-[#1b0d14] border border-slate-200 dark:border-[#3b1d2c] text-xs text-slate-700 dark:text-[#fdf2f8] rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500 dark:focus:border-pink-400 font-medium"
                        >
                          <option value="default">Sort: Default</option>
                          <option value="difficulty">Sort: Difficulty</option>
                          <option value="score">Sort: Best Score</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            setMockPresetTrack('fullstack');
                            setShowMockModal(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-500 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Timer className="w-3.5 h-3.5" />
                          Start Mock Interview
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            fetchQuestions();
                            fetchHistory();
                            fetchBookmarks();
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#1b0d14] text-slate-500 dark:text-[#b88aa1] hover:text-indigo-600 dark:hover:text-pink-300 transition-colors cursor-pointer"
                          title="Refresh questions"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* TAB PANELS */}
                {activeTab === 'browse' && (
                  <div>
                    {loadingQuestions ? (
                      <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-[#b88aa1] gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-[#3b1d2c] border-t-indigo-600 dark:border-t-pink-400 animate-spin" />
                        <span className="text-xs font-mono">Loading question pool...</span>
                      </div>
                    ) : filteredQuestions.length === 0 ? (
                      <div className="text-center py-16 bg-white dark:bg-[#1b0d14] border border-slate-200 dark:border-[#3b1d2c] rounded-2xl max-w-md mx-auto p-6">
                        <BookOpen className="w-10 h-10 text-slate-300 dark:text-[#b88aa1] mx-auto mb-3" />
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-[#fdf2f8]">No matching challenges</h3>
                        <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-1">
                          Try clearing your search query or adjusting category and difficulty filters.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="dashboard_grid_cards">
                        {filteredQuestions.map((question) => (
                          <QuestionCard
                            key={question.id}
                            question={question}
                            onSelect={handleSelectQuestion}
                            isSolved={isSolved(question.id)}
                            bestScore={getBestScore(question.id)}
                            isBookmarked={bookmarkedIds.includes(question.id)}
                            onToggleBookmark={handleToggleBookmark}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'history' && (
                  <PracticeHistory
                    submissions={submissions}
                    onSelect={(sub) => {
                      const q =
                        questions.find((item) => item.id === sub.questionId) ||
                        ({
                          id: sub.questionId,
                          title: sub.questionTitle,
                          category: sub.category,
                          type: sub.type,
                          difficulty: 'Medium',
                          description: 'Full challenge details are recorded below.'
                        } as Question);
                      setSelectedQuestion(q);
                      setActiveSubmission(sub);
                      setRetryDraftOverride(null);
                    }}
                    onRetryPrevious={(sub) => {
                      const q =
                        questions.find((item) => item.id === sub.questionId) ||
                        ({
                          id: sub.questionId,
                          title: sub.questionTitle,
                          category: sub.category,
                          type: sub.type,
                          difficulty: 'Medium',
                          description: 'Full challenge details are recorded below.'
                        } as Question);
                      setSelectedQuestion(q);
                      setActiveSubmission(null);
                      setRetryDraftOverride({
                        answerText: sub.answerText,
                        codeLanguage: sub.codeLanguage
                      });
                    }}
                    onDelete={(id) => setDeleteTargetId(id)}
                    loadingHistory={loadingHistory}
                  />
                )}

                {activeTab === 'create' && isAdmin && (
                  <CustomQuestionBuilder onSave={handleSaveQuestion} isSaving={savingQuestion} />
                )}

                {activeTab === 'profile' && (
                  <UserProfile
                    currentUser={currentUser}
                    submissions={submissions}
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    onLogout={handleLogout}
                    onTabChange={setActiveTab}
                    onPracticeCategory={(cat: QuestionCategory) => {
                      setSelectedCategory(cat);
                      setStatusFilter('all');
                      setActiveTab('browse');
                    }}
                    onStartWeakAreasMock={() => {
                      setMockPresetTrack('weak');
                      setShowMockModal(true);
                    }}
                  />
                )}

                {activeTab === 'feedback' && !isAdmin && (
                  <FeedbackSection currentUser={currentUser} onSubmitFeedback={handlePostFeedback} />
                )}

                {activeTab === 'admin' && isAdmin && (
                  <AdminPanel
                    onRefreshQuestions={fetchQuestions}
                    onNotify={addToast}
                    currentUser={currentUser}
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Clean Footer */}
      <footer
        id="app_sleek_footer"
        className="h-12 border-t border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#1b0d14] flex items-center justify-between px-6 md:px-8 text-xs text-slate-500 dark:text-[#b88aa1]"
      >
        <span>© {new Date().getFullYear()} MockMind — Interview Practice Workspace</span>
        <div className="flex items-center gap-5">
          {currentUser && (
            <>
              <button
                type="button"
                onClick={() => {
                  handleBackToPool();
                  setActiveTab('browse');
                }}
                className="hover:text-slate-800 dark:hover:text-[#fdf2f8] cursor-pointer"
              >
                Question Pool
              </button>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    handleBackToPool();
                    setActiveTab('feedback');
                  }}
                  className="hover:text-slate-800 dark:hover:text-[#fdf2f8] cursor-pointer"
                >
                  Feedback & Support
                </button>
              )}
            </>
          )}
        </div>
      </footer>

      <MockInterviewModal
        open={showMockModal}
        questions={questions}
        submissions={submissions}
        initialPresetTrack={mockPresetTrack}
        onClose={() => setShowMockModal(false)}
        onStart={(config) => {
          setShowMockModal(false);
          setSelectedQuestion(null);
          setActiveSubmission(null);
          setActiveMockConfig(config);
        }}
      />

      <ConfirmModal
        open={Boolean(deleteTargetId)}
        title="Delete Practice Record?"
        description="Are you sure you want to permanently remove this evaluation record from your practice history?"
        confirmLabel="Delete Record"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteSubmission}
        onCancel={() => setDeleteTargetId(null)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

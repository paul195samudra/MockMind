import React, { useState, useEffect } from 'react';
import { ActivityLog, Feedback, Submission, User, Question, QuestionCategory, QuestionType } from '../types';
import { getAuthHeaders } from '../utils/auth';
import { ConfirmModal } from './ConfirmModal';
import {
  ShieldAlert,
  Activity,
  Users,
  MessageSquare,
  Layers,
  Search,
  RefreshCw,
  Trash2,
  X,
  Star,
  FileText,
  Edit,
  Plus,
  Save,
  Code,
  BookOpen
} from 'lucide-react';

interface AdminPanelProps {
  onRefreshQuestions?: () => void;
  onNotify?: (type: 'success' | 'error' | 'info', message: string) => void;
  currentUser?: User | null;
}

export function AdminPanel({ onRefreshQuestions, onNotify, currentUser }: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'activities' | 'users' | 'feedbacks' | 'submissions' | 'questions'>('activities');

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [questionsList, setQuestionsList] = useState<Question[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Question Modal state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedQuestionToEdit, setSelectedQuestionToEdit] = useState<Question | null>(null);
  const [qTitle, setQTitle] = useState('');
  const [qCategory, setQCategory] = useState<QuestionCategory>('Algorithms');
  const [qType, setQType] = useState<QuestionType>('conceptual');
  const [qDifficulty, setQDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [qDescription, setQDescription] = useState('');
  const [qInitialCode, setQInitialCode] = useState('');
  const [qSolutionTemplate, setQSolutionTemplate] = useState('');
  const [qExpectedOutcomesText, setQExpectedOutcomesText] = useState('');
  const [qKeywordsText, setQKeywordsText] = useState('');
  const [qTestCasesJson, setQTestCasesJson] = useState('');
  const [qSqlSetup, setQSqlSetup] = useState('');

  // Confirmation dialog state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  // Load summary counts on mount so KPI strip always shows accurate live data
  useEffect(() => {
    fetchAllSummaryCounts();
  }, [currentUser]);

  useEffect(() => {
    fetchAdminData();
  }, [activeSubTab]);

  const fetchAllSummaryCounts = async () => {
    const headers = getAuthHeaders();
    try {
      const [actRes, usrRes, fbRes, subRes, qRes] = await Promise.all([
        fetch('/api/admin/activities', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/feedbacks', { headers }),
        fetch('/api/admin/submissions', { headers }),
        fetch('/api/questions')
      ]);
      if (actRes.ok) setActivityLogs(await actRes.json());
      if (usrRes.ok) setUsersList(await usrRes.json());
      if (fbRes.ok) setFeedbacks(await fbRes.json());
      if (subRes.ok) setSubmissions(await subRes.json());
      if (qRes.ok) setQuestionsList(await qRes.json());
    } catch {
      // handled per-tab if offline
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setErrorText(null);
    try {
      const headers = getAuthHeaders();

      if (activeSubTab === 'activities') {
        const res = await fetch('/api/admin/activities', { headers });
        if (!res.ok) throw new Error('Unable to load activity logs.');
        setActivityLogs(await res.json());
      } else if (activeSubTab === 'users') {
        const [resUsers, resSub] = await Promise.all([
          fetch('/api/admin/users', { headers }),
          fetch('/api/admin/submissions', { headers })
        ]);
        if (!resUsers.ok) throw new Error('Unable to load user directory.');
        setUsersList(await resUsers.json());
        if (resSub.ok) setSubmissions(await resSub.json());
      } else if (activeSubTab === 'feedbacks') {
        const res = await fetch('/api/admin/feedbacks', { headers });
        if (!res.ok) throw new Error('Unable to load feedback entries.');
        setFeedbacks(await res.json());
      } else if (activeSubTab === 'submissions') {
        const res = await fetch('/api/admin/submissions', { headers });
        if (!res.ok) throw new Error('Unable to load submissions.');
        setSubmissions(await res.json());
      } else if (activeSubTab === 'questions') {
        const res = await fetch('/api/questions');
        if (!res.ok) throw new Error('Unable to load questions.');
        setQuestionsList(await res.json());
      }
    } catch (err: any) {
      setErrorText(err.message || 'Failed connecting to administration backend.');
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteSubmission = (id: string) => {
    setConfirmState({
      open: true,
      title: 'Delete Submission Record?',
      description: 'This candidate submission and its evaluation report will be permanently removed.',
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        try {
          const res = await fetch(`/api/submissions/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          if (res.ok) {
            setSubmissions((prev) => prev.filter((s) => s.id !== id));
            onNotify?.('success', 'Submission record deleted.');
            fetchAdminData();
          } else {
            onNotify?.('error', 'Could not delete submission record.');
          }
        } catch {
          onNotify?.('error', 'Network error while deleting submission.');
        }
      }
    });
  };

  const getSubCountForUser = (userId: string) => submissions.filter((s) => s.userId === userId).length;

  const getAverageScoreForUser = (userId: string) => {
    const userSubs = submissions.filter((s) => s.userId === userId);
    if (userSubs.length === 0) return '—';
    const sum = userSubs.reduce((acc, curr) => acc + curr.evaluation.score, 0);
    return `${(sum / userSubs.length).toFixed(1)}%`;
  };

  const resetQuestionForm = (prepopulate: Question | null = null) => {
    if (prepopulate) {
      setSelectedQuestionToEdit(prepopulate);
      setQTitle(prepopulate.title || '');
      setQCategory(prepopulate.category || 'Algorithms');
      setQType(prepopulate.type || 'conceptual');
      setQDifficulty(prepopulate.difficulty || 'Medium');
      setQDescription(prepopulate.description || '');
      setQInitialCode(prepopulate.initialCode || '');
      setQSolutionTemplate(prepopulate.solutionTemplate || '');
      setQExpectedOutcomesText(prepopulate.expectedOutcomes?.join('\n') || '');
      setQKeywordsText(prepopulate.keywords?.join(', ') || '');
      setQTestCasesJson(prepopulate.testCases && prepopulate.testCases.length > 0 ? JSON.stringify(prepopulate.testCases, null, 2) : '');
      setQSqlSetup(prepopulate.sqlSetup || '');
    } else {
      setSelectedQuestionToEdit(null);
      setQTitle('');
      setQCategory('Algorithms');
      setQType('conceptual');
      setQDifficulty('Medium');
      setQDescription('');
      setQInitialCode('');
      setQSolutionTemplate('');
      setQExpectedOutcomesText('');
      setQKeywordsText('');
      setQTestCasesJson('');
      setQSqlSetup('');
    }
  };

  const handleSaveQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qTitle.trim() || !qCategory || !qDescription.trim()) {
      onNotify?.('error', 'Title, category, and description are required.');
      return;
    }

    let parsedTestCases = [];
    if (qType === 'coding' && qTestCasesJson.trim()) {
      try {
        const parsed = JSON.parse(qTestCasesJson.trim());
        if (!Array.isArray(parsed)) throw new Error();
        parsedTestCases = parsed;
      } catch {
        onNotify?.('error', 'Unit Test Cases must be a valid JSON array.');
        return;
      }
    }

    const payload = {
      title: qTitle.trim(),
      category: qCategory,
      type: qType,
      difficulty: qDifficulty,
      description: qDescription.trim(),
      initialCode: qInitialCode,
      solutionTemplate: qSolutionTemplate,
      expectedOutcomes: qExpectedOutcomesText.split('\n').map((l) => l.trim()).filter(Boolean),
      keywords: qKeywordsText.split(',').map((k) => k.trim()).filter(Boolean),
      testCases: parsedTestCases,
      sqlSetup: qCategory === 'Databases' ? qSqlSetup : ''
    };

    setLoading(true);
    try {
      const headers = getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = selectedQuestionToEdit
        ? await fetch(`/api/questions/${selectedQuestionToEdit.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
          })
        : await fetch('/api/questions', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });

      if (res.ok) {
        setShowQuestionModal(false);
        resetQuestionForm();
        await fetchAdminData();
        onRefreshQuestions?.();
        onNotify?.('success', selectedQuestionToEdit ? 'Question updated.' : 'Question added to pool.');
      } else {
        const errInfo = await res.json();
        throw new Error(errInfo.error || 'Failed saving question.');
      }
    } catch (err: any) {
      onNotify?.('error', err.message || 'Unable to save question.');
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteQuestion = (id: string, titleName: string) => {
    setConfirmState({
      open: true,
      title: 'Delete Practice Question?',
      description: `Permanently remove "${titleName}" from the question pool? Candidates will no longer be able to practice it.`,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        setLoading(true);
        try {
          const res = await fetch(`/api/questions/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          });
          if (res.ok) {
            await fetchAdminData();
            onRefreshQuestions?.();
            onNotify?.('success', `"${titleName}" removed.`);
          } else {
            onNotify?.('error', 'Failed to delete question.');
          }
        } catch {
          onNotify?.('error', 'Network error while deleting question.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const filteredActivities = activityLogs.filter((log) => {
    const text = `${log.action} ${log.userName} ${log.userEmail} ${log.details}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const filteredUsers = usersList.filter((u) => {
    const text = `${u.name} ${u.email}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const filteredFeedbacks = feedbacks.filter((fb) => {
    const text = `${fb.userName} ${fb.userEmail} ${fb.category} ${fb.message}`.toLowerCase();
    const matchSearch = text.includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'All' || fb.category === categoryFilter;
    const matchRating = ratingFilter === 'All' || fb.rating === Number(ratingFilter);
    return matchSearch && matchCat && matchRating;
  });

  const filteredSubmissions = submissions.filter((sub) => {
    const text = `${sub.questionTitle} ${sub.codeLanguage || ''} ${sub.category} ${sub.answerText}`.toLowerCase();
    const matchSearch = text.includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'All' || sub.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const filteredQuestions = questionsList.filter((q) => {
    const text = `${q.title} ${q.category} ${q.difficulty} ${q.description}`.toLowerCase();
    const matchSearch = text.includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'All' || q.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6" id="admin_control_terminal">
      {/* Admin Hero Header */}
      <div className="bg-slate-900 dark:bg-[#1b0d14] rounded-2xl border border-slate-800 dark:border-[#3b1d2c] p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 dark:text-pink-300">
              <ShieldAlert className="w-4 h-4" />
              Administrator Console
            </div>
            <h1 className="text-2xl font-bold tracking-tight font-display text-white">
              Platform Operations & Content Manager
            </h1>
            <p className="text-xs text-slate-300 dark:text-[#e7c6d7] max-w-xl">
              Review activity logs, candidate accounts, feedback reports, and manage the question catalog.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              fetchAllSummaryCounts();
              fetchAdminData();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/15 dark:bg-[#26131d] dark:hover:bg-[#331a27] text-white py-2 px-4 rounded-xl border border-white/15 dark:border-[#3b1d2c] transition-colors self-start cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* Accurate Live Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 pt-5 border-t border-white/10 dark:border-[#3b1d2c]">
          <div className="bg-white/5 dark:bg-[#160910] border border-white/10 dark:border-[#3b1d2c] p-3 rounded-xl">
            <span className="block text-[11px] text-slate-400 dark:text-[#b88aa1]">Activity Logs</span>
            <span className="text-xl font-bold font-mono tabular-nums mt-0.5 block">{activityLogs.length}</span>
          </div>
          <div className="bg-white/5 dark:bg-[#160910] border border-white/10 dark:border-[#3b1d2c] p-3 rounded-xl">
            <span className="block text-[11px] text-slate-400 dark:text-[#b88aa1]">Users</span>
            <span className="text-xl font-bold font-mono tabular-nums mt-0.5 block">{usersList.length}</span>
          </div>
          <div className="bg-white/5 dark:bg-[#160910] border border-white/10 dark:border-[#3b1d2c] p-3 rounded-xl">
            <span className="block text-[11px] text-slate-400 dark:text-[#b88aa1]">Feedbacks</span>
            <span className="text-xl font-bold font-mono tabular-nums mt-0.5 block">{feedbacks.length}</span>
          </div>
          <div className="bg-white/5 dark:bg-[#160910] border border-white/10 dark:border-[#3b1d2c] p-3 rounded-xl">
            <span className="block text-[11px] text-slate-400 dark:text-[#b88aa1]">Submissions</span>
            <span className="text-xl font-bold font-mono tabular-nums mt-0.5 block">{submissions.length}</span>
          </div>
          <div className="bg-white/5 dark:bg-[#160910] border border-white/10 dark:border-[#3b1d2c] p-3 rounded-xl">
            <span className="block text-[11px] text-teal-300 dark:text-pink-300">Questions</span>
            <span className="text-xl font-bold font-mono tabular-nums mt-0.5 block">{questionsList.length}</span>
          </div>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c] rounded-xl overflow-x-auto max-w-full">
        {[
          { id: 'activities', label: 'Activity Logs', icon: Activity },
          { id: 'users', label: 'Registered Users', icon: Users },
          { id: 'feedbacks', label: `Feedback (${feedbacks.length})`, icon: MessageSquare },
          { id: 'submissions', label: 'All Submissions', icon: Layers },
          { id: 'questions', label: 'Manage Questions', icon: Star }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveSubTab(tab.id as any);
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 justify-center flex-1 py-2 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? 'bg-white dark:bg-[#1b0d14] text-indigo-700 dark:text-pink-300 shadow-xs'
                  : 'text-slate-600 dark:text-[#b88aa1] hover:text-slate-900 dark:hover:text-[#fdf2f8]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {errorText && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4 text-xs text-rose-700 dark:text-rose-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorText}</span>
        </div>
      )}

      {/* Workspace Container */}
      <div className="bg-white dark:bg-[#1b0d14] rounded-2xl border border-slate-200 dark:border-[#3b1d2c] shadow-sm overflow-hidden min-h-[300px]">
        <div className="p-4 bg-slate-50/70 dark:bg-[#160910] border-b border-slate-200 dark:border-[#3b1d2c] flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#b88aa1]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records..."
              className="w-full bg-white dark:bg-[#26131d] text-xs text-slate-900 dark:text-[#fdf2f8] rounded-xl border border-slate-200 dark:border-[#3b1d2c] pl-9 pr-3 py-2 outline-none focus:border-indigo-500 dark:focus:border-pink-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end">
            {activeSubTab === 'questions' && (
              <button
                type="button"
                onClick={() => {
                  resetQuestionForm();
                  setShowQuestionModal(true);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-500 text-white rounded-xl py-2 px-4 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            )}

            {activeSubTab === 'feedbacks' && (
              <>
                <select
                  value={ratingFilter}
                  onChange={(e) => setRatingFilter(e.target.value)}
                  className="bg-white dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c] text-xs text-slate-700 dark:text-[#fdf2f8] rounded-lg px-2.5 py-1.5 outline-none"
                >
                  <option value="All">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c] text-xs text-slate-700 dark:text-[#fdf2f8] rounded-lg px-2.5 py-1.5 outline-none"
                >
                  <option value="All">All Categories</option>
                  <option value="General Praise">General Praise</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Question Content Feedback">Content Feedback</option>
                  <option value="Other">Other</option>
                </select>
              </>
            )}

            {(activeSubTab === 'submissions' || activeSubTab === 'questions') && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c] text-xs text-slate-700 dark:text-[#fdf2f8] rounded-lg px-2.5 py-1.5 outline-none"
              >
                <option value="All">All Categories</option>
                <option value="Algorithms">Algorithms</option>
                <option value="Data Structures">Data Structures</option>
                <option value="System Design">System Design</option>
                <option value="Behavioral">Behavioral</option>
                <option value="Databases">Databases</option>
                <option value="Pharmacy & Healthcare">Pharmacy & Healthcare</option>
                <option value="Information & Technology">Information & Technology</option>
                <option value="Banking & Finance">Banking & Finance</option>
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-[#b88aa1] gap-2">
            <div className="w-7 h-7 rounded-full border-2 border-slate-200 dark:border-[#3b1d2c] border-t-indigo-600 dark:border-t-pink-400 animate-spin" />
            <span className="text-xs font-mono">Loading records...</span>
          </div>
        ) : activeSubTab === 'activities' ? (
          filteredActivities.length === 0 ? (
            <div className="text-center py-16 text-slate-500 dark:text-[#b88aa1]">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No activity logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#160910] text-slate-500 dark:text-[#b88aa1] border-b border-slate-200 dark:border-[#3b1d2c]">
                  <tr>
                    <th className="px-6 py-3 font-semibold">User</th>
                    <th className="px-6 py-3 font-semibold">Action</th>
                    <th className="px-6 py-3 font-semibold">Timestamp</th>
                    <th className="px-6 py-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#3b1d2c]">
                  {filteredActivities.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-[#26131d]/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className="block font-semibold text-slate-900 dark:text-[#fdf2f8]">{log.userName}</span>
                        <span className="block text-[11px] text-slate-500 dark:text-[#b88aa1] font-mono">{log.userEmail}</span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-[11px] font-semibold text-indigo-600 dark:text-pink-300">
                        {log.action}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 dark:text-[#b88aa1] text-[11px] font-mono tabular-nums">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 dark:text-[#e7c6d7] max-w-md whitespace-pre-wrap">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeSubTab === 'users' ? (
          filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-slate-500 dark:text-[#b88aa1]">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No registered users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#160910] text-slate-500 dark:text-[#b88aa1] border-b border-slate-200 dark:border-[#3b1d2c]">
                  <tr>
                    <th className="px-6 py-3 font-semibold">User</th>
                    <th className="px-6 py-3 font-semibold">Role</th>
                    <th className="px-6 py-3 font-semibold text-right">Submissions</th>
                    <th className="px-6 py-3 font-semibold text-right">Avg Score</th>
                    <th className="px-6 py-3 font-semibold">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#3b1d2c]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-[#26131d]/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className="block font-semibold text-slate-900 dark:text-[#fdf2f8]">{u.name}</span>
                        <span className="block text-[11px] text-slate-500 dark:text-[#b88aa1] font-mono">{u.email}</span>
                      </td>
                      <td className="px-6 py-3.5 font-mono text-[11px] font-semibold">
                        <span className={u.role === 'admin' ? 'text-indigo-600 dark:text-pink-300' : 'text-slate-600 dark:text-[#e7c6d7]'}>
                          {u.role === 'admin' ? 'Admin' : 'Candidate'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums text-slate-700 dark:text-[#e7c6d7]">
                        {getSubCountForUser(u.id)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-[#fdf2f8]">
                        {getAverageScoreForUser(u.id)}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 dark:text-[#b88aa1] text-[11px] font-mono tabular-nums">
                        {new Date(u.registeredAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeSubTab === 'feedbacks' ? (
          filteredFeedbacks.length === 0 ? (
            <div className="text-center py-16 text-slate-500 dark:text-[#b88aa1]">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No feedback matching filters</p>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFeedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="bg-slate-50/70 dark:bg-[#160910] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="block font-bold text-slate-900 dark:text-[#fdf2f8] text-xs">{fb.userName}</span>
                      <span className="block text-[11px] text-slate-500 dark:text-[#b88aa1] font-mono">{fb.userEmail}</span>
                    </div>
                    <span className="text-[11px] font-medium text-indigo-600 dark:text-pink-300">{fb.category}</span>
                  </div>

                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= fb.rating ? 'fill-current' : 'text-slate-200 dark:text-[#3b1d2c]'}`} />
                    ))}
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-[#b88aa1] font-mono ml-1.5 tabular-nums">
                      {fb.rating}/5
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-[#e7c6d7] leading-relaxed whitespace-pre-wrap bg-white dark:bg-[#1b0d14] p-3 rounded-lg border border-slate-200 dark:border-[#3b1d2c]">
                    {fb.message}
                  </p>

                  <div className="text-[10px] text-slate-400 dark:text-[#b88aa1] font-mono tabular-nums">
                    {new Date(fb.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeSubTab === 'questions' ? (
          filteredQuestions.length === 0 ? (
            <div className="text-center py-16 text-slate-500 dark:text-[#b88aa1]">
              <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No practice questions match query</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#160910] text-slate-500 dark:text-[#b88aa1] border-b border-slate-200 dark:border-[#3b1d2c]">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Question</th>
                    <th className="px-6 py-3 font-semibold">Category</th>
                    <th className="px-6 py-3 font-semibold">Type</th>
                    <th className="px-6 py-3 font-semibold">Difficulty</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#3b1d2c]">
                  {filteredQuestions.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-[#26131d]/50 transition-colors">
                      <td className="px-6 py-4 max-w-md">
                        <span className="font-semibold text-slate-900 dark:text-[#fdf2f8] block">{q.title}</span>
                        <p className="text-[11px] text-slate-500 dark:text-[#b88aa1] line-clamp-2 mt-0.5">
                          {q.description.replace(/[#*`]/g, '')}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-indigo-600 dark:text-pink-300 font-medium">{q.category}</td>
                      <td className="px-6 py-4 font-mono text-[11px] text-slate-600 dark:text-[#e7c6d7]">
                        <span className="inline-flex items-center gap-1">
                          {q.type === 'coding' ? <Code className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                          {q.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold">{q.difficulty}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              resetQuestionForm(q);
                              setShowQuestionModal(true);
                            }}
                            className="bg-slate-50 dark:bg-[#26131d] hover:bg-slate-100 dark:hover:bg-[#331a27] text-slate-700 dark:text-[#fdf2f8] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 border border-slate-200 dark:border-[#3b1d2c] cursor-pointer"
                          >
                            <Edit className="w-3 h-3 text-indigo-600 dark:text-pink-400" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDeleteQuestion(q.id, q.title)}
                            className="bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 border border-rose-200 dark:border-rose-500/30 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center py-16 text-slate-500 dark:text-[#b88aa1]">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-semibold">No submissions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#160910] text-slate-500 dark:text-[#b88aa1] border-b border-slate-200 dark:border-[#3b1d2c]">
                <tr>
                  <th className="px-6 py-3 font-semibold">Question</th>
                  <th className="px-6 py-3 font-semibold">Category</th>
                  <th className="px-6 py-3 font-semibold text-right">Score</th>
                  <th className="px-6 py-3 font-semibold">Submitted</th>
                  <th className="px-6 py-3 font-semibold">Language</th>
                  <th className="px-6 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#3b1d2c]">
                {filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-[#26131d]/50 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-[#fdf2f8]">
                      {sub.questionTitle}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 dark:text-[#e7c6d7]">{sub.category}</td>
                    <td className="px-6 py-3.5 text-right font-mono tabular-nums font-bold">
                      <span
                        className={
                          sub.evaluation.score >= 80
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : sub.evaluation.score >= 60
                            ? 'text-amber-600 dark:text-amber-300'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {sub.evaluation.score}%
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[11px] tabular-nums text-slate-500 dark:text-[#b88aa1]">
                      {new Date(sub.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[11px] text-slate-600 dark:text-[#e7c6d7]">
                      {sub.codeLanguage || 'Conceptual'}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => requestDeleteSubmission(sub.id)}
                        className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 border border-rose-200 dark:border-rose-500/30 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Question Editor Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1b0d14] rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-[#3b1d2c] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 dark:bg-[#160910] text-white p-5 flex items-center justify-between border-b border-slate-800 dark:border-[#3b1d2c]">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-indigo-400 dark:text-pink-400" />
                <div>
                  <h3 className="font-bold text-sm">
                    {selectedQuestionToEdit ? 'Edit Question' : 'Create Practice Question'}
                  </h3>
                  <p className="text-[11px] text-slate-300 dark:text-[#b88aa1]">
                    {selectedQuestionToEdit ? `Editing "${selectedQuestionToEdit.title}"` : 'Add a new challenge to the question pool'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQuestionModal(false);
                  resetQuestionForm();
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestionSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Challenge Title *</label>
                  <input
                    type="text"
                    required
                    value={qTitle}
                    onChange={(e) => setQTitle(e.target.value)}
                    placeholder="e.g., Reverse Linked List"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] rounded-lg outline-none focus:border-indigo-500 dark:focus:border-pink-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Category *</label>
                  <select
                    value={qCategory}
                    onChange={(e) => setQCategory(e.target.value as QuestionCategory)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] rounded-lg outline-none focus:border-indigo-500 dark:focus:border-pink-400"
                  >
                    <option value="Algorithms">Algorithms</option>
                    <option value="Data Structures">Data Structures</option>
                    <option value="System Design">System Design</option>
                    <option value="Behavioral">Behavioral</option>
                    <option value="Databases">Databases</option>
                    <option value="Pharmacy & Healthcare">Pharmacy & Healthcare</option>
                    <option value="Information & Technology">Information & Technology</option>
                    <option value="Banking & Finance">Banking & Finance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Format *</label>
                  <div className="flex gap-4 mt-1.5 text-slate-700 dark:text-[#e7c6d7]">
                    <label className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input type="radio" name="qType" checked={qType === 'coding'} onChange={() => setQType('coding')} />
                      Coding Challenge
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input type="radio" name="qType" checked={qType === 'conceptual'} onChange={() => setQType('conceptual')} />
                      Conceptual / Behavioral
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Difficulty *</label>
                  <select
                    value={qDifficulty}
                    onChange={(e) => setQDifficulty(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] rounded-lg outline-none focus:border-indigo-500 dark:focus:border-pink-400"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Description *</label>
                <textarea
                  rows={4}
                  required
                  value={qDescription}
                  onChange={(e) => setQDescription(e.target.value)}
                  placeholder="Describe requirements, constraints, and examples..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] rounded-lg outline-none focus:border-indigo-500 dark:focus:border-pink-400"
                />
              </div>

              {qType === 'coding' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Starter Code (Optional)</label>
                  <textarea
                    rows={3}
                    value={qInitialCode}
                    onChange={(e) => setQInitialCode(e.target.value)}
                    placeholder="function solve(input) {\n  // Starter code\n}"
                    className="w-full text-xs px-3 py-2 bg-slate-900 dark:bg-[#160910] text-slate-100 border border-slate-800 dark:border-[#3b1d2c] rounded-lg outline-none font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Reference Solution</label>
                <textarea
                  rows={3}
                  value={qSolutionTemplate}
                  onChange={(e) => setQSolutionTemplate(e.target.value)}
                  placeholder="Ideal solution or key points..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] rounded-lg outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Criteria (one per line)</label>
                  <textarea
                    rows={3}
                    value={qExpectedOutcomesText}
                    onChange={(e) => setQExpectedOutcomesText(e.target.value)}
                    placeholder="O(N) time complexity&#10;Handle empty input"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Keywords (comma-separated)</label>
                  <textarea
                    rows={3}
                    value={qKeywordsText}
                    onChange={(e) => setQKeywordsText(e.target.value)}
                    placeholder="two-pointer, stack, hash map"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] rounded-lg outline-none font-mono"
                  />
                </div>
              </div>

              {qType === 'coding' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">
                    Custom Unit Test Cases JSON (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={qTestCasesJson}
                    onChange={(e) => setQTestCasesJson(e.target.value)}
                    placeholder='[{"name":"Basic","functionName":"solve","args":[[1,2]],"expected":3}]'
                    className="w-full text-xs px-3 py-2 bg-slate-900 dark:bg-[#160910] text-slate-100 border border-slate-800 dark:border-[#3b1d2c] rounded-lg outline-none font-mono"
                  />
                </div>
              )}

              {qCategory === 'Databases' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">
                    SQL Sandbox Setup Script (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={qSqlSetup}
                    onChange={(e) => setQSqlSetup(e.target.value)}
                    placeholder="Optional SQL CREATE TABLE / INSERT seed script..."
                    className="w-full text-xs px-3 py-2 bg-slate-900 dark:bg-[#160910] text-slate-100 border border-slate-800 dark:border-[#3b1d2c] rounded-lg outline-none font-mono"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-[#3b1d2c] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuestionModal(false);
                    resetQuestionForm();
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-[#26131d] hover:bg-slate-200 dark:hover:bg-[#331a27] text-slate-700 dark:text-[#e7c6d7] text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {selectedQuestionToEdit ? 'Save Changes' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
      />
    </div>
  );
}

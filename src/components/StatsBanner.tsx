import { Question, Submission, User } from '../types';
import { Award, Clock, Library, Star } from 'lucide-react';

interface StatsBannerProps {
  questions: Question[];
  submissions: Submission[];
  onTabChange?: (tab: 'browse' | 'history' | 'create' | 'profile' | 'feedback' | 'admin') => void;
  currentUser?: User | null;
}

export function StatsBanner({ questions, submissions, onTabChange, currentUser }: StatsBannerProps) {
  const totalQuestions = questions.length;
  const completedCount = submissions.length;

  const avgScore = completedCount > 0
    ? Math.round(submissions.reduce((acc, curr) => acc + curr.evaluation.score, 0) / completedCount)
    : 0;

  const highestScoreObj = completedCount > 0
    ? submissions.reduce((prev, current) => (prev.evaluation.score > current.evaluation.score ? prev : current))
    : null;

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Practice Pool */}
      <button
        type="button"
        onClick={() => onTabChange?.('browse')}
        className="text-left bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-5 flex items-center gap-4 hover:border-indigo-300 dark:hover:border-pink-400/60 transition-colors cursor-pointer group"
      >
        <div className="p-3 rounded-lg bg-indigo-50 dark:bg-[#2a101d] text-indigo-600 dark:text-pink-400">
          <Library className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-medium text-slate-500 dark:text-[#b88aa1]">Practice Pool</h3>
          <p className="text-2xl font-bold font-display tabular-nums text-slate-900 dark:text-[#fdf2f8]">
            {totalQuestions}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-0.5 truncate">
            Available challenges
          </p>
        </div>
      </button>

      {/* 2. Sessions Practiced */}
      <button
        type="button"
        onClick={() => onTabChange?.(isAdmin ? 'profile' : 'history')}
        className="text-left bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-5 flex items-center gap-4 hover:border-teal-300 dark:hover:border-pink-400/60 transition-colors cursor-pointer group"
      >
        <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-300">
          <Clock className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-medium text-slate-500 dark:text-[#b88aa1]">Sessions Practiced</h3>
          <p className="text-2xl font-bold font-display tabular-nums text-slate-900 dark:text-[#fdf2f8]">
            {completedCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-0.5 truncate">
            Completed evaluations
          </p>
        </div>
      </button>

      {/* 3. Average Score */}
      <button
        type="button"
        onClick={() => onTabChange?.('profile')}
        className="text-left bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-5 flex items-center gap-4 hover:border-amber-300 dark:hover:border-pink-400/60 transition-colors cursor-pointer group"
      >
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300">
          <Award className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-medium text-slate-500 dark:text-[#b88aa1]">Average Score</h3>
          <p
            className={`text-2xl font-bold font-display tabular-nums ${
              avgScore >= 80
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-900 dark:text-[#fdf2f8]'
            }`}
          >
            {completedCount > 0 ? `${avgScore}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-0.5 truncate">
            {completedCount > 0 ? (avgScore >= 80 ? 'Strong benchmark' : 'Keep practicing') : 'No attempts yet'}
          </p>
        </div>
      </button>

      {/* 4. Personal Best */}
      <button
        type="button"
        onClick={() => onTabChange?.('profile')}
        className="text-left bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-5 flex items-center gap-4 hover:border-rose-300 dark:hover:border-pink-400/60 transition-colors cursor-pointer group"
      >
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-pink-300">
          <Star className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-medium text-slate-500 dark:text-[#b88aa1]">Personal Best</h3>
          <p className="text-2xl font-bold font-display tabular-nums text-slate-900 dark:text-[#fdf2f8]">
            {highestScoreObj ? `${highestScoreObj.evaluation.score}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-0.5 truncate max-w-[175px]">
            {highestScoreObj ? highestScoreObj.questionTitle : 'No records yet'}
          </p>
        </div>
      </button>
    </div>
  );
}

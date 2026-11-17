import { Submission } from '../types';
import { Calendar, Trash2, ExternalLink, CheckSquare, RefreshCw, Clock, RotateCcw } from 'lucide-react';

interface PracticeHistoryProps {
  submissions: Submission[];
  onSelect: (submission: Submission) => void;
  onRetryPrevious?: (submission: Submission) => void;
  onDelete: (id: string) => void;
  loadingHistory: boolean;
}

export function PracticeHistory({
  submissions,
  onSelect,
  onRetryPrevious,
  onDelete,
  loadingHistory
}: PracticeHistoryProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-500/30';
    if (score >= 75) return 'text-indigo-700 dark:text-pink-300 bg-indigo-50 dark:bg-[#2a101d] border-indigo-200 dark:border-pink-400/30';
    if (score >= 50) return 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-500/30';
    return 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-500/30';
  };

  if (loadingHistory) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-[#b88aa1] gap-2">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="text-xs font-mono">Loading practice history...</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#3b1d2c] pb-4 mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold font-display text-slate-900 dark:text-[#fdf2f8]">Practice Performance Log</h2>
          <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-0.5">Review past evaluations, iterate on previous drafts, and track score progression</p>
        </div>
        <span className="text-xs font-semibold font-mono tabular-nums px-2.5 py-1 bg-slate-50 dark:bg-[#26131d] text-slate-700 dark:text-[#e7c6d7] border border-slate-200 dark:border-[#3b1d2c] rounded-lg">
          {submissions.length} Submissions
        </span>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-12 px-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-[#26131d] text-slate-400 dark:text-[#b88aa1] flex items-center justify-center mx-auto mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-[#fdf2f8]">No Submissions Yet</h3>
          <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-1 leading-relaxed">
            Select a challenge from the Question Pool, submit your solution, and your scored evaluations will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <div
              key={sub.id}
              className="border border-slate-200 dark:border-[#3b1d2c] rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap hover:border-indigo-300 dark:hover:border-pink-400/50 transition-colors bg-white dark:bg-[#160910]"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-[#b88aa1]">
                  <span className="flex items-center gap-1 font-mono text-[11px] tabular-nums">
                    <Calendar className="w-3 h-3" />
                    {new Date(sub.timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-indigo-600 dark:text-pink-300 font-medium">{sub.category}</span>
                  {typeof sub.durationSeconds === 'number' && sub.durationSeconds > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums">
                        <Clock className="w-3 h-3" />
                        {Math.floor(sub.durationSeconds / 60)}m {String(sub.durationSeconds % 60).padStart(2, '0')}s
                      </span>
                    </>
                  )}
                </div>

                <h3
                  className="text-sm font-bold text-slate-900 dark:text-[#fdf2f8] truncate pr-2 hover:text-indigo-600 dark:hover:text-pink-300 cursor-pointer"
                  onClick={() => onSelect(sub)}
                >
                  {sub.questionTitle}
                </h3>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#b88aa1] font-mono">
                  <span>{sub.type === 'coding' ? 'Coding' : 'Conceptual'}</span>
                  {sub.codeLanguage && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{sub.codeLanguage}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                <div className={`text-center py-1.5 px-3 rounded-lg border font-mono tabular-nums flex flex-col items-center justify-center w-16 ${getScoreColor(sub.evaluation.score)}`}>
                  <span className="text-[10px] opacity-80 leading-none">SCORE</span>
                  <span className="text-sm font-bold leading-tight mt-0.5">{sub.evaluation.score}%</span>
                </div>

                {onRetryPrevious && (
                  <button
                    type="button"
                    onClick={() => onRetryPrevious(sub)}
                    className="px-2.5 py-2 border border-slate-200 dark:border-[#3b1d2c] text-xs font-semibold text-slate-700 dark:text-[#e7c6d7] hover:text-indigo-600 dark:hover:text-pink-300 hover:border-indigo-300 dark:hover:border-pink-400/50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                    title="Reopen in workspace with your previous attempt preloaded"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Practice Again</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onSelect(sub)}
                  className="p-2 border border-slate-200 dark:border-[#3b1d2c] text-slate-600 dark:text-[#e7c6d7] hover:text-indigo-600 dark:hover:text-pink-300 hover:border-indigo-300 dark:hover:border-pink-400/50 rounded-lg transition-colors cursor-pointer"
                  title="View evaluation details"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(sub.id)}
                  className="p-2 border border-slate-200 dark:border-[#3b1d2c] text-slate-400 dark:text-[#b88aa1] hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/40 rounded-lg transition-colors cursor-pointer"
                  title="Delete practice record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

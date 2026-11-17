import { Question } from '../types';
import { Code, BookOpen, ChevronRight, CheckCircle2, Bookmark } from 'lucide-react';

interface QuestionCardProps {
  key?: string;
  question: Question;
  onSelect: (question: Question) => void;
  isSolved: boolean;
  bestScore?: number;
  isBookmarked?: boolean;
  onToggleBookmark?: (questionId: string) => void;
}

export function QuestionCard({
  question,
  onSelect,
  isSolved,
  bestScore,
  isBookmarked = false,
  onToggleBookmark
}: QuestionCardProps) {
  const difficultyTextClass = {
    Easy: 'text-emerald-700 dark:text-emerald-400',
    Medium: 'text-amber-700 dark:text-amber-300',
    Hard: 'text-rose-700 dark:text-rose-400'
  }[question.difficulty] || 'text-slate-600 dark:text-[#e7c6d7]';

  return (
    <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-5 transition-colors hover:border-indigo-300 dark:hover:border-pink-400/60 flex flex-col justify-between group">
      <div>
        {/* Clean typographic metadata (no pill clutter) */}
        <div className="flex items-center justify-between gap-2 mb-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-[#b88aa1] truncate">
            <span className="font-medium text-indigo-600 dark:text-pink-300 truncate">{question.category}</span>
            <span aria-hidden="true">·</span>
            <span className={`font-semibold ${difficultyTextClass}`}>{question.difficulty}</span>
            {question.isCustom && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-slate-500 dark:text-[#b88aa1]">Custom</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 dark:text-[#b88aa1]">
              {question.type === 'coding' ? 'Code' : 'Concept'}
            </span>
            {onToggleBookmark && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(question.id);
                }}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark challenge'}
                title={isBookmarked ? 'Saved to bookmarks' : 'Save to bookmarks'}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  isBookmarked
                    ? 'text-indigo-600 dark:text-pink-400 hover:bg-indigo-50 dark:hover:bg-[#2a101d]'
                    : 'text-slate-300 dark:text-[#72475d] hover:text-slate-600 dark:hover:text-pink-300'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold font-display text-slate-900 dark:text-[#fdf2f8] mb-2 group-hover:text-indigo-600 dark:group-hover:text-pink-300 transition-colors flex items-start gap-2">
          {question.type === 'coding' ? (
            <Code className="w-4 h-4 text-slate-400 dark:text-[#b88aa1] shrink-0 mt-1" />
          ) : (
            <BookOpen className="w-4 h-4 text-slate-400 dark:text-[#b88aa1] shrink-0 mt-1" />
          )}
          <span className="line-clamp-2">{question.title}</span>
        </h3>

        {/* Description Fragment */}
        <p className="text-xs text-slate-600 dark:text-[#e7c6d7]/85 line-clamp-3 mb-4 leading-relaxed">
          {question.description.replace(/[#*`]/g, '')}
        </p>
      </div>

      {/* Footer status & Practice button */}
      <div className="pt-4 border-t border-slate-100 dark:border-[#3b1d2c] flex items-center justify-between gap-3 mt-auto">
        <div className="min-w-0">
          {isSolved ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium tabular-nums">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Solved · Best {bestScore}%</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 dark:text-[#b88aa1]">Not attempted</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onSelect(question)}
          className="flex items-center gap-1 text-xs font-semibold text-white bg-slate-900 hover:bg-indigo-600 dark:bg-pink-600 dark:hover:bg-pink-500 py-1.5 px-3.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Practice
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

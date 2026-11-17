import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MockExamConfig, Submission } from '../types';
import { PracticeDesk } from './PracticeDesk';
import { ConfirmModal } from './ConfirmModal';
import { getAuthHeaders } from '../utils/auth';
import {
  Timer,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Award,
  AlertTriangle,
  Download,
  Flag
} from 'lucide-react';

interface MockInterviewSessionProps {
  config: MockExamConfig;
  bookmarkedIds: string[];
  onToggleBookmark: (questionId: string) => void;
  onExit: () => void;
  onSubmissionsSaved: (newSubs: Submission[]) => void;
  onInspectSubmission: (submission: Submission) => void;
}

interface DraftState {
  answerText: string;
  codeLanguage?: string;
  hintsUsed?: number;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MockInterviewSession({
  config,
  bookmarkedIds,
  onToggleBookmark,
  onExit,
  onSubmissionsSaved,
  onInspectSubmission
}: MockInterviewSessionProps) {
  const totalSecondsInitial = config.durationMinutes * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(totalSecondsInitial);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() => {
    const init: Record<string, DraftState> = {};
    for (const q of config.questions) {
      init[q.id] = {
        answerText: q.type === 'coding' ? (q.initialCode || '') : '',
        codeLanguage: q.category === 'Databases' ? 'SQL' : q.type === 'coding' ? 'TypeScript' : undefined,
        hintsUsed: 0
      };
    }
    return init;
  });

  const [isGrading, setIsGrading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [completedSubs, setCompletedSubs] = useState<Submission[] | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const currentQuestion = config.questions[currentIdx];

  // Shared countdown timer
  useEffect(() => {
    if (completedSubs || isGrading) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [completedSubs, isGrading]);

  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const handleDraftSync = useCallback(
    (qId: string, answerText: string, language?: string, hintsUsed?: number) => {
      setDrafts((prev) => {
        const cur = prev[qId];
        const nextHints = hintsUsed || 0;
        if (cur && cur.answerText === answerText && cur.codeLanguage === language && (cur.hintsUsed || 0) === nextHints) {
          return prev;
        }
        return {
          ...prev,
          [qId]: { answerText, codeLanguage: language, hintsUsed: nextHints }
        };
      });
    },
    []
  );

  const initialDraftOverride = useMemo(() => {
    const d = draftsRef.current[currentQuestion.id];
    return d
      ? {
          answerText: d.answerText,
          codeLanguage: d.codeLanguage
        }
      : null;
  }, [currentQuestion.id]);

  const mockModeConfig = useMemo(
    () => ({
      currentIndex: currentIdx,
      totalCount: config.questions.length,
      submitLabel: currentIdx < config.questions.length - 1 ? 'Save & Next Question →' : 'Finish & Grade Exam',
      onDraftSync: (ans: string, lang?: string, hintsUsed?: number) =>
        handleDraftSync(currentQuestion.id, ans, lang, hintsUsed)
    }),
    [currentIdx, config.questions.length, currentQuestion.id, handleDraftSync]
  );

  const handleFinishExam = async () => {
    if (isGrading) return;
    setIsGrading(true);
    setGradingError(null);

    const timeSpentTotal = Math.max(1, totalSecondsInitial - remainingSeconds);
    const perQuestionSeconds = Math.round(timeSpentTotal / config.questions.length);

    try {
      const results: Submission[] = [];
      for (const q of config.questions) {
        const draft = drafts[q.id];
        const rawAnswer = draft?.answerText?.trim() || '';
        const answerToSend = rawAnswer || '(Candidate left this question unanswered during timed mock interview)';

        const res = await fetch('/api/evaluate', {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            questionId: q.id,
            answerText: answerToSend,
            codeLanguage: draft?.codeLanguage,
            durationSeconds: perQuestionSeconds,
            hintsUsed: draft?.hintsUsed || 0
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.submission) {
          throw new Error(data.error || `Failed grading "${q.title}".`);
        }
        results.push(data.submission);
        try {
          localStorage.removeItem(`mockmind_draft_${q.id}`);
        } catch {
          // ignore
        }
      }

      onSubmissionsSaved(results);
      setCompletedSubs(results);
    } catch (err: any) {
      setGradingError(err.message || 'Failed submitting mock exam.');
    } finally {
      setIsGrading(false);
    }
  };

  if (completedSubs) {
    const avgScore =
      completedSubs.length > 0
        ? Math.round(completedSubs.reduce((acc, s) => acc + s.evaluation.score, 0) / completedSubs.length)
        : 0;
    const totalUsed = totalSecondsInitial - remainingSeconds;
    const hireSignal =
      avgScore >= 85
        ? 'Strong Hire Signal'
        : avgScore >= 75
        ? 'Hire Ready'
        : avgScore >= 55
        ? 'Borderline — Targeted Review Needed'
        : 'Needs Foundational Practice';

    const handleExportCombined = () => {
      const md = [
        `# MockMind Combined Mock Interview Report: ${config.title}`,
        `- **Overall Average Score:** ${avgScore}% (${hireSignal})`,
        `- **Total Time Used:** ${formatCountdown(totalUsed)} / ${config.durationMinutes}:00`,
        '',
        ...completedSubs.flatMap((s, i) => [
          `## ${i + 1}. ${s.questionTitle} (${s.category}) — ${s.evaluation.score}%`,
          s.evaluation.summary,
          '',
          `**Strengths:** ${(s.evaluation.strengths || []).join('; ') || 'None'}`,
          `**Improvements:** ${(s.evaluation.weaknesses || []).join('; ') || 'None'}`,
          ''
        ])
      ].join('\n');

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mock-interview-report-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#1b0d14] rounded-2xl border border-slate-200 dark:border-[#3b1d2c] p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-[#3b1d2c] pb-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-pink-300">
                <Award className="w-4 h-4" />
                Mock Interview Readiness Report
              </div>
              <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-[#fdf2f8]">
                {config.title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-[#b88aa1]">
                Completed in {formatCountdown(totalUsed)} · {hireSignal}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center px-5 py-3 rounded-xl bg-slate-50 dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c]">
                <div className="text-[11px] text-slate-500 dark:text-[#b88aa1]">Overall Score</div>
                <div className="text-3xl font-extrabold font-display tabular-nums text-indigo-600 dark:text-pink-300">
                  {avgScore}%
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-6">
            {completedSubs.map((sub, idx) => (
              <div
                key={sub.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-[#3b1d2c] bg-slate-50/70 dark:bg-[#160910] flex items-center justify-between gap-4 flex-wrap"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-xs text-indigo-600 dark:text-pink-300 font-semibold">
                    Question {idx + 1} · {sub.category}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#fdf2f8]">{sub.questionTitle}</h3>
                  <p className="text-xs text-slate-600 dark:text-[#e7c6d7] line-clamp-2">{sub.evaluation.summary}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-[#fdf2f8]">
                    {sub.evaluation.score}%
                  </span>
                  <button
                    type="button"
                    onClick={() => onInspectSubmission(sub)}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-pink-600 dark:hover:bg-pink-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Open Full Review
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#3b1d2c] flex items-center justify-between flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportCombined}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#26131d] text-xs font-semibold text-slate-700 dark:text-[#e7c6d7] flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Combined Report (.md)
            </button>

            <button
              type="button"
              onClick={onExit}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-500 text-white text-xs font-semibold cursor-pointer"
            >
              Return to Question Pool
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLowTime = remainingSeconds <= 300;

  return (
    <>
      <div className="space-y-4">
        {/* Shared Timed Exam Control Header */}
        <div className="bg-slate-900 dark:bg-[#1b0d14] text-white rounded-2xl border border-slate-800 dark:border-[#3b1d2c] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              ← Exit Exam
            </button>
            <span className="text-slate-600">|</span>
            <div>
              <div className="text-xs font-bold font-display">{config.title}</div>
              <div className="text-[11px] text-slate-400 dark:text-[#b88aa1]">
                Switch freely between questions before finishing. All answers are graded together.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Step Switcher */}
            <div className="flex items-center gap-1.5 bg-white/5 dark:bg-[#26131d] p-1 rounded-xl border border-white/10 dark:border-[#3b1d2c]">
              {config.questions.map((q, idx) => {
                const active = idx === currentIdx;
                const d = drafts[q.id];
                const hasContent =
                  Boolean(d?.answerText?.trim()) && d?.answerText.trim() !== (q.initialCode || '').trim();
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      active
                        ? 'bg-indigo-600 dark:bg-pink-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>Q{idx + 1}</span>
                    {hasContent && <CheckCircle2 className="w-3 h-3 text-emerald-300" />}
                  </button>
                );
              })}
            </div>

            {/* Countdown Timer */}
            <div
              className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold tabular-nums flex items-center gap-1.5 ${
                isLowTime
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                  : 'bg-white/10 dark:bg-[#26131d] border-white/15 dark:border-[#3b1d2c] text-white'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>{formatCountdown(remainingSeconds)}</span>
            </div>

            <button
              type="button"
              disabled={isGrading}
              onClick={handleFinishExam}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{isGrading ? 'Grading Mock Exam...' : 'Finish & Grade All'}</span>
            </button>
          </div>
        </div>

        {gradingError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-700 dark:text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{gradingError}</span>
          </div>
        )}

        {/* Reuse PracticeDesk inside Mock Exam */}
        <div key={currentQuestion.id}>
          <PracticeDesk
            question={currentQuestion}
            isSubmitting={isGrading}
            onBack={() => setShowExitConfirm(true)}
            isBookmarked={bookmarkedIds.includes(currentQuestion.id)}
            onToggleBookmark={onToggleBookmark}
            initialDraftOverride={initialDraftOverride}
            onSubmit={async (answerText, language, _dur, hintsUsed) => {
              handleDraftSync(currentQuestion.id, answerText, language, hintsUsed);
              if (currentIdx < config.questions.length - 1) {
                setCurrentIdx((i) => i + 1);
              } else {
                await handleFinishExam();
              }
            }}
            mockMode={mockModeConfig}
          />
        </div>

        {/* Quick Prev/Next Footer */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#1b0d14] text-xs font-semibold text-slate-700 dark:text-[#e7c6d7] disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>

          <button
            type="button"
            disabled={currentIdx === config.questions.length - 1}
            onClick={() => setCurrentIdx((i) => Math.min(config.questions.length - 1, i + 1))}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#1b0d14] text-xs font-semibold text-slate-700 dark:text-[#e7c6d7] disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <ConfirmModal
        open={showExitConfirm}
        title="Exit Mock Interview?"
        description="Your progress in this timed mock loop won't be scored as a combined exam unless you finish & grade it."
        confirmLabel="Exit Mock"
        cancelLabel="Continue Exam"
        variant="danger"
        onConfirm={() => {
          setShowExitConfirm(false);
          onExit();
        }}
        onCancel={() => setShowExitConfirm(false)}
      />
    </>
  );
}

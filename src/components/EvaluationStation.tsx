import React, { useState } from 'react';
import { Submission, FollowUpMessage } from '../types';
import {
  AlertTriangle,
  CheckCircle,
  Code,
  RefreshCw,
  Star,
  MessageSquareCode,
  Columns2,
  Rows2,
  Copy,
  Check,
  Clock,
  Download,
  Printer,
  Send,
  MessageCircle,
  Lightbulb
} from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { getAuthHeaders } from '../utils/auth';

interface EvaluationStationProps {
  submission: Submission;
  onRetry: (preloadPrevious?: boolean) => void;
  onBackToPool?: () => void;
}

function formatDuration(seconds?: number): string | null {
  if (typeof seconds !== 'number' || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

export function EvaluationStation({ submission, onRetry, onBackToPool }: EvaluationStationProps) {
  const {
    score,
    summary,
    correctness,
    strengths,
    weaknesses,
    modelAnswer,
    followUpQuestion,
    codeReview
  } = submission.evaluation;

  const [compareLayout, setCompareLayout] = useState<'side-by-side' | 'stacked'>('side-by-side');
  const [copiedRef, setCopiedRef] = useState(false);

  // Follow-up interviewer chat state
  const [chatHistory, setChatHistory] = useState<FollowUpMessage[]>(() =>
    followUpQuestion
      ? [
          {
            role: 'interviewer',
            content: followUpQuestion,
            timestamp: submission.timestamp
          }
        ]
      : [
          {
            role: 'interviewer',
            content:
              'Ask me about complexity optimizations, missed edge cases, or how this solution scales under production load.',
            timestamp: submission.timestamp
          }
        ]
  );
  const [chatInput, setChatInput] = useState('');
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const getScoreTheme = (scoreVal: number) => {
    if (scoreVal >= 90) {
      return {
        badge: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
        ring: 'border-emerald-500',
        label: 'Excellent Solution'
      };
    }
    if (scoreVal >= 75) {
      return {
        badge: 'bg-indigo-50 dark:bg-[#2a101d] border-indigo-200 dark:border-pink-400/30 text-indigo-700 dark:text-pink-300',
        ring: 'border-indigo-500 dark:border-pink-400',
        label: 'Strong Performance'
      };
    }
    if (scoreVal >= 50) {
      return {
        badge: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300',
        ring: 'border-amber-500',
        label: 'Needs Refinement'
      };
    }
    return {
      badge: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300',
      ring: 'border-rose-500',
      label: 'Needs Rework'
    };
  };

  const theme = getScoreTheme(score);
  const durationLabel = formatDuration(submission.durationSeconds);

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(modelAnswer);
      setCopiedRef(true);
      window.setTimeout(() => setCopiedRef(false), 1800);
    } catch {
      // ignore clipboard failures
    }
  };

  const handleExportMarkdown = () => {
    const lines = [
      `# MockMind Evaluation Report: ${submission.questionTitle}`,
      '',
      `- **Category:** ${submission.category}`,
      `- **Type:** ${submission.type}`,
      `- **Score:** ${score}% (${theme.label})`,
      `- **Date:** ${new Date(submission.timestamp).toLocaleString()}`,
      durationLabel ? `- **Duration:** ${durationLabel}` : '',
      submission.hintsUsed ? `- **Hints Used:** ${submission.hintsUsed}/3` : '',
      '',
      '## Summary',
      summary,
      '',
      '## Technical Correctness & Rubric Coverage',
      correctness,
      '',
      '## Strengths',
      ...(strengths.length > 0 ? strengths.map((s) => `- ${s}`) : ['- None recorded.']),
      '',
      '## Areas for Improvement',
      ...(weaknesses.length > 0 ? weaknesses.map((w) => `- ${w}`) : ['- No major gaps identified.']),
      '',
      '## Your Submission',
      '```' + (submission.codeLanguage?.toLowerCase() || ''),
      submission.answerText,
      '```',
      '',
      '## Reference Solution',
      '```' + (submission.codeLanguage?.toLowerCase() || ''),
      modelAnswer,
      '```'
    ].filter(Boolean);

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${submission.questionId || 'evaluation'}-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sendFollowUpMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sendingFollowUp) return;

    const userMsg: FollowUpMessage = {
      role: 'candidate',
      content: trimmed,
      timestamp: new Date().toISOString()
    };

    const nextHistory = [...chatHistory, userMsg];
    setChatHistory(nextHistory);
    setChatInput('');
    setChatError(null);
    setSendingFollowUp(true);

    try {
      const res = await fetch('/api/followup', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          submissionId: submission.id,
          history: chatHistory,
          userMessage: trimmed
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not reach follow-up interviewer.');
      }
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'interviewer',
          content: data.reply,
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (err: any) {
      setChatError(err.message || 'Follow-up request failed.');
    } finally {
      setSendingFollowUp(false);
    }
  };

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendFollowUpMessage(chatInput);
  };

  const quickFollowUpPrompts = [
    'How can I optimize time and space complexity?',
    'Which edge cases should I handle next?',
    'How would this change at 100x scale?'
  ];

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <button
          type="button"
          onClick={onBackToPool || (() => onRetry(false))}
          className="text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] hover:text-slate-900 dark:hover:text-[#fdf2f8] transition-colors cursor-pointer"
        >
          ← Return to Question Pool
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="text-xs bg-white dark:bg-[#26131d] hover:bg-slate-50 dark:hover:bg-[#331a27] text-slate-700 dark:text-[#e7c6d7] border border-slate-200 dark:border-[#3b1d2c] font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export .md
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="text-xs bg-white dark:bg-[#26131d] hover:bg-slate-50 dark:hover:bg-[#331a27] text-slate-700 dark:text-[#e7c6d7] border border-slate-200 dark:border-[#3b1d2c] font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>

          <button
            type="button"
            onClick={() => onRetry(true)}
            className="text-xs bg-slate-900 hover:bg-slate-800 dark:bg-pink-600 dark:hover:bg-pink-500 text-white font-semibold flex items-center gap-1.5 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refine & Retry Attempt
          </button>
        </div>
      </div>

      {/* Main Score Overview */}
      <div className="bg-white dark:bg-[#1b0d14] rounded-2xl border border-slate-200 dark:border-[#3b1d2c] p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-3 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 dark:border-[#3b1d2c] pb-6 md:pb-0">
            <div className={`w-28 h-28 rounded-full border-[7px] ${theme.ring} flex flex-col items-center justify-center bg-slate-50 dark:bg-[#12080d]`}>
              <span className="text-3xl font-extrabold font-display tabular-nums text-slate-900 dark:text-[#fdf2f8]">{score}</span>
              <span className="text-[10px] text-slate-400 dark:text-[#b88aa1] font-mono">/ 100</span>
            </div>
            <div className={`mt-3 text-xs font-semibold px-3 py-1 rounded-lg border ${theme.badge}`}>
              {theme.label}
            </div>
          </div>

          <div className="md:col-span-9 space-y-2.5">
            <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 dark:text-[#b88aa1]">
              <span className="font-semibold text-indigo-600 dark:text-pink-300">{submission.category}</span>
              <span aria-hidden="true">·</span>
              <span>{new Date(submission.timestamp).toLocaleString()}</span>
              {durationLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                    <Clock className="w-3 h-3" />
                    {durationLabel}
                  </span>
                </>
              )}
              {typeof submission.hintsUsed === 'number' && submission.hintsUsed > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums text-amber-600 dark:text-amber-300">
                    <Lightbulb className="w-3 h-3" />
                    {submission.hintsUsed} {submission.hintsUsed === 1 ? 'hint' : 'hints'} used
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-[#fdf2f8] leading-tight">
              {submission.questionTitle}
            </h1>
            <p className="text-sm text-slate-600 dark:text-[#e7c6d7] leading-relaxed">
              {summary}
            </p>
          </div>
        </div>
      </div>

      {/* Strengths and Areas for Growth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-emerald-200/80 dark:border-emerald-500/25 p-5">
          <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            Strengths
          </h2>
          {strengths && strengths.length > 0 ? (
            <ul className="space-y-2">
              {strengths.map((s, idx) => (
                <li
                  key={idx}
                  className="text-xs text-slate-700 dark:text-[#e7c6d7] flex items-start gap-2 bg-emerald-50/40 dark:bg-emerald-950/25 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20"
                >
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400 dark:text-[#b88aa1] italic">
              No standout highlights recorded. Review the reference solution below.
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-rose-200/80 dark:border-rose-500/25 p-5">
          <h2 className="text-sm font-bold text-rose-800 dark:text-rose-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            Areas for Improvement
          </h2>
          {weaknesses && weaknesses.length > 0 ? (
            <ul className="space-y-2">
              {weaknesses.map((w, idx) => (
                <li
                  key={idx}
                  className="text-xs text-slate-700 dark:text-[#e7c6d7] flex items-start gap-2 bg-rose-50/40 dark:bg-rose-950/25 p-2.5 rounded-lg border border-rose-100 dark:border-rose-500/20"
                >
                  <span className="text-rose-600 dark:text-rose-400 font-bold shrink-0">!</span>
                  <span className="leading-relaxed">{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-500/25">
              No major design flaws or gaps identified in this submission.
            </p>
          )}
        </div>
      </div>

      {/* Technical Correctness */}
      <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-5">
        <h2 className="text-sm font-bold text-slate-900 dark:text-[#fdf2f8] mb-2.5 flex items-center gap-1.5 font-display">
          <Star className="w-4 h-4 text-indigo-500 dark:text-pink-400" />
          Technical Correctness & Rubric Coverage
        </h2>
        <p className="text-xs text-slate-700 dark:text-[#e7c6d7] leading-relaxed bg-slate-50 dark:bg-[#12080d] p-4 rounded-xl border border-slate-200 dark:border-[#3b1d2c] whitespace-pre-wrap">
          {correctness}
        </p>
      </div>

      {/* Follow-Up Interviewer Q&A Chat */}
      <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-5 space-y-4 no-print">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-[#3b1d2c] pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#fdf2f8] font-display flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-indigo-500 dark:text-pink-400" />
              Follow-Up Interviewer Q&A
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-0.5">
              Practice responding to follow-up probes or ask how to refine your approach.
            </p>
          </div>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                msg.role === 'interviewer'
                  ? 'bg-indigo-50/60 dark:bg-[#26131d] border-indigo-200/70 dark:border-[#3b1d2c] text-slate-800 dark:text-[#fdf2f8]'
                  : 'bg-slate-50 dark:bg-[#160910] border-slate-200 dark:border-[#3b1d2c] text-slate-700 dark:text-[#e7c6d7] ml-6'
              }`}
            >
              <div className="text-[10px] font-mono uppercase tracking-wider mb-1 font-semibold text-indigo-600 dark:text-pink-300">
                {msg.role === 'interviewer' ? 'Interviewer' : 'You'}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {quickFollowUpPrompts.map((promptText) => (
            <button
              key={promptText}
              type="button"
              disabled={sendingFollowUp}
              onClick={() => sendFollowUpMessage(promptText)}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#3b1d2c] bg-slate-50 dark:bg-[#26131d] hover:border-indigo-300 dark:hover:border-pink-400 text-slate-600 dark:text-[#e7c6d7] transition-colors cursor-pointer"
            >
              {promptText}
            </button>
          ))}
        </div>

        {chatError && (
          <div className="p-2.5 text-xs bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 rounded-lg text-rose-700 dark:text-rose-200">
            {chatError}
          </div>
        )}

        <form onSubmit={handleFollowUpSubmit} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Reply to the interviewer's follow-up or ask a question..."
            disabled={sendingFollowUp}
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c] text-slate-900 dark:text-[#fdf2f8] placeholder:text-slate-400 dark:placeholder:text-[#8f5d76] outline-none focus:border-indigo-500 dark:focus:border-pink-400"
          />
          <button
            type="submit"
            disabled={sendingFollowUp || !chatInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingFollowUp ? 'Sending...' : 'Send'}</span>
          </button>
        </form>
      </div>

      {/* Line-Level Code Diagnostics */}
      {codeReview && codeReview.suggestions && codeReview.suggestions.length > 0 && (
        <div className="bg-slate-900 dark:bg-[#160910] text-slate-200 rounded-xl border border-slate-800 dark:border-[#3b1d2c] p-5">
          <h2 className="text-xs font-mono uppercase tracking-wider text-indigo-300 dark:text-pink-300 mb-3 flex items-center gap-2 border-b border-slate-800 dark:border-[#3b1d2c] pb-2.5">
            <MessageSquareCode className="w-4 h-4" />
            Line-Level Code Review
          </h2>
          <div className="space-y-3">
            {codeReview.suggestions.map((s, idx) => {
              const severityBadge = {
                critical: 'bg-rose-950 text-rose-300 border-rose-800',
                warning: 'bg-amber-950 text-amber-300 border-amber-800',
                info: 'bg-slate-800 text-slate-300 border-slate-700'
              }[s.severity] || 'bg-slate-800 text-slate-300 border-slate-700';

              return (
                <div key={idx} className="bg-slate-950 dark:bg-[#1b0d14] border border-slate-800 dark:border-[#3b1d2c] rounded-lg p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-400 dark:text-[#b88aa1]">
                      {s.line ? `Line ${s.line}` : 'General'}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold border ${severityBadge}`}>
                      {s.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 dark:text-[#fdf2f8] leading-relaxed">{s.message}</p>
                  {s.suggestion && (
                    <div className="bg-slate-900 dark:bg-[#12080d] border border-slate-800 dark:border-[#3b1d2c] p-2.5 rounded-md mt-2 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                      <div className="text-[10px] font-sans text-slate-400 mb-1">Suggested improvement:</div>
                      <pre className="whitespace-pre-wrap">{s.suggestion}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Side-by-Side vs Stacked Solution Comparison */}
      <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 dark:border-[#3b1d2c] pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#fdf2f8] font-display flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-500 dark:text-pink-400" />
              Solution Comparison
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-0.5">
              Compare your submitted answer directly against the reference solution.
            </p>
          </div>

          <div className="flex items-center gap-2 no-print">
            <div className="flex items-center p-1 bg-slate-100 dark:bg-[#26131d] rounded-lg border border-slate-200 dark:border-[#3b1d2c]">
              <button
                type="button"
                onClick={() => setCompareLayout('side-by-side')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  compareLayout === 'side-by-side'
                    ? 'bg-white dark:bg-[#1b0d14] text-slate-900 dark:text-[#fdf2f8] shadow-xs'
                    : 'text-slate-500 dark:text-[#b88aa1]'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                Side-by-Side
              </button>
              <button
                type="button"
                onClick={() => setCompareLayout('stacked')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  compareLayout === 'stacked'
                    ? 'bg-white dark:bg-[#1b0d14] text-slate-900 dark:text-[#fdf2f8] shadow-xs'
                    : 'text-slate-500 dark:text-[#b88aa1]'
                }`}
              >
                <Rows2 className="w-3.5 h-3.5" />
                Stacked
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyReference}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#26131d] text-xs font-semibold text-slate-700 dark:text-[#e7c6d7] hover:bg-slate-50 dark:hover:bg-[#331a27] transition-colors cursor-pointer whitespace-nowrap"
            >
              {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedRef ? 'Copied' : 'Copy Reference'}
            </button>
          </div>
        </div>

        <div className={`grid gap-4 ${compareLayout === 'side-by-side' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          <div className="space-y-2 min-w-0">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-[#e7c6d7]">Your Submission</h3>
            {submission.type === 'coding' ? (
              <CodeEditor
                value={submission.answerText}
                language={submission.codeLanguage || 'TypeScript'}
                readOnly
                minHeight="240px"
                maxHeight="380px"
                className="rounded-lg"
              />
            ) : (
              <div className="bg-slate-50 dark:bg-[#12080d] border border-slate-200 dark:border-[#3b1d2c] rounded-lg p-4 text-xs text-slate-700 dark:text-[#e7c6d7] max-h-[360px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {submission.answerText}
              </div>
            )}
          </div>

          <div className="space-y-2 min-w-0">
            <h3 className="text-xs font-semibold text-indigo-700 dark:text-pink-300">Reference Solution</h3>
            {submission.type === 'coding' ? (
              <CodeEditor
                value={modelAnswer}
                language={submission.codeLanguage || 'TypeScript'}
                readOnly
                minHeight="240px"
                maxHeight="380px"
                className="rounded-lg"
              />
            ) : (
              <div className="bg-slate-50 dark:bg-[#12080d] border border-indigo-200/70 dark:border-pink-400/25 rounded-lg p-4 text-xs text-slate-700 dark:text-[#e7c6d7] max-h-[360px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {modelAnswer}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 pt-2 no-print">
        <button
          type="button"
          onClick={() => onRetry(false)}
          className="text-xs text-slate-500 dark:text-[#b88aa1] hover:underline font-semibold cursor-pointer"
        >
          Start Fresh on This Question
        </button>
        <button
          type="button"
          onClick={onBackToPool || (() => onRetry(false))}
          className="text-xs text-indigo-600 dark:text-pink-300 hover:underline font-semibold cursor-pointer"
        >
          Return to Question Pool
        </button>
      </div>
    </div>
  );
}

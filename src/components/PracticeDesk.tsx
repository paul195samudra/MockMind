import React, { useState, useEffect, useRef } from 'react';
import { Question, SqlExecutionResult } from '../types';
import {
  Play,
  RotateCcw,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Terminal,
  Code,
  BookOpen,
  Clock,
  Pause,
  Check,
  Mic,
  MicOff,
  Bookmark,
  Database,
  Cpu
} from 'lucide-react';
import { runUnitTests, TestSuiteResult } from '../utils/testRunner';
import { getAuthHeaders } from '../utils/auth';
import { CodeEditor } from './CodeEditor';
import { ConfirmModal } from './ConfirmModal';

interface HintItem {
  level: number;
  title: string;
  hint: string;
}

interface PracticeDeskProps {
  question: Question;
  onSubmit: (
    answerText: string,
    language?: string,
    durationSeconds?: number,
    hintsUsed?: number
  ) => Promise<void>;
  isSubmitting: boolean;
  onBack: () => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (questionId: string) => void;
  initialDraftOverride?: { answerText: string; codeLanguage?: string } | null;
  mockMode?: {
    currentIndex: number;
    totalCount: number;
    submitLabel?: string;
    onDraftSync?: (answerText: string, language?: string, hintsUsed?: number) => void;
  };
}

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function PracticeDesk({
  question,
  onSubmit,
  isSubmitting,
  onBack,
  isBookmarked = false,
  onToggleBookmark,
  initialDraftOverride = null,
  mockMode
}: PracticeDeskProps) {
  const draftStorageKey = `mockmind_draft_${question.id}`;

  const [answerText, setAnswerText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('TypeScript');
  const [errorWordCount, setErrorWordCount] = useState<string | null>(null);
  const [testSuiteResult, setTestSuiteResult] = useState<TestSuiteResult | null>(null);
  const [sqlResult, setSqlResult] = useState<SqlExecutionResult | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Progressive Hints state
  const [hints, setHints] = useState<HintItem[]>([]);
  const [loadingHint, setLoadingHint] = useState(false);
  const [hintError, setHintError] = useState<string | null>(null);

  // Voice Dictation state for conceptual responses
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Interview stopwatch & auto-save draft indicators
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved' | 'restored'>('idle');
  const [showResetModal, setShowResetModal] = useState(false);
  const isInitializedRef = useRef(false);
  const onDraftSyncRef = useRef(mockMode?.onDraftSync);
  onDraftSyncRef.current = mockMode?.onDraftSync;

  // Stop speech recognition cleanly when unmounting or switching question
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, [question.id]);

  // Load initial code, retry override, or saved draft per question
  useEffect(() => {
    isInitializedRef.current = false;
    const defaultAnswer = question.type === 'coding' ? (question.initialCode || '') : '';
    const defaultLang = question.category === 'Databases' ? 'SQL' : 'TypeScript';

    if (initialDraftOverride && typeof initialDraftOverride.answerText === 'string') {
      setAnswerText(initialDraftOverride.answerText);
      setSelectedLanguage(initialDraftOverride.codeLanguage || defaultLang);
      setDraftStatus('restored');
    } else {
      try {
        const savedRaw = localStorage.getItem(draftStorageKey);
        if (savedRaw) {
          const parsed = JSON.parse(savedRaw);
          if (
            typeof parsed.answerText === 'string' &&
            parsed.answerText.trim() !== '' &&
            parsed.answerText !== defaultAnswer
          ) {
            setAnswerText(parsed.answerText);
            setSelectedLanguage(parsed.language || defaultLang);
            setDraftStatus('restored');
          } else {
            setAnswerText(defaultAnswer);
            setSelectedLanguage(defaultLang);
            setDraftStatus('idle');
          }
        } else {
          setAnswerText(defaultAnswer);
          setSelectedLanguage(defaultLang);
          setDraftStatus('idle');
        }
      } catch {
        setAnswerText(defaultAnswer);
        setSelectedLanguage(defaultLang);
        setDraftStatus('idle');
      }
    }

    setErrorWordCount(null);
    setTestSuiteResult(null);
    setSqlResult(null);
    setHints([]);
    setHintError(null);
    setSpeechError(null);
    setInterimTranscript('');
    setIsListening(false);
    setElapsedSeconds(0);
    setTimerRunning(true);
    isInitializedRef.current = true;
  }, [question.id, question.type, question.initialCode, question.category, draftStorageKey, initialDraftOverride]);

  // Auto-save draft changes and notify mock session parent if active
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (onDraftSyncRef.current) {
      onDraftSyncRef.current(answerText, question.type === 'coding' ? selectedLanguage : undefined, hints.length);
    }
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(
          draftStorageKey,
          JSON.stringify({ answerText, language: selectedLanguage, updatedAt: Date.now() })
        );
        if (answerText.trim()) {
          setDraftStatus('saved');
        }
      } catch {
        // ignore storage quota failures
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [answerText, selectedLanguage, hints.length, draftStorageKey, question.type]);

  // Interview timer tick
  useEffect(() => {
    if (!timerRunning || isSubmitting) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning, isSubmitting]);

  const confirmReset = () => {
    const fallback = question.type === 'coding' ? (question.initialCode || '') : '';
    setAnswerText(fallback);
    setTestSuiteResult(null);
    setSqlResult(null);
    setErrorWordCount(null);
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {
      // ignore
    }
    setDraftStatus('idle');
    setShowResetModal(false);
  };

  const handleRequestHint = async () => {
    if (loadingHint || hints.length >= 3) return;
    const nextLevel = hints.length + 1;
    setLoadingHint(true);
    setHintError(null);

    try {
      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          questionId: question.id,
          currentAnswer: answerText,
          hintLevel: nextLevel
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not load progressive hint.');
      }
      setHints((prev) => [
        ...prev,
        {
          level: nextLevel,
          title: data.title || `Hint ${nextLevel}`,
          hint: data.hint
        }
      ]);
    } catch (err: any) {
      setHintError(err.message || 'Unable to generate hint.');
    } finally {
      setLoadingHint(false);
    }
  };

  const toggleVoiceDictation = () => {
    setSpeechError(null);
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechError('Voice dictation is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        if (finalChunk) {
          setAnswerText((prev) => {
            const spacer = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
            return prev + spacer + finalChunk.trim();
          });
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        setSpeechError(
          event.error === 'not-allowed'
            ? 'Microphone access was denied. Enable mic permission to use voice mode.'
            : `Voice recognition stopped (${event.error}).`
        );
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      setSpeechError('Unable to initialize microphone recognition.');
      setIsListening(false);
    }
  };

  const handleRunVerification = async () => {
    if (!answerText.trim() || isRunningTests || isSubmitting) return;
    setIsRunningTests(true);
    setTestSuiteResult(null);
    setSqlResult(null);

    try {
      if (selectedLanguage === 'SQL') {
        const res = await fetch('/api/run-sql', {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ questionId: question.id, query: answerText })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && !data.error) {
          throw new Error('SQL sandbox execution failed.');
        }
        setSqlResult({
          columns: data.columns || [],
          rows: data.rows || [],
          rowCount: data.rowCount || 0,
          executedStatements: data.executedStatements || 0,
          error: data.error
        });
        return;
      }

      if (selectedLanguage === 'Python' || selectedLanguage === 'Java') {
        const res = await fetch('/api/dry-run', {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            questionId: question.id,
            code: answerText,
            codeLanguage: selectedLanguage
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'AI Dry-Run check failed.');
        }
        setTestSuiteResult({
          passed: Boolean(data.passed),
          cases: Array.isArray(data.cases) ? data.cases : [],
          error: data.error
        });
        return;
      }

      // JavaScript / TypeScript: Run instant browser unit test runner
      const results = await runUnitTests(question, answerText);
      if (results.noLocalSuite) {
        // Automatically delegate custom coding questions without JS unit cases to AI Dry-Run Check
        const res = await fetch('/api/dry-run', {
          method: 'POST',
          headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            questionId: question.id,
            code: answerText,
            codeLanguage: selectedLanguage
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'No local unit tests configured for this custom challenge.');
        }
        setTestSuiteResult({
          passed: Boolean(data.passed),
          cases: Array.isArray(data.cases) ? data.cases : [],
          error: data.error
        });
      } else {
        setTestSuiteResult(results);
      }
    } catch (e: any) {
      setTestSuiteResult({
        passed: false,
        cases: [],
        error: e.message || 'Error running verification.'
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const triggerSubmit = () => {
    if (isSubmitting) return;
    if (!answerText.trim()) {
      setErrorWordCount('Answer cannot be empty. Please write your solution before submitting.');
      return;
    }
    if (question.type === 'conceptual' && answerText.trim().split(/\s+/).length < 15) {
      setErrorWordCount('Please write a more detailed response (at least 15 words) so the evaluator can assess your reasoning thoroughly.');
      return;
    }
    setErrorWordCount(null);
    onSubmit(
      answerText,
      question.type === 'coding' ? selectedLanguage : undefined,
      elapsedSeconds,
      hints.length
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSubmit();
  };

  const wordCount = answerText.trim() ? answerText.trim().split(/\s+/).length : 0;
  const lineCount = answerText ? answerText.split('\n').length : 0;

  // Format question instructions
  const formattedDescription = question.description.split('\n').map((line, index) => {
    if (line.trim().startsWith('###')) {
      return (
        <h4 key={index} className="text-sm font-semibold text-slate-900 dark:text-[#fdf2f8] mt-4 mb-2 first:mt-0 font-display">
          {line.replace('###', '').trim()}
        </h4>
      );
    }
    if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
      return (
        <li key={index} className="text-xs text-slate-600 dark:text-[#e7c6d7] ml-4 list-disc mb-1 leading-relaxed">
          {line.replace(/^[-*]\s*/, '').trim()}
        </li>
      );
    }
    if (line.trim().match(/^\d+\./)) {
      return (
        <li key={index} className="text-xs text-slate-600 dark:text-[#e7c6d7] ml-4 list-decimal mb-1 leading-relaxed">
          {line.replace(/^\d+\.\s*/, '').trim()}
        </li>
      );
    }
    return (
      <p key={index} className="text-xs text-slate-600 dark:text-[#e7c6d7] mb-2 leading-relaxed">
        {line}
      </p>
    );
  });

  const isDryRunLanguage = selectedLanguage === 'Python' || selectedLanguage === 'Java';
  const isSqlLanguage = selectedLanguage === 'SQL';

  return (
    <>
      <div className="bg-white dark:bg-[#1b0d14] rounded-2xl border border-slate-200 dark:border-[#3b1d2c] shadow-sm overflow-hidden min-h-[580px]">
        {/* Header bar */}
        <div className="bg-slate-50 dark:bg-[#160910] border-b border-slate-200 dark:border-[#3b1d2c] px-6 py-3.5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {!mockMode && (
              <>
                <button
                  type="button"
                  onClick={onBack}
                  className="text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] hover:text-slate-900 dark:hover:text-[#fdf2f8] transition-colors cursor-pointer whitespace-nowrap"
                >
                  ← Back to Pool
                </button>
                <span className="text-slate-300 dark:text-[#3b1d2c]">|</span>
              </>
            )}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-indigo-600 dark:text-pink-300">{question.category}</span>
              <span aria-hidden="true" className="text-slate-400">·</span>
              <span className="text-slate-500 dark:text-[#b88aa1]">{question.difficulty}</span>
              {mockMode && (
                <>
                  <span aria-hidden="true" className="text-slate-400">·</span>
                  <span className="font-mono text-slate-700 dark:text-pink-200">
                    Question {mockMode.currentIndex + 1} of {mockMode.totalCount}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onToggleBookmark && (
              <button
                type="button"
                onClick={() => onToggleBookmark(question.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  isBookmarked
                    ? 'border-indigo-300 dark:border-pink-400/50 bg-indigo-50 dark:bg-[#2a101d] text-indigo-700 dark:text-pink-300'
                    : 'border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#26131d] text-slate-600 dark:text-[#b88aa1] hover:text-slate-900 dark:hover:text-[#fdf2f8]'
                }`}
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark challenge'}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                <span>{isBookmarked ? 'Saved' : 'Save'}</span>
              </button>
            )}

            {/* Progressive Hint Button */}
            <button
              type="button"
              onClick={handleRequestHint}
              disabled={loadingHint || hints.length >= 3 || isSubmitting}
              className="flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-950/50 disabled:opacity-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
              title="Get a progressive conceptual nudge without spoiling the full solution"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{loadingHint ? 'Thinking...' : `Get Hint (${hints.length}/3)`}</span>
            </button>

            {/* Interview Stopwatch */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#26131d] px-2.5 py-1 text-xs font-mono tabular-nums text-slate-700 dark:text-[#fdf2f8]">
              <Clock className="w-3.5 h-3.5 text-indigo-500 dark:text-pink-400" />
              <span>{formatTimer(elapsedSeconds)}</span>
              <button
                type="button"
                onClick={() => setTimerRunning((r) => !r)}
                className="ml-1 text-slate-400 hover:text-slate-700 dark:text-[#b88aa1] dark:hover:text-[#fdf2f8] cursor-pointer"
                title={timerRunning ? 'Pause timer' : 'Resume timer'}
              >
                {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            </div>

            {question.type === 'coding' && (
              <div className="flex items-center gap-1.5">
                <label htmlFor="practice-lang-select" className="text-xs text-slate-500 dark:text-[#b88aa1] font-medium">
                  Language:
                </label>
                <select
                  id="practice-lang-select"
                  value={selectedLanguage}
                  onChange={(e) => {
                    setSelectedLanguage(e.target.value);
                    setTestSuiteResult(null);
                    setSqlResult(null);
                  }}
                  className="bg-white dark:bg-[#26131d] border border-slate-200 dark:border-[#3b1d2c] text-xs text-slate-800 dark:text-[#fdf2f8] rounded-lg px-2.5 py-1 focus:border-indigo-500 dark:focus:border-pink-400 outline-none font-mono"
                >
                  <option value="TypeScript">TypeScript</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="Python">Python</option>
                  <option value="SQL">SQL</option>
                  <option value="Java">Java</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid Workspace */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
          {/* Left column: Problem Statement + Progressive Hints */}
          <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-[#3b1d2c] max-h-[660px] overflow-y-auto">
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-[#fdf2f8] mb-2">
              {question.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#b88aa1] mb-4">
              <span className="flex items-center gap-1 font-medium">
                {question.type === 'coding' ? (
                  <>
                    <Code className="w-3.5 h-3.5 text-indigo-500 dark:text-pink-400" />
                    Coding Challenge
                  </>
                ) : (
                  <>
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500 dark:text-pink-400" />
                    Conceptual Analysis
                  </>
                )}
              </span>
              <span aria-hidden="true">·</span>
              <span>{question.difficulty}</span>
              {question.testCases && question.testCases.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {question.testCases.length} tests
                  </span>
                </>
              )}
            </div>

            <div className="space-y-2 mb-6">{formattedDescription}</div>

            {/* Progressive Hints Drawer */}
            {(hints.length > 0 || hintError) && (
              <div className="mb-5 space-y-2.5">
                {hintError && (
                  <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-200">
                    {hintError}
                  </div>
                )}
                {hints.map((h) => (
                  <div
                    key={h.level}
                    className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/25 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                      <span className="flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" />
                        Hint {h.level}: {h.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-[#e7c6d7] leading-relaxed">{h.hint}</p>
                  </div>
                ))}
              </div>
            )}

            {isSqlLanguage && (
              <div className="bg-slate-50 dark:bg-[#26131d]/70 p-3.5 rounded-xl border border-slate-200 dark:border-[#3b1d2c] mb-4 text-xs">
                <div className="font-semibold text-slate-800 dark:text-[#fdf2f8] flex items-center gap-1.5 mb-1">
                  <Database className="w-3.5 h-3.5 text-indigo-500 dark:text-pink-400" />
                  SQL Sandbox Tables Available
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#b88aa1] font-mono leading-relaxed">
                  {question.sqlSetup
                    ? 'Custom problem dataset loaded cleanly in isolated memory.'
                    : 'departments, employees, customers, orders, transactions, prescriptions'}
                </p>
              </div>
            )}

            {question.expectedOutcomes && question.expectedOutcomes.length > 0 && (
              <div className="bg-slate-50 dark:bg-[#26131d]/70 p-4 rounded-xl border border-slate-200 dark:border-[#3b1d2c] mb-4">
                <h4 className="text-xs font-semibold text-slate-800 dark:text-[#fdf2f8] mb-2 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  Evaluation Criteria
                </h4>
                <ul className="space-y-1.5">
                  {question.expectedOutcomes.map((outcome, idx) => (
                    <li key={idx} className="text-xs text-slate-600 dark:text-[#e7c6d7] flex items-start gap-1.5 leading-snug">
                      <span className="text-indigo-500 dark:text-pink-400 font-bold shrink-0">✓</span>
                      {outcome}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {question.keywords && question.keywords.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-[#b88aa1] mb-1.5">
                  Key Concepts
                </h4>
                <p className="text-xs font-mono text-slate-600 dark:text-[#e7c6d7] leading-relaxed">
                  {question.keywords.join(' · ')}
                </p>
              </div>
            )}
          </div>

          {/* Right column: IDE / Response Editor */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-slate-50/50 dark:bg-[#12080d]/60">
            <div className="p-6 flex-grow flex flex-col">
              <div className="flex items-center justify-between mb-2.5 gap-2 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-slate-700 dark:text-[#fdf2f8] font-mono flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-slate-400 dark:text-pink-400" />
                    {question.type === 'coding' ? 'Code Workspace' : 'Response Editor'}
                  </span>
                  {draftStatus !== 'idle' && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {draftStatus === 'restored' ? 'Draft restored' : 'Draft saved'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {question.type === 'conceptual' && (
                    <button
                      type="button"
                      onClick={toggleVoiceDictation}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        isListening
                          ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
                          : 'bg-white dark:bg-[#26131d] border-slate-200 dark:border-[#3b1d2c] text-slate-600 dark:text-[#e7c6d7] hover:border-indigo-300 dark:hover:border-pink-400'
                      }`}
                      title="Speak your answer aloud using browser voice dictation"
                    >
                      {isListening ? <MicOff className="w-3.5 h-3.5 animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{isListening ? 'Stop Speaking' : 'Voice Answer'}</span>
                    </button>
                  )}

                  <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-[#b88aa1]">
                    {question.type === 'coding' ? `${lineCount} lines` : `${wordCount} words`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="text-xs text-slate-500 dark:text-[#b88aa1] hover:text-slate-800 dark:hover:text-[#fdf2f8] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
              </div>

              {speechError && (
                <div className="mb-2.5 p-2.5 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 rounded-lg text-amber-800 dark:text-amber-200">
                  {speechError}
                </div>
              )}

              {isListening && (
                <div className="mb-2.5 p-2.5 text-xs bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 rounded-lg text-rose-700 dark:text-rose-200 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    Listening... speak clearly to transcribe into your response.
                  </span>
                  {interimTranscript && (
                    <span className="italic opacity-80 truncate max-w-xs">{interimTranscript}</span>
                  )}
                </div>
              )}

              <div className="relative flex-grow flex flex-col">
                {question.type === 'coding' ? (
                  <>
                    <div className="bg-slate-900 dark:bg-[#26131d] text-slate-300 dark:text-[#e7c6d7] rounded-t-lg px-4 py-1.5 text-xs font-mono flex items-center justify-between select-none border border-b-0 border-slate-800 dark:border-[#3b1d2c]">
                      <span>
                        solution.
                        {selectedLanguage === 'SQL'
                          ? 'sql'
                          : selectedLanguage === 'Python'
                          ? 'py'
                          : selectedLanguage === 'Java'
                          ? 'java'
                          : selectedLanguage === 'JavaScript'
                          ? 'js'
                          : 'ts'}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-[#b88aa1]">
                        Tab to indent · Ctrl/Cmd+Enter to submit
                      </span>
                    </div>
                    <CodeEditor
                      value={answerText}
                      onChange={setAnswerText}
                      language={selectedLanguage}
                      readOnly={isSubmitting}
                      placeholder={
                        selectedLanguage === 'SQL'
                          ? '-- Write your SQL query here...\nSELECT * FROM employees;'
                          : '// Write your solution here...'
                      }
                      minHeight="340px"
                      maxHeight="440px"
                      onSubmitShortcut={triggerSubmit}
                      className="rounded-b-lg"
                    />
                  </>
                ) : (
                  <textarea
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        triggerSubmit();
                      }
                    }}
                    placeholder="Structure your answer clearly (or use Voice Answer above): cover requirements, trade-offs, architecture or behavioral STAR points, and edge cases..."
                    disabled={isSubmitting}
                    className="w-full flex-grow min-h-[340px] max-h-[440px] p-4 text-sm bg-white dark:bg-[#160910] text-slate-900 dark:text-[#fdf2f8] placeholder:text-slate-400 dark:placeholder:text-[#8f5d76] border border-slate-200 dark:border-[#3b1d2c] rounded-lg outline-none focus:border-indigo-500 dark:focus:border-pink-400 resize-none transition-colors leading-relaxed"
                  />
                )}
              </div>

              {/* SQL Sandbox Output Table */}
              {question.type === 'coding' && sqlResult && (
                <div className="mt-4 bg-slate-900 dark:bg-[#160910] text-slate-100 rounded-xl border border-slate-800 dark:border-[#3b1d2c] p-4 font-mono text-xs overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-800 dark:border-[#3b1d2c] pb-2.5 mb-3">
                    <span className="font-semibold text-slate-100 flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      SQL Sandbox Result {sqlResult.error ? '(Error)' : `(${sqlResult.rowCount} rows)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSqlResult(null)}
                      className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  {sqlResult.error ? (
                    <div className="bg-rose-950/50 border border-rose-900/60 p-3 rounded-lg text-rose-200 leading-relaxed">
                      {sqlResult.error}
                    </div>
                  ) : sqlResult.columns.length === 0 ? (
                    <p className="text-slate-400 text-[11px]">Query executed cleanly with 0 returned rows.</p>
                  ) : (
                    <div className="overflow-x-auto max-h-[220px]">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-700 text-slate-300">
                            {sqlResult.columns.map((col) => (
                              <th key={col} className="px-2.5 py-1.5 font-semibold whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {sqlResult.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {sqlResult.columns.map((col) => (
                                <td key={col} className="px-2.5 py-1.5 text-slate-200 whitespace-nowrap">
                                  {row[col] === null ? 'NULL' : String(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Unit Test / AI Dry-Run Terminal Output */}
              {question.type === 'coding' && testSuiteResult && (
                <div className="mt-4 bg-slate-900 dark:bg-[#160910] text-slate-100 rounded-xl border border-slate-800 dark:border-[#3b1d2c] p-4 font-mono text-xs overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-800 dark:border-[#3b1d2c] pb-2.5 mb-3">
                    <span className="font-semibold text-slate-100">
                      {isDryRunLanguage ? 'AI Dry-Run Trace' : 'Test Suite'}: {testSuiteResult.passed ? 'All Passed' : 'Failed'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTestSuiteResult(null)}
                      className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  {testSuiteResult.error ? (
                    <div className="bg-rose-950/50 border border-rose-900/60 p-3 rounded-lg text-rose-200 leading-relaxed">
                      <div className="font-semibold mb-1 flex items-center gap-1.5 text-rose-300">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Runtime Error
                      </div>
                      <p className="text-[11px] whitespace-pre-wrap">{testSuiteResult.error}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      <div className="text-slate-400 text-[11px] border-b border-slate-800 pb-1.5 flex justify-between tabular-nums">
                        <span>Test Cases</span>
                        <span>
                          {testSuiteResult.cases.filter((c) => c.passed).length} / {testSuiteResult.cases.length} Passed
                        </span>
                      </div>
                      {testSuiteResult.cases.map((c, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
                            c.passed
                              ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-200'
                              : 'bg-rose-950/30 border-rose-900/50 text-rose-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold mb-1">
                            <span>{c.name}</span>
                            <span>{c.passed ? 'PASS' : 'FAIL'}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] text-slate-300 mt-1">
                            <div className="truncate" title={c.input}>IN: {c.input}</div>
                            <div className="truncate" title={c.expected}>EXPECT: {c.expected}</div>
                            <div className="truncate" title={c.actual}>
                              ACTUAL: <span className={c.passed ? 'text-emerald-300' : 'text-rose-300'}>{c.actual}</span>
                            </div>
                          </div>
                          {c.error && (
                            <div className="mt-1.5 text-rose-300 text-[10px] bg-rose-950/50 p-1.5 rounded border border-rose-900/40">
                              Error: {c.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {errorWordCount && (
                <div className="mt-3 p-3 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-500/30 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorWordCount}</span>
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="p-6 bg-white dark:bg-[#1b0d14] border-t border-slate-200 dark:border-[#3b1d2c] flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#b88aa1] max-w-sm">
                <Sparkles className="w-4 h-4 text-indigo-500 dark:text-pink-400 shrink-0" />
                <span>Submissions are evaluated on correctness, complexity, and edge-case handling.</span>
              </div>

              <div className="flex items-center gap-3">
                {question.type === 'coding' && (
                  <button
                    type="button"
                    disabled={isRunningTests || isSubmitting}
                    onClick={handleRunVerification}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-[#26131d] dark:hover:bg-[#331a27] disabled:opacity-50 text-xs text-white font-semibold py-2.5 px-4 rounded-xl border border-slate-700 dark:border-[#3b1d2c] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isRunningTests ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-white animate-spin" />
                        <span>{isSqlLanguage ? 'Executing SQL...' : isDryRunLanguage ? 'Tracing...' : 'Running Tests...'}</span>
                      </>
                    ) : isSqlLanguage ? (
                      <>
                        <Database className="w-4 h-4 text-emerald-400" />
                        <span>Run SQL Query</span>
                      </>
                    ) : isDryRunLanguage ? (
                      <>
                        <Cpu className="w-4 h-4 text-amber-400" />
                        <span>AI Dry-Run Check</span>
                      </>
                    ) : (
                      <>
                        <Code className="w-4 h-4 text-emerald-400" />
                        <span>Run Tests</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-500 disabled:opacity-60 text-xs text-white font-semibold py-2.5 px-5 rounded-xl shadow-sm cursor-pointer transition-colors whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      <span>Evaluating...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{mockMode?.submitLabel || 'Submit Solution'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <ConfirmModal
        open={showResetModal}
        title="Reset Workspace?"
        description="This will discard your current draft for this challenge and restore the starter template."
        confirmLabel="Reset Workspace"
        cancelLabel="Keep Editing"
        variant="danger"
        onConfirm={confirmReset}
        onCancel={() => setShowResetModal(false)}
      />
    </>
  );
}

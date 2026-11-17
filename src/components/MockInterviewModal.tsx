import React, { useState } from 'react';
import { MockExamConfig, Question, QuestionCategory, Submission } from '../types';
import { X, Timer, Play, Layers, Target, ShieldCheck, Cpu, Briefcase } from 'lucide-react';

interface MockInterviewModalProps {
  open: boolean;
  questions: Question[];
  submissions: Submission[];
  initialPresetTrack?: 'fullstack' | 'algorithms' | 'healthcare' | 'finance' | 'weak';
  onClose: () => void;
  onStart: (config: MockExamConfig) => void;
}

type TrackId = 'fullstack' | 'algorithms' | 'healthcare' | 'finance' | 'weak';

function pickQuestions(
  pool: Question[],
  count: number,
  predicate: (q: Question) => boolean,
  fallbackPool: Question[]
): Question[] {
  const primary = [...pool.filter(predicate)].sort(() => Math.random() - 0.5);
  const chosen: Question[] = [];
  for (const q of primary) {
    if (chosen.length >= count) break;
    chosen.push(q);
  }
  if (chosen.length < count) {
    const rest = [...fallbackPool.filter((q) => !chosen.some((c) => c.id === q.id))].sort(() => Math.random() - 0.5);
    for (const q of rest) {
      if (chosen.length >= count) break;
      chosen.push(q);
    }
  }
  return chosen;
}

export function MockInterviewModal({
  open,
  questions,
  submissions,
  initialPresetTrack = 'fullstack',
  onClose,
  onStart
}: MockInterviewModalProps) {
  const [track, setTrack] = useState<TrackId>(initialPresetTrack);
  const [questionCount, setQuestionCount] = useState<2 | 3>(3);
  const [difficultyPref, setDifficultyPref] = useState<'Mixed' | 'Easy-Medium' | 'Medium-Hard'>('Mixed');

  React.useEffect(() => {
    setTrack(initialPresetTrack);
  }, [initialPresetTrack, open]);

  if (!open) return null;

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

  const weakCategories = categories.filter((cat) => {
    const catSubs = submissions.filter((s) => s.category === cat);
    if (catSubs.length === 0) return true;
    const avg = catSubs.reduce((acc, s) => acc + s.evaluation.score, 0) / catSubs.length;
    return avg < 75;
  });

  const tracks = [
    {
      id: 'fullstack' as const,
      title: 'Full-Stack Engineering Loop',
      desc: 'Balanced mix of Coding, System Design / Databases, and Behavioral prompts.',
      icon: Layers
    },
    {
      id: 'algorithms' as const,
      title: 'Algorithms & Data Structures',
      desc: 'Focused problem-solving sprint testing logic, edge cases, and complexity.',
      icon: Cpu
    },
    {
      id: 'healthcare' as const,
      title: 'Pharmacy & Healthcare Track',
      desc: 'HIPAA pipelines, EHR workflows, NDC validation, and drug safety.',
      icon: ShieldCheck
    },
    {
      id: 'finance' as const,
      title: 'Banking & FinTech Track',
      desc: 'Double-entry ledgers, order matching, KYC/AML compliance, and APY math.',
      icon: Briefcase
    },
    {
      id: 'weak' as const,
      title: 'Weak Areas Focus Drill',
      desc: `Targets your ${weakCategories.length} below-75% or unpracticed domains automatically.`,
      icon: Target
    }
  ];

  const handleLaunch = () => {
    const diffFilter = (q: Question) => {
      if (difficultyPref === 'Easy-Medium') return q.difficulty === 'Easy' || q.difficulty === 'Medium';
      if (difficultyPref === 'Medium-Hard') return q.difficulty === 'Medium' || q.difficulty === 'Hard';
      return true;
    };

    const filteredPool = questions.filter(diffFilter);
    const activePool = filteredPool.length >= questionCount ? filteredPool : questions;

    let selected: Question[] = [];
    let label = 'Mock Interview Session';

    if (track === 'fullstack') {
      label = 'Full-Stack Engineering Loop';
      const coding = pickQuestions(activePool, 1, (q) => q.type === 'coding', activePool);
      const sysOrDb = pickQuestions(
        activePool,
        1,
        (q) => (q.category === 'System Design' || q.category === 'Databases') && !coding.some((c) => c.id === q.id),
        activePool
      );
      const behavioral = pickQuestions(
        activePool,
        1,
        (q) => q.category === 'Behavioral' && !coding.some((c) => c.id === q.id) && !sysOrDb.some((c) => c.id === q.id),
        activePool
      );
      selected = [...coding, ...sysOrDb, ...behavioral].slice(0, questionCount);
    } else if (track === 'algorithms') {
      label = 'Algorithms & Data Structures Sprint';
      selected = pickQuestions(
        activePool,
        questionCount,
        (q) => q.category === 'Algorithms' || q.category === 'Data Structures' || q.type === 'coding',
        activePool
      );
    } else if (track === 'healthcare') {
      label = 'Pharmacy & Healthcare Track';
      selected = pickQuestions(
        activePool,
        questionCount,
        (q) => q.category === 'Pharmacy & Healthcare',
        activePool
      );
    } else if (track === 'finance') {
      label = 'Banking & FinTech Track';
      selected = pickQuestions(
        activePool,
        questionCount,
        (q) => q.category === 'Banking & Finance',
        activePool
      );
    } else {
      label = 'Weak Areas Focus Drill';
      selected = pickQuestions(
        activePool,
        questionCount,
        (q) => weakCategories.includes(q.category),
        activePool
      );
    }

    onStart({
      id: `mock_${Date.now()}`,
      title: label,
      durationMinutes: questionCount === 2 ? 30 : 45,
      questions: selected
    });
  };

  return (
    <div className="fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1b0d14] border border-slate-200 dark:border-[#3b1d2c] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="bg-slate-900 dark:bg-[#160910] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 dark:border-[#3b1d2c]">
          <div className="flex items-center gap-2.5">
            <Timer className="w-5 h-5 text-indigo-400 dark:text-pink-400" />
            <div>
              <h2 className="text-sm font-bold font-display">Configure Timed Mock Interview</h2>
              <p className="text-[11px] text-slate-300 dark:text-[#b88aa1]">
                Simulate a multi-question loop with shared pacing and a combined readiness scorecard.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-[#e7c6d7] mb-2">
              Select Interview Track
            </label>
            <div className="space-y-2">
              {tracks.map((t) => {
                const Icon = t.icon;
                const active = track === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTrack(t.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                      active
                        ? 'border-indigo-500 dark:border-pink-400 bg-indigo-50/70 dark:bg-[#2a101d]'
                        : 'border-slate-200 dark:border-[#3b1d2c] bg-slate-50/60 dark:bg-[#160910] hover:border-slate-300 dark:hover:border-pink-400/40'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        active ? 'text-indigo-600 dark:text-pink-400' : 'text-slate-400 dark:text-[#b88aa1]'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-[#fdf2f8]">{t.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-[#b88aa1] mt-0.5">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#e7c6d7] mb-1.5">
                Length & Pacing
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { count: 2 as const, label: '2 Qs · 30m' },
                  { count: 3 as const, label: '3 Qs · 45m' }
                ]).map((opt) => (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => setQuestionCount(opt.count)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                      questionCount === opt.count
                        ? 'border-indigo-500 dark:border-pink-400 bg-indigo-50 dark:bg-[#2a101d] text-indigo-700 dark:text-pink-300'
                        : 'border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#26131d] text-slate-600 dark:text-[#b88aa1]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-[#e7c6d7] mb-1.5">
                Difficulty Range
              </label>
              <select
                value={difficultyPref}
                onChange={(e) => setDifficultyPref(e.target.value as any)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#26131d] text-xs font-medium text-slate-800 dark:text-[#fdf2f8] outline-none"
              >
                <option value="Mixed">Mixed (All levels)</option>
                <option value="Easy-Medium">Warmup (Easy – Medium)</option>
                <option value="Medium-Hard">Senior (Medium – Hard)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-[#160910] border-t border-slate-200 dark:border-[#3b1d2c] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#26131d] text-xs font-semibold text-slate-700 dark:text-[#e7c6d7] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={questions.length === 0}
            onClick={handleLaunch}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Begin Mock Interview
          </button>
        </div>
      </div>
    </div>
  );
}

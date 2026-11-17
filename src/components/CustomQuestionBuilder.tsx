import React, { useState } from 'react';
import { Question, QuestionCategory, QuestionType, QuestionTestCase } from '../types';
import { Save, Plus, Trash2, Code, BookOpen, AlertCircle, PlusCircle } from 'lucide-react';

interface CustomQuestionBuilderProps {
  onSave: (question: Partial<Question>) => Promise<void>;
  isSaving: boolean;
}

export function CustomQuestionBuilder({ onSave, isSaving }: CustomQuestionBuilderProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<QuestionCategory>('Algorithms');
  const [type, setType] = useState<QuestionType>('coding');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [description, setDescription] = useState('');
  const [initialCode, setInitialCode] = useState('');
  const [solutionTemplate, setSolutionTemplate] = useState('');
  const [sqlSetup, setSqlSetup] = useState('');

  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [currentOutcome, setCurrentOutcome] = useState('');

  const [keywords, setKeywords] = useState<string[]>([]);
  const [currentKeyword, setCurrentKeyword] = useState('');

  const [testCases, setTestCases] = useState<QuestionTestCase[]>([]);
  const [tcName, setTcName] = useState('');
  const [tcFnName, setTcFnName] = useState('');
  const [tcArgsJson, setTcArgsJson] = useState('');
  const [tcExpectedJson, setTcExpectedJson] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAddOutcome = () => {
    if (currentOutcome.trim() && !outcomes.includes(currentOutcome.trim())) {
      setOutcomes([...outcomes, currentOutcome.trim()]);
      setCurrentOutcome('');
    }
  };

  const handleRemoveOutcome = (idx: number) => {
    setOutcomes(outcomes.filter((_, i) => i !== idx));
  };

  const handleAddKeyword = () => {
    if (currentKeyword.trim() && !keywords.includes(currentKeyword.trim())) {
      setKeywords([...keywords, currentKeyword.trim()]);
      setCurrentKeyword('');
    }
  };

  const handleRemoveKeyword = (idx: number) => {
    setKeywords(keywords.filter((_, i) => i !== idx));
  };

  const handleAddTestCase = () => {
    setValidationError(null);
    try {
      const parsedArgs = tcArgsJson.trim() ? JSON.parse(tcArgsJson.trim()) : [];
      if (!Array.isArray(parsedArgs)) {
        setValidationError('Test case Arguments must be a valid JSON array (e.g. [5, "abc"]).');
        return;
      }
      const parsedExpected = tcExpectedJson.trim() ? JSON.parse(tcExpectedJson.trim()) : null;
      setTestCases((prev) => [
        ...prev,
        {
          name: tcName.trim() || `Case ${prev.length + 1}`,
          functionName: tcFnName.trim() || undefined,
          args: parsedArgs,
          expected: parsedExpected
        }
      ]);
      setTcName('');
      setTcArgsJson('');
      setTcExpectedJson('');
    } catch {
      setValidationError('Invalid JSON in Test Case Arguments or Expected Output.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError('Challenge title is required.');
      return;
    }
    if (description.trim().length < 30) {
      setValidationError('Please provide at least 30 characters in the description so candidates have clear instructions.');
      return;
    }

    setValidationError(null);

    const questionPayload: Partial<Question> = {
      title: title.trim(),
      category,
      type,
      difficulty,
      description: description.trim(),
      initialCode: type === 'coding' ? initialCode : '',
      solutionTemplate: solutionTemplate.trim() || 'Reference walkthrough guidelines.',
      expectedOutcomes:
        outcomes.length > 0
          ? outcomes
          : ['Demonstrate strong understanding of the core concept.', 'Address key edge cases and constraints.'],
      keywords: keywords.length > 0 ? keywords : ['analysis', 'trade-offs'],
      testCases: type === 'coding' ? testCases : [],
      sqlSetup: category === 'Databases' ? sqlSetup : ''
    };

    onSave(questionPayload).then(() => {
      setTitle('');
      setDescription('');
      setInitialCode('');
      setSolutionTemplate('');
      setSqlSetup('');
      setOutcomes([]);
      setKeywords([]);
      setTestCases([]);
    });
  };

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

  return (
    <div className="bg-white dark:bg-[#1b0d14] rounded-xl border border-slate-200 dark:border-[#3b1d2c] p-6 shadow-sm">
      <div className="border-b border-slate-100 dark:border-[#3b1d2c] pb-4 mb-5">
        <h2 className="text-lg font-bold font-display text-slate-900 dark:text-[#fdf2f8] flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-indigo-600 dark:text-pink-400" />
          Author Practice Question
        </h2>
        <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-0.5">
          Create technical challenges with custom assessment rubrics and runnable test cases.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Challenge Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Implement Max Stack or Design Rate Limiter"
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] placeholder:text-slate-400 dark:placeholder:text-[#8f5d76] border border-slate-200 dark:border-[#3b1d2c] focus:bg-white dark:focus:bg-[#160910] focus:border-indigo-500 dark:focus:border-pink-400 rounded-lg outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Topic Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as QuestionCategory)}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] focus:border-indigo-500 dark:focus:border-pink-400 rounded-lg outline-none transition-colors"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Interview Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('coding')}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  type === 'coding'
                    ? 'border-indigo-500 dark:border-pink-400 bg-indigo-50 dark:bg-[#2a101d] text-indigo-700 dark:text-pink-300'
                    : 'border-slate-200 dark:border-[#3b1d2c] bg-slate-50 dark:bg-[#26131d] text-slate-600 dark:text-[#b88aa1]'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                Coding Test
              </button>
              <button
                type="button"
                onClick={() => setType('conceptual')}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  type === 'conceptual'
                    ? 'border-indigo-500 dark:border-pink-400 bg-indigo-50 dark:bg-[#2a101d] text-indigo-700 dark:text-pink-300'
                    : 'border-slate-200 dark:border-[#3b1d2c] bg-slate-50 dark:bg-[#26131d] text-slate-600 dark:text-[#b88aa1]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Conceptual
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Difficulty</label>
            <div className="flex gap-2">
              {['Easy', 'Medium', 'Hard'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDifficulty(lvl as any)}
                  className={`flex-1 p-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    difficulty === lvl
                      ? lvl === 'Easy'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                        : lvl === 'Medium'
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                          : 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300'
                      : 'border-slate-200 dark:border-[#3b1d2c] bg-slate-50 dark:bg-[#26131d] text-slate-600 dark:text-[#b88aa1]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Description & Requirements</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outline the task, constraints, edge cases, and expected behavior."
            rows={5}
            className="w-full text-xs p-3 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] placeholder:text-slate-400 dark:placeholder:text-[#8f5d76] border border-slate-200 dark:border-[#3b1d2c] focus:bg-white dark:focus:bg-[#160910] focus:border-indigo-500 dark:focus:border-pink-400 rounded-lg outline-none transition-colors resize-none leading-relaxed"
          />
        </div>

        <div className="bg-slate-50 dark:bg-[#160910] border border-slate-200 dark:border-[#3b1d2c] p-4 rounded-xl">
          <label className="block text-xs font-bold text-slate-800 dark:text-[#fdf2f8] mb-1">Evaluation Criteria</label>
          <p className="text-xs text-slate-500 dark:text-[#b88aa1] mb-2">Milestones the evaluator checks for in candidate responses:</p>

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={currentOutcome}
              onChange={(e) => setCurrentOutcome(e.target.value)}
              placeholder="e.g., Handle null or empty inputs gracefully"
              className="flex-grow text-xs p-2 bg-white dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] focus:border-indigo-500 dark:focus:border-pink-400 rounded-lg outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddOutcome();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddOutcome}
              className="p-2 bg-slate-900 hover:bg-slate-800 dark:bg-pink-600 dark:hover:bg-pink-500 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {outcomes.map((out, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs text-slate-700 dark:text-[#e7c6d7] bg-white dark:bg-[#1b0d14] p-2 rounded border border-slate-200 dark:border-[#3b1d2c]"
              >
                <span className="truncate pr-2">• {out}</span>
                <button type="button" onClick={() => handleRemoveOutcome(idx)} className="text-rose-500 hover:text-rose-600 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {outcomes.length === 0 && (
              <span className="text-xs text-slate-400 dark:text-[#b88aa1] italic">No custom criteria added yet.</span>
            )}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#160910] border border-slate-200 dark:border-[#3b1d2c] p-4 rounded-xl">
          <label className="block text-xs font-bold text-slate-800 dark:text-[#fdf2f8] mb-1">Assessment Keywords</label>
          <p className="text-xs text-slate-500 dark:text-[#b88aa1] mb-2">Key terms candidates are expected to cover:</p>

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={currentKeyword}
              onChange={(e) => setCurrentKeyword(e.target.value)}
              placeholder="e.g., O(N) complexity"
              className="flex-grow text-xs p-2 bg-white dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] focus:border-indigo-500 dark:focus:border-pink-400 rounded-lg outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddKeyword();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              className="p-2 bg-slate-900 hover:bg-slate-800 dark:bg-pink-600 dark:hover:bg-pink-500 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw, idx) => (
              <span
                key={idx}
                className="bg-indigo-50 dark:bg-[#2a101d] text-indigo-700 dark:text-pink-300 border border-indigo-200 dark:border-pink-400/30 text-xs font-mono px-2.5 py-1 rounded-md flex items-center gap-1.5"
              >
                {kw}
                <button type="button" onClick={() => handleRemoveKeyword(idx)} className="hover:opacity-75 font-bold cursor-pointer">
                  ×
                </button>
              </span>
            ))}
            {keywords.length === 0 && (
              <span className="text-xs text-slate-400 dark:text-[#b88aa1] italic">No keywords added.</span>
            )}
          </div>
        </div>

        {type === 'coding' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Starter Code Template (Optional)</label>
              <textarea
                value={initialCode}
                onChange={(e) => setInitialCode(e.target.value)}
                placeholder={`function solve(input) {\n  // Starter code\n}`}
                rows={4}
                className="w-full text-xs p-3 bg-slate-900 dark:bg-[#160910] border border-slate-800 dark:border-[#3b1d2c] text-slate-100 focus:border-indigo-500 dark:focus:border-pink-400 rounded-lg outline-none font-mono resize-none leading-relaxed"
              />
            </div>

            <div className="bg-slate-50 dark:bg-[#160910] border border-slate-200 dark:border-[#3b1d2c] p-4 rounded-xl space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-[#fdf2f8]">
                  Runnable Unit Test Cases (Optional)
                </label>
                <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-0.5">
                  Attach JSON input arguments and expected return values so candidates can run automated tests in the workspace.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={tcName}
                  onChange={(e) => setTcName(e.target.value)}
                  placeholder="Case name (e.g., Basic example)"
                  className="text-xs p-2 bg-white dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] rounded-lg outline-none"
                />
                <input
                  type="text"
                  value={tcFnName}
                  onChange={(e) => setTcFnName(e.target.value)}
                  placeholder="Function name (e.g., solve)"
                  className="text-xs p-2 bg-white dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] rounded-lg outline-none font-mono"
                />
                <input
                  type="text"
                  value={tcArgsJson}
                  onChange={(e) => setTcArgsJson(e.target.value)}
                  placeholder='Args JSON array, e.g. [[1, 2, 3], 4]'
                  className="text-xs p-2 bg-white dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] rounded-lg outline-none font-mono"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tcExpectedJson}
                    onChange={(e) => setTcExpectedJson(e.target.value)}
                    placeholder="Expected JSON, e.g. true or 6"
                    className="flex-1 text-xs p-2 bg-white dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] rounded-lg outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddTestCase}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-pink-600 dark:hover:bg-pink-500 text-white rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    + Add Case
                  </button>
                </div>
              </div>

              {testCases.length > 0 && (
                <div className="space-y-1.5">
                  {testCases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 text-[11px] font-mono bg-white dark:bg-[#1b0d14] p-2 rounded border border-slate-200 dark:border-[#3b1d2c] text-slate-700 dark:text-[#e7c6d7]"
                    >
                      <span className="truncate">
                        {tc.name}: {tc.functionName || 'fn'}({JSON.stringify(tc.args).slice(1, -1)}) → {JSON.stringify(tc.expected)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTestCases((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-600 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {category === 'Databases' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">
              SQL Sandbox Setup Script (Optional CREATE TABLE / INSERT)
            </label>
            <textarea
              value={sqlSetup}
              onChange={(e) => setSqlSetup(e.target.value)}
              placeholder="Leave blank to use the default interview schema (employees, departments, orders, customers, transactions, prescriptions)."
              rows={3}
              className="w-full text-xs p-3 bg-slate-900 dark:bg-[#160910] border border-slate-800 dark:border-[#3b1d2c] text-slate-100 rounded-lg outline-none font-mono resize-none leading-relaxed"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1">Reference Solution (Optional)</label>
          <textarea
            value={solutionTemplate}
            onChange={(e) => setSolutionTemplate(e.target.value)}
            placeholder="Provide an exemplary reference solution or conceptual walkthrough."
            rows={4}
            className="w-full text-xs p-3 bg-slate-50 dark:bg-[#26131d] text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] focus:border-indigo-500 dark:focus:border-pink-400 rounded-lg outline-none font-mono resize-none leading-relaxed"
          />
        </div>

        {validationError && (
          <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-500 font-semibold text-xs text-white py-2.5 rounded-xl shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Question...' : 'Publish to Practice Pool'}
          </button>
        </div>
      </form>
    </div>
  );
}

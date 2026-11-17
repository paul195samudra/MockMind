import React, { useState } from 'react';
import { User } from '../types';
import { Send, Star, CheckCircle, MessageSquare, ShieldAlert } from 'lucide-react';

interface FeedbackSectionProps {
  currentUser: User | null;
  onSubmitFeedback: (data: {
    userName?: string;
    userEmail?: string;
    rating: number;
    category: 'Bug Report' | 'Feature Request' | 'Question Content Feedback' | 'General Praise' | 'Other';
    message: string;
  }) => Promise<boolean>;
}

export function FeedbackSection({ currentUser, onSubmitFeedback }: FeedbackSectionProps) {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [category, setCategory] = useState<'Bug Report' | 'Feature Request' | 'Question Content Feedback' | 'General Praise' | 'Other'>('General Praise');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorText('Please enter your feedback message.');
      return;
    }

    if (!currentUser && (!userName.trim() || !userEmail.trim())) {
      setErrorText('Please enter both your name and email address.');
      return;
    }

    setSubmitting(true);
    setErrorText(null);

    try {
      const payload = currentUser
        ? { rating, category, message }
        : { userName, userEmail, rating, category, message };

      const ok = await onSubmitFeedback(payload);
      if (ok) {
        setSuccess(true);
        setMessage('');
        setUserName('');
        setUserEmail('');
        setRating(5);
      } else {
        setErrorText('Unable to submit feedback right now. Please try again.');
      }
    } catch (err: any) {
      setErrorText(err.message || 'An error occurred while sending feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="bg-white dark:bg-[#1b0d14] rounded-2xl border border-slate-200 dark:border-[#3b1d2c] shadow-sm p-8 max-w-2xl mx-auto"
      id="user_feedback_panel"
    >
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-[#3b1d2c] pb-5 mb-6">
        <div className="p-3 bg-indigo-50 dark:bg-[#2a101d] rounded-xl text-indigo-600 dark:text-pink-400">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold font-display text-slate-900 dark:text-[#fdf2f8] tracking-tight">
            Feedback & Support
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#b88aa1] mt-0.5">
            Share bug reports, question suggestions, or feature requests with the platform team.
          </p>
        </div>
      </div>

      {success ? (
        <div className="text-center py-8 px-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-500/30">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-[#fdf2f8]">Feedback Received</h3>
          <p className="text-xs text-slate-600 dark:text-[#e7c6d7] mt-1 max-w-sm mx-auto leading-relaxed">
            Thank you for helping improve MockMind. Your note has been logged for review.
          </p>
          <button
            type="button"
            onClick={() => setSuccess(false)}
            className="mt-5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-500 text-white py-2 px-4 rounded-xl cursor-pointer transition-colors"
          >
            Submit Another Response
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorText && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-200 border border-rose-200 dark:border-rose-500/30 rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          {!currentUser ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1.5">Your Name</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full bg-slate-50 dark:bg-[#26131d] text-xs text-slate-900 dark:text-[#fdf2f8] rounded-xl border border-slate-200 dark:border-[#3b1d2c] px-3.5 py-2.5 outline-none focus:bg-white dark:focus:bg-[#160910] focus:border-indigo-500 dark:focus:border-pink-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1.5">Your Email</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 dark:bg-[#26131d] text-xs text-slate-900 dark:text-[#fdf2f8] rounded-xl border border-slate-200 dark:border-[#3b1d2c] px-3.5 py-2.5 outline-none focus:bg-white dark:focus:bg-[#160910] focus:border-indigo-500 dark:focus:border-pink-400 transition-colors"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-[#26131d] rounded-xl border border-slate-200 dark:border-[#3b1d2c] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-indigo-600 dark:bg-pink-600 text-white flex items-center justify-center font-bold text-xs font-mono">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-[#fdf2f8]">{currentUser.name}</span>
                  <span className="text-xs text-slate-500 dark:text-[#b88aa1] ml-1.5">({currentUser.email})</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-2">
              Overall Experience Rating
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isSelected = star <= (hoveredRating ?? rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(null)}
                    className="p-1 transition-transform active:scale-90 cursor-pointer text-amber-400"
                    title={`Rate ${star} stars`}
                  >
                    <Star className={`w-6 h-6 ${isSelected ? 'fill-amber-400' : 'text-slate-200 dark:text-[#3b1d2c]'}`} />
                  </button>
                );
              })}
              <span className="text-xs text-slate-600 dark:text-[#e7c6d7] font-semibold ml-2">
                {rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Neutral' : rating === 2 ? 'Fair' : 'Needs Work'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-[#26131d] text-xs text-slate-900 dark:text-[#fdf2f8] border border-slate-200 dark:border-[#3b1d2c] rounded-xl px-3.5 py-2.5 outline-none focus:bg-white dark:focus:bg-[#160910] focus:border-indigo-500 dark:focus:border-pink-400 font-medium transition-colors"
            >
              <option value="General Praise">General Praise & Review</option>
              <option value="Bug Report">Bug Report / Technical Issue</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Question Content Feedback">Question Content Feedback</option>
              <option value="Other">Other Inquiry</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-[#e7c6d7] mb-1.5">Message</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share details on what worked well or what we can improve..."
              className="w-full bg-slate-50 dark:bg-[#26131d] text-xs text-slate-900 dark:text-[#fdf2f8] placeholder:text-slate-400 dark:placeholder:text-[#8f5d76] border border-slate-200 dark:border-[#3b1d2c] rounded-xl px-3.5 py-2.5 outline-none focus:bg-white dark:focus:bg-[#160910] focus:border-indigo-500 dark:focus:border-pink-400 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-500 disabled:opacity-50 text-xs text-white font-semibold py-3 px-5 rounded-xl shadow-sm cursor-pointer transition-colors"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Feedback</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

import React, { useEffect } from 'react';
import { AlertTriangle, HelpCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-indigo-200/40 bg-white dark:bg-[#1b0d14] p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                variant === 'danger'
                  ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-300'
                  : 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-50 dark:text-indigo-400'
              }`}
            >
              {variant === 'danger' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <HelpCircle className="h-4 w-4" />
              )}
            </div>
            <div>
              <h3
                id="confirm-modal-title"
                className="font-display text-sm font-bold text-slate-900 dark:text-[#fdf2f8]"
              >
                {title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-[#e7c6d7]">
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-[#b88aa1] dark:hover:bg-[#26131d] dark:hover:text-[#fdf2f8] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 dark:border-[#3b1d2c] bg-white dark:bg-[#26131d] px-4 py-2 text-xs font-semibold text-slate-700 dark:text-[#e7c6d7] hover:bg-slate-50 dark:hover:bg-[#331a27] transition-colors cursor-pointer whitespace-nowrap"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer whitespace-nowrap ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500'
                : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-pink-600 dark:hover:bg-pink-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

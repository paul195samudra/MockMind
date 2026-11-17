import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[1100] flex max-w-sm flex-col gap-2.5 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const styleMap = {
          success:
            'border-emerald-200 bg-white text-slate-800 dark:border-emerald-500/30 dark:bg-[#1b0d14] dark:text-[#fdf2f8]',
          error:
            'border-rose-200 bg-white text-slate-800 dark:border-rose-500/30 dark:bg-[#1b0d14] dark:text-[#fdf2f8]',
          info:
            'border-indigo-200 bg-white text-slate-800 dark:border-pink-500/30 dark:bg-[#1b0d14] dark:text-[#fdf2f8]'
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg transition-all ${styleMap}`}
          >
            {toast.type === 'success' && (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            )}
            {toast.type === 'info' && (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500 dark:text-pink-400" />
            )}
            <p className="flex-1 text-xs font-medium leading-relaxed">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="rounded p-0.5 text-slate-400 hover:text-slate-700 dark:text-[#b88aa1] dark:hover:text-[#fdf2f8] cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

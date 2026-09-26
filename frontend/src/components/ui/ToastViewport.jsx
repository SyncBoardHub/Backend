import React, { useContext } from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { ToastContext } from '../../context/toastContext';

const TOAST_STYLES = {
  info: {
    icon: Info,
    iconClass: 'text-blue-300',
    borderClass: 'border-blue-400/20',
    accentClass: 'bg-blue-500/50',
  },
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-300',
    borderClass: 'border-emerald-400/20',
    accentClass: 'bg-emerald-500/50',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-300',
    borderClass: 'border-red-400/20',
    accentClass: 'bg-red-500/50',
  },
  warning: {
    icon: AlertCircle,
    iconClass: 'text-amber-300',
    borderClass: 'border-amber-400/20',
    accentClass: 'bg-amber-500/50',
  },
};

export default function ToastViewport() {
  const { dismissToast } = useToast();
  const { toasts } = useContext(ToastContext);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.variant] || TOAST_STYLES.info;
        const Icon = style.icon;

        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismissToast(toast.id)}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border bg-[#171620]/95 p-4 text-left shadow-2xl backdrop-blur-xl ${style.borderClass}`}
          >
            <div className={`absolute left-0 top-0 h-full w-1 ${style.accentClass}`} />
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${style.iconClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{toast.title}</p>
                {toast.message ? <p className="mt-1 text-xs leading-5 text-slate-300">{toast.message}</p> : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

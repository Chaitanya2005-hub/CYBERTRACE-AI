import { CheckCircle, Warning, X } from '@phosphor-icons/react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error';
  text: string;
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const isSuccess = toast.type === 'success';
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded border text-sm font-mono shadow-lg animate-slide-in ${
        isSuccess
          ? 'bg-risk-low/10 border-risk-low/30 text-risk-low'
          : 'bg-risk-critical/10 border-risk-critical/30 text-risk-critical'
      }`}
    >
      {isSuccess ? <CheckCircle className="w-4 h-4 shrink-0" weight="fill" /> : <Warning className="w-4 h-4 shrink-0" weight="fill" />}
      <span className="flex-1">{toast.text}</span>
      <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

import { useUIStore, type Toast as ToastType } from '../../stores/uiStore';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const hideToast = useUIStore((s) => s.hideToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastType; onClose: () => void }) {
  const bgColor = toast.type === 'success'
    ? 'bg-green-900/90 border-green-600'
    : toast.type === 'error'
    ? 'bg-red-900/90 border-red-600'
    : 'bg-cyan-900/90 border-cyan-600';

  const textColor = toast.type === 'success'
    ? 'text-green-300'
    : toast.type === 'error'
    ? 'text-red-300'
    : 'text-cyan-300';

  const Icon = toast.type === 'success'
    ? CheckCircle
    : toast.type === 'error'
    ? XCircle
    : Info;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${bgColor} shadow-lg backdrop-blur-sm min-w-64 animate-in slide-in-from-right`}>
      <Icon className={`w-5 h-5 ${textColor} flex-shrink-0`} />
      <span className="text-sm text-slate-200 flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        className="p-0.5 hover:bg-slate-700/50 rounded transition-colors"
      >
        <X className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}

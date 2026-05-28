import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  duration: number;
}

type Listener = (toasts: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

const emit = () => {
  const snapshot = [...items];
  listeners.forEach((l) => l(snapshot));
};

const push = (kind: ToastKind, message: string, duration: number): number => {
  const id = nextId++;
  items = [...items, { id, kind, message, duration }];
  emit();
  if (duration > 0) {
    window.setTimeout(() => dismissInternal(id), duration);
  }
  return id;
};

const dismissInternal = (id: number) => {
  items = items.filter((t) => t.id !== id);
  emit();
};

export const toast = {
  success: (message: string, opts?: { duration?: number }) =>
    push('success', message, opts?.duration ?? 3500),
  error: (message: string, opts?: { duration?: number }) =>
    push('error', message, opts?.duration ?? 6000),
  warning: (message: string, opts?: { duration?: number }) =>
    push('warning', message, opts?.duration ?? 5000),
  info: (message: string, opts?: { duration?: number }) =>
    push('info', message, opts?.duration ?? 4000),
  dismiss: (id: number) => dismissInternal(id),
};

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const STYLES: Record<ToastKind, { container: string; icon: string }> = {
  success: {
    container:
      'bg-white dark:bg-[#363233] border-l-4 border-l-emerald-500 dark:border-l-emerald-400',
    icon: 'text-emerald-500 dark:text-emerald-400',
  },
  error: {
    container: 'bg-white dark:bg-[#363233] border-l-4 border-l-[#FF4632]',
    icon: 'text-[#FF4632]',
  },
  warning: {
    container: 'bg-white dark:bg-[#363233] border-l-4 border-l-amber-500',
    icon: 'text-amber-500',
  },
  info: {
    container:
      'bg-white dark:bg-[#363233] border-l-4 border-l-[#3100E2] dark:border-l-blue-400',
    icon: 'text-[#3100E2] dark:text-blue-400',
  },
};

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(items);

  useEffect(() => {
    const listener: Listener = (next) => setList(next);
    listeners.add(listener);
    listener(items);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (list.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {list.map((t) => {
        const Icon = ICONS[t.kind];
        const styles = STYLES[t.kind];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 px-4 py-3 animate-slide-down ${styles.container}`}
            role="status"
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${styles.icon}`} />
            <div className="flex-1 min-w-0 text-sm leading-snug text-gray-900 dark:text-gray-100 break-words">
              {t.message}
            </div>
            <button
              type="button"
              onClick={() => dismissInternal(t.id)}
              className="p-1 -m-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3d3839] transition-colors"
              aria-label="Cerrar notificacion"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface Pending {
  id: number;
  options: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

type Listener = (pending: Pending | null) => void;

let current: Pending | null = null;
const listeners = new Set<Listener>();
let nextId = 1;

const emit = () => listeners.forEach((l) => l(current));

export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  const opts: ConfirmOptions =
    typeof options === 'string' ? { message: options, danger: true } : options;
  return new Promise<boolean>((resolve) => {
    // If something is already open, auto-cancel the previous to avoid stacking.
    if (current) {
      const prev = current;
      current = null;
      emit();
      prev.resolve(false);
    }
    const id = nextId++;
    current = { id, options: opts, resolve };
    emit();
  });
}

function resolveCurrent(ok: boolean) {
  if (!current) return;
  const c = current;
  current = null;
  emit();
  c.resolve(ok);
}

export function ConfirmDialogHost() {
  const [pending, setPending] = useState<Pending | null>(current);
  const yesRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const listener: Listener = (next) => setPending(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        resolveCurrent(false);
      }
      if (e.key === 'Enter') {
        e.stopPropagation();
        resolveCurrent(true);
      }
    };
    document.addEventListener('keydown', onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => yesRef.current?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
    };
  }, [pending]);

  if (!pending) return null;

  const {
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    danger = false,
  } = pending.options;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => resolveCurrent(false)}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-white dark:bg-[#363233] rounded-2xl shadow-2xl animate-scale-in"
      >
        <button
          type="button"
          onClick={() => resolveCurrent(false)}
          className="absolute top-3 right-3 p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3d3839] transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="p-6">
          <div className="flex gap-4">
            {danger && (
              <div className="shrink-0">
                <div className="w-11 h-11 rounded-full bg-[#FF4632]/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-[#FF4632]" />
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {title}
                </h3>
              )}
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words">
                {message}
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => resolveCurrent(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3d3839] transition-colors"
            >
              {cancelText}
            </button>
            <button
              ref={yesRef}
              type="button"
              onClick={() => resolveCurrent(true)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#363233] ${
                danger
                  ? 'bg-[#FF4632] hover:bg-[#ed2f1a] focus-visible:ring-[#FF4632]'
                  : 'bg-[#3100E2] hover:bg-[#2300a3] focus-visible:ring-[#3100E2]'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

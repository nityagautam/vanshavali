import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { ok: CheckCircle2, err: AlertTriangle, info: Info };
const DURATION = { ok: 3500, info: 4500, err: 6000 };

/**
 * One toast system for the whole app. `notify(type, message, { action })`
 * with type 'ok' | 'err' | 'info'. Toasts stack, repeat messages collapse,
 * and each one can be dismissed. Lives above sheets/modals so confirmations
 * from a form are still visible.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);
  const timers = useRef(new Map());

  const dismiss = useCallback(id => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts(list => list.filter(t => t.id !== id));
  }, []);

  const notify = useCallback((type, message, { action, duration } = {}) => {
    if (!message) return;
    const id = nextId.current++;
    setToasts(list => [...list.filter(t => !(t.type === type && t.message === message)), { id, type, message, action }].slice(-3));
    timers.current.set(id, setTimeout(() => dismiss(id), duration ?? DURATION[type] ?? 4000));
  }, [dismiss]);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toaster" role="region" aria-label="Notifications" aria-live="polite">
          {toasts.map(t => {
            const Icon = ICONS[t.type] || Info;
            return (
              <div key={t.id} className={`toast toast-${t.type}`} role={t.type === 'err' ? 'alert' : 'status'}>
                <Icon size={18} className="toast-icon" />
                <span className="toast-msg">{t.message}</span>
                {t.action && (
                  <button className="toast-action" onClick={() => { t.action.onClick(); dismiss(t.id); }}>{t.action.label}</button>
                )}
                <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={16} /></button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

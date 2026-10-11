import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <section onClick={onClick} className={`surface-card ${className}`}>{children}</section>;
}

export function Button({ children, variant = 'primary', size = 'md', type = 'button', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'; size?: 'sm' | 'md' | 'lg' }) {
  const base = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-45';
  const variants = {
    primary: 'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-900/20 hover:brightness-110 active:scale-[.98]',
    secondary: 'bg-[var(--soft)] text-[var(--text)] hover:bg-violet-500/10',
    ghost: 'text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--text)]',
    danger: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/15',
    outline: 'border border-[var(--border)] bg-transparent text-[var(--text)] hover:border-violet-400/60 hover:bg-violet-500/5',
  };
  const sizes = { sm: 'px-3 py-2 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-sm' };
  return <button type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
}

export function IconButton({ label, children, type = 'button', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type={type} aria-label={label} title={label} className={`inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${className}`} {...props}>{children}</button>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field-control ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field-control ${props.className ?? ''}`} />;
}

export function Field({ label, hint, error, children, className = '' }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string }) {
  return <label className={`block min-w-0 ${className}`}>
    <span className="mb-1.5 block text-sm font-medium text-[var(--text)]">{label}</span>
    {children}
    {error ? <span className="mt-1 flex items-center gap-1 text-xs text-rose-500"><AlertCircle size={13} />{error}</span> : hint ? <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span> : null}
  </label>;
}

export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'purple'; className?: string }) {
  const tones = {
    neutral: 'bg-[var(--soft)] text-[var(--muted)]',
    green: 'bg-emerald-500/10 text-emerald-500',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-rose-500/10 text-rose-500',
    blue: 'bg-sky-500/10 text-sky-500',
    purple: 'bg-violet-500/10 text-violet-500',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]} ${className}`}>{children}</span>;
}

export function ProgressBar({ value, tone = 'gradient', className = '', label = 'Progress' }: { value: number; tone?: 'gradient' | 'green' | 'amber' | 'red'; className?: string; label?: string }) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  const colors = {
    gradient: 'from-violet-500 to-cyan-400',
    green: 'from-emerald-500 to-teal-400',
    amber: 'from-amber-500 to-orange-400',
    red: 'from-rose-500 to-pink-400',
  };
  return <div className={`h-2 overflow-hidden rounded-full bg-[var(--soft)] ${className}`} role="progressbar" aria-label={label} aria-valuetext={`${Math.round(clamped)}%`} aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
    <motion.div initial={false} animate={{ width: `${clamped}%` }} transition={{ duration: 0.55, ease: 'easeOut' }} className={`h-full rounded-full bg-gradient-to-r ${colors[tone]}`} />
  </div>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div>
      {eyebrow && <div className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-violet-500">{eyebrow}</div>}
      <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>;
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] px-5 py-8 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">{icon}</div>
    <h3 className="font-semibold text-[var(--text)]">{title}</h3>
    <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--muted)]">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>;
}

export function Modal({ open, title, description, children, onClose, wide = false }: { open: boolean; title: string; description?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = document.getElementById('runway-modal-dialog');
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      const previous = previousFocusRef.current;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.div id="runway-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="runway-modal-title" aria-describedby={description ? 'runway-modal-description' : undefined} tabIndex={-1} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-2xl sm:rounded-3xl sm:p-6 ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><h2 id="runway-modal-title" className="text-lg font-bold text-[var(--text)]">{title}</h2>{description && <p id="runway-modal-description" className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>}</div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close dialog" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[var(--muted)] hover:bg-[var(--soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"><X size={18} /></button>
      </div>
      {children}
    </motion.div>
  </div>;
}

export function ToastNotice() {
  const message = useFinanceStore((state) => state.toastMessage);
  const undoEntry = useFinanceStore((state) => state.undoEntry);
  const undo = useFinanceStore((state) => state.undoLastAction);
  const clear = useFinanceStore((state) => state.clearToast);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(clear, 6500);
    return () => window.clearTimeout(timer);
  }, [message, clear]);
  if (!message) return null;
  const hasUndo = Boolean(undoEntry);
  return <motion.div role="status" aria-live="polite" aria-atomic="true" initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-24 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-3 shadow-2xl sm:bottom-6">
    <div className="mt-0.5 text-emerald-500"><CheckCircle2 size={19} /></div>
    <div className="min-w-0 flex-1 text-sm text-[var(--text)]">{message}</div>
    {hasUndo && <button onClick={undo} className="rounded-lg px-2 py-1 text-xs font-bold text-violet-500 hover:bg-violet-500/10">Undo</button>}
    {!hasUndo && <button onClick={clear} aria-label="Dismiss notification" className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--soft)]"><X size={16} /></button>}
  </motion.div>;
}

export function InlineNotice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'success' }) {
  const styles = {
    info: 'border-sky-500/20 bg-sky-500/5 text-sky-600 dark:text-sky-300',
    warning: 'border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-300',
    success: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-300',
  };
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'warning' ? AlertCircle : Info;
  return <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm leading-5 ${styles[tone]}`}><Icon className="mt-0.5 shrink-0" size={16} /><div>{children}</div></div>;
}

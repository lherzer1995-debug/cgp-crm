import { AlertTriangle, CheckCircle2, Inbox, SearchX } from 'lucide-react';
import { cn } from '../../utils/cn';

export function StatusBadge({
  tone,
  children,
}: {
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet';
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-white/[0.06] text-smoke border-white/[0.08]',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    info: 'bg-info/10 text-info border-info/20',
    violet: 'bg-violet/10 text-violet-soft border-violet/20',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold', tones[tone])}>
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon = 'inbox',
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: 'inbox' | 'search' | 'warning';
}) {
  const Icon = icon === 'search' ? SearchX : icon === 'warning' ? AlertTriangle : Inbox;
  return (
    <div className="rounded-3xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06]">
        <Icon className="h-5 w-5 text-smoke" />
      </div>
      <h3 className="text-[18px] font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-smoke">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-white">{title}</h2>
        {description ? <p className="mt-1 text-[14px] text-smoke">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-white/[0.06]', className)} />;
}

export function FeedbackToast({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}) {
  return (
    <div className={cn('fixed bottom-5 right-5 z-[70] flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl', type === 'success' ? 'border-success/30 bg-success/10' : 'border-danger/30 bg-danger/10')}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/20">
        <CheckCircle2 className={cn('h-4 w-4', type === 'success' ? 'text-success-soft' : 'text-danger-soft')} />
      </div>
      <div>
        <p className="text-[14px] font-semibold text-white">{type === 'success' ? 'Gespeichert' : 'Hinweis'}</p>
        <p className="text-[13px] text-mist">{message}</p>
      </div>
      <button onClick={onClose} className="rounded-lg px-2 py-1 text-[13px] text-smoke hover:bg-white/[0.08] hover:text-white">
        OK
      </button>
    </div>
  );
}

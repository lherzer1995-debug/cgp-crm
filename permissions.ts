import { AlertTriangle, CheckCircle2, ClipboardList, Inbox, MessageSquare, SearchX, Wrench } from 'lucide-react';
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


export function Modal({
  open,
  title,
  description,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Dialog schließen"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0f1622] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/[0.08] px-6 py-5">
          <h3 className="text-[22px] font-semibold tracking-[-0.04em] text-white">{title}</h3>
          {description ? <p className="mt-1 text-[14px] leading-6 text-smoke">{description}</p> : null}
        </div>
        <div className="max-h-[70dvh] overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}


export interface EntityTimelineItem {
  id: string;
  kind: 'note' | 'task' | 'service';
  title: string;
  detail: string;
  timestamp: string;
  actor: string;
  handoffTo?: string;
  meta?: string;
}

function timelineTone(kind: EntityTimelineItem['kind']) {
  if (kind === 'task') return 'warning';
  if (kind === 'service') return 'info';
  return 'neutral';
}

function timelineIcon(kind: EntityTimelineItem['kind']) {
  if (kind === 'task') return ClipboardList;
  if (kind === 'service') return Wrench;
  return MessageSquare;
}

export function EntityTimeline({
  title,
  description,
  entries,
  loading = false,
  emptyTitle = 'Noch keine Timeline-Einträge',
  emptyDescription = 'Sobald Verantwortung, Status oder Rückmeldungen dokumentiert werden, erscheint hier die Verlaufsspur.',
}: {
  title: string;
  description?: string;
  entries: EntityTimelineItem[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  return (
    <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
      <SectionHeader title={title} description={description} />
      <div className="mt-4">
        {loading ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-[88px] w-full" />
            <SkeletonBlock className="h-[88px] w-full" />
            <SkeletonBlock className="h-[88px] w-full" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} icon="inbox" />
        ) : (
          <div className="relative pl-5">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/[0.08]" />
            <div className="space-y-4">
              {entries.map((entry) => {
                const Icon = timelineIcon(entry.kind);
                const tone = timelineTone(entry.kind);
                return (
                  <div key={entry.id} className="relative">
                    <div className={cn('absolute left-[-5px] top-6 h-3 w-3 rounded-full border-2 border-[#0f1622]', tone === 'info' ? 'bg-info' : tone === 'warning' ? 'bg-warning' : 'bg-white/50')} />
                    <div className="rounded-[22px] border border-white/[0.08] bg-black/15 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/[0.06]">
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[14px] font-semibold text-white">{entry.title}</p>
                              <StatusBadge tone={tone}>{entry.kind}</StatusBadge>
                              {entry.handoffTo ? <StatusBadge tone="violet">an {entry.handoffTo}</StatusBadge> : null}
                            </div>
                            <p className="mt-2 text-[13px] leading-6 text-smoke">{entry.detail}</p>
                            {entry.meta ? <p className="mt-2 text-[12px] text-ash">{entry.meta}</p> : null}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[12px] text-smoke">{entry.actor}</p>
                          <p className="mt-1 text-[12px] text-ash">{entry.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

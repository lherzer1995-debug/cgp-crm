
import { Bell, ChevronDown, Menu, Plus, Search, UserPlus, Wrench, ClipboardPlus, CircleAlert, Clock3, CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { UserButton, useUser } from '@clerk/react';
import { cn } from '../../utils/cn';
import { useAppStore, type Page } from '../../data/app-store';

const titles: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: 'Arbeitsübersicht', subtitle: 'Was heute offen ist, was warten kann und wo du eingreifen musst.' },
  kunden: { title: 'Kundenbestand', subtitle: 'Kontakte, Historie und operative Risiken im Blick.' },
  aufgaben: { title: 'Aufgabenliste', subtitle: 'Offene Punkte nach Fälligkeit, Priorität und Zuständigkeit.' },
  einsaetze: { title: 'Einsatzsteuerung', subtitle: 'Geplante Termine, Statuswechsel und Rückmeldungen aus dem Feld.' },
  kalender: { title: 'Kalender', subtitle: 'Tagesplanung und Auslastung ohne dekorativen Ballast.' },
  einstellungen: { title: 'Einstellungen', subtitle: 'Nur Einstellungen, die im Alltag wirklich relevant sind.' },
};

interface Props {
  page: Page;
  search: string;
  onSearch: (value: string) => void;
  onMenuClick: () => void;
  isMobile: boolean;
}

export default function Header({ page, search, onSearch, onMenuClick, isMobile }: Props) {
  const { feedback, clearFeedback, viewer, overdueTasks, todayServices, activity } = useAppStore();
  const { user } = useUser();
  const meta = titles[page];
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const quickCreateRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (quickCreateOpen && !quickCreateRef.current?.contains(event.target as Node)) {
        setQuickCreateOpen(false);
      }
      if (notificationsOpen && !notificationsRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [notificationsOpen, quickCreateOpen]);

  const emitCreate = (type: 'customer' | 'task' | 'service') => {
    window.dispatchEvent(new CustomEvent('crm:create', { detail: { type, source: 'header' } }));
    setQuickCreateOpen(false);
  };

  const notifications = useMemo(() => {
    const items = [
      ...overdueTasks.slice(0, 4).map((task) => ({
        id: `task-${task.id}`,
        level: 'warning' as const,
        title: `Überfällig: ${task.title}`,
        detail: `${task.customerName} · fällig seit ${task.dueDate}`,
        icon: CircleAlert,
      })),
      ...todayServices.slice(0, 3).map((service) => ({
        id: `service-${service.id}`,
        level: 'info' as const,
        title: `Heute: ${service.title}`,
        detail: `${service.customerName} · ${service.startTime}–${service.endTime}`,
        icon: Clock3,
      })),
      ...activity.slice(0, 4).map((entry) => ({
        id: `activity-${entry.id}`,
        level: 'neutral' as const,
        title: entry.title,
        detail: `${entry.customerName} · ${entry.actor}`,
        icon: CheckCircle2,
      })),
    ];
    return items.filter((item) => !dismissedIds.includes(item.id)).slice(0, 8);
  }, [activity, dismissedIds, overdueTasks, todayServices]);

  const notificationCount = notifications.length + (feedback ? 1 : 0);

  const dismissNotification = (id: string) => {
    setDismissedIds((current) => [...current, id]);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0b0f17]/90 backdrop-blur-xl">
      <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.04] text-mist transition-colors',
              'hover:bg-white/[0.08] hover:text-white',
            )}
            aria-label={isMobile ? 'Navigation öffnen' : 'Sidebar ein- oder ausklappen'}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold tracking-[-0.04em] text-white">{meta.title}</h1>
            <p className="hidden truncate text-[14px] text-smoke md:block">{meta.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Suchen nach Kunde, Aufgabe oder Einsatz"
              className="h-11 w-[320px] rounded-2xl border border-white/[0.09] bg-white/[0.04] pl-11 pr-4 text-[14px] text-cloud placeholder:text-ash focus:border-primary/40 focus:outline-none"
            />
          </div>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((current) => !current);
                if (feedback) clearFeedback();
              }}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.04] text-mist transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label="Benachrichtigungen"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 ? <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-black">{Math.min(notificationCount, 9)}</span> : null}
            </button>

            {notificationsOpen ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[360px] rounded-[24px] border border-white/[0.08] bg-[#111722] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.38)]">
                <div className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-[14px] font-semibold text-white">Benachrichtigungen</p>
                    <p className="text-[12px] text-smoke">Überfällige Aufgaben, heutige Einsätze und letzte Aktivität.</p>
                  </div>
                  {notifications.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setDismissedIds(notifications.map((item) => item.id))}
                      className="text-[12px] font-medium text-primary-light hover:text-white"
                    >
                      Alle ausblenden
                    </button>
                  ) : null}
                </div>

                {feedback ? (
                  <div className={cn(
                    'mx-2 mb-2 rounded-2xl border px-3 py-3',
                    feedback.type === 'error' ? 'border-danger/30 bg-danger/10' : 'border-success/30 bg-success/10',
                  )}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold text-white">{feedback.type === 'error' ? 'Aktion fehlgeschlagen' : 'Zuletzt gespeichert'}</p>
                        <p className="mt-1 text-[13px] leading-5 text-mist">{feedback.message}</p>
                      </div>
                      <button type="button" onClick={clearFeedback} className="text-[12px] text-smoke hover:text-white">Schließen</button>
                    </div>
                  </div>
                ) : null}

                <div className="max-h-[420px] space-y-1 overflow-y-auto px-1 pb-1">
                  {notifications.length === 0 ? (
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 text-center">
                      <p className="text-[14px] font-medium text-white">Nichts Dringendes offen</p>
                      <p className="mt-1 text-[13px] text-smoke">Sobald Aufgaben überfällig sind oder neue Aktivität einläuft, erscheint sie hier.</p>
                    </div>
                  ) : (
                    notifications.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.id} className="flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-white/[0.05]">
                          <span className={cn(
                            'mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl',
                            item.level === 'warning' && 'bg-warning/12 text-warning',
                            item.level === 'info' && 'bg-info/12 text-info',
                            item.level === 'neutral' && 'bg-white/[0.06] text-mist',
                          )}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-white">{item.title}</p>
                            <p className="mt-1 text-[13px] leading-5 text-smoke">{item.detail}</p>
                          </div>
                          <button type="button" onClick={() => dismissNotification(item.id)} className="text-[12px] text-smoke hover:text-white">OK</button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div ref={quickCreateRef} className="relative">
            <button type="button" onClick={() => setQuickCreateOpen((current) => !current)} className="btn btn-primary">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Neu</span>
              <ChevronDown className="h-4 w-4 opacity-80" />
            </button>

            {quickCreateOpen ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[280px] rounded-[24px] border border-white/[0.08] bg-[#111722] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.38)]">
                <button onClick={() => emitCreate('customer')} className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/[0.05]">
                  <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 text-primary-light"><UserPlus className="h-4 w-4" /></span>
                  <span>
                    <span className="block text-[14px] font-semibold text-white">Kunde anlegen</span>
                    <span className="mt-1 block text-[13px] leading-5 text-smoke">Neuer Kunde mit Ansprechpartner, Priorität und Startkontext.</span>
                  </span>
                </button>
                <button onClick={() => emitCreate('task')} className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/[0.05]">
                  <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-warning/10 text-warning"><ClipboardPlus className="h-4 w-4" /></span>
                  <span>
                    <span className="block text-[14px] font-semibold text-white">Aufgabe anlegen</span>
                    <span className="mt-1 block text-[13px] leading-5 text-smoke">Mit Kunde, Verantwortlichem, Priorität und Fälligkeit.</span>
                  </span>
                </button>
                <button onClick={() => emitCreate('service')} className="flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-white/[0.05]">
                  <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-info/10 text-info"><Wrench className="h-4 w-4" /></span>
                  <span>
                    <span className="block text-[14px] font-semibold text-white">Einsatz planen</span>
                    <span className="mt-1 block text-[13px] leading-5 text-smoke">Termin direkt mit Techniker und Zeitfenster sauber einplanen.</span>
                  </span>
                </button>
              </div>
            ) : null}
          </div>

          <div className="hidden items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 lg:flex">
            <div className="text-right">
              <p className="text-[12px] text-smoke">Angemeldet · {viewer.role}</p>
              <p className="text-[13px] font-medium text-white">{user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Teammitglied'}</p>
            </div>
            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: 'h-9 w-9' } }} />
          </div>
        </div>
      </div>
    </header>
  );
}

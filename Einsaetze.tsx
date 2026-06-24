import { Bell, ChevronDown, Menu, Plus, Search, UserPlus, Wrench, ClipboardPlus, CircleAlert, Clock3, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { UserButton, useUser } from '@clerk/react';
import { cn } from '../../utils/cn';
import { useAppStore, type Page } from '../../data/app-store';
import { canCreateCustomer, canCreateTask, canPlanService, roleDescription, roleLabel } from '../../utils/permissions';
import { StatusBadge } from '../ui/common';

const titles: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: 'Arbeitsübersicht', subtitle: 'Was heute offen ist, was warten kann und wo du eingreifen musst.' },
  kunden: { title: 'Kundenbestand', subtitle: 'Kontakte, Historie und operative Risiken im Blick.' },
  aufgaben: { title: 'Aufgabenliste', subtitle: 'Offene Punkte nach Fälligkeit, Priorität und Zuständigkeit.' },
  einsaetze: { title: 'Einsatzsteuerung', subtitle: 'Geplante Termine, Statuswechsel und Rückmeldungen aus dem Feld.' },
  kalender: { title: 'Kalender', subtitle: 'Tagesplanung und Auslastung ohne dekorativen Ballast.' },
  ops: { title: 'Audit & Ops', subtitle: 'Kritische Vorgänge, Übergaben und Plattformzustand für Leitung und Admin.' },
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
  const { feedback, clearFeedback, viewer, overdueTasks, todayServices, activity, systemHealth } = useAppStore();
  const { user } = useUser();
  const meta = titles[page];
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const quickCreateRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (quickCreateOpen && !quickCreateRef.current?.contains(event.target as Node)) setQuickCreateOpen(false);
      if (notificationsOpen && !notificationsRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
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
  const creationOptions = [
    { id: 'customer', icon: UserPlus, label: 'Kunde anlegen', desc: 'Neuen Kunden mit Kontakt und Status anlegen', allowed: canCreateCustomer(viewer) },
    { id: 'task', icon: ClipboardPlus, label: 'Aufgabe anlegen', desc: 'Rückruf, Folgeaktion oder internes To-do anlegen', allowed: canCreateTask(viewer) },
    { id: 'service', icon: Wrench, label: 'Einsatz planen', desc: 'Termin, Techniker und Zeitfenster festlegen', allowed: canPlanService(viewer) },
  ] as const;

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#0b0f17]/90 backdrop-blur-xl">
      <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className={cn('inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.04] text-mist transition-colors', 'hover:bg-white/[0.08] hover:text-white')}
            aria-label={isMobile ? 'Navigation öffnen' : 'Sidebar ein- oder ausklappen'}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <StatusBadge tone="info">{roleLabel(viewer.role)}</StatusBadge>
              {systemHealth ? <StatusBadge tone={systemHealth.ok ? 'success' : 'warning'}>{systemHealth.ok ? systemHealth.storage : 'eingeschränkt'}</StatusBadge> : null}
            </div>
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
              placeholder="Kunde, Aufgabe oder Einsatz suchen"
              className="h-11 w-[320px] rounded-2xl border border-white/[0.09] bg-white/[0.055] pl-11 pr-4 text-[14px] text-cloud placeholder:text-ash transition-colors hover:border-white/[0.14] focus:border-primary/40 focus:outline-none"
            />
          </div>

          <div className="relative" ref={notificationsRef}>
            <button type="button" onClick={() => setNotificationsOpen((value) => !value)} className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.055] text-mist transition-colors hover:bg-white/[0.085] hover:text-white" aria-label="Benachrichtigungen">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 ? <span className="absolute right-2.5 top-2.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">{notificationCount}</span> : null}
            </button>

            {notificationsOpen ? (
              <div className="absolute right-0 top-[56px] z-30 w-[360px] rounded-[28px] border border-white/[0.08] bg-[#101722] p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-semibold text-white">Benachrichtigungen</p>
                    <p className="text-[13px] text-smoke">Nur Hinweise mit operativer Relevanz.</p>
                  </div>
                  <StatusBadge tone={notificationCount > 0 ? 'warning' : 'success'}>{notificationCount > 0 ? `${notificationCount} offen` : 'leer'}</StatusBadge>
                </div>

                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {feedback ? (
                    <div className="rounded-2xl border border-danger/20 bg-danger/10 p-3">
                      <p className="text-[13px] font-semibold text-white">Systemhinweis</p>
                      <p className="mt-1 text-[13px] leading-6 text-mist">{feedback.message}</p>
                      <button className="mt-3 text-[12px] font-semibold text-white/80 hover:text-white" onClick={clearFeedback}>Hinweis schließen</button>
                    </div>
                  ) : null}

                  {notifications.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/[0.08] bg-black/15 p-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-primary-light">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium text-white">{item.title}</p>
                          <p className="mt-1 text-[13px] leading-6 text-smoke">{item.detail}</p>
                        </div>
                      </div>
                      <button className="mt-3 text-[12px] font-semibold text-smoke hover:text-white" onClick={() => setDismissedIds((current) => [...current, item.id])}>Ausblenden</button>
                    </div>
                  ))}

                  {notifications.length === 0 && !feedback ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-5 text-center text-[13px] text-smoke">
                      Aktuell keine offenen Hinweise.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={quickCreateRef}>
            <button type="button" className="btn btn-primary" onClick={() => setQuickCreateOpen((value) => !value)}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Neu</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {quickCreateOpen ? (
              <div className="absolute right-0 top-[56px] z-30 w-[360px] rounded-[28px] border border-white/[0.08] bg-[#101722] p-4 shadow-2xl">
                <div className="mb-3">
                  <p className="text-[15px] font-semibold text-white">Neuen Vorgang starten</p>
                  <p className="text-[13px] text-smoke">{roleDescription(viewer.role)}.</p>
                </div>
                <div className="space-y-2">
                  {creationOptions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!item.allowed}
                      onClick={() => item.allowed && emitCreate(item.id)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                        item.allowed
                          ? 'border-white/[0.08] bg-black/15 hover:border-primary/30 hover:bg-white/[0.04]'
                          : 'cursor-not-allowed border-white/[0.06] bg-black/10 opacity-50'
                      )}
                    >
                      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-primary-light">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-medium text-white">{item.label}</p>
                          {!item.allowed ? <StatusBadge tone="warning">nicht für {roleLabel(viewer.role)}</StatusBadge> : null}
                        </div>
                        <p className="mt-1 text-[13px] leading-6 text-smoke">{item.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="hidden lg:flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
            <div className="text-right">
              <p className="text-[13px] font-medium text-white">{viewer.name}</p>
              <p className="text-[12px] text-smoke">{roleDescription(viewer.role)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.04]">
              {user ? <UserButton afterSignOutUrl="/" /> : <ShieldCheck className="h-4 w-4 text-smoke" />}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
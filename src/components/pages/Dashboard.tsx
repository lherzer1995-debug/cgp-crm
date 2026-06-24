import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardList,
  FolderClock,
  ShieldAlert,
  TimerReset,
  Users,
  Wrench,
} from 'lucide-react';
import { useMemo } from 'react';
import { useAppStore, type Page } from '../../data/app-store';
import { EmptyState, SectionHeader, StatusBadge } from '../ui/common';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet';

function toneForPriority(priority: string): Tone {
  if (priority === 'dringend') return 'danger';
  if (priority === 'hoch') return 'warning';
  if (priority === 'mittel') return 'info';
  return 'neutral';
}

function toneForServiceStatus(status: string): Tone {
  if (status === 'unterwegs') return 'warning';
  if (status === 'vor-ort') return 'violet';
  if (status === 'abgeschlossen') return 'success';
  if (status === 'abgesagt') return 'neutral';
  return 'info';
}

function formatShortDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

function startOfToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function Dashboard({ onNav, search }: { onNav: (page: Page) => void; search: string }) {
  const { kpi, overdueTasks, todayServices, activity, customers, openTasks, serviceEvents, viewer } = useAppStore();
  const today = startOfToday();

  const searchedCustomers = useMemo(() => {
    if (!search) return customers.filter((customer) => customer.status !== 'archiviert').slice(0, 5);
    return customers.filter((customer) => {
      const q = search.toLowerCase();
      return (
        customer.name.toLowerCase().includes(q) ||
        customer.city.toLowerCase().includes(q) ||
        customer.contacts.some((contact) => contact.name.toLowerCase().includes(q))
      );
    }).slice(0, 5);
  }, [customers, search]);

  const urgentTasks = useMemo(
    () =>
      openTasks
        .filter((task) => task.priority === 'dringend' || task.dueDate <= today)
        .sort((a, b) => `${a.dueDate}-${b.priority}`.localeCompare(`${b.dueDate}-${a.priority}`))
        .slice(0, 4),
    [openTasks, today],
  );

  const nextServices = useMemo(
    () =>
      serviceEvents
        .filter((event) => event.status !== 'abgeschlossen' && event.status !== 'abgesagt')
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
        .slice(0, 6),
    [serviceEvents],
  );

  const ownershipBoard = useMemo(() => {
    const counts = new Map<string, { open: number; urgent: number; nextService?: string }>();
    openTasks.forEach((task) => {
      const entry = counts.get(task.assignee) || { open: 0, urgent: 0 };
      entry.open += 1;
      if (task.priority === 'dringend' || task.dueDate <= today) entry.urgent += 1;
      counts.set(task.assignee, entry);
    });
    todayServices.forEach((event) => {
      const entry = counts.get(event.assignee) || { open: 0, urgent: 0 };
      entry.nextService = event.startTime;
      counts.set(event.assignee, entry);
    });

    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.urgent - a.urgent || b.open - a.open)
      .slice(0, 5);
  }, [openTasks, today, todayServices]);

  const riskCustomers = useMemo(
    () =>
      customers
        .filter((customer) => customer.status === 'risiko' || customer.priority === 'dringend' || customer.status === 'wartet')
        .slice(0, 4),
    [customers],
  );

  const unresolvedCount = urgentTasks.length + riskCustomers.length;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-[28px] border border-white/[0.08] bg-[#101722] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-smoke">Arbeitslage heute</p>
              <h1 className="mt-3 max-w-2xl text-[30px] font-semibold tracking-[-0.05em] text-white">
                {unresolvedCount > 0
                  ? `Heute brauchen ${unresolvedCount} Punkte echte Aufmerksamkeit — nicht später, sondern vor Feierabend.`
                  : 'Die Lage ist stabil. Heute geht es um saubere Übergaben und pünktliche Rückmeldungen.'}
              </h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-smoke">
                Dieses Dashboard priorisiert offene Risiken, fällige Aufgaben und einsatzrelevante Kundenkontexte. Alles andere ist bewusst nachrangig.
              </p>
            </div>

            <div className="min-w-[220px] rounded-3xl border border-white/[0.08] bg-black/15 p-4">
              <p className="text-[13px] text-smoke">Verantwortlich angemeldet</p>
              <p className="mt-2 text-[18px] font-semibold text-white">{viewer.name}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge tone="info">{viewer.role}</StatusBadge>
                <StatusBadge tone={kpi.urgentTasks > 0 ? 'warning' : 'success'}>
                  {kpi.urgentTasks > 0 ? `${kpi.urgentTasks} dringend` : 'keine Eskalation'}
                </StatusBadge>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Überfällig',
                value: overdueTasks.length,
                caption: 'Aufgaben mit Fristüberschreitung',
                icon: TimerReset,
                tone: overdueTasks.length > 0 ? 'danger' : 'success',
              },
              {
                label: 'Heute im Feld',
                value: todayServices.length,
                caption: 'geplante oder laufende Einsätze',
                icon: Wrench,
                tone: todayServices.length > 0 ? 'info' : 'neutral',
              },
              {
                label: 'Wartende Kunden',
                value: kpi.waitingCustomers,
                caption: 'noch ohne saubere Rückmeldung',
                icon: FolderClock,
                tone: kpi.waitingCustomers > 0 ? 'warning' : 'success',
              },
              {
                label: 'Risikofälle',
                value: kpi.riskCustomers,
                caption: 'eskaliert oder beschwerdeanfällig',
                icon: ShieldAlert,
                tone: kpi.riskCustomers > 0 ? 'danger' : 'success',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-white/[0.08] bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <item.icon className="h-5 w-5 text-primary-light" />
                  <StatusBadge tone={item.tone as Tone}>{item.caption}</StatusBadge>
                </div>
                <p className="mt-5 text-[32px] font-semibold tracking-[-0.04em] text-white">{item.value}</p>
                <p className="text-[14px] text-smoke">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={() => onNav('aufgaben')}>
              Offene Arbeit prüfen
            </button>
            <button className="btn btn-secondary" onClick={() => onNav('einsaetze')}>
              Einsatzsteuerung öffnen
            </button>
            <button className="btn btn-secondary" onClick={() => onNav('kalender')}>
              Kalender abstimmen
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <SectionHeader
            title="Heute zuerst"
            description="Die Fälle mit dem höchsten operativen Schaden, wenn sie liegen bleiben."
            action={
              <button className="btn btn-secondary" onClick={() => onNav('aufgaben')}>
                Alle Aufgaben
              </button>
            }
          />
          <div className="mt-5 space-y-3">
            {urgentTasks.length === 0 ? (
              <EmptyState
                title="Keine Eskalation offen"
                description="Aktuell ist keine Aufgabe überfällig oder dringend priorisiert."
                icon="warning"
              />
            ) : (
              urgentTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => onNav('aufgaben')}
                  className="flex w-full items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/15 p-4 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06]">
                    <ClipboardList className="h-4 w-4 text-primary-light" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-medium text-white">{task.title}</p>
                      <StatusBadge tone={toneForPriority(task.priority)}>{task.priority}</StatusBadge>
                    </div>
                    <p className="mt-1 text-[14px] text-smoke">{task.customerName}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ash">
                      <span>Fällig {formatShortDate(task.dueDate)}</span>
                      <span>Verantwortlich {task.assignee}</span>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-smoke" />
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Aktive Kunden', value: kpi.activeCustomers, icon: Users, caption: 'laufende Betreuung' },
          { label: 'Offene Aufgaben', value: kpi.openTasks, icon: ClipboardList, caption: 'ohne erledigte Punkte' },
          { label: 'Dringend', value: kpi.urgentTasks, icon: AlertTriangle, caption: 'Priorität heute' },
          { label: 'Heute geplant', value: kpi.todayServices, icon: CalendarClock, caption: 'laufende Einsätze' },
        ].map((item) => (
          <div key={item.label} className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <item.icon className="h-5 w-5 text-primary-light" />
              <span className="text-[12px] text-smoke">{item.caption}</span>
            </div>
            <p className="mt-5 text-[30px] font-semibold tracking-[-0.04em] text-white">{item.value}</p>
            <p className="text-[14px] text-smoke">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <SectionHeader
            title="Nächste Einsätze"
            description="Nicht alle Termine, sondern die nächste operative Sequenz."
            action={<button className="btn btn-secondary" onClick={() => onNav('einsaetze')}>Zur Einsatzliste</button>}
          />
          <div className="mt-5 space-y-3">
            {nextServices.length === 0 ? (
              <EmptyState
                title="Keine Einsätze geplant"
                description="Aktuell ist kein offener oder geplanter Einsatz hinterlegt."
                action={<button className="btn btn-secondary" onClick={() => onNav('kalender')}>Kalender öffnen</button>}
              />
            ) : (
              nextServices.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onNav('einsaetze')}
                  className="grid w-full gap-3 rounded-2xl border border-white/[0.08] bg-black/15 p-4 text-left transition-colors hover:bg-white/[0.05] md:grid-cols-[84px_1fr_auto]"
                >
                  <div className="rounded-2xl bg-white/[0.06] px-3 py-2 text-center">
                    <p className="text-[12px] text-smoke">{formatShortDate(event.date)}</p>
                    <p className="mt-1 text-[14px] font-medium text-white">{event.startTime}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-medium text-white">{event.customerName}</p>
                      <StatusBadge tone={toneForServiceStatus(event.status)}>{event.status}</StatusBadge>
                    </div>
                    <p className="mt-1 text-[14px] text-smoke">{event.title}</p>
                    <p className="mt-2 text-[13px] text-ash">
                      {event.assignee} · {event.customerAddress}
                    </p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-smoke" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
            <SectionHeader title="Verantwortung im Team" description="Wer heute offene Last trägt, statt nur Nutzerlisten anzuzeigen." />
            <div className="mt-5 space-y-3">
              {ownershipBoard.length === 0 ? (
                <EmptyState title="Keine offenen Zuordnungen" description="Aktuell sind keine Aufgaben oder Tages-Einsätze aktiv." />
              ) : (
                ownershipBoard.map((owner) => (
                  <div key={owner.name} className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[15px] font-medium text-white">{owner.name}</p>
                      <div className="flex gap-2">
                        <StatusBadge tone={owner.urgent > 0 ? 'danger' : 'neutral'}>
                          {owner.urgent > 0 ? `${owner.urgent} kritisch` : 'kein Risiko'}
                        </StatusBadge>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-smoke">
                      <span>{owner.open} offene Aufgaben</span>
                      <span>{owner.nextService ? `heute ab ${owner.nextService} im Feld` : 'heute ohne Einsatz'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
            <SectionHeader title="Aktivität" description="Letzte Änderungen im System – nur Dinge, die für den Betrieb relevant sind." />
            <div className="mt-5 space-y-3">
              {activity.length === 0 ? (
                <EmptyState title="Noch keine Historie" description="Sobald Aufgaben, Kunden oder Einsätze bearbeitet werden, erscheint hier die Verlaufsspur." />
              ) : (
                activity.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[14px] font-medium text-white">{item.title}</p>
                      <span className="text-[12px] text-ash">{item.timestamp}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-smoke">{item.customerName}</p>
                    <p className="mt-2 text-[13px] text-ash">{item.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <SectionHeader
            title={search ? `Treffer für „${search}“` : 'Kunden mit Kontext'}
            description={search ? 'Direkter Zugriff auf passende Kunden.' : 'Kunden mit letzter Notiz, Status und nächstem Servicekontext.'}
            action={<button className="btn btn-secondary" onClick={() => onNav('kunden')}>Zur Kundenliste</button>}
          />
          <div className="mt-5 space-y-3">
            {searchedCustomers.length === 0 ? (
              <EmptyState
                title="Keine passenden Kunden"
                description="Für deine Suche wurde kein Kunde gefunden."
                icon="search"
              />
            ) : (
              searchedCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => onNav('kunden')}
                  className="flex w-full items-start gap-4 rounded-2xl border border-white/[0.08] bg-black/15 p-4 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 font-semibold text-primary-soft">
                    {customer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[15px] font-medium text-white">{customer.name}</p>
                      <StatusBadge tone={customer.status === 'risiko' ? 'danger' : customer.status === 'wartet' ? 'warning' : customer.status === 'archiviert' ? 'neutral' : 'success'}>
                        {customer.status}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-[14px] text-smoke">
                      {customer.city} · letzter Einsatz {formatShortDate(customer.lastService)} · nächster {formatShortDate(customer.nextService)}
                    </p>
                    {customer.notes[0] ? <p className="mt-2 line-clamp-2 text-[13px] text-ash">{customer.notes[0].content}</p> : null}
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-smoke" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-danger/20 bg-danger/6 p-6">
          <SectionHeader
            title="Kunden mit erhöhtem Risiko"
            description="Diese Fälle brauchen saubere Rückmeldung und sichtbare Eigentümerschaft."
            action={<button className="btn btn-secondary" onClick={() => onNav('kunden')}>Fälle öffnen</button>}
          />
          <div className="mt-5 space-y-3">
            {riskCustomers.length === 0 ? (
              <EmptyState
                title="Keine akuten Risikokunden"
                description="Aktuell ist kein Kunde als Risiko oder dringend markiert."
              />
            ) : (
              riskCustomers.map((customer) => (
                <div key={customer.id} className="rounded-2xl border border-danger/20 bg-black/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15px] font-medium text-white">{customer.name}</p>
                    <StatusBadge tone="danger">Aufmerksamkeit</StatusBadge>
                  </div>
                  <p className="mt-2 text-[14px] text-smoke">
                    {customer.city} · nächster Termin {formatShortDate(customer.nextService)}
                  </p>
                  <p className="mt-2 text-[13px] text-ash">{customer.notes[0]?.content || 'Noch keine dokumentierte Rückmeldung vorhanden.'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

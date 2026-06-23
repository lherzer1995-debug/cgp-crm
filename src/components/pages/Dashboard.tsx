import { ArrowRight, CalendarClock, ClipboardList, TriangleAlert, Users } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAppStore, type Page } from '../../data/app-store';
import { EmptyState, SectionHeader, StatusBadge } from '../ui/common';

function toneForPriority(priority: string) {
  if (priority === 'dringend') return 'danger';
  if (priority === 'hoch') return 'warning';
  if (priority === 'mittel') return 'info';
  return 'neutral';
}

export default function Dashboard({ onNav, search }: { onNav: (page: Page) => void; search: string }) {
  const { kpi, overdueTasks, todayServices, activity, customers, openTasks } = useAppStore();

  const searchedCustomers = search
    ? customers.filter((customer) => customer.name.toLowerCase().includes(search.toLowerCase())).slice(0, 4)
    : customers.filter((customer) => customer.status !== 'archiviert').slice(0, 4);

  const riskCustomers = customers.filter((customer) => customer.status === 'risiko' || customer.priority === 'dringend');

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <section className="grid gap-5 xl:grid-cols-[1.35fr_.95fr]">
        <div className="rounded-[28px] border border-white/[0.08] bg-[#111722] p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-smoke">Tageslage</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <div>
              <h2 className="max-w-xl text-[32px] font-semibold tracking-[-0.05em] text-white">
                Heute zählen Reaktionszeit, saubere Übergaben und klare Rückmeldungen.
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-7 text-smoke">
                Das CRM priorisiert nicht hübsche KPIs, sondern die Fälle, die heute Auswirkungen auf Servicequalität und Kundenbindung haben.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button className="btn btn-primary" onClick={() => onNav('einsaetze')}>
                  Einsatzsteuerung öffnen
                </button>
                <button className="btn btn-secondary" onClick={() => onNav('aufgaben')}>
                  Aufgaben prüfen
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-3xl bg-black/20 p-4">
                <p className="text-[13px] text-smoke">Überfällige Aufgaben</p>
                <p className="mt-2 text-[30px] font-semibold text-white">{overdueTasks.length}</p>
                <p className="text-[13px] text-smoke">müssen heute geklärt werden</p>
              </div>
              <div className="rounded-3xl bg-black/20 p-4">
                <p className="text-[13px] text-smoke">Risikokunden</p>
                <p className="mt-2 text-[30px] font-semibold text-white">{kpi.riskCustomers}</p>
                <p className="text-[13px] text-smoke">mit offener Eskalation oder Beschwerde</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <SectionHeader title="Heute im Feld" description="Live-relevante Einsätze statt dekorativer Übersicht." />
          <div className="mt-5 space-y-3">
            {todayServices.length === 0 ? (
              <EmptyState
                title="Heute keine Termine"
                description="Es ist aktuell kein Einsatz für den heutigen Tag geplant."
                action={<button className="btn btn-secondary" onClick={() => onNav('kalender')}>Kalender öffnen</button>}
              />
            ) : (
              todayServices.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onNav('einsaetze')}
                  className="flex w-full items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/15 p-4 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <div className="rounded-2xl bg-white/[0.06] px-3 py-2 text-center">
                    <p className="text-[12px] text-smoke">{event.startTime}</p>
                    <p className="text-[12px] text-smoke">{event.endTime}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-white">{event.customerName}</p>
                    <p className="mt-1 text-[14px] text-smoke">{event.title}</p>
                    <p className="mt-1 text-[13px] text-ash">{event.assignee}</p>
                  </div>
                  <StatusBadge tone={event.status === 'unterwegs' ? 'warning' : event.status === 'geplant' ? 'info' : 'success'}>
                    {event.status}
                  </StatusBadge>
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
          { label: 'Dringend', value: kpi.urgentTasks, icon: TriangleAlert, caption: 'mit hoher Priorität' },
          { label: 'Heute geplant', value: kpi.todayServices, icon: CalendarClock, caption: 'offene Einsätze' },
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
            title={search ? `Treffer für „${search}“` : 'Kunden mit Kontext'}
            description={search ? 'Direkter Zugriff auf passende Kunden.' : 'Keine glatte Galerie, sondern echte Arbeitsfälle mit Status.'}
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
                    <p className="mt-1 text-[14px] text-smoke">{customer.city} · letzter Einsatz {customer.lastService}</p>
                    {customer.notes[0] ? <p className="mt-2 line-clamp-2 text-[13px] text-ash">{customer.notes[0].content}</p> : null}
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-smoke" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
            <SectionHeader title="Akut zu klären" description="Was heute Wirkung auf SLA, Beschwerden oder Umsatzverlust hat." />
            <div className="mt-5 space-y-3">
              {openTasks.filter((task) => task.priority === 'dringend' || task.dueDate <= '2026-06-23').slice(0, 4).map((task) => (
                <div key={task.id} className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15px] font-medium text-white">{task.title}</p>
                    <StatusBadge tone={toneForPriority(task.priority) as any}>{task.priority}</StatusBadge>
                  </div>
                  <p className="mt-1 text-[14px] text-smoke">{task.customerName}</p>
                  <p className="mt-2 text-[13px] text-ash">{task.description}</p>
                </div>
              ))}
              {openTasks.length === 0 ? (
                <EmptyState title="Keine offenen Aufgaben" description="Das Team hat aktuell keine offenen Punkte mehr." />
              ) : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
            <SectionHeader title="Aktivität" description="Letzte Änderungen im System – ohne Fake-Metriken." />
            <div className="mt-5 space-y-3">
              {activity.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[14px] font-medium text-white">{item.title}</p>
                    <span className="text-[12px] text-ash">{item.timestamp}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-smoke">{item.customerName}</p>
                  <p className="mt-2 text-[13px] text-ash">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {riskCustomers.length > 0 ? (
        <section className="rounded-[28px] border border-danger/20 bg-danger/6 p-6">
          <SectionHeader
            title="Kunden mit erhöhtem Risiko"
            description="Diese Fälle brauchen klare Rückmeldung, sonst kippt der Eindruck schnell."
            action={<button className="btn btn-secondary" onClick={() => onNav('kunden')}>Fälle öffnen</button>}
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {riskCustomers.map((customer) => (
              <div key={customer.id} className="rounded-2xl border border-danger/20 bg-black/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[15px] font-medium text-white">{customer.name}</p>
                  <StatusBadge tone="danger">Aufmerksamkeit</StatusBadge>
                </div>
                <p className="mt-2 text-[14px] text-smoke">{customer.notes[0]?.content || 'Noch keine Notiz vorhanden.'}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

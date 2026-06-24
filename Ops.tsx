import { AlertTriangle, ArrowRight, CalendarClock, ClipboardList, FolderClock, ShieldAlert, TimerReset, Users, Wrench, Route, BadgeCheck } from 'lucide-react';
import { useMemo } from 'react';
import { useAppStore, type Page } from '../../data/app-store';
import { EmptyState, SectionHeader, StatusBadge } from '../ui/common';
import { isFieldTechnician, isPlanner, roleLabel } from '../../utils/permissions';

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

function startOfToday() {
  return new Date().toISOString().slice(0, 10);
}

function MetricCard({ label, value, caption, icon: Icon, tone }: { label: string; value: number; caption: string; icon: React.ElementType; tone: Tone }) {
  return (
    <div className="rounded-[24px] border border-white/[0.08] bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-5 w-5 text-primary-light" />
        <StatusBadge tone={tone}>{caption}</StatusBadge>
      </div>
      <p className="mt-5 text-[30px] font-semibold tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-2 text-[14px] font-medium text-white">{label}</p>
    </div>
  );
}

export default function Dashboard({ onNav, search }: { onNav: (page: Page) => void; search: string }) {
  const { kpi, overdueTasks, todayServices, activity, customers, openTasks, serviceEvents, viewer } = useAppStore();
  const today = startOfToday();
  const isTech = isFieldTechnician(viewer);
  const isPlannerRole = isPlanner(viewer);

  const visibleTasks = useMemo(() => (isTech ? openTasks.filter((task) => task.assignee === viewer.name) : openTasks), [isTech, openTasks, viewer.name]);
  const visibleServices = useMemo(() => (isTech ? serviceEvents.filter((event) => event.assignee === viewer.name) : serviceEvents), [isTech, serviceEvents, viewer.name]);
  const visibleOverdue = useMemo(() => overdueTasks.filter((task) => !isTech || task.assignee === viewer.name), [isTech, overdueTasks, viewer.name]);
  const visibleTodayServices = useMemo(() => todayServices.filter((event) => !isTech || event.assignee === viewer.name), [isTech, todayServices, viewer.name]);

  const searchedCustomers = useMemo(() => {
    const base = isTech
      ? customers.filter((customer) => visibleTasks.some((task) => task.customerId === customer.id) || visibleServices.some((event) => event.customerId === customer.id))
      : customers;
    if (!search) return base.filter((customer) => customer.status !== 'archiviert').slice(0, 5);
    return base.filter((customer) => {
      const q = search.toLowerCase();
      return customer.name.toLowerCase().includes(q) || customer.city.toLowerCase().includes(q) || customer.contacts.some((contact) => contact.name.toLowerCase().includes(q));
    }).slice(0, 5);
  }, [customers, isTech, search, visibleServices, visibleTasks]);

  const urgentTasks = useMemo(
    () =>
      visibleTasks
        .filter((task) => task.priority === 'dringend' || task.dueDate <= today)
        .sort((a, b) => `${a.dueDate}-${a.priority}`.localeCompare(`${b.dueDate}-${b.priority}`))
        .slice(0, 4),
    [visibleTasks, today],
  );

  const nextServices = useMemo(
    () =>
      visibleServices
        .filter((event) => event.status !== 'abgeschlossen' && event.status !== 'abgesagt')
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
        .slice(0, 6),
    [visibleServices],
  );

  const ownershipBoard = useMemo(() => {
    const counts = new Map<string, { open: number; urgent: number; nextService?: string }>();
    visibleTasks.forEach((task) => {
      const entry = counts.get(task.assignee) || { open: 0, urgent: 0 };
      entry.open += 1;
      if (task.priority === 'dringend' || task.dueDate <= today) entry.urgent += 1;
      counts.set(task.assignee, entry);
    });
    visibleTodayServices.forEach((event) => {
      const entry = counts.get(event.assignee) || { open: 0, urgent: 0 };
      entry.nextService = event.startTime;
      counts.set(event.assignee, entry);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({ name, ...value })).sort((a, b) => b.urgent - a.urgent || b.open - a.open).slice(0, 5);
  }, [visibleTasks, today, visibleTodayServices]);

  const riskCustomers = useMemo(
    () => searchedCustomers.filter((customer) => customer.status === 'risiko' || customer.priority === 'dringend' || customer.status === 'wartet').slice(0, 4),
    [searchedCustomers],
  );

  const unresolvedCount = urgentTasks.length + riskCustomers.length;
  const roleHeadline = isTech
    ? `Dein Tag ist ${urgentTasks.length > 0 ? 'nicht sauber geplant' : 'unter Kontrolle'}: ${visibleTodayServices.length} Einsätze und ${urgentTasks.length} Punkte mit Druck.`
    : isPlannerRole
    ? `${unresolvedCount > 0 ? `${unresolvedCount} Punkte brauchen heute echte Disposition.` : 'Die Lage ist stabil – jetzt geht es um saubere Übergaben und Auslastung.'}`
    : 'Die operative Lage ist sichtbar – Qualität und Eskalationen brauchen heute Aufmerksamkeit.';

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-[28px] border border-white/[0.08] bg-[#101722] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="info">{roleLabel(viewer.role)}</StatusBadge>
                <StatusBadge tone={urgentTasks.length > 0 ? 'warning' : 'success'}>{urgentTasks.length > 0 ? `${urgentTasks.length} kritisch` : 'keine akute Eskalation'}</StatusBadge>
              </div>
              <h1 className="mt-4 max-w-2xl text-[30px] font-semibold tracking-[-0.05em] text-white">{roleHeadline}</h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-smoke">
                {isTech
                  ? 'Du siehst hier nur Arbeit, für die du Verantwortung trägst: eigene Einsätze, eigene Aufgaben, relevante Kundenkontexte.'
                  : 'Dieses Dashboard priorisiert operative Last, Risiken, nächste Einsätze und Verantwortlichkeit. Alles andere ist bewusst nachrangig.'}
              </p>
            </div>

            <div className="min-w-[220px] rounded-3xl border border-white/[0.08] bg-black/15 p-4">
              <p className="text-[13px] text-smoke">Angemeldet</p>
              <p className="mt-2 text-[18px] font-semibold text-white">{viewer.name}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge tone="info">{viewer.role}</StatusBadge>
                <StatusBadge tone={isTech ? (visibleTodayServices.length > 0 ? 'info' : 'neutral') : kpi.urgentTasks > 0 ? 'warning' : 'success'}>
                  {isTech ? `${visibleTodayServices.length} Einsätze heute` : kpi.urgentTasks > 0 ? `${kpi.urgentTasks} dringend` : 'keine Eskalation'}
                </StatusBadge>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label={isTech ? 'Meine Überfälligen' : 'Überfällig'} value={visibleOverdue.length} caption={isTech ? 'deine fälligen Aufgaben' : 'Aufgaben mit Fristüberschreitung'} icon={TimerReset} tone={visibleOverdue.length > 0 ? 'danger' : 'success'} />
            <MetricCard label={isTech ? 'Meine Einsätze heute' : 'Heute im Feld'} value={visibleTodayServices.length} caption={isTech ? 'dir zugewiesene Einsätze' : 'geplante oder laufende Einsätze'} icon={Wrench} tone={visibleTodayServices.length > 0 ? 'info' : 'neutral'} />
            <MetricCard label={isTech ? 'Meine offenen Aufgaben' : 'Wartende Kunden'} value={isTech ? visibleTasks.length : kpi.waitingCustomers} caption={isTech ? 'noch nicht abgeschlossene Punkte' : 'noch ohne saubere Rückmeldung'} icon={isTech ? ClipboardList : FolderClock} tone={isTech ? (visibleTasks.length > 0 ? 'warning' : 'success') : kpi.waitingCustomers > 0 ? 'warning' : 'success'} />
            <MetricCard label={isTech ? 'Kunden mit Risiko' : 'Risikofälle'} value={riskCustomers.length || kpi.riskCustomers} caption={isTech ? 'relevante Fälle in deinem Kontext' : 'eskaliert oder beschwerdeanfällig'} icon={isTech ? AlertTriangle : ShieldAlert} tone={(riskCustomers.length || kpi.riskCustomers) > 0 ? 'danger' : 'success'} />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <SectionHeader title={isTech ? 'Heute zuerst' : 'Operative Priorität'} description={isTech ? 'Diese Punkte solltest du vor Feierabend sauber abschließen.' : 'Keine KPI-Deko – nur Punkte mit echtem Einfluss auf den Tag.'} />
          <div className="mt-5 space-y-3">
            {urgentTasks.length === 0 ? (
              <EmptyState title="Keine kritischen Aufgaben" description={isTech ? 'Für dich ist aktuell nichts überfällig oder dringend.' : 'Aktuell gibt es keine überfälligen oder dringenden Aufgaben.'} />
            ) : (
              urgentTasks.map((task) => (
                <button key={task.id} onClick={() => onNav('aufgaben')} className="w-full rounded-3xl border border-white/[0.08] bg-black/15 p-4 text-left transition-colors hover:border-primary/25 hover:bg-white/[0.04]">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={toneForPriority(task.priority)}>{task.priority}</StatusBadge>
                    <StatusBadge tone={task.dueDate <= today ? 'danger' : 'warning'}>{task.dueDate <= today ? 'fällig/überfällig' : task.dueDate}</StatusBadge>
                  </div>
                  <p className="mt-3 text-[16px] font-medium text-white">{task.title}</p>
                  <p className="mt-1 text-[14px] leading-6 text-smoke">{task.customerName} · {task.assignee}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <SectionHeader title={isTech ? 'Nächste Einsätze' : 'Einsatzsequenz'} description={isTech ? 'Reihenfolge, Zeitfenster und Kundenkontext für deinen Tag.' : 'Die nächste operative Sequenz statt einer neutralen Terminliste.'} action={<button className="btn btn-secondary" onClick={() => onNav('einsaetze')}>Zur Einsatzsteuerung</button>} />
          <div className="mt-5 space-y-3">
            {nextServices.length === 0 ? <EmptyState title="Heute keine Termine" description="Es sind keine offenen Einsätze sichtbar." /> : nextServices.map((event) => (
              <div key={event.id} className="rounded-[24px] border border-white/[0.08] bg-black/15 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={toneForServiceStatus(event.status)}>{event.status.replaceAll('-', ' ')}</StatusBadge>
                    <StatusBadge tone="info">{event.date} · {event.startTime}</StatusBadge>
                  </div>
                  <p className="text-[13px] text-smoke">{event.assignee}</p>
                </div>
                <p className="mt-3 text-[16px] font-medium text-white">{event.title}</p>
                <p className="mt-1 text-[14px] leading-6 text-smoke">{event.customerName} · {event.customerAddress}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <SectionHeader title={isTech ? 'Verantwortung im Feld' : 'Verantwortung im Team'} description={isTech ? 'Wer heute was trägt und wo Druck sitzt.' : 'Arbeitslast und kritische Punkte nicht nur zählen, sondern zuordnen.'} />
          <div className="mt-5 space-y-3">
            {ownershipBoard.length === 0 ? (
              <EmptyState title="Keine Teamlast sichtbar" description="Aktuell sind keine offenen Zuordnungen vorhanden." />
            ) : (
              ownershipBoard.map((entry) => (
                <div key={entry.name} className="rounded-[24px] border border-white/[0.08] bg-black/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-medium text-white">{entry.name}</p>
                      <p className="text-[13px] text-smoke">{entry.open} offen · {entry.urgent} kritisch</p>
                    </div>
                    <div className="flex gap-2">
                      {entry.urgent > 0 ? <StatusBadge tone="danger">{entry.urgent} kritisch</StatusBadge> : null}
                      {entry.nextService ? <StatusBadge tone="info">{entry.nextService}</StatusBadge> : <StatusBadge tone="neutral">kein Slot</StatusBadge>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <SectionHeader title={isTech ? 'Relevante Kunden' : 'Kunden mit Kontext'} description={isTech ? 'Nur Kunden, die heute mit deinen Aufgaben oder Einsätzen zusammenhängen.' : 'Keine bloße Stammdatenliste, sondern Fälle mit nächstem sinnvollen Schritt.'} action={<button className="btn btn-secondary" onClick={() => onNav('kunden')}>Zum Kundenmodul</button>} />
          <div className="mt-5 space-y-3">
            {searchedCustomers.length === 0 ? (
              <EmptyState title="Keine Kunden sichtbar" description="Zu deiner Suche oder Rolle gibt es aktuell keinen passenden Kundenkontext." icon="search" />
            ) : (
              searchedCustomers.map((customer) => (
                <button key={customer.id} onClick={() => onNav('kunden')} className="flex w-full items-start justify-between gap-4 rounded-[24px] border border-white/[0.08] bg-black/15 p-4 text-left transition-colors hover:border-primary/25 hover:bg-white/[0.04]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[16px] font-medium text-white">{customer.name}</p>
                      <StatusBadge tone={customer.status === 'risiko' ? 'danger' : customer.status === 'wartet' ? 'warning' : 'success'}>{customer.status}</StatusBadge>
                    </div>
                    <p className="mt-1 text-[14px] leading-6 text-smoke">{customer.city} · letzter Kontakt {customer.lastService}</p>
                    <p className="mt-1 text-[13px] text-mist">{customer.contacts[0]?.name || 'kein Kontakt'} · nächster Einsatz {customer.nextService || 'noch offen'}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-smoke" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-6">
          <SectionHeader title={isTech ? 'Übergaben & Verlauf' : 'Aktivität und Verlauf'} description={isTech ? 'Saubere Übergaben statt verlorener Kontext.' : 'Was zuletzt passiert ist und wo operative Handovers entstanden sind.'} />
          <div className="mt-5 space-y-3">
            {activity.slice(0, 8).map((entry) => (
              <div key={entry.id} className="rounded-[24px] border border-white/[0.08] bg-black/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[15px] font-medium text-white">{entry.title}</p>
                  <StatusBadge tone={entry.kind === 'service' ? 'info' : entry.kind === 'task' ? 'warning' : 'neutral'}>{entry.kind}</StatusBadge>
                </div>
                <p className="mt-1 text-[14px] leading-6 text-smoke">{entry.customerName} · {entry.actor}</p>
                <p className="mt-1 text-[13px] text-mist">{entry.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
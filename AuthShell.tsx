
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, ClipboardList, Wrench } from 'lucide-react';
import { useAppStore } from '../../data/app-store';
import { canCreateTask, canPlanService, isFieldTechnician, roleLabel } from '../../utils/permissions';
import { EmptyState, SectionHeader, StatusBadge } from '../ui/common';
import { ServiceCreateModal, TaskCreateModal } from '../ui/workflow-modals';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function getDays(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirst(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function Kalender({ search }: { search: string }) {
  const { customers, serviceEvents, openTasks, viewer } = useAppStore();
  const initial = new Date('2026-06-23');
  const [month, setMonth] = useState(initial.getMonth());
  const [year, setYear] = useState(initial.getFullYear());
  const [selectedDate, setSelectedDate] = useState('2026-06-23');
  const [createServiceOpen, setCreateServiceOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string; source?: string }>).detail;
      if (detail?.source === 'header') return;
      if (detail?.type === 'service') setCreateServiceOpen(true);
      if (detail?.type === 'task') setCreateTaskOpen(true);
    };
    window.addEventListener('crm:create', handler as EventListener);
    return () => window.removeEventListener('crm:create', handler as EventListener);
  }, []);

  const days = getDays(year, month);
  const first = getFirst(year, month);
  const prevDays = getDays(year, month - 1);

  const cells = useMemo(() => {
    const result: Array<{ key: string; day: number; type: 'prev' | 'current' | 'next' }> = [];
    for (let i = first - 1; i >= 0; i -= 1) {
      const day = prevDays - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      result.push({ key: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day, type: 'prev' });
    }
    for (let day = 1; day <= days; day += 1) {
      result.push({ key: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day, type: 'current' });
    }
    while (result.length < 42) {
      const nextIndex = result.length - (first + days) + 1;
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      result.push({ key: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextIndex).padStart(2, '0')}`, day: nextIndex, type: 'next' });
    }
    return result;
  }, [days, first, month, prevDays, year]);

  const query = search.toLowerCase();
  const eventsByDate = useMemo(() => {
    const map: Record<string, typeof serviceEvents> = {};
    (isFieldTechnician(viewer) ? serviceEvents.filter((event) => event.assignee === viewer.name) : serviceEvents).forEach((event) => {
      if (!search || event.customerName.toLowerCase().includes(query) || event.title.toLowerCase().includes(query)) {
        map[event.date] = [...(map[event.date] || []), event];
      }
    });
    return map;
  }, [serviceEvents, search, query, viewer]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof openTasks> = {};
    (isFieldTechnician(viewer) ? openTasks.filter((task) => task.assignee === viewer.name) : openTasks).forEach((task) => {
      if (!search || task.customerName.toLowerCase().includes(query) || task.title.toLowerCase().includes(query)) {
        map[task.dueDate] = [...(map[task.dueDate] || []), task];
      }
    });
    return map;
  }, [openTasks, search, query, viewer]);

  const selectedEvents = eventsByDate[selectedDate] || [];
  const selectedTasks = tasksByDate[selectedDate] || [];
  const defaultCustomerId = customers[0]?.id || '';

  return (
    <>
      <div className="grid min-h-[calc(100dvh-76px)] gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="border-r border-white/[0.08] p-4 sm:p-6 lg:p-8">
          {isFieldTechnician(viewer) ? (<div className="mb-5 rounded-[24px] border border-info/20 bg-info/8 p-4"><p className="text-[14px] font-medium text-white">Persönlicher Kalender</p><p className="mt-1 text-[13px] leading-6 text-smoke">Als {roleLabel(viewer.role)} siehst du nur deine Einsätze und fälligen Aufgaben. Neue Planung bleibt bei Disposition und Leitung.</p></div>) : null}
          <SectionHeader
            title="Kalender"
            description="Einsätze und fällige Aufgaben in einer Monatsansicht."
            action={
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={() => setCreateTaskOpen(true)} disabled={!canCreateTask(viewer)}>
                  <ClipboardList className="h-4 w-4" />
                  Aufgabe für Tag
                </button>
                <button className="btn btn-primary" onClick={() => setCreateServiceOpen(true)} disabled={!canPlanService(viewer)}>
                  <Plus className="h-4 w-4" />
                  Einsatz für Tag
                </button>
              </div>
            }
          />

          <div className="mt-6 rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => (month === 0 ? (setMonth(11), setYear((value) => value - 1)) : setMonth((value) => value - 1))} className="btn btn-secondary"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => (month === 11 ? (setMonth(0), setYear((value) => value + 1)) : setMonth((value) => value + 1))} className="btn btn-secondary"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-white">{MONTHS[month]} {year}</h2>
              <button onClick={() => { setMonth(5); setYear(2026); setSelectedDate('2026-06-23'); }} className="btn btn-secondary">Heute</button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => (
                <div key={day} className="px-2 py-2 text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-smoke">{day}</div>
              ))}
              {cells.map((cell) => {
                const events = eventsByDate[cell.key] || [];
                const tasks = tasksByDate[cell.key] || [];
                return (
                  <button
                    key={cell.key}
                    onClick={() => setSelectedDate(cell.key)}
                    className={`min-h-[132px] rounded-2xl border p-3 text-left transition-colors ${selectedDate === cell.key ? 'border-primary/40 bg-primary/8' : 'border-white/[0.08] bg-black/12 hover:bg-white/[0.04]'} ${cell.type !== 'current' ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-medium text-white">{cell.day}</span>
                      {(events.length || tasks.length) ? <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] text-smoke">{events.length + tasks.length}</span> : null}
                    </div>
                    <div className="mt-3 space-y-1">
                      {events.slice(0, 2).map((event) => (
                        <div key={event.id} className="truncate rounded-lg bg-info/10 px-2 py-1 text-[11px] text-info">
                          {event.startTime} · {event.customerName}
                        </div>
                      ))}
                      {tasks.slice(0, 2).map((task) => (
                        <div key={task.id} className="truncate rounded-lg bg-warning/10 px-2 py-1 text-[11px] text-warning">
                          Aufgabe · {task.title}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="bg-[#0d121b] p-6">
          <SectionHeader
            title={new Date(`${selectedDate}T00:00:00`).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            description="Tagesdetails mit Einsatz- und Aufgabenkontext."
          />
          <div className="mt-6 space-y-6">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-smoke">Einsätze</h3>
                <button className="text-[13px] font-medium text-primary-light" onClick={() => setCreateServiceOpen(true)}>Neu</button>
              </div>
              <div className="space-y-3">
                {selectedEvents.length === 0 ? (
                  <EmptyState title="Heute keine Termine" description="Für den ausgewählten Tag ist aktuell kein Einsatz geplant." />
                ) : (
                  selectedEvents.map((event) => (
                    <div key={event.id} className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[15px] font-medium text-white">{event.customerName}</p>
                        <StatusBadge tone={event.status === 'abgeschlossen' ? 'success' : event.status === 'unterwegs' ? 'warning' : 'info'}>
                          {event.status}
                        </StatusBadge>
                      </div>
                      <p className="mt-2 text-[14px] text-smoke">{event.title}</p>
                      <p className="mt-2 text-[13px] text-ash">{event.startTime}–{event.endTime} · {event.assignee}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold uppercase tracking-[0.14em] text-smoke">Fällige Aufgaben</h3>
                <button className="text-[13px] font-medium text-primary-light" onClick={() => setCreateTaskOpen(true)}>Neu</button>
              </div>
              <div className="space-y-3">
                {selectedTasks.length === 0 ? (
                  <EmptyState title="Keine fälligen Aufgaben" description="Für diesen Tag ist aktuell keine Aufgabe terminiert." />
                ) : (
                  selectedTasks.map((task) => (
                    <div key={task.id} className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[15px] font-medium text-white">{task.title}</p>
                        <StatusBadge tone={task.priority === 'dringend' ? 'danger' : task.priority === 'hoch' ? 'warning' : 'info'}>
                          {task.priority}
                        </StatusBadge>
                      </div>
                      <p className="mt-2 text-[14px] text-smoke">{task.customerName}</p>
                      <p className="mt-2 text-[13px] text-ash">{task.assignee} · {task.status.replaceAll('-', ' ')}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>

      <ServiceCreateModal open={createServiceOpen} onClose={() => setCreateServiceOpen(false)} initialCustomerId={defaultCustomerId} initialDate={selectedDate} />
      <TaskCreateModal open={createTaskOpen} onClose={() => setCreateTaskOpen(false)} initialCustomerId={defaultCustomerId} initialDueDate={selectedDate} />
    </>
  );
}

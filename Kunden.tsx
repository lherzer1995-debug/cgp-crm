
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Circle, ClipboardList, Search, UserRound } from 'lucide-react';
import { useAppStore } from '../../data/app-store';
import { cn } from '../../utils/cn';
import { canCreateTask, canSeeActivityEntry, isFieldTechnician, roleLabel } from '../../utils/permissions';
import { EmptyState, EntityTimeline, type EntityTimelineItem, SectionHeader, StatusBadge } from '../ui/common';
import { TaskCreateModal } from '../ui/workflow-modals';
import type { ActivityItem, Task, TaskPriority, TaskStatus } from '../../data/store';

const statusOptions: Array<'all' | TaskStatus> = ['all', 'offen', 'in-arbeit', 'wartet-auf-kunde', 'erledigt'];
const priorityOptions: Array<'all' | TaskPriority> = ['all', 'dringend', 'hoch', 'mittel', 'niedrig'];

const statusTone: Record<TaskStatus, 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet'> = {
  offen: 'neutral',
  'in-arbeit': 'info',
  'wartet-auf-kunde': 'warning',
  erledigt: 'success',
};

const priorityTone: Record<TaskPriority, 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet'> = {
  niedrig: 'neutral',
  mittel: 'info',
  hoch: 'warning',
  dringend: 'danger',
};

function timelineOrder(value: string) {
  const normalized = value
    .replace(',', '')
    .replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1')
    .replace(/\s+/g, ' ')
    .trim();
  const parsed = Date.parse(normalized.replace(' ', 'T'));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function TaskMetric({ label, value, caption, icon: Icon }: { label: string; value: number; caption: string; icon: React.ElementType }) {
  return (
    <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-primary-light" />
        <CalendarClock className="h-4 w-4 text-smoke" />
      </div>
      <p className="mt-5 text-[28px] font-semibold tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-1 text-[14px] text-white">{label}</p>
      <p className="mt-1 text-[13px] leading-5 text-smoke">{caption}</p>
    </div>
  );
}

function TaskDetailDrawer({
  task,
  onClose,
  onSave,
  onAdvance,
  onFollowUp,
  team,
  timeline,
  timelineLoading,
  focusSection = 'details',
}: {
  task: Task | null;
  onClose: () => void;
  onSave: (patch: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'dueDate' | 'assignee' | 'status'>>) => void;
  onAdvance: () => void;
  onFollowUp: () => void;
  team: Array<{ id: string; name: string; role: string }>;
  timeline: EntityTimelineItem[];
  timelineLoading: boolean;
  focusSection?: 'details' | 'context' | 'timeline';
}) {
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    priority: 'mittel' as TaskPriority,
    dueDate: '',
    assignee: '',
    status: 'offen' as TaskStatus,
  });
  const detailsRef = useRef<HTMLElement | null>(null);
  const contextRef = useRef<HTMLElement | null>(null);
  const timelineRef = useRef<HTMLElement | null>(null);
  const [flashSection, setFlashSection] = useState<'details' | 'context' | 'timeline' | null>(null);
  const [currentSection, setCurrentSection] = useState<'details' | 'context' | 'timeline'>(focusSection);

  useEffect(() => {
    if (!task) return;
    setDraft({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      assignee: task.assignee,
      status: task.status,
    });
  }, [task]);

  useEffect(() => {
    setCurrentSection(focusSection);
  }, [focusSection]);

  useEffect(() => {
    if (!task) return;
    const refMap = { details: detailsRef, context: contextRef, timeline: timelineRef };
    const ref = refMap[currentSection]?.current;
    if (!ref) return;
    const timer = window.setTimeout(() => {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setFlashSection(currentSection);
      window.setTimeout(() => setFlashSection((current) => (current === currentSection ? null : current)), 1800);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [currentSection, task?.id]);

  if (!task) return null;

  const isOverdue = task.status !== 'erledigt' && task.dueDate < new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-[75]">
      <button type="button" aria-label="Aufgabendetail schließen" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-[560px] overflow-y-auto border-l border-white/[0.08] bg-[#0e1520] shadow-[-30px_0_80px_rgba(0,0,0,0.45)]">
        <div className="border-b border-white/[0.08] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={statusTone[task.status]}>{task.status.replaceAll('-', ' ')}</StatusBadge>
                <StatusBadge tone={priorityTone[task.priority]}>{task.priority}</StatusBadge>
                {isOverdue ? <StatusBadge tone="danger">überfällig</StatusBadge> : null}
              </div>
              <h3 className="mt-3 text-[24px] font-semibold tracking-[-0.04em] text-white">Aufgabe führen</h3>
              <p className="mt-1 text-[14px] leading-6 text-smoke">
                Diese Ansicht ist für echte Arbeit da: präziser Titel, klare Verantwortung, saubere Folgeaktion.
              </p>
            </div>
            <button className="btn btn-secondary" onClick={onClose}>Schließen</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {([
              ['details', 'Details'],
              ['context', 'Verantwortung'],
              ['timeline', 'Timeline'],
            ] as const).map(([section, label]) => (
              <button key={section} type="button" onClick={() => {
                const refMap = { details: detailsRef, context: contextRef, timeline: timelineRef };
                const ref = refMap[section].current;
                ref?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setCurrentSection(section);
                setFlashSection(section);
              }} className={cn('chip', currentSection === section && 'chip-active')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section ref={detailsRef} className={cn('rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5 transition-all', flashSection === 'details' && 'ring-2 ring-primary/35')}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-smoke">Kontext</p>
                <p className="mt-1 text-[16px] font-medium text-white">{task.customerName}</p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-smoke">Erstellt</p>
                <p className="mt-1 text-[14px] text-mist">{task.createdAt}</p>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="block">
                <span className="field-label">Aufgabentitel</span>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                  className="field-input"
                />
              </label>

              <label className="block">
                <span className="field-label">Beschreibung</span>
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  className="field-input min-h-[120px] resize-y py-3"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="field-label">Priorität</span>
                  <select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TaskPriority }))} className="field-input">
                    <option value="dringend">dringend</option>
                    <option value="hoch">hoch</option>
                    <option value="mittel">mittel</option>
                    <option value="niedrig">niedrig</option>
                  </select>
                </label>

                <label className="block">
                  <span className="field-label">Status</span>
                  <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as TaskStatus }))} className="field-input">
                    <option value="offen">offen</option>
                    <option value="in-arbeit">in Bearbeitung</option>
                    <option value="wartet-auf-kunde">wartet auf Kunde</option>
                    <option value="erledigt">erledigt</option>
                  </select>
                </label>

                <label className="block">
                  <span className="field-label">Fällig am</span>
                  <input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} className="field-input" />
                </label>

                <label className="block">
                  <span className="field-label">Verantwortlich</span>
                  <select value={draft.assignee} onChange={(event) => setDraft((current) => ({ ...current, assignee: event.target.value }))} className="field-input">
                    {team.map((member) => (
                      <option key={member.id} value={member.name}>
                        {member.name} · {member.role}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button className="btn btn-primary" onClick={() => onSave(draft)}>Speichern</button>
              <button className="btn btn-secondary" onClick={onAdvance}>Nächster Status</button>
              <button className="btn btn-secondary" onClick={onFollowUp}>Folgeaufgabe</button>
            </div>
          </section>

          <section ref={contextRef} className={cn('grid gap-4 xl:grid-cols-2 transition-all', flashSection === 'context' && 'rounded-[24px] ring-2 ring-primary/35 p-1')}>
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-smoke">Verantwortlichkeit</p>
              <div className="mt-4 flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06]">
                  <UserRound className="h-5 w-5 text-primary-light" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-white">{draft.assignee}</p>
                  <p className="mt-1 text-[13px] leading-5 text-smoke">Die Aufgabe braucht eine Person, kein Team im Unklaren.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-smoke">Qualitätssignal</p>
              <div className="mt-4 space-y-3 text-[13px] leading-5 text-smoke">
                <p>• Titel beschreibt eine Entscheidung oder Handlung, nicht nur ein Thema.</p>
                <p>• Fälligkeit ist konkret statt „sobald möglich“.</p>
                <p>• Status zeigt echten Fortschritt, keine kosmetische Farbe.</p>
              </div>
            </div>
          </section>

          <div ref={timelineRef} className={cn('transition-all', flashSection === 'timeline' && 'rounded-[28px] ring-2 ring-primary/35 p-1')}>
          <EntityTimeline
            title="Aufgaben-Timeline"
            description="Statuswechsel, Übergaben und Dokumentation statt stiller Tabellenzeile."
            entries={timeline}
            loading={timelineLoading}
            emptyTitle="Noch keine Aufgaben-Timeline"
            emptyDescription="Sobald Verantwortung, Status oder Folgeaktionen dokumentiert werden, erscheint hier die nachvollziehbare Verlaufsspur."
          />
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function Aufgaben({ search }: { search: string }) {
  const { customers, team, updateTask, updateTaskStatus, activity, viewer, fetchAudit } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [followUpSeed, setFollowUpSeed] = useState<{ customerId?: string; title?: string; description?: string; assignee?: string; dueDate?: string } | null>(null);
  const [auditEntries, setAuditEntries] = useState<ActivityItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [focusSection, setFocusSection] = useState<'details' | 'context' | 'timeline'>('details');

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string; source?: string }>).detail;
      if (detail?.source === 'header') return;
      if (detail?.type === 'task') setIsCreateOpen(true);
    };
    window.addEventListener('crm:create', handler as EventListener);
    return () => window.removeEventListener('crm:create', handler as EventListener);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ entityType?: 'customer' | 'task' | 'service'; entityId?: string; focusSection?: 'overview' | 'tasks' | 'notes' | 'timeline' | 'details' | 'context' }>).detail;
      if (detail?.entityType !== 'task' || !detail.entityId) return;
      setSelectedTaskId(detail.entityId);
      if (detail.focusSection === 'timeline' || detail.focusSection === 'context' || detail.focusSection === 'details') setFocusSection(detail.focusSection);
      else setFocusSection('details');
    };
    window.addEventListener('crm:focus', handler as EventListener);
    return () => window.removeEventListener('crm:focus', handler as EventListener);
  }, []);

  const query = (search || localSearch).toLowerCase();
  const tasks = useMemo(() => customers.flatMap((customer) => customer.tasks), [customers]);
  const visibleTasks = useMemo(() => (isFieldTechnician(viewer) ? tasks.filter((task) => task.assignee === viewer.name) : tasks), [tasks, viewer]);

  const filtered = visibleTasks.filter((task) => {
    const matchesQuery = !query || task.title.toLowerCase().includes(query) || task.customerName.toLowerCase().includes(query) || task.assignee.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesQuery && matchesStatus && matchesPriority;
  });

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;

  useEffect(() => {
    let active = true;
    if (!selectedTask) {
      setAuditEntries([]);
      setAuditLoading(false);
      return;
    }
    setAuditLoading(true);
    fetchAudit({ entityType: 'task', entityId: selectedTask.id, customerId: selectedTask.customerId, limit: 30 })
      .then((items) => {
        if (!active) return;
        setAuditEntries(items);
      })
      .catch(() => {
        if (!active) return;
        setAuditEntries([]);
      })
      .finally(() => {
        if (active) setAuditLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedTask, fetchAudit]);

  const selectedTaskTimeline = useMemo(() => {
    if (!selectedTask) return [];
    const customer = customers.find((entry) => entry.id === selectedTask.customerId);
    const activitySource = auditEntries.length > 0 ? auditEntries : activity;
    const directActivity: EntityTimelineItem[] = activitySource
      .filter((entry) => (entry.entityType === 'task' ? entry.entityId === selectedTask.id : entry.customerId === selectedTask.customerId && entry.kind === 'task' && entry.detail.includes(selectedTask.title)))
      .filter((entry) => canSeeActivityEntry(viewer, entry))
      .map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        title: entry.title,
        detail: entry.detail,
        timestamp: entry.timestamp,
        actor: entry.actor,
        handoffTo: entry.handoffTo,
        meta: customer ? customer.name : undefined,
      }));

    const fallbackEntries: EntityTimelineItem[] = [
      {
        id: `${selectedTask.id}-created`,
        kind: 'task',
        title: 'Aufgabe angelegt',
        detail: `${selectedTask.title} wurde initial ${selectedTask.assignee} zugewiesen.`,
        timestamp: selectedTask.createdAt,
        actor: selectedTask.assignee,
        handoffTo: selectedTask.assignee,
        meta: selectedTask.customerName,
      },
      ...(selectedTask.completedAt
        ? [{
            id: `${selectedTask.id}-completed`,
            kind: 'task' as const,
            title: 'Aufgabe abgeschlossen',
            detail: `${selectedTask.title} wurde abgeschlossen.`,
            timestamp: selectedTask.completedAt,
            actor: selectedTask.assignee,
            handoffTo: selectedTask.assignee,
            meta: selectedTask.customerName,
          }]
        : []),
    ];

    return [...directActivity, ...fallbackEntries]
      .sort((left, right) => timelineOrder(right.timestamp) - timelineOrder(left.timestamp))
      .slice(0, 10);
  }, [selectedTask, auditEntries, activity, customers, viewer]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <SectionHeader
          title="Aufgaben"
          description="Operative Arbeit braucht Präzision: klare Zuständigkeit, echte Fälligkeit und saubere Folgeaktion."
          action={<button className="btn btn-primary" onClick={() => { setFollowUpSeed(null); setIsCreateOpen(true); }} disabled={!canCreateTask(viewer)}>Aufgabe anlegen</button>}
        />

        {isFieldTechnician(viewer) ? (
          <div className="rounded-[24px] border border-info/20 bg-info/8 p-4">
            <p className="text-[14px] font-medium text-white">Rollenfokus: {roleLabel(viewer.role)}</p>
            <p className="mt-1 text-[13px] leading-6 text-smoke">Du siehst hier nur deine Aufgaben, Statuswechsel und Übergaben. Neue Aufgaben bleiben für Disposition oder Leitung reserviert.</p>
          </div>
        ) : null}

        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
              <input
                type="search"
                value={search ? search : localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                placeholder="Aufgabe, Kunde oder Verantwortlichen suchen"
                className="h-11 w-full rounded-2xl border border-white/[0.09] bg-white/[0.04] pl-11 pr-4 text-[14px] text-cloud placeholder:text-ash focus:border-primary/40 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`chip ${statusFilter === status ? 'chip-active' : ''}`}>
                  {status === 'all' ? 'alle Status' : status.replaceAll('-', ' ')}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((priority) => (
                <button key={priority} onClick={() => setPriorityFilter(priority)} className={`chip ${priorityFilter === priority ? 'chip-active' : ''}`}>
                  {priority === 'all' ? 'alle Prioritäten' : priority}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={query ? 'Keine passenden Aufgaben' : 'Keine offenen Aufgaben'}
            description={query ? 'Prüfe Suchbegriff und Filterkombination.' : 'Im aktuellen Filter ist nichts offen. Das Team ist aufgeräumt.'}
            action={<button className="btn btn-secondary" onClick={() => { setFollowUpSeed(null); setIsCreateOpen(true); }}>Neue Aufgabe anlegen</button>}
            icon={query ? 'search' : 'inbox'}
          />
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.03]">
            <table className="w-full">
              <thead className="bg-black/15">
                <tr className="text-left text-[12px] uppercase tracking-[0.14em] text-smoke">
                  <th className="px-5 py-4 font-semibold">Aufgabe</th>
                  <th className="px-5 py-4 font-semibold">Kunde</th>
                  <th className="px-5 py-4 font-semibold">Verantwortlich</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Priorität</th>
                  <th className="px-5 py-4 font-semibold">Fällig</th>
                  <th className="px-5 py-4 font-semibold">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .sort((a, b) => `${a.dueDate}${a.priority}`.localeCompare(`${b.dueDate}${b.priority}`))
                  .map((task) => {
                    const isOverdue = task.status !== 'erledigt' && task.dueDate < today;
                    return (
                      <tr key={task.id} className="border-t border-white/[0.06] hover:bg-white/[0.025]">
                        <td className="px-5 py-4">
                          <button className="text-left" onClick={() => setSelectedTaskId(task.id)}>
                            <p className="text-[15px] font-medium text-white hover:text-primary-light">{task.title}</p>
                            <p className="mt-1 text-[13px] leading-5 text-smoke">{task.description}</p>
                          </button>
                        </td>
                        <td className="px-5 py-4 text-[14px] text-mist">{task.customerName}</td>
                        <td className="px-5 py-4 text-[14px] text-mist">{task.assignee}</td>
                        <td className="px-5 py-4">
                          <StatusBadge tone={statusTone[task.status]}>{task.status.replaceAll('-', ' ')}</StatusBadge>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge tone={priorityTone[task.priority]}>{task.priority}</StatusBadge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1 text-[14px]">
                            <span className={isOverdue ? 'text-danger-soft' : 'text-mist'}>{task.dueDate}</span>
                            {isOverdue ? <span className="text-[12px] text-danger-soft">überfällig</span> : null}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button className="btn btn-secondary !px-3 !py-2 text-[13px]" onClick={() => setSelectedTaskId(task.id)}>
                              Öffnen
                            </button>
                            <button className="btn btn-secondary !px-3 !py-2 text-[13px]" onClick={() => updateTaskStatus(task.id)}>
                              Nächster Status
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-4">
          <TaskMetric label="Offen" value={tasks.filter((task) => task.status === 'offen').length} caption="neu erfasst oder noch nicht in Bearbeitung" icon={ClipboardList} />
          <TaskMetric label="Wartet auf Kunde" value={tasks.filter((task) => task.status === 'wartet-auf-kunde').length} caption="Rückmeldung, Freigabe oder Material fehlt" icon={Circle} />
          <TaskMetric label="Heute fällig" value={tasks.filter((task) => task.dueDate <= today && task.status !== 'erledigt').length} caption="muss heute entschieden werden" icon={AlertTriangle} />
          <TaskMetric label="Erledigt" value={tasks.filter((task) => task.status === 'erledigt').length} caption="sauber abgeschlossen statt vergessen" icon={CheckCircle2} />
        </div>
      </div>

      <TaskCreateModal
        open={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setFollowUpSeed(null); }}
        initialCustomerId={followUpSeed?.customerId}
        initialTitle={followUpSeed?.title}
        initialDescription={followUpSeed?.description}
        initialAssignee={followUpSeed?.assignee}
        initialDueDate={followUpSeed?.dueDate}
      />

      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onSave={(patch) => selectedTask && updateTask(selectedTask.id, patch)}
        onAdvance={() => selectedTask && updateTaskStatus(selectedTask.id)}
        onFollowUp={() => {
          if (!selectedTask) return;
          setFollowUpSeed({
            customerId: selectedTask.customerId,
            title: `Nachfassen: ${selectedTask.title}`,
            description: `Auf Basis der Aufgabe "${selectedTask.title}" den nächsten Schritt sauber absichern.`,
            assignee: selectedTask.assignee,
            dueDate: selectedTask.dueDate,
          });
          setIsCreateOpen(true);
        }}
        team={team}
        timeline={selectedTaskTimeline}
        timelineLoading={auditLoading}
        focusSection={focusSection}
      />
    </>
  );
}

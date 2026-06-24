
import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ChevronRight, Clock, MapPin, Search, Truck, User } from 'lucide-react';
import { getInitials, useAppStore } from '../../data/app-store';
import { EmptyState, SectionHeader, StatusBadge } from '../ui/common';
import { ServiceCreateModal, ServiceNoteModal } from '../ui/workflow-modals';
import type { ServiceEvent, ServiceStatus } from '../../data/store';

const filters: Array<'all' | ServiceStatus> = ['all', 'geplant', 'unterwegs', 'vor-ort', 'abgeschlossen', 'abgesagt'];

function toneForStatus(status: ServiceStatus) {
  if (status === 'abgeschlossen') return 'success';
  if (status === 'unterwegs') return 'warning';
  if (status === 'vor-ort') return 'violet';
  if (status === 'abgesagt') return 'neutral';
  return 'info';
}

export default function Einsaetze({ search }: { search: string }) {
  const { serviceEvents, team, activity, addServiceNote, updateServiceStatus, updateService } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<'all' | ServiceStatus>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(serviceEvents[0]?.id || null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string }>).detail;
      if (detail?.type === 'service') setIsCreateOpen(true);
    };
    window.addEventListener('crm:create', handler as EventListener);
    return () => window.removeEventListener('crm:create', handler as EventListener);
  }, []);

  const query = (search || localSearch).toLowerCase();
  const filtered = useMemo(
    () =>
      serviceEvents.filter((event) => {
        const matchesQuery =
          !query ||
          event.customerName.toLowerCase().includes(query) ||
          event.title.toLowerCase().includes(query) ||
          event.assignee.toLowerCase().includes(query);
        const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
        return matchesQuery && matchesStatus;
      }),
    [serviceEvents, query, statusFilter],
  );

  const selected = serviceEvents.find((event) => event.id === selectedId) || null;
  const serviceActivity = useMemo(() => {
    if (!selected) return [];
    return activity
      .filter((item) => item.customerId === selected.customerId && (item.kind === 'service' || item.kind === 'task' || item.kind === 'note'))
      .slice(0, 8);
  }, [activity, selected]);

  const [draft, setDraft] = useState({
    title: '',
    description: '',
    status: 'geplant' as ServiceStatus,
    assignee: '',
    date: '',
    startTime: '',
    endTime: '',
  });

  useEffect(() => {
    if (!selected) return;
    setDraft({
      title: selected.title,
      description: selected.description,
      status: selected.status,
      assignee: selected.assignee,
      date: selected.date,
      startTime: selected.startTime,
      endTime: selected.endTime,
    });
  }, [selected]);

  return (
    <>
      <div className="grid min-h-[calc(100dvh-76px)] gap-0 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="border-r border-white/[0.08]">
          <div className="space-y-5 p-4 sm:p-6 lg:p-8">
            <SectionHeader
              title="Einsatzliste"
              description="Status, Zeitfenster und Rückmeldungen in einer Ansicht."
              action={<button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>Einsatz planen</button>}
            />

            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
                  <input
                    type="search"
                    value={search ? search : localSearch}
                    onChange={(event) => setLocalSearch(event.target.value)}
                    placeholder="Kunde, Einsatz oder Techniker suchen"
                    className="h-11 w-full rounded-2xl border border-white/[0.09] bg-white/[0.04] pl-11 pr-4 text-[14px] text-cloud placeholder:text-ash focus:border-primary/40 focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter) => (
                    <button key={filter} onClick={() => setStatusFilter(filter)} className={`chip ${statusFilter === filter ? 'chip-active' : ''}`}>
                      {filter === 'all' ? 'alle Status' : filter.replaceAll('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                title={query ? 'Keine passenden Einsätze' : 'Keine Einsätze vorhanden'}
                description={query ? 'Passe Suche oder Statusfilter an.' : 'Plane den ersten Termin, damit der Einsatzbereich befüllt wird.'}
                action={<button className="btn btn-secondary" onClick={() => setIsCreateOpen(true)}>Einsatz anlegen</button>}
                icon={query ? 'search' : 'inbox'}
              />
            ) : (
              <div className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.03]">
                <table className="w-full">
                  <thead className="bg-black/15">
                    <tr className="text-left text-[12px] uppercase tracking-[0.14em] text-smoke">
                      <th className="px-5 py-4 font-semibold">Kunde</th>
                      <th className="px-5 py-4 font-semibold">Einsatz</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Zeit</th>
                      <th className="px-5 py-4 font-semibold">Techniker</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((event) => (
                      <tr
                        key={event.id}
                        onClick={() => setSelectedId(event.id)}
                        className={`cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.04] ${selectedId === event.id ? 'bg-white/[0.05]' : ''}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.08] text-[13px] font-semibold text-white">
                              {getInitials(event.customerName)}
                            </div>
                            <div>
                              <p className="text-[14px] font-medium text-white">{event.customerName}</p>
                              <p className="text-[13px] text-smoke">{event.customerAddress}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[14px] text-mist">{event.title}</td>
                        <td className="px-5 py-4">
                          <StatusBadge tone={toneForStatus(event.status)}>{event.status.replaceAll('-', ' ')}</StatusBadge>
                        </td>
                        <td className="px-5 py-4 text-[14px] text-mist">{event.date} · {event.startTime}–{event.endTime}</td>
                        <td className="px-5 py-4 text-[14px] text-mist">{event.assignee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <aside className="bg-[#0e1520]">
          {selected ? (
            <div className="h-full overflow-y-auto">
              <div className="border-b border-white/[0.08] px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={toneForStatus(selected.status)}>{selected.status.replaceAll('-', ' ')}</StatusBadge>
                      <StatusBadge tone="neutral">{selected.date}</StatusBadge>
                    </div>
                    <h3 className="mt-3 text-[24px] font-semibold tracking-[-0.04em] text-white">Einsatz führen</h3>
                    <p className="mt-1 text-[14px] leading-6 text-smoke">
                      Status, Zeitfenster, Notizen und Folgeeinsatz in einem Arbeitskontext.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 px-6 py-5">
                <section className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-smoke">Kunde</p>
                      <p className="mt-1 text-[16px] font-medium text-white">{selected.customerName}</p>
                    </div>
                    <button className="btn btn-secondary" onClick={() => setFollowUpOpen(true)}>
                      Folgeeinsatz
                    </button>
                  </div>

                  <div className="grid gap-4">
                    <label className="block">
                      <span className="field-label">Einsatztitel</span>
                      <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="field-input" />
                    </label>

                    <label className="block">
                      <span className="field-label">Beschreibung</span>
                      <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} rows={4} className="field-input min-h-[120px] resize-y py-3" />
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="field-label">Status</span>
                        <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ServiceStatus }))} className="field-input">
                          <option value="geplant">geplant</option>
                          <option value="unterwegs">unterwegs</option>
                          <option value="vor-ort">vor Ort</option>
                          <option value="abgeschlossen">abgeschlossen</option>
                          <option value="abgesagt">abgesagt</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="field-label">Techniker</span>
                        <select value={draft.assignee} onChange={(event) => setDraft((current) => ({ ...current, assignee: event.target.value }))} className="field-input">
                          {team.map((member) => (
                            <option key={member.id} value={member.name}>{member.name} · {member.role}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="field-label">Datum</span>
                        <input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} className="field-input" />
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                          <span className="field-label">Start</span>
                          <input type="time" value={draft.startTime} onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))} className="field-input" />
                        </label>
                        <label className="block">
                          <span className="field-label">Ende</span>
                          <input type="time" value={draft.endTime} onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))} className="field-input" />
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button className="btn btn-primary" onClick={() => updateService(selected.id, draft)}>Einsatz speichern</button>
                      <button className="btn btn-secondary" onClick={() => updateServiceStatus(selected.id)}>Nächster Status</button>
                      <button className="btn btn-secondary" onClick={() => setIsNoteOpen(true)}>Notiz ergänzen</button>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-smoke">Einsatznotizen</p>
                    <button className="text-[13px] font-medium text-primary-light" onClick={() => setIsNoteOpen(true)}>Notiz hinzufügen</button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {selected.notes.length === 0 ? (
                      <EmptyState title="Noch keine Einsatznotiz" description="Dokumentiere Abweichungen, Rückfragen oder Nachweise direkt am Termin." />
                    ) : (
                      selected.notes.map((note, index) => (
                        <div key={`${selected.id}-note-${index}`} className="rounded-2xl border border-white/[0.08] bg-black/15 p-4 text-[14px] leading-6 text-mist">
                          {note}
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-smoke">Verlauf & Historie</p>
                    <div className="flex items-center gap-2 text-[12px] text-smoke">
                      <CalendarClock className="h-4 w-4" />
                      letzte relevante Änderungen
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {serviceActivity.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[14px] font-medium text-white">{item.title}</p>
                          <span className="text-[12px] text-ash">{item.timestamp}</span>
                        </div>
                        <p className="mt-1 text-[13px] text-smoke">{item.actor}</p>
                        <p className="mt-2 text-[13px] text-ash">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-smoke">Operativer Kontext</p>
                  <div className="mt-4 space-y-3 text-[14px] text-mist">
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-smoke" />{selected.customerAddress}</div>
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-smoke" />{selected.date} · {selected.startTime}–{selected.endTime}</div>
                    <div className="flex items-center gap-2"><User className="h-4 w-4 text-smoke" />{selected.assignee}</div>
                    <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-smoke" />Status mit Folgeaktion statt isolierter Kartenansicht.</div>
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState title="Kein Einsatz ausgewählt" description="Wähle links einen Einsatz, um Status, Notizen und Historie zu bearbeiten." />
            </div>
          )}
        </aside>
      </div>

      <ServiceCreateModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <ServiceCreateModal open={followUpOpen} onClose={() => setFollowUpOpen(false)} initialCustomerId={selected?.customerId || ''} initialDate={selected?.date || undefined} />
      <ServiceNoteModal open={isNoteOpen} onClose={() => setIsNoteOpen(false)} onSubmit={(note) => selected && addServiceNote(selected.id, note)} />
    </>
  );
}


import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  User,
  Wrench,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { getInitials, useAppStore } from '../../data/app-store';
import { EmptyState, SectionHeader, StatusBadge } from '../ui/common';
import { CustomerCreateModal, QuickTagModal, ServiceCreateModal, TaskCreateModal } from '../ui/workflow-modals';
import type { Customer, CustomerStatus, NoteType, TaskPriority } from '../../data/store';

const customerStates: Array<'all' | CustomerStatus> = ['all', 'aktiv', 'wartet', 'risiko', 'archiviert'];

function formatDate(value?: string) {
  if (!value) return 'Nicht geplant';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusTone(status: CustomerStatus): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet' {
  if (status === 'aktiv') return 'success';
  if (status === 'wartet') return 'warning';
  if (status === 'risiko') return 'danger';
  return 'neutral';
}

function priorityTone(priority: TaskPriority): 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet' {
  if (priority === 'dringend') return 'danger';
  if (priority === 'hoch') return 'warning';
  if (priority === 'mittel') return 'info';
  return 'neutral';
}

function CustomerMetric({
  title,
  value,
  caption,
  tone = 'neutral',
}: {
  title: string;
  value: string | number;
  caption: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'violet';
}) {
  const toneClass = {
    neutral: 'border-white/[0.08] bg-white/[0.03]',
    success: 'border-success/20 bg-success/8',
    warning: 'border-warning/20 bg-warning/8',
    danger: 'border-danger/20 bg-danger/8',
    info: 'border-info/20 bg-info/8',
    violet: 'border-violet/20 bg-violet/8',
  }[tone];

  return (
    <div className={cn('rounded-[24px] border p-4', toneClass)}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-smoke">{title}</p>
      <p className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-1 text-[13px] text-smoke">{caption}</p>
    </div>
  );
}

export default function Kunden({ search }: { search: string }) {
  const { customers, addCustomerNote, addCustomerTag, updateCustomerStatus, activity, openTasks } = useAppStore();
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CustomerStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(customers[0]?.id || null);
  const [noteType, setNoteType] = useState<NoteType>('notiz');
  const [draftNote, setDraftNote] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [isServiceOpen, setIsServiceOpen] = useState(false);

  const query = (search || localSearch).trim().toLowerCase();
  const filtered = useMemo(() => {
    return customers.filter((customer) => {
      const matchesQuery =
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.city.toLowerCase().includes(query) ||
        customer.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        customer.contacts.some((contact) => contact.name.toLowerCase().includes(query) || contact.email.toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [customers, query, statusFilter]);

  const selected = customers.find((customer) => customer.id === selectedId) || null;

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string; source?: string }>).detail;
      if (detail?.source === 'header') return;
      if (detail?.type === 'customer') setCreateOpen(true);
    };
    window.addEventListener('crm:create', handler as EventListener);
    return () => window.removeEventListener('crm:create', handler as EventListener);
  }, []);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((customer) => customer.id === selectedId)) {
      setSelectedId(filtered[0]?.id || null);
    }
  }, [filtered, selectedId]);

  const selectedTasks = selected ? selected.tasks : [];
  const selectedOpenTasks = selectedTasks.filter((task) => task.status !== 'erledigt');
  const selectedRecentActivity = selected ? activity.filter((entry) => entry.customerId === selected.id).slice(0, 6) : [];
  const riskCustomers = customers.filter((customer) => customer.status === 'risiko').length;
  const waitingCustomers = customers.filter((customer) => customer.status === 'wartet').length;
  const customersWithOpenTasks = customers.filter((customer) => customer.tasks.some((task) => task.status !== 'erledigt')).length;

  const topCustomers = [...customers]
    .sort((left, right) => {
      const leftWeight = (left.status === 'risiko' ? 4 : left.status === 'wartet' ? 2 : 1) + left.tasks.filter((task) => task.status !== 'erledigt').length;
      const rightWeight = (right.status === 'risiko' ? 4 : right.status === 'wartet' ? 2 : 1) + right.tasks.filter((task) => task.status !== 'erledigt').length;
      return rightWeight - leftWeight;
    })
    .slice(0, 4);

  const saveNote = () => {
    if (!selected || !draftNote.trim()) return;
    addCustomerNote(selected.id, { content: draftNote.trim(), type: noteType });
    setDraftNote('');
  };

  const riskLabel = (customer: Customer) => {
    const overdueForCustomer = openTasks.filter((task) => task.customerId === customer.id && task.status !== 'erledigt' && task.dueDate < '2026-06-24').length;
    if (customer.status === 'risiko') return 'Sofort nachfassen';
    if (overdueForCustomer > 0) return `${overdueForCustomer} offene Eskalation${overdueForCustomer > 1 ? 'en' : ''}`;
    if (!customer.nextService) return 'Kein nächster Einsatz geplant';
    return `Nächster Einsatz ${formatDate(customer.nextService)}`;
  };

  return (
    <>
      <div className="grid min-h-[calc(100dvh-76px)] gap-0 xl:grid-cols-[minmax(0,1.2fr)_440px]">
        <section className="border-r border-white/[0.08]">
          <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <SectionHeader
              title="Kundensteuerung"
              description="Kunden mit Kontext statt Tabellenfriedhof: Risiken, nächste Schritte und Verantwortlichkeit auf einer Fläche."
              action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Kunde anlegen</button>}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <CustomerMetric title="Kunden gesamt" value={customers.length} caption={`${customersWithOpenTasks} mit offenen Aufgaben`} />
              <CustomerMetric title="Warten auf Aktion" value={waitingCustomers} caption="Kunden ohne sauberen Abschluss" tone="warning" />
              <CustomerMetric title="Risikokunden" value={riskCustomers} caption="Brauchen klare Nachverfolgung" tone="danger" />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
              <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
                    <input
                      type="search"
                      value={search ? search : localSearch}
                      onChange={(event) => setLocalSearch(event.target.value)}
                      placeholder="Nach Firma, Ort, Tag oder Ansprechpartner suchen"
                      className="h-11 w-full rounded-2xl border border-white/[0.09] bg-white/[0.04] pl-11 pr-4 text-[14px] text-cloud placeholder:text-ash focus:border-primary/40 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {customerStates.map((status) => (
                      <button key={status} onClick={() => setStatusFilter(status)} className={cn('chip', statusFilter === status && 'chip-active')}>
                        {status === 'all' ? 'Alle' : status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[24px] border border-white/[0.08]">
                  {filtered.length === 0 ? (
                    <div className="p-6">
                      <EmptyState
                        title={query ? 'Keine Kunden zu dieser Suche' : 'Noch keine Kunden angelegt'}
                        description={query ? 'Suche, Filter oder Schreibweise anpassen.' : 'Lege den ersten Kunden an, damit Aufgaben, Notizen und Einsätze geplant werden können.'}
                        action={<button className="btn btn-secondary" onClick={() => setCreateOpen(true)}>Kunde anlegen</button>}
                        icon={query ? 'search' : 'inbox'}
                      />
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-black/15">
                        <tr className="text-left text-[12px] uppercase tracking-[0.14em] text-smoke">
                          <th className="px-5 py-4 font-semibold">Kunde</th>
                          <th className="px-5 py-4 font-semibold">Status</th>
                          <th className="px-5 py-4 font-semibold">Offene Punkte</th>
                          <th className="px-5 py-4 font-semibold">Nächster Schritt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((customer) => {
                          const pending = customer.tasks.filter((task) => task.status !== 'erledigt').length;
                          return (
                            <tr
                              key={customer.id}
                              onClick={() => setSelectedId(customer.id)}
                              className={cn('cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.04]', selectedId === customer.id && 'bg-white/[0.06]')}
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 font-semibold text-primary-soft">
                                    {getInitials(customer.name)}
                                  </div>
                                  <div>
                                    <p className="text-[15px] font-medium text-white">{customer.name}</p>
                                    <p className="text-[13px] text-smoke">{customer.city} · {customer.contacts[0]?.name}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4"><StatusBadge tone={statusTone(customer.status)}>{customer.status}</StatusBadge></td>
                              <td className="px-5 py-4">
                                <div className="space-y-1">
                                  <p className="text-[14px] font-medium text-white">{pending} offen</p>
                                  <p className="text-[13px] text-smoke">{customer.serviceCount} Einsätze gesamt</p>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-[14px] text-white">{riskLabel(customer)}</p>
                                <p className="text-[13px] text-smoke">{customer.tags.slice(0, 2).join(' · ') || 'Keine Tags'}</p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
                <SectionHeader title="Operativ zuerst" description="Kunden, bei denen Servicequalität oder Reaktionszeit kippen kann." />
                <div className="mt-4 space-y-3">
                  {topCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => setSelectedId(customer.id)}
                      className={cn('w-full rounded-[22px] border p-4 text-left transition-colors hover:bg-white/[0.04]',
                        selectedId === customer.id ? 'border-primary/25 bg-primary/10' : 'border-white/[0.08] bg-black/15')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[15px] font-semibold text-white">{customer.name}</p>
                          <p className="mt-1 text-[13px] text-smoke">{riskLabel(customer)}</p>
                        </div>
                        <StatusBadge tone={statusTone(customer.status)}>{customer.status}</StatusBadge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {customer.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[12px] font-medium text-smoke">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="bg-black/10">
          {selected ? (
            <div className="space-y-5 p-4 sm:p-6">
              <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-primary/12 text-[18px] font-semibold text-primary-soft">
                      {getInitials(selected.name)}
                    </div>
                    <div>
                      <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-white">{selected.name}</h2>
                      <p className="mt-1 text-[14px] text-smoke">{selected.address}, {selected.zip} {selected.city}</p>
                    </div>
                  </div>
                  <StatusBadge tone={statusTone(selected.status)}>{selected.status}</StatusBadge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <CustomerMetric title="Offene Aufgaben" value={selectedOpenTasks.length} caption="direkt im Kundenkontext" tone={selectedOpenTasks.length > 0 ? 'warning' : 'success'} />
                  <CustomerMetric title="Nächster Einsatz" value={selected.nextService ? formatDate(selected.nextService) : 'Offen'} caption={selected.lastService ? `Letzter Einsatz ${formatDate(selected.lastService)}` : 'Noch kein Einsatz'} tone={selected.nextService ? 'info' : 'danger'} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button className="btn btn-secondary" onClick={() => setIsTaskOpen(true)}><Plus className="h-4 w-4" />Aufgabe</button>
                  <button className="btn btn-secondary" onClick={() => setIsServiceOpen(true)}><Wrench className="h-4 w-4" />Einsatz</button>
                  <button className="btn btn-secondary" onClick={() => setIsTagOpen(true)}>Tag ergänzen</button>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
                <SectionHeader title="Kontakt & Verantwortung" description="Wichtige Kontakt- und Steuerungsdaten ohne Kontextwechsel." />
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 text-[14px] text-mist"><MapPin className="h-4 w-4 text-smoke" />{selected.address}, {selected.zip} {selected.city}</div>
                  <div className="flex items-center gap-3 text-[14px] text-mist"><Phone className="h-4 w-4 text-smoke" />{selected.phone || 'Keine Telefonnummer hinterlegt'}</div>
                  <div className="flex items-center gap-3 text-[14px] text-mist"><Mail className="h-4 w-4 text-smoke" />{selected.email}</div>
                  <div className="flex items-center gap-3 text-[14px] text-mist"><User className="h-4 w-4 text-smoke" />{selected.contacts[0]?.name} · {selected.contacts[0]?.role || 'Ansprechpartner'}</div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {selected.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[12px] font-medium text-smoke">
                      {tag}
                    </span>
                  ))}
                  {selected.tags.length === 0 ? <p className="text-[13px] text-smoke">Noch keine Tags vergeben.</p> : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(['aktiv', 'wartet', 'risiko', 'archiviert'] as CustomerStatus[]).map((status) => (
                    <button key={status} type="button" onClick={() => updateCustomerStatus(selected.id, status)} className={cn('chip', selected.status === status && 'chip-active')}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
                <SectionHeader title="Offene Punkte" description="Alles, was vor dem nächsten Einsatz sauber gelöst sein muss." />
                <div className="mt-4 space-y-3">
                  {selectedOpenTasks.length === 0 ? (
                    <EmptyState title="Keine offenen Aufgaben" description="Für diesen Kunden ist aktuell nichts eskaliert oder offen." icon="inbox" />
                  ) : (
                    selectedOpenTasks.map((task) => (
                      <div key={task.id} className="rounded-[22px] border border-white/[0.08] bg-black/15 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[15px] font-semibold text-white">{task.title}</p>
                            <p className="mt-1 text-[13px] text-smoke">{task.description}</p>
                          </div>
                          <StatusBadge tone={priorityTone(task.priority)}>{task.priority}</StatusBadge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-[13px] text-smoke">
                          <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />Fällig {formatDate(task.dueDate)}</span>
                          <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{task.assignee}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
                <SectionHeader title="Notizen & Verlauf" description="Was zuletzt passiert ist und was intern festgehalten wurde." />
                <div className="mt-4 rounded-[22px] border border-white/[0.08] bg-black/15 p-4">
                  <div className="flex flex-wrap gap-3">
                    <select value={noteType} onChange={(event) => setNoteType(event.target.value as NoteType)} className="field max-w-[220px]">
                      <option value="notiz">Notiz</option>
                      <option value="anruf">Telefonat</option>
                      <option value="email">E-Mail</option>
                      <option value="besuch">Vor-Ort</option>
                      <option value="intern">Intern</option>
                    </select>
                    <textarea
                      value={draftNote}
                      onChange={(event) => setDraftNote(event.target.value)}
                      placeholder="Nächster Schritt, Erkenntnis oder Rückmeldung dokumentieren"
                      className="field min-h-[110px] flex-1"
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button className="btn btn-primary" onClick={saveNote} disabled={!draftNote.trim()}>Notiz speichern</button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {selected.notes.map((note) => (
                    <div key={note.id} className="rounded-[22px] border border-white/[0.08] bg-black/15 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[14px] font-medium text-white">{note.author}</p>
                          <p className="mt-1 text-[13px] text-mist">{note.content}</p>
                        </div>
                        <div className="text-right">
                          <StatusBadge tone="neutral">{note.type}</StatusBadge>
                          <p className="mt-2 text-[12px] text-smoke">{note.createdAt}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-white/[0.08] pt-5">
                  <SectionHeader title="Letzte Aktivität" description="Systemweite Änderungen und Aktionen zu diesem Kunden." />
                  <div className="mt-4 space-y-3">
                    {selectedRecentActivity.length === 0 ? (
                      <p className="text-[13px] text-smoke">Noch keine Aktivität erfasst.</p>
                    ) : (
                      selectedRecentActivity.map((entry) => (
                        <div key={entry.id} className="rounded-[20px] border border-white/[0.08] bg-black/15 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[14px] font-semibold text-white">{entry.title}</p>
                              <p className="mt-1 text-[13px] text-smoke">{entry.detail}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[12px] text-smoke">{entry.actor}</p>
                              <p className="mt-1 text-[12px] text-ash">{entry.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {selected.status === 'risiko' ? (
                <div className="rounded-[28px] border border-danger/25 bg-danger/8 p-5">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 h-5 w-5 text-danger" />
                    <div>
                      <p className="text-[15px] font-semibold text-white">Risikokunde</p>
                      <p className="mt-1 text-[13px] leading-6 text-mist">
                        Dieser Kunde braucht einen klaren Eigentümer, einen terminierten nächsten Schritt und sichtbare Nachverfolgung.
                        Ohne sauberen Abschluss sinkt hier direkt die wahrgenommene Servicequalität.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState title="Kein Kunde ausgewählt" description="Wähle links einen Kunden aus, um Details, Aufgaben und letzte Aktivität zu sehen." icon="inbox" />
            </div>
          )}
        </aside>
      </div>

      <CustomerCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {selected ? <QuickTagModal open={isTagOpen} onClose={() => setIsTagOpen(false)} customerId={selected.id} /> : null}
      {selected ? <TaskCreateModal open={isTaskOpen} onClose={() => setIsTaskOpen(false)} initialCustomerId={selected.id} initialTitle={`Nachfassen ${selected.name}`} /> : null}
      {selected ? <ServiceCreateModal open={isServiceOpen} onClose={() => setIsServiceOpen(false)} initialCustomerId={selected.id} /> : null}
    </>
  );
}

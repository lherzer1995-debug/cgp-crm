import { useMemo, useState } from 'react';
import { Calendar, Mail, MapPin, Phone, Plus, Search, User, Wrench, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getInitials, useAppStore } from '../../data/app-store';
import { EmptyState, SectionHeader, StatusBadge } from '../ui/common';
import type { CustomerStatus, NoteType } from '../../data/store';

const customerStates: CustomerStatus[] = ['aktiv', 'wartet', 'risiko', 'archiviert'];

export default function Kunden({ search }: { search: string }) {
  const { customers, addCustomer, addCustomerNote, addCustomerTag, addTask, addServiceEvent, updateCustomerStatus } = useAppStore();
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CustomerStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(customers[0]?.id || null);
  const [noteType, setNoteType] = useState<NoteType>('notiz');
  const [draftNote, setDraftNote] = useState('');

  const query = (search || localSearch).toLowerCase();
  const filtered = useMemo(() => {
    return customers.filter((customer) => {
      const matchesQuery =
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.city.toLowerCase().includes(query) ||
        customer.contacts.some((contact) => contact.name.toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [customers, query, statusFilter]);

  const selected = customers.find((customer) => customer.id === selectedId) || null;

  const createCustomer = () => {
    const name = window.prompt('Name des Kunden');
    if (!name) return;
    const city = window.prompt('Ort', 'München') || '';
    const email = window.prompt('E-Mail', 'kontakt@example.de') || '';
    addCustomer({ name, city, email });
  };

  const saveNote = () => {
    if (!selected) return;
    addCustomerNote(selected.id, { content: draftNote, type: noteType });
    setDraftNote('');
  };

  return (
    <div className="grid min-h-[calc(100dvh-76px)] gap-0 xl:grid-cols-[minmax(0,1.1fr)_420px]">
      <section className="border-r border-white/[0.08]">
        <div className="space-y-5 p-4 sm:p-6 lg:p-8">
          <SectionHeader
            title="Kundenbestand"
            description="Tabellarisch, filterbar und ohne Showcase-Optik."
            action={<button className="btn btn-primary" onClick={createCustomer}><Plus className="h-4 w-4" />Kunde anlegen</button>}
          />

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
              <input
                type="search"
                value={search ? search : localSearch}
                onChange={(event) => setLocalSearch(event.target.value)}
                placeholder="Kunde oder Ansprechpartner suchen"
                className="h-11 w-full rounded-2xl border border-white/[0.09] bg-white/[0.04] pl-11 pr-4 text-[14px] text-cloud placeholder:text-ash focus:border-primary/40 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setStatusFilter('all')} className={cn('chip', statusFilter === 'all' && 'chip-active')}>Alle</button>
              {customerStates.map((status) => (
                <button key={status} onClick={() => setStatusFilter(status)} className={cn('chip', statusFilter === status && 'chip-active')}>
                  {status}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title={query ? 'Keine passenden Kunden' : 'Noch keine Kunden angelegt'}
              description={query ? 'Passe den Suchbegriff oder den Statusfilter an.' : 'Lege den ersten Kunden an, damit Aufgaben, Notizen und Einsätze geplant werden können.'}
              action={<button className="btn btn-secondary" onClick={createCustomer}>Kunde anlegen</button>}
              icon={query ? 'search' : 'inbox'}
            />
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.03]">
              <table className="w-full">
                <thead className="bg-black/15">
                  <tr className="text-left text-[12px] uppercase tracking-[0.14em] text-smoke">
                    <th className="px-5 py-4 font-semibold">Kunde</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Kontakt</th>
                    <th className="px-5 py-4 font-semibold">Nächster Einsatz</th>
                    <th className="px-5 py-4 font-semibold">Risiko</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => setSelectedId(customer.id)}
                      className={cn('cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.04]', selectedId === customer.id && 'bg-white/[0.05]')}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 font-semibold text-primary-soft">
                            {getInitials(customer.name)}
                          </div>
                          <div>
                            <p className="text-[15px] font-medium text-white">{customer.name}</p>
                            <p className="text-[13px] text-smoke">{customer.city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={customer.status === 'risiko' ? 'danger' : customer.status === 'wartet' ? 'warning' : customer.status === 'archiviert' ? 'neutral' : 'success'}>
                          {customer.status}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-4 text-[14px] text-smoke">{customer.contacts[0]?.name}</td>
                      <td className="px-5 py-4 text-[14px] text-smoke">{customer.nextService || 'kein Termin'}</td>
                      <td className="px-5 py-4 text-[14px] text-smoke">{customer.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <aside className="bg-[#0d121b]">
        {!selected ? (
          <div className="p-6">
            <EmptyState title="Kein Kunde ausgewählt" description="Wähle links einen Kunden aus, um Kontakt, Aufgaben und Notizen zu bearbeiten." />
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="border-b border-white/[0.08] p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 font-semibold text-primary-soft">
                      {getInitials(selected.name)}
                    </div>
                    <div>
                      <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-white">{selected.name}</h2>
                      <p className="text-[14px] text-smoke">{selected.address}, {selected.city}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {customerStates.map((status) => (
                      <button key={status} onClick={() => updateCustomerStatus(selected.id, status)} className={cn('chip', selected.status === status && 'chip-active')}>
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setSelectedId(null)} className="rounded-2xl border border-white/[0.08] p-2 text-smoke hover:bg-white/[0.05] hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button onClick={() => window.location.href = `tel:${selected.phone}`} className="btn btn-secondary"><Phone className="h-4 w-4" />Anrufen</button>
                <button onClick={() => window.location.href = `mailto:${selected.email}`} className="btn btn-secondary"><Mail className="h-4 w-4" />E-Mail</button>
                <button onClick={() => addTask({ customerId: selected.id, title: 'Rückruf an Kunden' })} className="btn btn-secondary"><User className="h-4 w-4" />Aufgabe</button>
                <button onClick={() => addServiceEvent({ customerId: selected.id, title: 'Serviceeinsatz', date: '2026-06-24' })} className="btn btn-secondary"><Wrench className="h-4 w-4" />Einsatz</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-smoke">Kontakt</p>
                  <div className="mt-4 space-y-3 text-[14px] text-smoke">
                    <div className="flex items-center gap-3"><MapPin className="h-4 w-4" />{selected.address}, {selected.zip} {selected.city}</div>
                    <div className="flex items-center gap-3"><Phone className="h-4 w-4" />{selected.phone}</div>
                    <div className="flex items-center gap-3"><Mail className="h-4 w-4" />{selected.email}</div>
                    <div className="flex items-center gap-3"><Calendar className="h-4 w-4" />Kunde seit {selected.customerSince}</div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-smoke">Tags</p>
                    <button
                      onClick={() => {
                        const tag = window.prompt('Tag ergänzen');
                        if (tag) addCustomerTag(selected.id, tag);
                      }}
                      className="text-[13px] text-primary-light hover:text-white"
                    >
                      + hinzufügen
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selected.tags.length > 0 ? selected.tags.map((tag) => <StatusBadge key={tag} tone="violet">{tag}</StatusBadge>) : <p className="text-[14px] text-smoke">Noch keine Tags.</p>}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-smoke">Notizen</p>
                  <div className="mt-4 space-y-3">
                    <select value={noteType} onChange={(event) => setNoteType(event.target.value as NoteType)} className="field">
                      <option value="notiz">Notiz</option>
                      <option value="anruf">Telefonat</option>
                      <option value="email">E-Mail</option>
                      <option value="besuch">Besuch</option>
                      <option value="intern">Intern</option>
                    </select>
                    <textarea
                      value={draftNote}
                      onChange={(event) => setDraftNote(event.target.value)}
                      rows={4}
                      placeholder="Kurz und konkret dokumentieren, was passiert ist."
                      className="field min-h-[120px] resize-none"
                    />
                    <div className="flex justify-end">
                      <button onClick={saveNote} disabled={!draftNote.trim()} className="btn btn-primary disabled:opacity-50">
                        Notiz speichern
                      </button>
                    </div>
                    <div className="space-y-3 border-t border-white/[0.08] pt-4">
                      {selected.notes.length === 0 ? (
                        <EmptyState title="Noch keine Notizen" description="Dokumentiere Anrufe, Vereinbarungen oder interne Hinweise direkt hier." />
                      ) : (
                        selected.notes.map((note) => (
                          <div key={note.id} className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <StatusBadge tone={note.type === 'intern' ? 'warning' : note.type === 'anruf' ? 'success' : 'info'}>
                                {note.type}
                              </StatusBadge>
                              <span className="text-[12px] text-ash">{note.createdAt}</span>
                            </div>
                            <p className="mt-3 text-[14px] leading-6 text-mist">{note.content}</p>
                            <p className="mt-2 text-[12px] text-ash">{note.author}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-smoke">Offene Aufgaben</p>
                  <div className="mt-4 space-y-3">
                    {selected.tasks.filter((task) => task.status !== 'erledigt').length === 0 ? (
                      <EmptyState title="Keine offenen Aufgaben" description="Für diesen Kunden ist aktuell nichts offen." />
                    ) : (
                      selected.tasks.filter((task) => task.status !== 'erledigt').map((task) => (
                        <div key={task.id} className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[14px] font-medium text-white">{task.title}</p>
                            <StatusBadge tone={task.priority === 'dringend' ? 'danger' : task.priority === 'hoch' ? 'warning' : 'info'}>
                              {task.priority}
                            </StatusBadge>
                          </div>
                          <p className="mt-2 text-[13px] text-smoke">{task.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

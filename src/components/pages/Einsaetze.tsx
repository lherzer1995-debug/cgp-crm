import { useMemo, useState } from 'react';
import { Calendar, ChevronRight, Clock, MapPin, Plus, Search, Truck, User, X } from 'lucide-react';
import { getInitials, useAppStore } from '../../data/app-store';
import { EmptyState, SectionHeader, StatusBadge } from '../ui/common';
import type { ServiceStatus } from '../../data/store';

const filters: Array<'all' | ServiceStatus> = ['all', 'geplant', 'unterwegs', 'vor-ort', 'abgeschlossen', 'abgesagt'];

export default function Einsaetze({ search }: { search: string }) {
  const { serviceEvents, customers, addServiceEvent, addServiceNote, updateServiceStatus } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<'all' | ServiceStatus>('all');
  const [localSearch, setLocalSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(serviceEvents[0]?.id || null);

  const query = (search || localSearch).toLowerCase();
  const filtered = useMemo(() => {
    return serviceEvents.filter((event) => {
      const matchesQuery =
        !query ||
        event.customerName.toLowerCase().includes(query) ||
        event.title.toLowerCase().includes(query) ||
        event.assignee.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [serviceEvents, query, statusFilter]);

  const selected = serviceEvents.find((event) => event.id === selectedId) || null;

  const createEvent = () => {
    const customer = customers[0];
    const title = window.prompt('Einsatzname', 'Wartung vor Ort');
    if (!title || !customer) return;
    addServiceEvent({ customerId: customer.id, title, date: '2026-06-24' });
  };

  return (
    <div className="grid min-h-[calc(100dvh-76px)] gap-0 xl:grid-cols-[minmax(0,1fr)_400px]">
      <section className="border-r border-white/[0.08]">
        <div className="space-y-5 p-4 sm:p-6 lg:p-8">
          <SectionHeader
            title="Einsatzliste"
            description="Status, Zeitfenster und Rückmeldungen in einer Ansicht."
            action={<button className="btn btn-primary" onClick={createEvent}><Plus className="h-4 w-4" />Einsatz planen</button>}
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
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title={query ? 'Keine passenden Einsätze' : 'Keine Einsätze vorhanden'}
              description={query ? 'Passe Suche oder Statusfilter an.' : 'Plane den ersten Termin, damit der Einsatzbereich befüllt wird.'}
              action={<button className="btn btn-secondary" onClick={createEvent}>Einsatz anlegen</button>}
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
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12 font-semibold text-primary-soft">
                            {getInitials(event.customerName)}
                          </div>
                          <div>
                            <p className="text-[15px] font-medium text-white">{event.customerName}</p>
                            <p className="text-[13px] text-smoke">{event.customerAddress}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[14px] text-smoke">{event.title}</td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={event.status === 'abgeschlossen' ? 'success' : event.status === 'unterwegs' ? 'warning' : event.status === 'geplant' ? 'info' : 'neutral'}>
                          {event.status}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-4 text-[14px] text-smoke">{event.date} · {event.startTime}</td>
                      <td className="px-5 py-4 text-[14px] text-smoke">{event.assignee}</td>
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
            <EmptyState title="Kein Einsatz ausgewählt" description="Wähle links einen Einsatz, um Status und Notizen zu bearbeiten." />
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="border-b border-white/[0.08] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-[-0.04em] text-white">{selected.title}</h2>
                  <p className="mt-1 text-[14px] text-smoke">{selected.customerName}</p>
                </div>
                <button onClick={() => setSelectedId(null)} className="rounded-2xl border border-white/[0.08] p-2 text-smoke hover:bg-white/[0.05] hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {filters.filter((item): item is ServiceStatus => item !== 'all').map((status) => (
                  <button key={status} onClick={() => updateServiceStatus(selected.id, status)} className={`chip ${selected.status === status ? 'chip-active' : ''}`}>
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-smoke">Rahmendaten</p>
                  <div className="mt-4 space-y-3 text-[14px] text-smoke">
                    <div className="flex items-center gap-3"><Calendar className="h-4 w-4" />{selected.date}</div>
                    <div className="flex items-center gap-3"><Clock className="h-4 w-4" />{selected.startTime} – {selected.endTime}</div>
                    <div className="flex items-center gap-3"><User className="h-4 w-4" />{selected.assignee}</div>
                    <div className="flex items-center gap-3"><MapPin className="h-4 w-4" />{selected.customerAddress}</div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-smoke">Statusaktion</p>
                  <div className="mt-4 grid gap-2">
                    <button onClick={() => updateServiceStatus(selected.id)} className="btn btn-primary"><Truck className="h-4 w-4" />Nächsten Status setzen</button>
                    <button
                      onClick={() => {
                        const note = window.prompt('Einsatznotiz');
                        if (note) addServiceNote(selected.id, note);
                      }}
                      className="btn btn-secondary"
                    >
                      Notiz ergänzen
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-smoke">Einsatznotizen</p>
                  <div className="mt-4 space-y-3">
                    {selected.notes.length === 0 ? (
                      <EmptyState title="Noch keine Notizen" description="Dokumentiere Anfahrt, Rückfragen oder Besonderheiten direkt im Einsatz." />
                    ) : (
                      selected.notes.map((note, index) => (
                        <div key={`${selected.id}-${index}`} className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                          <p className="text-[14px] leading-6 text-mist">{note}</p>
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

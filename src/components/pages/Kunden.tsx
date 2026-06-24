import { useEffect, useMemo, useState } from 'react';
import { Calendar, Mail, MapPin, Phone, Plus, Search, User, Wrench, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { getInitials, useAppStore } from '../../data/app-store';
import { EmptyState, Modal, SectionHeader, StatusBadge } from '../ui/common';
import { QuickTagModal, ServiceCreateModal, TaskCreateModal } from '../ui/workflow-modals';
import type { CustomerStatus, NoteType, TaskPriority } from '../../data/store';

const customerStates: CustomerStatus[] = ['aktiv', 'wartet', 'risiko', 'archiviert'];
const priorityOptions: TaskPriority[] = ['niedrig', 'mittel', 'hoch', 'dringend'];

type CustomerFormState = {
  name: string;
  address: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  status: CustomerStatus;
  priority: TaskPriority;
  contactName: string;
  contactRole: string;
  contactPhone: string;
  contactEmail: string;
  tags: string;
};

const initialCustomerForm: CustomerFormState = {
  name: '',
  address: '',
  zip: '',
  city: '',
  phone: '',
  email: '',
  status: 'wartet',
  priority: 'mittel',
  contactName: '',
  contactRole: '',
  contactPhone: '',
  contactEmail: '',
  tags: '',
};

export default function Kunden({ search }: { search: string }) {
  const { customers, addCustomer, addCustomerNote, addCustomerTag, updateCustomerStatus } = useAppStore();
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CustomerStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(customers[0]?.id || null);
  const [noteType, setNoteType] = useState<NoteType>('notiz');
  const [draftNote, setDraftNote] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(initialCustomerForm);
  const [customerErrors, setCustomerErrors] = useState<Partial<Record<keyof CustomerFormState, string>>>({});
  const [isTagOpen, setIsTagOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [isServiceOpen, setIsServiceOpen] = useState(false);

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

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: string; source?: string }>).detail;
      if (detail?.source === 'header') return;
      if (detail?.type === 'customer') setIsCreateOpen(true);
    };
    window.addEventListener('crm:create', handler as EventListener);
    return () => window.removeEventListener('crm:create', handler as EventListener);
  }, []);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const updateForm = <K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) => {
    setCustomerForm((current) => ({ ...current, [key]: value }));
    setCustomerErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof CustomerFormState, string>> = {};

    if (!customerForm.name.trim()) nextErrors.name = 'Bitte einen Kundennamen eingeben.';
    if (!customerForm.city.trim()) nextErrors.city = 'Bitte einen Ort eingeben.';
    if (!customerForm.email.trim()) nextErrors.email = 'Bitte eine E-Mail-Adresse eingeben.';
    if (!customerForm.contactName.trim()) nextErrors.contactName = 'Bitte einen Ansprechpartner angeben.';

    if (customerForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerForm.email.trim())) {
      nextErrors.email = 'Bitte eine gültige E-Mail-Adresse eingeben.';
    }

    if (customerForm.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerForm.contactEmail.trim())) {
      nextErrors.contactEmail = 'Bitte eine gültige E-Mail-Adresse eingeben.';
    }

    setCustomerErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const closeCreateModal = () => {
    if (isSubmitting) return;
    setIsCreateOpen(false);
    setCustomerForm(initialCustomerForm);
    setCustomerErrors({});
  };

  const submitCustomer = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);

    const normalizedTags = customerForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    addCustomer({
      name: customerForm.name,
      address: customerForm.address,
      zip: customerForm.zip,
      city: customerForm.city,
      phone: customerForm.phone,
      email: customerForm.email,
      status: customerForm.status,
      priority: customerForm.priority,
      contactName: customerForm.contactName,
      contactRole: customerForm.contactRole,
      contactPhone: customerForm.contactPhone,
      contactEmail: customerForm.contactEmail,
      tags: normalizedTags,
    });

    await new Promise((resolve) => window.setTimeout(resolve, 220));
    setIsSubmitting(false);
    closeCreateModal();
  };

  const saveNote = () => {
    if (!selected) return;
    addCustomerNote(selected.id, { content: draftNote, type: noteType });
    setDraftNote('');
  };

  return (
    <>
      <div className="grid min-h-[calc(100dvh-76px)] gap-0 xl:grid-cols-[minmax(0,1.1fr)_420px]">
        <section className="border-r border-white/[0.08]">
          <div className="space-y-5 p-4 sm:p-6 lg:p-8">
            <SectionHeader
              title="Kundenbestand"
              description="Filterbar, belastbar und direkt auf Arbeitsabläufe ausgerichtet."
              action={<button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4" />Kunde anlegen</button>}
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
                action={<button className="btn btn-secondary" onClick={() => setIsCreateOpen(true)}>Kunde anlegen</button>}
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
                  <button onClick={() => setIsTaskOpen(true)} className="btn btn-secondary"><User className="h-4 w-4" />Aufgabe</button>
                  <button onClick={() => setIsServiceOpen(true)} className="btn btn-secondary"><Wrench className="h-4 w-4" />Einsatz</button>
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
                        onClick={() => setIsTagOpen(true)}
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

      <Modal
        open={isCreateOpen}
        onClose={closeCreateModal}
        title="Neuen Kunden anlegen"
        description="Lege den Kunden inklusive Ansprechpartner direkt sauber an. So sind Kontakt, Status und Priorisierung sofort vollständig."
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeCreateModal} disabled={isSubmitting}>Abbrechen</button>
            <button className="btn btn-primary" onClick={submitCustomer} disabled={isSubmitting}>
              {isSubmitting ? 'Wird angelegt…' : 'Kunde speichern'}
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <section>
            <h4 className="text-[15px] font-semibold text-white">Stammdaten</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="field-label">Firmenname *</label>
                <input
                  value={customerForm.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="z. B. Bäckerei Sonnenschein"
                  className={cn('field', customerErrors.name && 'field-error')}
                />
                {customerErrors.name ? <p className="mt-1 text-[12px] text-danger-soft">{customerErrors.name}</p> : null}
              </div>

              <div>
                <label className="field-label">Straße / Hausnummer</label>
                <input value={customerForm.address} onChange={(event) => updateForm('address', event.target.value)} placeholder="Rosenstraße 17" className="field" />
              </div>
              <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4">
                <div>
                  <label className="field-label">PLZ</label>
                  <input value={customerForm.zip} onChange={(event) => updateForm('zip', event.target.value)} placeholder="80331" className="field" />
                </div>
                <div>
                  <label className="field-label">Ort *</label>
                  <input
                    value={customerForm.city}
                    onChange={(event) => updateForm('city', event.target.value)}
                    placeholder="München"
                    className={cn('field', customerErrors.city && 'field-error')}
                  />
                  {customerErrors.city ? <p className="mt-1 text-[12px] text-danger-soft">{customerErrors.city}</p> : null}
                </div>
              </div>

              <div>
                <label className="field-label">Telefon</label>
                <input value={customerForm.phone} onChange={(event) => updateForm('phone', event.target.value)} placeholder="+49 89 123456" className="field" />
              </div>
              <div>
                <label className="field-label">Allgemeine E-Mail *</label>
                <input
                  value={customerForm.email}
                  onChange={(event) => updateForm('email', event.target.value)}
                  placeholder="service@kunde.de"
                  className={cn('field', customerErrors.email && 'field-error')}
                />
                {customerErrors.email ? <p className="mt-1 text-[12px] text-danger-soft">{customerErrors.email}</p> : null}
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-[15px] font-semibold text-white">Ansprechpartner</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="field-label">Name *</label>
                <input
                  value={customerForm.contactName}
                  onChange={(event) => updateForm('contactName', event.target.value)}
                  placeholder="Katrin Meier"
                  className={cn('field', customerErrors.contactName && 'field-error')}
                />
                {customerErrors.contactName ? <p className="mt-1 text-[12px] text-danger-soft">{customerErrors.contactName}</p> : null}
              </div>
              <div>
                <label className="field-label">Rolle</label>
                <input value={customerForm.contactRole} onChange={(event) => updateForm('contactRole', event.target.value)} placeholder="Filialleitung" className="field" />
              </div>
              <div>
                <label className="field-label">Direkte Telefonnummer</label>
                <input value={customerForm.contactPhone} onChange={(event) => updateForm('contactPhone', event.target.value)} placeholder="+49 89 123457" className="field" />
              </div>
              <div>
                <label className="field-label">Direkte E-Mail</label>
                <input
                  value={customerForm.contactEmail}
                  onChange={(event) => updateForm('contactEmail', event.target.value)}
                  placeholder="k.meier@kunde.de"
                  className={cn('field', customerErrors.contactEmail && 'field-error')}
                />
                {customerErrors.contactEmail ? <p className="mt-1 text-[12px] text-danger-soft">{customerErrors.contactEmail}</p> : null}
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-[15px] font-semibold text-white">Einordnung</h4>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="field-label">Status</label>
                <select value={customerForm.status} onChange={(event) => updateForm('status', event.target.value as CustomerStatus)} className="field">
                  {customerStates.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Priorität</label>
                <select value={customerForm.priority} onChange={(event) => updateForm('priority', event.target.value as TaskPriority)} className="field">
                  {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Tags</label>
                <input
                  value={customerForm.tags}
                  onChange={(event) => updateForm('tags', event.target.value)}
                  placeholder="z. B. SLA 24h, Premium"
                  className="field"
                />
                <p className="mt-1 text-[12px] text-ash">Mehrere Tags mit Komma trennen.</p>
              </div>
            </div>
          </section>
        </div>
      </Modal>

      <QuickTagModal open={isTagOpen} onClose={() => setIsTagOpen(false)} onSubmit={(tag) => selected && addCustomerTag(selected.id, tag)} />
      <TaskCreateModal open={isTaskOpen} onClose={() => setIsTaskOpen(false)} initialCustomerId={selected?.id} />
      <ServiceCreateModal open={isServiceOpen} onClose={() => setIsServiceOpen(false)} initialCustomerId={selected?.id} />
    </>
  );
}

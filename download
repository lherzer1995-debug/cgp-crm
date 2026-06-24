
import { useEffect, useState } from 'react';
import { Modal } from './common';
import { useAppStore } from '../../data/app-store';
import type { CustomerStatus, TaskPriority } from '../../data/store';

function FieldShell({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="mt-2 block text-[12px] text-danger-soft">{error}</span> : null}
    </label>
  );
}

type TaskFormState = {
  customerId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  assignee: string;
};

const initialTaskForm: TaskFormState = {
  customerId: '',
  title: '',
  description: '',
  priority: 'mittel',
  dueDate: new Date().toISOString().slice(0, 10),
  assignee: '',
};

export function TaskCreateModal({
  open,
  onClose,
  initialCustomerId = '',
  initialTitle = '',
  initialDescription = '',
  initialAssignee = '',
  initialDueDate,
}: {
  open: boolean;
  onClose: () => void;
  initialCustomerId?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialAssignee?: string;
  initialDueDate?: string;
}) {
  const { customers, team, addTask } = useAppStore();
  const [form, setForm] = useState<TaskFormState>(initialTaskForm);
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...initialTaskForm,
      customerId: initialCustomerId || customers[0]?.id || '',
      title: initialTitle,
      description: initialDescription,
      dueDate: initialDueDate || initialTaskForm.dueDate,
      assignee: initialAssignee || team[0]?.name || '',
    });
    setErrors({});
    setIsSubmitting(false);
  }, [open, initialCustomerId, initialTitle, initialDescription, initialAssignee, initialDueDate, customers, team]);

  const updateField = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof TaskFormState, string>> = {};
    if (!form.customerId) next.customerId = 'Bitte einen Kunden auswählen.';
    if (!form.title.trim()) next.title = 'Bitte einen präzisen Aufgabentitel angeben.';
    if (!form.dueDate) next.dueDate = 'Bitte ein Fälligkeitsdatum setzen.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    await addTask({
      customerId: form.customerId,
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      dueDate: form.dueDate,
      assignee: form.assignee,
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Aufgabe anlegen"
      description="Sauberer Titel, eindeutige Zuständigkeit und ein echtes Fälligkeitsdatum statt Schnellschuss."
      footer={
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={isSubmitting}>Abbrechen</button>
          <button className="btn btn-primary" type="button" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? 'Speichert…' : 'Aufgabe speichern'}
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Kunde" error={errors.customerId}>
          <select className={`field ${errors.customerId ? 'field-error' : ''}`} value={form.customerId} onChange={(event) => updateField('customerId', event.target.value)}>
            <option value="">Bitte auswählen</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
        </FieldShell>
        <FieldShell label="Verantwortlich">
          <select className="field" value={form.assignee} onChange={(event) => updateField('assignee', event.target.value)}>
            {team.map((member) => (
              <option key={member.id} value={member.name}>{member.name} · {member.role}</option>
            ))}
          </select>
        </FieldShell>
        <div className="md:col-span-2">
          <FieldShell label="Titel" error={errors.title}>
            <input className={`field ${errors.title ? 'field-error' : ''}`} value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="z. B. Freigabe für Austausch nachfassen" />
          </FieldShell>
        </div>
        <div className="md:col-span-2">
          <FieldShell label="Beschreibung">
            <textarea className="field min-h-[110px]" value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Kontext, nächste Aktion und was erledigt sein muss." />
          </FieldShell>
        </div>
        <FieldShell label="Priorität">
          <select className="field" value={form.priority} onChange={(event) => updateField('priority', event.target.value as TaskPriority)}>
            <option value="dringend">dringend</option>
            <option value="hoch">hoch</option>
            <option value="mittel">mittel</option>
            <option value="niedrig">niedrig</option>
          </select>
        </FieldShell>
        <FieldShell label="Fällig am" error={errors.dueDate}>
          <input className={`field ${errors.dueDate ? 'field-error' : ''}`} type="date" value={form.dueDate} onChange={(event) => updateField('dueDate', event.target.value)} />
        </FieldShell>
      </div>
    </Modal>
  );
}

type ServiceFormState = {
  customerId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  assignee: string;
};

const initialServiceForm: ServiceFormState = {
  customerId: '',
  title: 'Wartung vor Ort',
  date: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  endTime: '10:30',
  assignee: '',
};

export function ServiceCreateModal({
  open,
  onClose,
  initialCustomerId = '',
  initialDate,
}: {
  open: boolean;
  onClose: () => void;
  initialCustomerId?: string;
  initialDate?: string;
}) {
  const { customers, team, addServiceEvent } = useAppStore();
  const [form, setForm] = useState<ServiceFormState>(initialServiceForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ServiceFormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...initialServiceForm,
      customerId: initialCustomerId || customers[0]?.id || '',
      date: initialDate || initialServiceForm.date,
      assignee: team.find((member) => member.role.includes('Techniker'))?.name || team[0]?.name || '',
    });
    setErrors({});
    setIsSubmitting(false);
  }, [open, initialCustomerId, initialDate, customers, team]);

  const updateField = <K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof ServiceFormState, string>> = {};
    if (!form.customerId) next.customerId = 'Bitte einen Kunden auswählen.';
    if (!form.title.trim()) next.title = 'Bitte einen Einsatztyp angeben.';
    if (!form.date) next.date = 'Bitte ein Datum wählen.';
    if (!form.startTime) next.startTime = 'Bitte eine Startzeit setzen.';
    if (!form.endTime) next.endTime = 'Bitte eine Endzeit setzen.';
    if (form.startTime && form.endTime && form.startTime >= form.endTime) next.endTime = 'Die Endzeit muss nach der Startzeit liegen.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    await addServiceEvent({
      customerId: form.customerId,
      title: form.title.trim(),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      assignee: form.assignee,
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Einsatz planen"
      description="Mit Kunde, Techniker und Zeitfenster. Kein Prompt, keine Platzhalterplanung."
      footer={
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={isSubmitting}>Abbrechen</button>
          <button className="btn btn-primary" type="button" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? 'Plant…' : 'Einsatz speichern'}
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Kunde" error={errors.customerId}>
          <select className={`field ${errors.customerId ? 'field-error' : ''}`} value={form.customerId} onChange={(event) => updateField('customerId', event.target.value)}>
            <option value="">Bitte auswählen</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
        </FieldShell>
        <FieldShell label="Techniker">
          <select className="field" value={form.assignee} onChange={(event) => updateField('assignee', event.target.value)}>
            {team.map((member) => (
              <option key={member.id} value={member.name}>{member.name} · {member.role}</option>
            ))}
          </select>
        </FieldShell>
        <div className="md:col-span-2">
          <FieldShell label="Einsatztyp" error={errors.title}>
            <input className={`field ${errors.title ? 'field-error' : ''}`} value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="z. B. Wartung Kühlanlage Filiale Nord" />
          </FieldShell>
        </div>
        <FieldShell label="Datum" error={errors.date}>
          <input className={`field ${errors.date ? 'field-error' : ''}`} type="date" value={form.date} onChange={(event) => updateField('date', event.target.value)} />
        </FieldShell>
        <div className="grid grid-cols-2 gap-4">
          <FieldShell label="Start" error={errors.startTime}>
            <input className={`field ${errors.startTime ? 'field-error' : ''}`} type="time" value={form.startTime} onChange={(event) => updateField('startTime', event.target.value)} />
          </FieldShell>
          <FieldShell label="Ende" error={errors.endTime}>
            <input className={`field ${errors.endTime ? 'field-error' : ''}`} type="time" value={form.endTime} onChange={(event) => updateField('endTime', event.target.value)} />
          </FieldShell>
        </div>
      </div>
    </Modal>
  );
}

export function QuickTagModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (tag: string) => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValue('');
      setError('');
    }
  }, [open]);

  const submit = () => {
    const clean = value.trim();
    if (!clean) {
      setError('Bitte einen sinnvollen Tag eingeben.');
      return;
    }
    onSubmit(clean);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tag ergänzen"
      description="Kurze, operative Kennzeichnung für Segment, Vertrag oder Risiko."
      footer={
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" type="button" onClick={submit}>Tag speichern</button>
        </>
      }
    >
      <FieldShell label="Tag" error={error}>
        <input className={`field ${error ? 'field-error' : ''}`} value={value} onChange={(event) => { setValue(event.target.value); setError(''); }} placeholder="z. B. SLA 4h oder Schlüsselkunde" />
      </FieldShell>
    </Modal>
  );
}

export function ServiceNoteModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValue('');
      setError('');
    }
  }, [open]);

  const submit = () => {
    const clean = value.trim();
    if (!clean) {
      setError('Bitte eine verwertbare Einsatznotiz eingeben.');
      return;
    }
    onSubmit(clean);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Einsatznotiz erfassen"
      description="Nur Informationen, die für Übergabe, Rückfrage oder Nachweis später relevant sind."
      footer={
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" type="button" onClick={submit}>Notiz speichern</button>
        </>
      }
    >
      <FieldShell label="Notiz" error={error}>
        <textarea className={`field min-h-[140px] ${error ? 'field-error' : ''}`} value={value} onChange={(event) => { setValue(event.target.value); setError(''); }} placeholder="z. B. Ersatzteil nicht verfügbar, Rücksprache mit Filialleitung erfolgt, Folgetermin nötig." />
      </FieldShell>
    </Modal>
  );
}


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

export function CustomerCreateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addCustomer } = useAppStore();
  const [form, setForm] = useState<CustomerFormState>(initialCustomerForm);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialCustomerForm);
    setErrors({});
    setIsSubmitting(false);
  }, [open]);

  const updateField = <K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof CustomerFormState, string>> = {};
    if (!form.name.trim()) nextErrors.name = 'Bitte einen Kundennamen eingeben.';
    if (!form.city.trim()) nextErrors.city = 'Bitte einen Ort eingeben.';
    if (!form.email.trim()) nextErrors.email = 'Bitte eine E-Mail-Adresse eingeben.';
    if (!form.contactName.trim()) nextErrors.contactName = 'Bitte einen Ansprechpartner angeben.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Bitte eine gültige E-Mail-Adresse eingeben.';
    }
    if (form.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim())) {
      nextErrors.contactEmail = 'Bitte eine gültige E-Mail-Adresse eingeben.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    const tags = form.tags.split(',').map((entry) => entry.trim()).filter(Boolean);
    await addCustomer({
      name: form.name.trim(),
      address: form.address.trim(),
      zip: form.zip.trim(),
      city: form.city.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      status: form.status,
      priority: form.priority,
      contactName: form.contactName.trim(),
      contactRole: form.contactRole.trim(),
      contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim(),
      tags,
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => !isSubmitting && onClose()}
      title="Neuen Kunden anlegen"
      description="Lege den Kunden inklusive Ansprechpartner direkt sauber an. So sind Kontakt, Status und Priorisierung sofort vollständig."
      footer={
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={isSubmitting}>Abbrechen</button>
          <button className="btn btn-primary" type="button" onClick={submit} disabled={isSubmitting}>
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
              <FieldShell label="Firmenname *" error={errors.name}>
                <input className={`field ${errors.name ? 'field-error' : ''}`} value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="z. B. Bäckerei Küster GmbH" />
              </FieldShell>
            </div>
            <FieldShell label="Adresse">
              <input className="field" value={form.address} onChange={(event) => updateField('address', event.target.value)} placeholder="Straße und Hausnummer" />
            </FieldShell>
            <FieldShell label="PLZ">
              <input className="field" value={form.zip} onChange={(event) => updateField('zip', event.target.value)} placeholder="80331" />
            </FieldShell>
            <FieldShell label="Ort *" error={errors.city}>
              <input className={`field ${errors.city ? 'field-error' : ''}`} value={form.city} onChange={(event) => updateField('city', event.target.value)} placeholder="München" />
            </FieldShell>
            <FieldShell label="Telefon">
              <input className="field" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+49 89 1234567" />
            </FieldShell>
            <FieldShell label="E-Mail *" error={errors.email}>
              <input className={`field ${errors.email ? 'field-error' : ''}`} value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="kontakt@kunde.de" />
            </FieldShell>
            <FieldShell label="Status">
              <select className="field" value={form.status} onChange={(event) => updateField('status', event.target.value as CustomerStatus)}>
                <option value="wartet">Wartet</option>
                <option value="aktiv">Aktiv</option>
                <option value="risiko">Risiko</option>
                <option value="archiviert">Archiviert</option>
              </select>
            </FieldShell>
            <FieldShell label="Priorität">
              <select className="field" value={form.priority} onChange={(event) => updateField('priority', event.target.value as TaskPriority)}>
                <option value="niedrig">Niedrig</option>
                <option value="mittel">Mittel</option>
                <option value="hoch">Hoch</option>
                <option value="dringend">Dringend</option>
              </select>
            </FieldShell>
            <div className="md:col-span-2">
              <FieldShell label="Tags">
                <input className="field" value={form.tags} onChange={(event) => updateField('tags', event.target.value)} placeholder="z. B. SLA 4h, Schlüsselkunde" />
              </FieldShell>
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-[15px] font-semibold text-white">Ansprechpartner</h4>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FieldShell label="Name *" error={errors.contactName}>
              <input className={`field ${errors.contactName ? 'field-error' : ''}`} value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)} placeholder="Vor- und Nachname" />
            </FieldShell>
            <FieldShell label="Rolle">
              <input className="field" value={form.contactRole} onChange={(event) => updateField('contactRole', event.target.value)} placeholder="Filialleitung" />
            </FieldShell>
            <FieldShell label="Telefon">
              <input className="field" value={form.contactPhone} onChange={(event) => updateField('contactPhone', event.target.value)} placeholder="+49 ..." />
            </FieldShell>
            <FieldShell label="E-Mail" error={errors.contactEmail}>
              <input className={`field ${errors.contactEmail ? 'field-error' : ''}`} value={form.contactEmail} onChange={(event) => updateField('contactEmail', event.target.value)} placeholder="ansprechpartner@kunde.de" />
            </FieldShell>
          </div>
        </section>
      </div>
    </Modal>
  );
}

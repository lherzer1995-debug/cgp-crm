
import { useEffect, useState } from 'react';
import { Modal } from './common';
import { useAppStore } from '../../data/app-store';
import type { TaskPriority } from '../../data/store';

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

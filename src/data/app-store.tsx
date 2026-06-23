import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getInitials,
  seedCustomers,
  seedServiceEvents,
  team,
  type ActivityItem,
  type Customer,
  type CustomerStatus,
  type Note,
  type NoteType,
  type ServiceEvent,
  type ServiceStatus,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TeamMember,
} from './store';

export type ThemeMode = 'dark' | 'light' | 'system';
export type Page = 'dashboard' | 'kunden' | 'aufgaben' | 'einsaetze' | 'kalender' | 'einstellungen';

interface SettingsState {
  profileName: string;
  company: string;
  email: string;
  phone: string;
  theme: ThemeMode;
  compactTables: boolean;
  emailUpdates: boolean;
  pushAlerts: boolean;
}

interface UiFeedback {
  type: 'success' | 'error';
  message: string;
}

interface AppStoreContextValue {
  customers: Customer[];
  serviceEvents: ServiceEvent[];
  team: TeamMember[];
  settings: SettingsState;
  isBooting: boolean;
  saveState: 'idle' | 'saving' | 'saved';
  feedback: UiFeedback | null;
  activity: ActivityItem[];
  overdueTasks: Task[];
  todayServices: ServiceEvent[];
  openTasks: Task[];
  kpi: {
    activeCustomers: number;
    riskCustomers: number;
    openTasks: number;
    urgentTasks: number;
    todayServices: number;
    waitingCustomers: number;
  };
  clearFeedback: () => void;
  setFeedback: (value: UiFeedback | null) => void;
  updateSettings: (patch: Partial<SettingsState>) => void;
  addCustomer: (payload: { name: string; city: string; email: string; address?: string; zip?: string; phone?: string; status?: CustomerStatus; priority?: TaskPriority; contactName?: string; contactRole?: string; contactPhone?: string; contactEmail?: string; tags?: string[] }) => void;
  updateCustomerStatus: (customerId: string, status: CustomerStatus) => void;
  addCustomerTag: (customerId: string, tag: string) => void;
  addCustomerNote: (customerId: string, payload: { content: string; type: NoteType; pinned?: boolean }) => void;
  addTask: (payload: { customerId: string; title: string; description?: string; priority?: TaskPriority; dueDate?: string; assignee?: string }) => void;
  updateTaskStatus: (taskId: string, status?: TaskStatus) => void;
  addServiceEvent: (payload: { customerId: string; title: string; date: string; startTime?: string; endTime?: string; assignee?: string }) => void;
  updateServiceStatus: (eventId: string, status?: ServiceStatus) => void;
  addServiceNote: (eventId: string, note: string) => void;
  resetDemoData: () => void;
}

const STORAGE_KEY = 'cgp-crm-workspace-v2';
const defaultSettings: SettingsState = {
  profileName: 'Lars Herzer',
  company: 'CGP Solutions GmbH',
  email: 'lars@cgp.de',
  phone: '+49 89 1234567',
  theme: 'dark',
  compactTables: false,
  emailUpdates: true,
  pushAlerts: true,
};

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function isoDate(value = new Date()): string {
  return value.toISOString().slice(0, 10);
}

function nowStamp(): string {
  return new Date().toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function nextTaskStatus(status: TaskStatus): TaskStatus {
  if (status === 'offen') return 'in-arbeit';
  if (status === 'in-arbeit') return 'wartet-auf-kunde';
  if (status === 'wartet-auf-kunde') return 'erledigt';
  return 'offen';
}

function nextServiceStatus(status: ServiceStatus): ServiceStatus {
  if (status === 'geplant') return 'unterwegs';
  if (status === 'unterwegs') return 'vor-ort';
  if (status === 'vor-ort') return 'abgeschlossen';
  if (status === 'abgeschlossen') return 'geplant';
  return 'geplant';
}

function buildActivity(customers: Customer[], events: ServiceEvent[]): ActivityItem[] {
  const noteItems = customers.flatMap((customer) =>
    customer.notes.map((note) => ({
      id: `act-${note.id}`,
      kind: 'note' as const,
      title: note.type === 'anruf' ? 'Telefonnotiz' : note.type === 'email' ? 'E-Mail erfasst' : 'Notiz ergänzt',
      detail: note.content,
      customerId: customer.id,
      customerName: customer.name,
      timestamp: note.createdAt,
      actor: note.author,
    })),
  );

  const taskItems = customers.flatMap((customer) =>
    customer.tasks.map((task) => ({
      id: `act-${task.id}`,
      kind: 'task' as const,
      title: task.status === 'erledigt' ? 'Aufgabe abgeschlossen' : 'Aufgabe aktualisiert',
      detail: `${task.title} · ${task.status}`,
      customerId: customer.id,
      customerName: customer.name,
      timestamp: task.completedAt || task.createdAt,
      actor: task.assignee,
    })),
  );

  const serviceItems = events.map((event) => ({
    id: `act-${event.id}`,
    kind: 'service' as const,
    title: `Einsatz ${event.status}`,
    detail: `${event.title} · ${event.startTime}–${event.endTime}`,
    customerId: event.customerId,
    customerName: event.customerName,
    timestamp: `${event.date} ${event.startTime}`,
    actor: event.assignee,
  }));

  return [...noteItems, ...taskItems, ...serviceItems]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 18);
}

function loadInitial() {
  if (typeof window === 'undefined') {
    return { customers: seedCustomers, serviceEvents: seedServiceEvents, settings: defaultSettings };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { customers: seedCustomers, serviceEvents: seedServiceEvents, settings: defaultSettings };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      customers: parsed.customers || seedCustomers,
      serviceEvents: parsed.serviceEvents || seedServiceEvents,
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
    };
  } catch {
    return { customers: seedCustomers, serviceEvents: seedServiceEvents, settings: defaultSettings };
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const initial = loadInitial();
  const [customers, setCustomers] = useState<Customer[]>(initial.customers);
  const [serviceEvents, setServiceEvents] = useState<ServiceEvent[]>(initial.serviceEvents);
  const [settings, setSettings] = useState<SettingsState>(initial.settings);
  const [isBooting, setIsBooting] = useState(true);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [feedback, setFeedback] = useState<UiFeedback | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBooting(false), 420);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isBooting) return;
    setSaveState('saving');
    const persistTimer = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ customers, serviceEvents, settings }));
      setSaveState('saved');
    }, 180);
    const idleTimer = window.setTimeout(() => {
      setSaveState('idle');
    }, 1500);
    return () => {
      window.clearTimeout(persistTimer);
      window.clearTimeout(idleTimer);
    };
  }, [customers, serviceEvents, settings, isBooting]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  const allTasks = useMemo(() => customers.flatMap((customer) => customer.tasks), [customers]);
  const today = isoDate(new Date('2026-06-23'));
  const todayServices = useMemo(() => serviceEvents.filter((event) => event.date === today && event.status !== 'abgeschlossen'), [serviceEvents]);
  const overdueTasks = useMemo(() => allTasks.filter((task) => task.status !== 'erledigt' && task.dueDate < today), [allTasks]);
  const openTasks = useMemo(() => allTasks.filter((task) => task.status !== 'erledigt'), [allTasks]);
  const activity = useMemo(() => buildActivity(customers, serviceEvents), [customers, serviceEvents]);

  const pushSuccess = (message: string) => setFeedback({ type: 'success', message });
  const pushError = (message: string) => setFeedback({ type: 'error', message });

  const updateSettings = (patch: Partial<SettingsState>) => {
    setSettings((current) => ({ ...current, ...patch }));
    pushSuccess('Einstellungen gespeichert');
  };

  const addCustomer: AppStoreContextValue['addCustomer'] = (payload) => {
    const cleanName = payload.name.trim();
    if (!cleanName) {
      pushError('Bitte einen Kundennamen eingeben.');
      return;
    }

    const cleanEmail = payload.email.trim();
    if (!cleanEmail) {
      pushError('Bitte eine E-Mail-Adresse eingeben.');
      return;
    }

    const cleanCity = payload.city.trim();
    if (!cleanCity) {
      pushError('Bitte einen Ort angeben.');
      return;
    }

    const customer: Customer = {
      id: uid('c'),
      name: cleanName,
      address: payload.address?.trim() || 'Adresse ergänzen',
      city: cleanCity,
      zip: payload.zip?.trim() || '00000',
      phone: payload.phone?.trim() || '+49',
      email: cleanEmail,
      contacts: [
        {
          id: uid('cp'),
          name: payload.contactName?.trim() || cleanName,
          role: payload.contactRole?.trim() || 'Ansprechpartner',
          phone: payload.contactPhone?.trim() || payload.phone?.trim() || '+49',
          email: payload.contactEmail?.trim() || cleanEmail,
          isPrimary: true,
        },
      ],
      status: payload.status || 'wartet',
      priority: payload.priority || 'mittel',
      tags: payload.tags || [],
      customerSince: isoDate(),
      lastService: isoDate(),
      nextService: undefined,
      serviceCount: 0,
      notes: [],
      tasks: [],
    };
    setCustomers((current) => [customer, ...current]);
    pushSuccess(`Kunde ${cleanName} angelegt`);
  };

  const updateCustomerStatus = (customerId: string, status: CustomerStatus) => {
    setCustomers((current) => current.map((customer) => (customer.id === customerId ? { ...customer, status } : customer)));
    pushSuccess('Kundenstatus aktualisiert');
  };

  const addCustomerTag = (customerId: string, tag: string) => {
    const clean = tag.trim();
    if (!clean) {
      pushError('Tag darf nicht leer sein.');
      return;
    }
    setCustomers((current) =>
      current.map((customer) =>
        customer.id === customerId && !customer.tags.includes(clean)
          ? { ...customer, tags: [...customer.tags, clean] }
          : customer,
      ),
    );
    pushSuccess('Tag ergänzt');
  };

  const addCustomerNote = (customerId: string, payload: { content: string; type: NoteType; pinned?: boolean }) => {
    const content = payload.content.trim();
    if (!content) {
      pushError('Bitte eine Notiz eingeben.');
      return;
    }
    const note: Note = {
      id: uid('n'),
      customerId,
      type: payload.type,
      content,
      author: settings.profileName,
      createdAt: nowStamp(),
      pinned: Boolean(payload.pinned),
    };
    setCustomers((current) =>
      current.map((customer) =>
        customer.id === customerId
          ? {
              ...customer,
              notes: [
                note,
                ...customer.notes.map((item) => ({ ...item, pinned: payload.pinned ? false : item.pinned })),
              ],
            }
          : customer,
      ),
    );
    pushSuccess('Notiz gespeichert');
  };

  const addTask: AppStoreContextValue['addTask'] = (payload) => {
    const customer = customers.find((item) => item.id === payload.customerId);
    if (!customer) {
      pushError('Kunde nicht gefunden.');
      return;
    }
    const title = payload.title.trim();
    if (!title) {
      pushError('Bitte einen Aufgabentitel eingeben.');
      return;
    }
    const task: Task = {
      id: uid('t'),
      customerId: customer.id,
      customerName: customer.name,
      title,
      description: payload.description?.trim() || 'Ohne weitere Beschreibung',
      status: 'offen',
      priority: payload.priority || 'mittel',
      assignee: payload.assignee || settings.profileName,
      dueDate: payload.dueDate || isoDate(),
      createdAt: isoDate(),
    };
    setCustomers((current) =>
      current.map((item) => (item.id === customer.id ? { ...item, tasks: [task, ...item.tasks] } : item)),
    );
    pushSuccess('Aufgabe angelegt');
  };

  const updateTaskStatus = (taskId: string, status?: TaskStatus) => {
    setCustomers((current) =>
      current.map((customer) => ({
        ...customer,
        tasks: customer.tasks.map((task) => {
          if (task.id !== taskId) return task;
          const next = status || nextTaskStatus(task.status);
          return {
            ...task,
            status: next,
            completedAt: next === 'erledigt' ? nowStamp() : undefined,
          };
        }),
      })),
    );
    pushSuccess('Aufgabenstatus aktualisiert');
  };

  const addServiceEvent: AppStoreContextValue['addServiceEvent'] = (payload) => {
    const customer = customers.find((item) => item.id === payload.customerId);
    if (!customer) {
      pushError('Kunde nicht gefunden.');
      return;
    }
    const title = payload.title.trim();
    if (!title) {
      pushError('Bitte einen Einsatznamen eingeben.');
      return;
    }
    const event: ServiceEvent = {
      id: uid('se'),
      customerId: customer.id,
      customerName: customer.name,
      customerAddress: `${customer.address}, ${customer.zip} ${customer.city}`,
      title,
      description: title,
      status: 'geplant',
      assignee: payload.assignee || 'Thomas Schmidt',
      date: payload.date,
      startTime: payload.startTime || '09:00',
      endTime: payload.endTime || '10:00',
      notes: [],
    };
    setServiceEvents((current) =>
      [...current, event].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
    );
    setCustomers((current) =>
      current.map((item) =>
        item.id === customer.id
          ? { ...item, serviceCount: item.serviceCount + 1, nextService: event.date }
          : item,
      ),
    );
    pushSuccess('Einsatz geplant');
  };

  const updateServiceStatus = (eventId: string, status?: ServiceStatus) => {
    setServiceEvents((current) =>
      current.map((event) =>
        event.id === eventId ? { ...event, status: status || nextServiceStatus(event.status) } : event,
      ),
    );
    pushSuccess('Einsatzstatus aktualisiert');
  };

  const addServiceNote = (eventId: string, note: string) => {
    const clean = note.trim();
    if (!clean) {
      pushError('Bitte eine Notiz eingeben.');
      return;
    }
    setServiceEvents((current) =>
      current.map((event) =>
        event.id === eventId ? { ...event, notes: [...event.notes, clean] } : event,
      ),
    );
    pushSuccess('Einsatznotiz ergänzt');
  };

  const resetDemoData = () => {
    setCustomers(seedCustomers);
    setServiceEvents(seedServiceEvents);
    setSettings(defaultSettings);
    window.localStorage.removeItem(STORAGE_KEY);
    pushSuccess('Demo-Daten zurückgesetzt');
  };

  const value: AppStoreContextValue = {
    customers,
    serviceEvents,
    team,
    settings,
    isBooting,
    saveState,
    feedback,
    activity,
    overdueTasks,
    todayServices,
    openTasks,
    kpi: {
      activeCustomers: customers.filter((customer) => customer.status === 'aktiv').length,
      riskCustomers: customers.filter((customer) => customer.status === 'risiko').length,
      openTasks: openTasks.length,
      urgentTasks: openTasks.filter((task) => task.priority === 'dringend').length,
      todayServices: todayServices.length,
      waitingCustomers: customers.filter((customer) => customer.status === 'wartet').length,
    },
    clearFeedback: () => setFeedback(null),
    setFeedback,
    updateSettings,
    addCustomer,
    updateCustomerStatus,
    addCustomerTag,
    addCustomerNote,
    addTask,
    updateTaskStatus,
    addServiceEvent,
    updateServiceStatus,
    addServiceNote,
    resetDemoData,
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore must be used inside AppStoreProvider');
  }
  return context;
}

export { getInitials };

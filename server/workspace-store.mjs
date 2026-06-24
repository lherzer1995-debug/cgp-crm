
import fs from 'node:fs';
import path from 'node:path';
import { defaultSettings, seedCustomers, seedServiceEvents, team } from './default-workspace.mjs';

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function isoDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

function nowStamp() {
  return new Date().toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function nextTaskStatus(status) {
  if (status === 'offen') return 'in-arbeit';
  if (status === 'in-arbeit') return 'wartet-auf-kunde';
  if (status === 'wartet-auf-kunde') return 'erledigt';
  return 'offen';
}

function nextServiceStatus(status) {
  if (status === 'geplant') return 'unterwegs';
  if (status === 'unterwegs') return 'vor-ort';
  if (status === 'vor-ort') return 'abgeschlossen';
  if (status === 'abgeschlossen') return 'geplant';
  return 'geplant';
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildActivity(customers, serviceEvents) {
  const noteItems = customers.flatMap((customer) =>
    customer.notes.map((note) => ({
      id: `act-${note.id}`,
      kind: 'note',
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
      kind: 'task',
      title: task.status === 'erledigt' ? 'Aufgabe abgeschlossen' : 'Aufgabe angelegt',
      detail: `${task.title} · ${task.status}`,
      customerId: customer.id,
      customerName: customer.name,
      timestamp: task.completedAt || task.createdAt,
      actor: task.assignee,
    })),
  );
  const serviceItems = serviceEvents.map((event) => ({
    id: `act-${event.id}`,
    kind: 'service',
    title: event.status === 'abgeschlossen' ? 'Einsatz abgeschlossen' : 'Einsatz geplant',
    detail: `${event.title} · ${event.status}`,
    customerId: event.customerId,
    customerName: event.customerName,
    timestamp: `${event.date} ${event.startTime}`,
    actor: event.assignee,
  }));
  return [...noteItems, ...taskItems, ...serviceItems].sort((a, b) => `${b.timestamp}`.localeCompare(`${a.timestamp}`)).slice(0, 40);
}

function createDefaultWorkspace() {
  return {
    settings: clone(defaultSettings),
    customers: clone(seedCustomers),
    serviceEvents: clone(seedServiceEvents),
    activity: buildActivity(clone(seedCustomers), clone(seedServiceEvents)),
    team: clone(team),
    updatedAt: new Date().toISOString(),
  };
}

export class WorkspaceStore {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.filePath = path.join(dataDir, 'workspace.json');
  }

  ensureDir() {
    fs.mkdirSync(this.dataDir, { recursive: true });
  }

  read() {
    this.ensureDir();
    if (!fs.existsSync(this.filePath)) {
      const initial = createDefaultWorkspace();
      this.write(initial);
      return initial;
    }
    const raw = fs.readFileSync(this.filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...createDefaultWorkspace(),
      ...parsed,
    };
  }

  write(workspace) {
    this.ensureDir();
    const next = { ...workspace, updatedAt: new Date().toISOString() };
    fs.writeFileSync(this.filePath, JSON.stringify(next, null, 2), 'utf8');
    return next;
  }

  getSnapshot(viewer) {
    const workspace = this.read();
    return { ...workspace, viewer };
  }

  addActivity(workspace, item) {
    workspace.activity = [
      {
        id: uid('act'),
        timestamp: nowStamp(),
        ...item,
      },
      ...(workspace.activity || []),
    ].slice(0, 80);
  }

  applyAction(action, payload, viewer) {
    const workspace = this.read();
    const actor = viewer.name || viewer.email || viewer.userId;
    const denyTechnician = viewer.role === 'techniker';

    const assertWrite = () => {
      if (!viewer.userId) throw new Error('Nicht authentifiziert.');
    };

    const assertManager = () => {
      if (!['admin', 'manager'].includes(viewer.role)) throw new Error('Für diese Aktion fehlen Berechtigungen.');
    };

    const findCustomer = (customerId) => workspace.customers.find((customer) => customer.id === customerId);
    const findTask = (taskId) => {
      for (const customer of workspace.customers) {
        const task = customer.tasks.find((entry) => entry.id === taskId);
        if (task) return { customer, task };
      }
      return null;
    };
    const findService = (eventId) => workspace.serviceEvents.find((event) => event.id === eventId);

    assertWrite();

    switch (action) {
      case 'updateSettings': {
        assertManager();
        workspace.settings = { ...workspace.settings, ...payload };
        break;
      }
      case 'addCustomer': {
        if (denyTechnician) throw new Error('Techniker dürfen keine neuen Kunden anlegen.');
        const customer = {
          id: uid('c'),
          name: payload.name,
          city: payload.city,
          email: payload.email,
          address: payload.address || 'Adresse ergänzen',
          zip: payload.zip || '',
          phone: payload.phone || '',
          status: payload.status || 'aktiv',
          priority: payload.priority || 'mittel',
          customerSince: isoDate(),
          lastService: isoDate(),
          nextService: '',
          serviceCount: 0,
          tags: payload.tags || [],
          contacts: [{
            id: uid('cp'),
            name: payload.contactName || payload.name,
            role: payload.contactRole || 'Ansprechpartner',
            phone: payload.contactPhone || payload.phone || '',
            email: payload.contactEmail || payload.email,
            isPrimary: true,
          }],
          notes: [],
          tasks: [],
        };
        workspace.customers.unshift(customer);
        this.addActivity(workspace, { kind: 'note', title: 'Kunde angelegt', detail: `${customer.name} wurde neu aufgenommen.`, customerId: customer.id, customerName: customer.name, actor });
        break;
      }
      case 'updateCustomerStatus': {
        if (denyTechnician) throw new Error('Techniker dürfen den Kundenstatus nicht ändern.');
        const customer = findCustomer(payload.customerId);
        if (!customer) throw new Error('Kunde nicht gefunden.');
        customer.status = payload.status;
        this.addActivity(workspace, { kind: 'note', title: 'Kundenstatus geändert', detail: `${customer.name} · ${payload.status}`, customerId: customer.id, customerName: customer.name, actor });
        break;
      }
      case 'addCustomerTag': {
        const customer = findCustomer(payload.customerId);
        if (!customer) throw new Error('Kunde nicht gefunden.');
        const tag = payload.tag.trim();
        if (tag && !customer.tags.includes(tag)) customer.tags.push(tag);
        this.addActivity(workspace, { kind: 'note', title: 'Tag ergänzt', detail: tag, customerId: customer.id, customerName: customer.name, actor });
        break;
      }
      case 'addCustomerNote': {
        const customer = findCustomer(payload.customerId);
        if (!customer) throw new Error('Kunde nicht gefunden.');
        const note = {
          id: uid('n'),
          customerId: customer.id,
          type: payload.type,
          content: payload.content.trim(),
          author: actor,
          createdAt: nowStamp(),
          pinned: Boolean(payload.pinned),
        };
        customer.notes.unshift(note);
        this.addActivity(workspace, { kind: 'note', title: 'Notiz ergänzt', detail: note.content, customerId: customer.id, customerName: customer.name, actor });
        break;
      }
      case 'addTask': {
        if (denyTechnician) throw new Error('Techniker dürfen keine Aufgaben verteilen.');
        const customer = findCustomer(payload.customerId);
        if (!customer) throw new Error('Kunde nicht gefunden.');
        const task = {
          id: uid('t'),
          customerId: customer.id,
          customerName: customer.name,
          title: payload.title.trim(),
          description: payload.description?.trim() || '',
          status: 'offen',
          priority: payload.priority || 'mittel',
          assignee: payload.assignee || team[0].name,
          dueDate: payload.dueDate || isoDate(),
          createdAt: isoDate(),
        };
        customer.tasks.unshift(task);
        this.addActivity(workspace, { kind: 'task', title: 'Aufgabe angelegt', detail: `${task.title} · ${task.assignee}`, customerId: customer.id, customerName: customer.name, actor });
        break;
      }
      case 'updateTask': {
        const entry = findTask(payload.taskId);
        if (!entry) throw new Error('Aufgabe nicht gefunden.');
        Object.assign(entry.task, payload.patch);
        if (entry.task.status === 'erledigt' && !entry.task.completedAt) entry.task.completedAt = isoDate();
        if (entry.task.status !== 'erledigt') delete entry.task.completedAt;
        this.addActivity(workspace, { kind: 'task', title: 'Aufgabe aktualisiert', detail: `${entry.task.title} · ${entry.task.status}`, customerId: entry.customer.id, customerName: entry.customer.name, actor });
        break;
      }
      case 'updateTaskStatus': {
        const entry = findTask(payload.taskId);
        if (!entry) throw new Error('Aufgabe nicht gefunden.');
        entry.task.status = payload.status || nextTaskStatus(entry.task.status);
        if (entry.task.status === 'erledigt') entry.task.completedAt = isoDate();
        this.addActivity(workspace, { kind: 'task', title: 'Aufgabenstatus geändert', detail: `${entry.task.title} · ${entry.task.status}`, customerId: entry.customer.id, customerName: entry.customer.name, actor });
        break;
      }
      case 'addServiceEvent': {
        const customer = findCustomer(payload.customerId);
        if (!customer) throw new Error('Kunde nicht gefunden.');
        const event = {
          id: uid('se'),
          customerId: customer.id,
          customerName: customer.name,
          customerAddress: `${customer.address}, ${customer.zip} ${customer.city}`.trim(),
          title: payload.title.trim(),
          description: payload.description?.trim() || payload.title.trim(),
          status: 'geplant',
          assignee: payload.assignee || team[0].name,
          date: payload.date,
          startTime: payload.startTime || '09:00',
          endTime: payload.endTime || '10:00',
          notes: [],
        };
        workspace.serviceEvents.push(event);
        workspace.serviceEvents.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
        customer.serviceCount += 1;
        customer.nextService = event.date;
        this.addActivity(workspace, { kind: 'service', title: 'Einsatz geplant', detail: `${event.title} · ${event.date} ${event.startTime}`, customerId: customer.id, customerName: customer.name, actor });
        break;
      }
      case 'updateService': {
        const event = findService(payload.eventId);
        if (!event) throw new Error('Einsatz nicht gefunden.');
        Object.assign(event, payload.patch);
        this.addActivity(workspace, { kind: 'service', title: 'Einsatz aktualisiert', detail: `${event.title} · ${event.status}`, customerId: event.customerId, customerName: event.customerName, actor });
        break;
      }
      case 'updateServiceStatus': {
        const event = findService(payload.eventId);
        if (!event) throw new Error('Einsatz nicht gefunden.');
        event.status = payload.status || nextServiceStatus(event.status);
        this.addActivity(workspace, { kind: 'service', title: 'Einsatzstatus geändert', detail: `${event.title} · ${event.status}`, customerId: event.customerId, customerName: event.customerName, actor });
        break;
      }
      case 'addServiceNote': {
        const event = findService(payload.eventId);
        if (!event) throw new Error('Einsatz nicht gefunden.');
        const note = payload.note.trim();
        if (note) event.notes.unshift(note);
        this.addActivity(workspace, { kind: 'service', title: 'Einsatznotiz ergänzt', detail: note, customerId: event.customerId, customerName: event.customerName, actor });
        break;
      }
      case 'resetDemoData': {
        assertManager();
        return this.write(createDefaultWorkspace());
      }
      default:
        throw new Error(`Unbekannte Aktion: ${action}`);
    }

    return this.write(workspace);
  }
}


import { team } from './default-workspace.mjs';
import { canEditService, canEditTask, canManageCustomers, canPlanServices, fail } from './authz.mjs';

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

export class WorkspaceStore {
  constructor(repository) {
    this.repository = repository;
  }

  async getSnapshot(viewer) {
    const workspace = await this.repository.readWorkspace();
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
    ].slice(0, 120);
  }

  async applyAction(action, payload, viewer) {
    const workspace = await this.repository.readWorkspace();
    const actor = viewer.name || viewer.email || viewer.userId || 'System';

    const findCustomer = (customerId) => workspace.customers.find((customer) => customer.id === customerId);
    const findTask = (taskId) => {
      for (const customer of workspace.customers) {
        const task = customer.tasks.find((entry) => entry.id === taskId);
        if (task) return { customer, task };
      }
      return null;
    };
    const findService = (eventId) => workspace.serviceEvents.find((event) => event.id === eventId);

    switch (action) {
      case 'updateSettings': {
        if (!['admin', 'manager'].includes(viewer.role)) throw fail(403, 'ROLE_FORBIDDEN', 'Nur Admins und Manager dürfen Einstellungen ändern.');
        workspace.settings = { ...workspace.settings, ...payload };
        break;
      }
      case 'addCustomer': {
        if (!canManageCustomers(viewer)) throw fail(403, 'ROLE_FORBIDDEN', 'Techniker dürfen keine Kunden anlegen.');
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
        if (!canManageCustomers(viewer)) throw fail(403, 'ROLE_FORBIDDEN', 'Techniker dürfen den Kundenstatus nicht ändern.');
        const customer = findCustomer(payload.customerId);
        if (!customer) throw fail(404, 'CUSTOMER_NOT_FOUND', 'Kunde nicht gefunden.');
        customer.status = payload.status;
        this.addActivity(workspace, { kind: 'note', title: 'Kundenstatus geändert', detail: `${customer.name} · ${payload.status}`, customerId: customer.id, customerName: customer.name, actor });
        break;
      }
      case 'addCustomerTag': {
        if (!canManageCustomers(viewer)) throw fail(403, 'ROLE_FORBIDDEN', 'Techniker dürfen keine Tags vergeben.');
        const customer = findCustomer(payload.customerId);
        if (!customer) throw fail(404, 'CUSTOMER_NOT_FOUND', 'Kunde nicht gefunden.');
        const tag = payload.tag.trim();
        if (tag && !customer.tags.includes(tag)) customer.tags.push(tag);
        this.addActivity(workspace, { kind: 'note', title: 'Tag ergänzt', detail: tag, customerId: customer.id, customerName: customer.name, actor });
        break;
      }
      case 'addCustomerNote': {
        const customer = findCustomer(payload.customerId);
        if (!customer) throw fail(404, 'CUSTOMER_NOT_FOUND', 'Kunde nicht gefunden.');
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
        if (!canManageCustomers(viewer)) throw fail(403, 'ROLE_FORBIDDEN', 'Techniker dürfen keine Aufgaben verteilen.');
        const customer = findCustomer(payload.customerId);
        if (!customer) throw fail(404, 'CUSTOMER_NOT_FOUND', 'Kunde nicht gefunden.');
        const task = {
          id: uid('t'),
          customerId: customer.id,
          customerName: customer.name,
          title: payload.title.trim(),
          description: payload.description?.trim() || '',
          status: payload.status || 'offen',
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
        if (!entry) throw fail(404, 'TASK_NOT_FOUND', 'Aufgabe nicht gefunden.');
        if (!canEditTask(viewer, entry.task)) throw fail(403, 'ROLE_FORBIDDEN', 'Diese Aufgabe darfst du nicht bearbeiten.');
        Object.assign(entry.task, payload.patch);
        if (entry.task.status === 'erledigt' && !entry.task.completedAt) entry.task.completedAt = isoDate();
        if (entry.task.status !== 'erledigt') delete entry.task.completedAt;
        this.addActivity(workspace, { kind: 'task', title: 'Aufgabe aktualisiert', detail: `${entry.task.title} · ${entry.task.status}`, customerId: entry.customer.id, customerName: entry.customer.name, actor });
        break;
      }
      case 'updateTaskStatus': {
        const entry = findTask(payload.taskId);
        if (!entry) throw fail(404, 'TASK_NOT_FOUND', 'Aufgabe nicht gefunden.');
        if (!canEditTask(viewer, entry.task)) throw fail(403, 'ROLE_FORBIDDEN', 'Diesen Status darfst du nicht ändern.');
        entry.task.status = payload.status || nextTaskStatus(entry.task.status);
        if (entry.task.status === 'erledigt') entry.task.completedAt = isoDate();
        this.addActivity(workspace, { kind: 'task', title: 'Aufgabenstatus geändert', detail: `${entry.task.title} · ${entry.task.status}`, customerId: entry.customer.id, customerName: entry.customer.name, actor });
        break;
      }
      case 'addServiceEvent': {
        if (!canPlanServices(viewer)) throw fail(403, 'ROLE_FORBIDDEN', 'Techniker dürfen keine Einsätze planen.');
        const customer = findCustomer(payload.customerId);
        if (!customer) throw fail(404, 'CUSTOMER_NOT_FOUND', 'Kunde nicht gefunden.');
        const event = {
          id: uid('se'),
          customerId: customer.id,
          customerName: customer.name,
          customerAddress: `${customer.address}, ${customer.zip} ${customer.city}`.trim(),
          title: payload.title.trim(),
          description: payload.description?.trim() || payload.title.trim(),
          status: payload.status || 'geplant',
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
        if (!event) throw fail(404, 'SERVICE_NOT_FOUND', 'Einsatz nicht gefunden.');
        if (!canEditService(viewer, event)) throw fail(403, 'ROLE_FORBIDDEN', 'Diesen Einsatz darfst du nicht bearbeiten.');
        Object.assign(event, payload.patch);
        this.addActivity(workspace, { kind: 'service', title: 'Einsatz aktualisiert', detail: `${event.title} · ${event.status}`, customerId: event.customerId, customerName: event.customerName, actor });
        break;
      }
      case 'updateServiceStatus': {
        const event = findService(payload.eventId);
        if (!event) throw fail(404, 'SERVICE_NOT_FOUND', 'Einsatz nicht gefunden.');
        if (!canEditService(viewer, event)) throw fail(403, 'ROLE_FORBIDDEN', 'Diesen Einsatzstatus darfst du nicht ändern.');
        event.status = payload.status || nextServiceStatus(event.status);
        this.addActivity(workspace, { kind: 'service', title: 'Einsatzstatus geändert', detail: `${event.title} · ${event.status}`, customerId: event.customerId, customerName: event.customerName, actor });
        break;
      }
      case 'addServiceNote': {
        const event = findService(payload.eventId);
        if (!event) throw fail(404, 'SERVICE_NOT_FOUND', 'Einsatz nicht gefunden.');
        if (!canEditService(viewer, event)) throw fail(403, 'ROLE_FORBIDDEN', 'Diesen Einsatz darfst du nicht kommentieren.');
        const note = payload.note.trim();
        if (note) event.notes.unshift(note);
        this.addActivity(workspace, { kind: 'service', title: 'Einsatznotiz ergänzt', detail: note, customerId: event.customerId, customerName: event.customerName, actor });
        break;
      }
      case 'resetDemoData': {
        if (!['admin', 'manager'].includes(viewer.role)) throw fail(403, 'ROLE_FORBIDDEN', 'Nur Admins und Manager dürfen Demo-Daten zurücksetzen.');
        workspace.customers = [];
        workspace.serviceEvents = [];
        workspace.activity = [];
        break;
      }
      default:
        throw fail(400, 'UNKNOWN_ACTION', `Unbekannte Aktion: ${action}`);
    }

    return this.repository.writeWorkspace(workspace);
  }
}

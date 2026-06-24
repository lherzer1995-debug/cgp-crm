
import { team } from './default-workspace.mjs';
import { canEditService, canEditTask, canManageCustomers, canPlanServices, fail } from './authz.mjs';

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function isoDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

function nowStamp(date = new Date()) {
  return date.toLocaleString('de-DE', {
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

  addActivity(workspace, pendingEntries, item) {
    const entry = {
      id: uid('act'),
      timestamp: nowStamp(),
      visibility: 'all',
      ...item,
    };
    workspace.activity = [entry, ...(workspace.activity || [])].slice(0, 160);
    pendingEntries.push(entry);
    return entry;
  }

  async persistAuditEntries(entries) {
    if (!entries.length) return;
    if (typeof this.repository.appendActivity === 'function') {
      for (const entry of entries) {
        await this.repository.appendActivity(entry);
      }
    }
  }

  async applyAction(action, payload, viewer) {
    const workspace = await this.repository.readWorkspace();
    const actor = viewer.name || viewer.email || viewer.userId || 'System';
    const auditEntries = [];

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
        this.addActivity(workspace, auditEntries, {
          kind: 'note',
          title: 'Systemeinstellungen geändert',
          detail: 'Betriebsrelevante Optionen wurden aktualisiert.',
          customerId: 'system',
          customerName: 'System',
          actor,
          entityType: 'customer',
          entityId: 'system',
          visibility: 'office',
        });
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
        this.addActivity(workspace, auditEntries, { kind: 'note', title: 'Kunde angelegt', detail: `${customer.name} wurde neu aufgenommen.`, customerId: customer.id, customerName: customer.name, actor, entityType: 'customer', entityId: customer.id, visibility: 'office' });
        break;
      }
      case 'updateCustomerStatus': {
        if (!canManageCustomers(viewer)) throw fail(403, 'ROLE_FORBIDDEN', 'Techniker dürfen den Kundenstatus nicht ändern.');
        const customer = findCustomer(payload.customerId);
        if (!customer) throw fail(404, 'CUSTOMER_NOT_FOUND', 'Kunde nicht gefunden.');
        const previous = customer.status;
        customer.status = payload.status;
        this.addActivity(workspace, auditEntries, { kind: 'note', title: 'Kundenstatus geändert', detail: `${customer.name} · ${previous} → ${payload.status}`, customerId: customer.id, customerName: customer.name, actor, entityType: 'customer', entityId: customer.id, visibility: 'office' });
        break;
      }
      case 'addCustomerTag': {
        if (!canManageCustomers(viewer)) throw fail(403, 'ROLE_FORBIDDEN', 'Techniker dürfen keine Tags vergeben.');
        const customer = findCustomer(payload.customerId);
        if (!customer) throw fail(404, 'CUSTOMER_NOT_FOUND', 'Kunde nicht gefunden.');
        const tag = payload.tag.trim();
        if (tag && !customer.tags.includes(tag)) customer.tags.push(tag);
        this.addActivity(workspace, auditEntries, { kind: 'note', title: 'Tag ergänzt', detail: tag, customerId: customer.id, customerName: customer.name, actor, entityType: 'customer', entityId: customer.id, visibility: 'office' });
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
        this.addActivity(workspace, auditEntries, { kind: 'note', title: 'Notiz ergänzt', detail: note.content, customerId: customer.id, customerName: customer.name, actor, entityType: 'customer', entityId: customer.id, visibility: payload.type === 'intern' ? 'office' : 'all' });
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
        this.addActivity(workspace, auditEntries, { kind: 'task', title: 'Aufgabe angelegt', detail: `${task.title} · ${task.assignee}`, customerId: customer.id, customerName: customer.name, actor, entityType: 'task', entityId: task.id, handoffTo: task.assignee, visibility: 'office' });
        break;
      }
      case 'updateTask': {
        const entry = findTask(payload.taskId);
        if (!entry) throw fail(404, 'TASK_NOT_FOUND', 'Aufgabe nicht gefunden.');
        if (!canEditTask(viewer, entry.task)) throw fail(403, 'ROLE_FORBIDDEN', 'Diese Aufgabe darfst du nicht bearbeiten.');
        const previous = { ...entry.task };
        Object.assign(entry.task, payload.patch);
        if (entry.task.status === 'erledigt' && !entry.task.completedAt) entry.task.completedAt = isoDate();
        if (entry.task.status !== 'erledigt') delete entry.task.completedAt;

        let title = 'Aufgabe aktualisiert';
        let detail = `${entry.task.title} · ${entry.task.status}`;
        if (payload.patch?.assignee && payload.patch.assignee !== previous.assignee) {
          title = 'Verantwortung übergeben';
          detail = `${entry.task.title} von ${previous.assignee} an ${entry.task.assignee}`;
        } else if (payload.patch?.status && payload.patch.status !== previous.status) {
          title = 'Aufgabenstatus geändert';
          detail = `${entry.task.title} · ${previous.status} → ${entry.task.status}`;
        }

        this.addActivity(workspace, auditEntries, {
          kind: 'task',
          title,
          detail,
          customerId: entry.customer.id,
          customerName: entry.customer.name,
          actor,
          entityType: 'task',
          entityId: entry.task.id,
          handoffTo: entry.task.assignee,
          visibility: 'all',
        });
        break;
      }
      case 'updateTaskStatus': {
        const entry = findTask(payload.taskId);
        if (!entry) throw fail(404, 'TASK_NOT_FOUND', 'Aufgabe nicht gefunden.');
        if (!canEditTask(viewer, entry.task)) throw fail(403, 'ROLE_FORBIDDEN', 'Diesen Status darfst du nicht ändern.');
        const previous = entry.task.status;
        entry.task.status = payload.status || nextTaskStatus(entry.task.status);
        if (entry.task.status === 'erledigt') entry.task.completedAt = isoDate();
        this.addActivity(workspace, auditEntries, { kind: 'task', title: 'Aufgabenstatus geändert', detail: `${entry.task.title} · ${previous} → ${entry.task.status}`, customerId: entry.customer.id, customerName: entry.customer.name, actor, entityType: 'task', entityId: entry.task.id, handoffTo: entry.task.assignee, visibility: 'all' });
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
        this.addActivity(workspace, auditEntries, { kind: 'service', title: 'Einsatz geplant', detail: `${event.title} · ${event.date} ${event.startTime}`, customerId: customer.id, customerName: customer.name, actor, entityType: 'service', entityId: event.id, handoffTo: event.assignee, visibility: 'office' });
        break;
      }
      case 'updateService': {
        const event = findService(payload.eventId);
        if (!event) throw fail(404, 'SERVICE_NOT_FOUND', 'Einsatz nicht gefunden.');
        if (!canEditService(viewer, event)) throw fail(403, 'ROLE_FORBIDDEN', 'Diesen Einsatz darfst du nicht bearbeiten.');
        const previous = { ...event };
        Object.assign(event, payload.patch);
        let title = 'Einsatz aktualisiert';
        let detail = `${event.title} · ${event.status}`;
        if (payload.patch?.assignee && payload.patch.assignee !== previous.assignee) {
          title = 'Einsatz übergeben';
          detail = `${event.title} von ${previous.assignee} an ${event.assignee}`;
        } else if (payload.patch?.status && payload.patch.status !== previous.status) {
          title = 'Einsatzstatus geändert';
          detail = `${event.title} · ${previous.status} → ${event.status}`;
        }
        this.addActivity(workspace, auditEntries, { kind: 'service', title, detail, customerId: event.customerId, customerName: event.customerName, actor, entityType: 'service', entityId: event.id, handoffTo: event.assignee, visibility: 'all' });
        break;
      }
      case 'updateServiceStatus': {
        const event = findService(payload.eventId);
        if (!event) throw fail(404, 'SERVICE_NOT_FOUND', 'Einsatz nicht gefunden.');
        if (!canEditService(viewer, event)) throw fail(403, 'ROLE_FORBIDDEN', 'Diesen Einsatzstatus darfst du nicht ändern.');
        const previous = event.status;
        event.status = payload.status || nextServiceStatus(event.status);
        this.addActivity(workspace, auditEntries, { kind: 'service', title: 'Einsatzstatus geändert', detail: `${event.title} · ${previous} → ${event.status}`, customerId: event.customerId, customerName: event.customerName, actor, entityType: 'service', entityId: event.id, handoffTo: event.assignee, visibility: 'all' });
        break;
      }
      case 'addServiceNote': {
        const event = findService(payload.eventId);
        if (!event) throw fail(404, 'SERVICE_NOT_FOUND', 'Einsatz nicht gefunden.');
        if (!canEditService(viewer, event)) throw fail(403, 'ROLE_FORBIDDEN', 'Diesen Einsatz darfst du nicht kommentieren.');
        const note = payload.note.trim();
        if (note) event.notes.unshift(note);
        this.addActivity(workspace, auditEntries, { kind: 'service', title: 'Einsatznotiz ergänzt', detail: note, customerId: event.customerId, customerName: event.customerName, actor, entityType: 'service', entityId: event.id, handoffTo: event.assignee, visibility: 'all' });
        break;
      }
      case 'resetDemoData': {
        if (!['admin', 'manager'].includes(viewer.role)) throw fail(403, 'ROLE_FORBIDDEN', 'Nur Admins und Manager dürfen Demo-Daten zurücksetzen.');
        workspace.customers = [];
        workspace.serviceEvents = [];
        workspace.activity = [];
        if (typeof this.repository.replaceActivity === 'function') {
          await this.repository.replaceActivity([]);
        }
        break;
      }
      default:
        throw fail(400, 'UNKNOWN_ACTION', `Unbekannte Aktion: ${action}`);
    }

    const nextState = await this.repository.writeWorkspace(workspace);
    await this.persistAuditEntries(auditEntries);
    return { ...nextState, activity: workspace.activity };
  }
}

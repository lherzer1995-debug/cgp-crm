import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import {
  customers, notes, activities, attachments, noteTemplates, settings, commissions, activityTemplates,
  type Customer, type InsertCustomer,
  type Note, type InsertNote,
  type Activity, type InsertActivity,
  type Attachment, type InsertAttachment,
  type NoteTemplate, type InsertNoteTemplate,
  type Settings, type InsertSettings,
  type Commission, type InsertCommission,
  type ActivityTemplate, type InsertActivityTemplate,
} from "@shared/schema";

// On Render: use persistent disk at /data/data.db, otherwise local data.db
const DB_PATH = process.env.NODE_ENV === "production" && require("fs").existsSync("/data")
  ? "/data/data.db"
  : "data.db";
const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite);

// Auto-create tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    city TEXT,
    country TEXT DEFAULT 'Deutschland',
    industry TEXT,
    payment_volume REAL,
    payment_method TEXT,
    bank_name TEXT,
    iban TEXT,
    commerz_account_manager TEXT DEFAULT 'Lars Herzer',
    girocard_disagio REAL,
    girocard_interchange REAL,
    girocard_scheme_fee REAL,
    girocard_acquirer REAL,
    creditcard_disagio REAL,
    creditcard_interchange REAL,
    creditcard_scheme_fee REAL,
    creditcard_acquirer REAL,
    selected_product TEXT,
    contract_start TEXT,
    contract_end TEXT,
    last_activity_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'note',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS note_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    due_date TEXT,
    due_time TEXT,
    raw_date_text TEXT,
    calendar_event_id TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    crm_name TEXT NOT NULL DEFAULT 'CGP CRM',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'sale',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS activity_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'follow_up',
    priority TEXT NOT NULL DEFAULT 'medium',
    recurrence TEXT NOT NULL DEFAULT 'none',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Run migrations for existing databases (ALTER TABLE IF NOT EXISTS column)
const runMigration = (sql: string) => { try { sqlite.exec(sql); } catch (_) {} };
runMigration("ALTER TABLE activities ADD COLUMN due_time TEXT");
runMigration("ALTER TABLE activities ADD COLUMN raw_date_text TEXT");
runMigration("ALTER TABLE activities ADD COLUMN calendar_event_id TEXT");
runMigration("ALTER TABLE activities ADD COLUMN completed_at TEXT");
runMigration("ALTER TABLE activities ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'");
runMigration("ALTER TABLE customers ADD COLUMN last_activity_date TEXT");
runMigration("ALTER TABLE notes ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))");
runMigration("ALTER TABLE settings ADD COLUMN advisor_name TEXT DEFAULT 'Lars Herzer'");
runMigration("ALTER TABLE settings ADD COLUMN monthly_commission_quota REAL");

export interface IStorage {
  // Customers
  getCustomers(): Customer[];
  getCustomer(id: number): Customer | undefined;
  createCustomer(data: InsertCustomer): Customer;
  updateCustomer(id: number, data: Partial<InsertCustomer>): Customer | undefined;
  deleteCustomer(id: number): void;
  // Notes
  getNotes(customerId: number): Note[];
  getNote(id: number): Note | undefined;
  createNote(data: InsertNote): Note;
  updateNote(id: number, data: Partial<InsertNote>): Note | undefined;
  deleteNote(id: number): void;
  // Attachments
  getAttachments(noteId: number): Attachment[];
  getAttachment(id: number): Attachment | undefined;
  createAttachment(data: InsertAttachment): Attachment;
  deleteAttachment(id: number): void;
  // Note Templates
  getNoteTemplates(): NoteTemplate[];
  createNoteTemplate(data: InsertNoteTemplate): NoteTemplate;
  deleteNoteTemplate(id: number): void;
  // Activities
  getActivities(customerId: number): Activity[];
  getAllActivities(): Activity[];
  createActivity(data: InsertActivity): Activity;
  updateActivity(id: number, data: Partial<InsertActivity>): Activity | undefined;
  deleteActivity(id: number): void;
  // Settings
  getSettings(): Settings;
  updateSettings(data: Partial<InsertSettings>): Settings;
  // Commissions
  getCommissions(filters?: { customerId?: number; year?: number; month?: number }): Commission[];
  getCommission(id: number): Commission | undefined;
  createCommission(data: InsertCommission): Commission;
  updateCommission(id: number, data: Partial<InsertCommission>): Commission | undefined;
  deleteCommission(id: number): void;
  getCommissionSummary(year: number): { month: number; monthLabel: string; total: number; count: number }[];
  // Activity Templates
  getActivityTemplates(): ActivityTemplate[];
  getActivityTemplate(id: number): ActivityTemplate | undefined;
  createActivityTemplate(data: InsertActivityTemplate): ActivityTemplate;
  deleteActivityTemplate(id: number): void;
}

class Storage implements IStorage {
  // ── Customers ───────────────────────────────────────────────────────────
  getCustomers(): Customer[] {
    return db.select().from(customers).all();
  }
  getCustomer(id: number): Customer | undefined {
    return db.select().from(customers).where(eq(customers.id, id)).get();
  }
  createCustomer(data: InsertCustomer): Customer {
    return db.insert(customers).values(data).returning().get();
  }
  updateCustomer(id: number, data: Partial<InsertCustomer>): Customer | undefined {
    return db.update(customers).set(data).where(eq(customers.id, id)).returning().get();
  }
  deleteCustomer(id: number): void {
    // Delete attachments for all notes of this customer
    const customerNotes = db.select().from(notes).where(eq(notes.customerId, id)).all();
    for (const note of customerNotes) {
      db.delete(attachments).where(eq(attachments.noteId, note.id)).run();
    }
    db.delete(notes).where(eq(notes.customerId, id)).run();
    db.delete(activities).where(eq(activities.customerId, id)).run();
    db.delete(customers).where(eq(customers.id, id)).run();
  }

  // ── Notes ───────────────────────────────────────────────────────────────
  getNotes(customerId: number): Note[] {
    return db.select().from(notes).where(eq(notes.customerId, customerId)).all();
  }
  getNote(id: number): Note | undefined {
    return db.select().from(notes).where(eq(notes.id, id)).get();
  }
  createNote(data: InsertNote): Note {
    return db.insert(notes).values(data).returning().get();
  }
  updateNote(id: number, data: Partial<InsertNote>): Note | undefined {
    return db.update(notes).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(notes.id, id)).returning().get();
  }
  deleteNote(id: number): void {
    db.delete(attachments).where(eq(attachments.noteId, id)).run();
    db.delete(notes).where(eq(notes.id, id)).run();
  }

  // ── Attachments ─────────────────────────────────────────────────────────
  getAttachments(noteId: number): Attachment[] {
    return db.select().from(attachments).where(eq(attachments.noteId, noteId)).all();
  }
  getAttachment(id: number): Attachment | undefined {
    return db.select().from(attachments).where(eq(attachments.id, id)).get();
  }
  createAttachment(data: InsertAttachment): Attachment {
    return db.insert(attachments).values(data).returning().get();
  }
  deleteAttachment(id: number): void {
    db.delete(attachments).where(eq(attachments.id, id)).run();
  }

  // ── Note Templates ───────────────────────────────────────────────────────
  getNoteTemplates(): NoteTemplate[] {
    return db.select().from(noteTemplates).all();
  }
  createNoteTemplate(data: InsertNoteTemplate): NoteTemplate {
    return db.insert(noteTemplates).values(data).returning().get();
  }
  deleteNoteTemplate(id: number): void {
    db.delete(noteTemplates).where(eq(noteTemplates.id, id)).run();
  }

  // ── Activities ──────────────────────────────────────────────────────────
  getActivities(customerId: number): Activity[] {
    return db.select().from(activities).where(eq(activities.customerId, customerId)).all();
  }
  getAllActivities(): Activity[] {
    return db.select().from(activities).all();
  }
  createActivity(data: InsertActivity): Activity {
    return db.insert(activities).values(data).returning().get();
  }
  updateActivity(id: number, data: Partial<InsertActivity>): Activity | undefined {
    return db.update(activities).set(data).where(eq(activities.id, id)).returning().get();
  }
  deleteActivity(id: number): void {
    db.delete(activities).where(eq(activities.id, id)).run();
  }

  // ── Settings ─────────────────────────────────────────────────────────────
  getSettings(): Settings {
    let row = db.select().from(settings).get();
    if (!row) {
      // Seed default row on first access
      row = db.insert(settings).values({ crmName: "CGP CRM" }).returning().get();
    }
    return row;
  }
  updateSettings(data: Partial<InsertSettings>): Settings {
    const existing = this.getSettings();
    return db
      .update(settings)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(settings.id, existing.id))
      .returning()
      .get();
  }

  // ── Commissions ──────────────────────────────────────────────────────────
  getCommissions(filters?: { customerId?: number; year?: number; month?: number }): Commission[] {
    let all = db.select().from(commissions).all();
    if (filters?.customerId != null) {
      all = all.filter((c) => c.customerId === filters.customerId);
    }
    if (filters?.year != null) {
      const y = String(filters.year);
      all = all.filter((c) => c.date.startsWith(y));
    }
    if (filters?.month != null) {
      const m = String(filters.month).padStart(2, "0");
      all = all.filter((c) => {
        const parts = c.date.split("-");
        return parts[1] === m;
      });
    }
    return all.sort((a, b) => (b.date > a.date ? 1 : -1));
  }
  getCommission(id: number): Commission | undefined {
    return db.select().from(commissions).where(eq(commissions.id, id)).get();
  }
  createCommission(data: InsertCommission): Commission {
    return db.insert(commissions).values(data).returning().get();
  }
  updateCommission(id: number, data: Partial<InsertCommission>): Commission | undefined {
    return db
      .update(commissions)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(commissions.id, id))
      .returning()
      .get();
  }
  deleteCommission(id: number): void {
    db.delete(commissions).where(eq(commissions.id, id)).run();
  }
  getCommissionSummary(year: number): { month: number; monthLabel: string; total: number; count: number }[] {
    const all = this.getCommissions({ year });
    const MONTH_LABELS = ["Januar", "Februar", "März", "April", "Mai", "Juni",
      "Juli", "August", "September", "Oktober", "November", "Dezember"];
    const result: { month: number; monthLabel: string; total: number; count: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const key = String(m).padStart(2, "0");
      const monthItems = all.filter((c) => c.date.split("-")[1] === key);
      result.push({
        month: m,
        monthLabel: MONTH_LABELS[m - 1],
        total: monthItems.reduce((sum, c) => sum + c.amount, 0),
        count: monthItems.length,
      });
    }
    return result;
  }

  // ── Activity Templates ───────────────────────────────────────────────────
  getActivityTemplates(): ActivityTemplate[] {
    return db.select().from(activityTemplates).all();
  }
  getActivityTemplate(id: number): ActivityTemplate | undefined {
    return db.select().from(activityTemplates).where(eq(activityTemplates.id, id)).get();
  }
  createActivityTemplate(data: InsertActivityTemplate): ActivityTemplate {
    return db.insert(activityTemplates).values(data).returning().get();
  }
  deleteActivityTemplate(id: number): void {
    db.delete(activityTemplates).where(eq(activityTemplates.id, id)).run();
  }
}

export const storage = new Storage();

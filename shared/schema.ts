import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Customers ──────────────────────────────────────────────────────────────
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  city: text("city"),
  country: text("country").default("Deutschland"),
  industry: text("industry"),
  status: text("status").notNull().default("lead"), // lead | prospect | active | churned
  // Payment / Commerzbank specific
  paymentVolume: real("payment_volume"), // monthly EUR
  paymentMethod: text("payment_method"), // card | sepa | instant
  bankName: text("bank_name"),
  iban: text("iban"),
  commerzAccountManager: text("commerz_account_manager").default("Lars Herzer"),
  // Disagio-Struktur (Händlergebühr = Interchange + Scheme Fee + Acquirer-Marge)
  // Girocard
  girocardDisagio: real("girocard_disagio"),           // Gesamt-Disagio Girocard (% vom Umsatz)
  girocardInterchange: real("girocard_interchange"),   // davon: Interchange an Hausbank (EU max 0,2%)
  girocardSchemeFee: real("girocard_scheme_fee"),      // davon: Scheme Fee an DK/girocard-Netz
  girocardAcquirer: real("girocard_acquirer"),          // davon: Acquirer-Marge CGP
  // Kreditkarte (Visa / Mastercard)
  creditcardDisagio: real("creditcard_disagio"),       // Gesamt-Disagio Kreditkarte (% vom Umsatz)
  creditcardInterchange: real("creditcard_interchange"), // davon: Interchange an kartenausgebende Bank (EU max 0,3%)
  creditcardSchemeFee: real("creditcard_scheme_fee"),  // davon: Scheme Fee an Visa/MC
  creditcardAcquirer: real("creditcard_acquirer"),      // davon: Acquirer-Marge CGP
  // Gewähltes Produkt von Commerz Globalpay Website
  selectedProduct: text("selected_product"),
  contractStart: text("contract_start"),
  contractEnd: text("contract_end"),
  // Analytics
  lastActivityDate: text("last_activity_date"),
  // Meta
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// ── Notes ──────────────────────────────────────────────────────────────────
export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(), // rich-text HTML
  type: text("type").notNull().default("note"), // note | call | meeting | email
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

// ── Attachments ────────────────────────────────────────────────────────────
export const attachments = sqliteTable("attachments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  noteId: integer("note_id").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  uploadedAt: text("uploaded_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  uploadedAt: true,
});
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachments.$inferSelect;

// ── Note Templates ─────────────────────────────────────────────────────────
export const noteTemplates = sqliteTable("note_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertNoteTemplateSchema = createInsertSchema(noteTemplates).omit({
  id: true,
  createdAt: true,
});
export type InsertNoteTemplate = z.infer<typeof insertNoteTemplateSchema>;
export type NoteTemplate = typeof noteTemplates.$inferSelect;

// ── Activities (Pipeline Events) ───────────────────────────────────────────
export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull(),
  type: text("type").notNull(), // call | demo | proposal | follow_up | closed_won | closed_lost
  description: text("description").notNull(),
  dueDate: text("due_date"),          // ISO date string (YYYY-MM-DD or full ISO)
  dueTime: text("due_time"),          // HH:MM if time was specified
  rawDateText: text("raw_date_text"), // original free-text input, e.g. "morgen 14 Uhr"
  calendarEventId: text("calendar_event_id"), // Google Calendar event ID once synced
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  completedAt: text("completed_at"),  // ISO timestamp when marked done (for sales cycle calc)
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

import type { Express } from "express";
import type { Server } from "http";
import { storage, db } from "./storage";
import { insertCustomerSchema, insertNoteSchema, insertActivitySchema, insertNoteTemplateSchema, updateSettingsSchema } from "@shared/schema";
import { customers } from "@shared/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import mammoth from "mammoth";
import fs from "fs";
import path from "path";

// Uploads directory for note attachments
const UPLOADS_DIR = process.env.NODE_ENV === "production" && fs.existsSync("/data")
  ? "/data/uploads"
  : path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${unique}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Nur PDF, DOC, DOCX, XLS, XLSX erlaubt"));
  },
});
// PDF Text-Extraktion ohne externe System-Tools
async function extractPdfText(buffer: Buffer): Promise<string> {
  // Dynamischer Import um Bundle-Probleme zu vermeiden
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(" ");
    pages.push(text);
  }
  return pages.join("\n");
}
import { syncActivityToCalendar, gcalConfigured } from "./gcalDirect";
import { registerOAuthRoutes, getStoredToken } from "./oauth";
import { parseGermanDateTime } from "./dateParser";

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: "Telefonat",
  demo: "Demo / Präsentation",
  proposal: "Angebot",
  follow_up: "Follow-up",
  closed_won: "Abschluss gewonnen",
  closed_lost: "Abschluss verloren",
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function extractTextFromBuffer(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === "application/pdf" || mimetype === "application/x-pdf") {
    // Validate PDF magic bytes
    if (!buffer.slice(0, 4).equals(Buffer.from("%PDF"))) {
      throw new Error("Ungültiges Dateiformat: Kein gültiges PDF");
    }
    // Use pdfjs-dist — works everywhere without system tools
    return extractPdfText(buffer);
  } else if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else {
    // Fallback: treat as plain text
    return buffer.toString("utf-8");
  }
}

// ── Rule-based contract parser (no AI dependency, works in published sites) ──
function parseGermanDate(raw: string): string | null {
  // DD.MM.YYYY or DD.MM.YYYY with optional leading zeros
  const m = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function matchLine(text: string, labelPattern: RegExp): string | null {
  // Matches label followed by value on same or next token-block
  const m = text.match(labelPattern);
  return m ? m[1]?.trim() || null : null;
}

function parsePercent(raw: string | null): number | null {
  if (!raw) return null;
  const m = raw.replace(",", ".").match(/(\d+\.?\d*)/);
  return m ? parseFloat(m[1]) : null;
}

// Helper: get Nth non-empty value after a label line (CGP PDFs: label, empty, sibling-header, empty, value)
function getLineAfterLabel(lines: string[], label: RegExp, skipCount = 2): string | null {
  for (let i = 0; i < lines.length - 2; i++) {
    if (label.test(lines[i].trim())) {
      let skipped = 0;
      for (let j = i + 1; j <= Math.min(i + 10, lines.length - 1); j++) {
        const v = lines[j].trim();
        if (!v) continue; // skip blank lines
        if (!/^\d+\./.test(v)) { // skip section numbers
          skipped++;
          if (skipped >= skipCount) return v;
        }
      }
    }
  }
  return null;
}

function analyzeContractWithAI(text: string): Promise<Record<string, any>> {
  const lines = text.split(/\n/);
  const flat = text.replace(/\s+/g, " ");

  const result: Record<string, any> = {};

  // ─ Company name ─ (label: Firmenname, value 2 lines after)
  result.companyName = getLineAfterLabel(lines, /^Firmenname$/i);
  // If not found, fall back to flat matching
  if (!result.companyName) {
    result.companyName = matchLine(flat, /Firmenname\s+(?:Rechtsform\s+)?([\w][\w\s&\-\.]+?GmbH|[\w][\w\s&\-\.]+?AG|[\w][\w\s&\-\.]+?e\.K\.?)/i);
  }

  // ─ Contact name ─
  result.contactName = getLineAfterLabel(lines, /^Ansprechpartner/i);
  if (!result.contactName) {
    result.contactName = matchLine(flat, /Unterschrift Haendler\s+([A-Z][a-z]+ [A-Z][\w]+)/i);
  }

  // ─ Email ─
  const emailM = flat.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  result.email = emailM ? emailM[1] : null;

  // ─ Phone ─ (must start with +49 or 0 followed by digits, minimum 10 chars total)
  const phoneRaw = getLineAfterLabel(lines, /^Telefon$/i, 1);
  const phoneM = (phoneRaw || flat).match(/(\+49[\s\d\-\/]{8,}|0[1-9][\d\s\-\/]{8,})/);
  result.phone = phoneM ? phoneM[1].replace(/\s+/g," ").trim() : null;

  // ─ City from PLZ/Stadt pattern ─
  const cityM = flat.match(/\d{5}\s+([A-Z][\w\s]+?)(?:\s{2,}|\n|Land|Telefon|Deutschland)/);
  result.city = cityM ? cityM[1].trim() : null;

  // ─ Country ─
  result.country = /Deutschland/i.test(flat) ? "Deutschland" :
    /Austria|\u00d6sterreich/i.test(flat) ? "Österreich" :
    /Schweiz|Switzerland/i.test(flat) ? "Schweiz" : null;

  // ─ Industry ─
  const industryMap: [RegExp, string][] = [
    [/Einzelhandel/i, "Einzelhandel"],
    [/Gastronomie|Restaurant|Hotel.*Gastr/i, "Gastronomie"],
    [/E-Commerce|Online.*Shop/i, "E-Commerce"],
    [/Handwerk/i, "Handwerk"],
    [/Hotel|Tourismus/i, "Hotel & Tourismus"],
    [/Gesundheit|Arzt|Apotheke|Klinik/i, "Gesundheit"],
    [/Industrie|Produktion|Fertigung/i, "Industrie"],
    [/Dienstleistung/i, "Dienstleistung"],
  ];
  for (const [re, label] of industryMap) {
    if (re.test(flat)) { result.industry = label; break; }
  }

  // ─ Bank ─ (skipCount=2: skip the "IBAN" sibling header)
  result.bankName = getLineAfterLabel(lines, /^Hausbank$/i, 2) ||
    matchLine(flat, /Hausbank\s+IBAN\s+([\w\s]+?)(?:BIC|\ {2,}|\d{2}\s)/i);

  // ─ IBAN ─ (value is 2 non-empty lines after "IBAN" label)
  const ibanRaw = getLineAfterLabel(lines, /^IBAN$/i, 2);
  const ibanM = ibanRaw
    ? ibanRaw.match(/([A-Z]{2}[\d\s]{14,30})/)
    : flat.match(/IBAN\s+[A-Z]{2}\s+[A-Z]{2}\s+[A-Z]{2}\s+([A-Z]{2}\d{2}[\d\s]+)/);
  const ibanDirect = flat.match(/\b([A-Z]{2}\d{2}[\s\d]{14,30})\b/);
  result.iban = (ibanM ? ibanM[1] : ibanDirect ? ibanDirect[1] : null)?.replace(/\s/g, "") || null;

  // ─ Payment volume ─
  const volM = flat.match(/(?:Umsatzvolumen|Umsatz).*?EUR\s?([\d\.]+),?\d*/i) ||
               flat.match(/EUR\s?([\d\.]+),\d{2}(?!\s*pro)/);
  if (volM) {
    result.paymentVolume = parseFloat(volM[1].replace(/\./g, ""));
  }

  // ─ Product ─
  const productMap: [RegExp, string][] = [
    [/EC-Terminal.*station/i, "EC-Terminal (stationaer)"],
    [/EC-Terminal.*portab/i, "EC-Terminal (portabel)"],
    [/EC-Terminal.*mobil/i, "EC-Terminal (mobil)"],
    [/Tap to Pay/i, "Tap to Pay auf dem iPhone"],
    [/E-Commerce Zahlung/i, "E-Commerce Zahlungsloesung"],
    [/Payment.Check|Beratung/i, "Payment-Check / Beratung"],
    [/Partnerprogramm/i, "Partnerprogramm"],
  ];
  for (const [re, label] of productMap) {
    if (re.test(flat)) { result.selectedProduct = label; break; }
  }

  // ─ Disagio rows: extract all percent values from disagio table ─
  // Pattern: Girocard ... X,XX % ... X,XX % ... X,XX % ... X,XX %
  const girocardRow = flat.match(/Girocard[^\n]{0,200}?(\d[,.]\d+)\s*%[^\n]{0,100}?(\d[,.]\d+)\s*%[^\n]{0,100}?(\d[,.]\d+)\s*%[^\n]{0,100}?(\d[,.]\d+)\s*%/i);
  if (girocardRow) {
    result.girocardDisagio   = parsePercent(girocardRow[1]);
    result.girocardInterchange = parsePercent(girocardRow[2]);
    result.girocardSchemeFee = parsePercent(girocardRow[3]);
    // acquirer is auto-calculated by frontend, but store it too
    result.girocardAcquirer  = parsePercent(girocardRow[4]);
  } else {
    // fallback: search individually
    const gcDisM = flat.match(/Girocard[^%]{0,80}(\d[,.]\d+)\s*%/);
    result.girocardDisagio = gcDisM ? parsePercent(gcDisM[1]) : null;
  }

  const ccRow = flat.match(/Kreditkarte[^\n]{0,200}?(\d[,.]\d+)\s*%[^\n]{0,100}?(\d[,.]\d+)\s*%[^\n]{0,100}?(\d[,.]\d+)\s*%[^\n]{0,100}?(\d[,.]\d+)\s*%/i);
  if (ccRow) {
    result.creditcardDisagio    = parsePercent(ccRow[1]);
    result.creditcardInterchange = parsePercent(ccRow[2]);
    result.creditcardSchemeFee  = parsePercent(ccRow[3]);
    result.creditcardAcquirer   = parsePercent(ccRow[4]);
  } else {
    const ccDisM = flat.match(/Kreditkarte[^%]{0,80}(\d[,.]\d+)\s*%/);
    result.creditcardDisagio = ccDisM ? parsePercent(ccDisM[1]) : null;
  }

  // ─ Contract dates ─
  const startRaw = getLineAfterLabel(lines, /^Vertragsbeginn$/i) ||
    matchLine(flat, /Vertragsbeginn\s+([\d\.]{6,10})/);
  result.contractStart = startRaw ? parseGermanDate(startRaw) : null;

  const endRaw = getLineAfterLabel(lines, /^Vertragsende$/i) ||
    matchLine(flat, /(?<!K\S{0,20})Vertragsende\s+([\d\.]{6,10})/);
  result.contractEnd = endRaw ? parseGermanDate(endRaw) : null;

  // ─ Status: if contract has a signature section, mark as active ─
  result.status = /Unterschrift|Vertragsunterzeichnung/i.test(flat) ? "active" : "lead";

  // Clean nulls
  for (const k of Object.keys(result)) {
    if (result[k] === null || result[k] === undefined || result[k] === "") delete result[k];
  }

  console.log("[analyze-contract] parsed fields:", Object.keys(result).join(", "));
  return Promise.resolve(result);
}

export function registerRoutes(httpServer: Server, app: Express) {

  // ── Google OAuth ───────────────────────────────────────────────────────────
  registerOAuthRoutes(app);

  // ── Customers ─────────────────────────────────────────────────────────────
  app.get("/api/customers", (_req, res) => {
    res.json(storage.getCustomers());
  });

  app.get("/api/customers/:id", (req, res) => {
    const customer = storage.getCustomer(Number(req.params.id));
    if (!customer) return res.status(404).json({ message: "Kunde nicht gefunden" });
    res.json(customer);
  });

  app.post("/api/customers", (req, res) => {
    const result = insertCustomerSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({
      error: "validation_error",
      message: "Bitte überprüfe deine Eingaben.",
      details: result.error.flatten().fieldErrors,
    });
    const customer = storage.createCustomer(result.data);
    res.status(201).json(customer);
  });

  app.patch("/api/customers/:id", (req, res) => {
    const partial = insertCustomerSchema.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({
      error: "validation_error",
      message: "Bitte überprüfe deine Eingaben.",
      details: partial.error.flatten().fieldErrors,
    });
    const customer = storage.updateCustomer(Number(req.params.id), partial.data);
    if (!customer) return res.status(404).json({ error: "not_found", message: "Kunde nicht gefunden" });
    res.json(customer);
  });

  app.delete("/api/customers/:id", (req, res) => {
    storage.deleteCustomer(Number(req.params.id));
    res.status(204).end();
  });

  // ── Contract Upload & AI Analysis ─────────────────────────────────────────
  app.post("/api/analyze-contract", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });
      const text = await extractTextFromBuffer(req.file.buffer, req.file.mimetype);
      if (!text || text.trim().length < 20) {
        return res.status(422).json({ message: "Dokument konnte nicht gelesen werden oder ist leer" });
      }
      const extracted = await analyzeContractWithAI(text);
      // Clean up nulls and ensure numbers are actual numbers
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(extracted)) {
        if (v !== null && v !== undefined && v !== "") clean[k] = v;
      }
      res.json({ success: true, data: clean });
    } catch (err: any) {
      console.error("Contract analysis error:", err);
      res.status(500).json({ message: err.message || "Fehler bei der KI-Analyse" });
    }
  });

  // ── Notes ─────────────────────────────────────────────────────────────────
  app.get("/api/customers/:id/notes", (req, res) => {
    res.json(storage.getNotes(Number(req.params.id)));
  });

  app.post("/api/customers/:id/notes", (req, res) => {
    const result = insertNoteSchema.safeParse({ ...req.body, customerId: Number(req.params.id) });
    if (!result.success) return res.status(400).json({ message: result.error.message });
    // Update customer's last_activity_date
    storage.updateCustomer(Number(req.params.id), { lastActivityDate: new Date().toISOString() });
    res.status(201).json(storage.createNote(result.data));
  });

  app.put("/api/notes/:id", (req, res) => {
    const partial = insertNoteSchema.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({ message: partial.error.message });
    const note = storage.updateNote(Number(req.params.id), partial.data);
    if (!note) return res.status(404).json({ message: "Notiz nicht gefunden" });
    res.json(note);
  });

  app.delete("/api/notes/:id", (req, res) => {
    storage.deleteNote(Number(req.params.id));
    res.status(204).end();
  });

  // ── Note Templates ────────────────────────────────────────────────────────
  app.get("/api/note-templates", (_req, res) => {
    res.json(storage.getNoteTemplates());
  });

  app.post("/api/note-templates", (req, res) => {
    const result = insertNoteTemplateSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.message });
    res.status(201).json(storage.createNoteTemplate(result.data));
  });

  app.delete("/api/note-templates/:id", (req, res) => {
    storage.deleteNoteTemplate(Number(req.params.id));
    res.status(204).end();
  });

  // ── Attachments ───────────────────────────────────────────────────────────
  app.post("/api/notes/:id/attachments", attachmentUpload.single("file"), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });
      const noteId = Number(req.params.id);
      const note = storage.getNote(noteId);
      if (!note) return res.status(404).json({ message: "Notiz nicht gefunden" });
      const attachment = storage.createAttachment({
        noteId,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        filePath: req.file.filename,
      });
      res.status(201).json(attachment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/attachments/:id/download", (req, res) => {
    const attachment = storage.getAttachment(Number(req.params.id));
    if (!attachment) return res.status(404).json({ message: "Anhang nicht gefunden" });
    const filePath = path.join(UPLOADS_DIR, attachment.filePath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Datei nicht gefunden" });
    res.download(filePath, attachment.fileName);
  });

  app.delete("/api/attachments/:id", (req, res) => {
    const attachment = storage.getAttachment(Number(req.params.id));
    if (!attachment) return res.status(404).json({ message: "Anhang nicht gefunden" });
    const filePath = path.join(UPLOADS_DIR, attachment.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    storage.deleteAttachment(Number(req.params.id));
    res.status(204).end();
  });

  // ── Freitext-Datum-Parser ────────────────────────────────────────────────
  app.post("/api/parse-date", (req, res) => {
    const text = (req.body?.text || "").toString().trim();
    if (!text) return res.status(400).json({ message: "Kein Text angegeben" });
    const parsed = parseGermanDateTime(text);
    if (!parsed) return res.status(422).json({ message: "Datum nicht erkannt. Versuche: 'morgen 14 Uhr', 'Freitag 9:30', 'nächsten Montag 10 Uhr'" });
    res.json(parsed);
  });

  // ── Activities ────────────────────────────────────────────────────────────
  app.get("/api/activities", (req, res) => {
    let acts = storage.getAllActivities();

    // ?status=open  → only undone
    // ?status=done  → only done
    const status = req.query.status as string | undefined;
    if (status === "open") acts = acts.filter((a) => !a.done);
    else if (status === "done") acts = acts.filter((a) => a.done);

    // ?overdue=true → only past-due, undone tasks
    if (req.query.overdue === "true") {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      acts = acts.filter((a) => {
        if (a.done || !a.dueDate) return false;
        const due = new Date(a.dueDate); due.setHours(0, 0, 0, 0);
        return due < today;
      });
    }

    // ?customerId=123 → filter by customer
    const customerId = req.query.customerId ? Number(req.query.customerId) : null;
    if (customerId) acts = acts.filter((a) => a.customerId === customerId);

    // ?type=call,demo → filter by type(s)
    const typeFilter = req.query.type as string | undefined;
    if (typeFilter) {
      const types = typeFilter.split(",").map((t) => t.trim()).filter(Boolean);
      if (types.length > 0) acts = acts.filter((a) => types.includes(a.type));
    }

    // Always sort by dueDate ascending (nulls last)
    acts.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate < b.dueDate ? -1 : 1;
    });

    res.json(acts);
  });

  app.get("/api/customers/:id/activities", (req, res) => {
    res.json(storage.getActivities(Number(req.params.id)));
  });
  app.post("/api/customers/:id/activities", async (req, res) => {
    // Free-text date: rawDateText -> dueDate + dueTime
    const body: any = { ...req.body, customerId: Number(req.params.id) };
    if (body.rawDateText && !body.dueDate) {
      const parsed = parseGermanDateTime(body.rawDateText);
      if (parsed) {
        body.dueDate = parsed.iso.split("T")[0];
        body.dueTime = parsed.hasTime ? parsed.iso.split("T")[1].substring(0, 5) : null;
      }
    }

    const result = insertActivitySchema.safeParse(body);
    if (!result.success) return res.status(400).json({
      error: "validation_error",
      message: "Bitte überprüfe deine Eingaben.",
      details: result.error.flatten().fieldErrors,
    });
    const activity = storage.createActivity(result.data);

    // —— Direkter Google Calendar Sync (OAuth2, kein Perplexity nötig) ——
    // The activity is always created and returned — a calendar sync failure
    // must never prevent the user from saving their work.
    if (activity.dueDate && gcalConfigured()) {
      const customer = storage.getCustomer(activity.customerId);
      const companyName = customer?.companyName ?? "Kunde";
      const contactName = customer?.contactName ?? "Kontakt";
      console.log(`[GCal] Triggering immediate sync for new activity ${activity.id} (customer: "${companyName}")`);
      syncActivityToCalendar(
        {
          id: activity.id,
          type: activity.type,
          description: activity.description,
          dueDate: activity.dueDate,
          dueTime: activity.dueTime,
        },
        companyName,
        contactName
      ).then((eventId) => {
        storage.updateActivity(activity.id, { calendarEventId: eventId });
        console.log(`[GCal] Activity ${activity.id} linked to calendar event ${eventId}`);
      }).catch((err: any) => {
        // Non-fatal: the background sync will retry this activity on the next tick
        console.error(`[GCal] Immediate sync failed for activity ${activity.id} — will retry in background. Reason: ${err.message}`);
      });
    } else if (activity.dueDate && !gcalConfigured()) {
      console.log(`[GCal] Calendar not configured — activity ${activity.id} will be synced once connected`);
    }

    res.status(201).json(activity);
  });

  app.patch("/api/activities/:id", (req, res) => {
    const partial = insertActivitySchema.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({
      error: "validation_error",
      message: "Bitte überprüfe deine Eingaben.",
      details: partial.error.flatten().fieldErrors,
    });
    // If marking as done, record completedAt
    const updateData: any = { ...partial.data };
    if (partial.data.done === true) {
      updateData.completedAt = new Date().toISOString();
    } else if (partial.data.done === false) {
      updateData.completedAt = null;
    }
    const activity = storage.updateActivity(Number(req.params.id), updateData);
    if (!activity) return res.status(404).json({ message: "Aktivität nicht gefunden" });
    // Update customer's last_activity_date
    storage.updateCustomer(activity.customerId, { lastActivityDate: new Date().toISOString() });
    res.json(activity);
  });


  app.delete("/api/activities/:id", (req, res) => {
    storage.deleteActivity(Number(req.params.id));
    res.status(204).end();
  });

  // ── Settings ──────────────────────────────────────────────────────────────
  app.get("/api/settings", (_req, res) => {
    const token = getStoredToken();
    const appSettings = storage.getSettings();
    res.json({
      crmName: appSettings.crmName,
      gcalConfigured: gcalConfigured(),
      gcalConnected: gcalConfigured(),
      gcalEmail: token?.email ?? null,
    });
  });

  app.put("/api/settings", (req, res) => {
    const result = updateSettingsSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: result.error.message });
    const updated = storage.updateSettings(result.data);
    res.json(updated);
  });

  // ── Analytics ─────────────────────────────────────────────────────────────
  app.get("/api/analytics/overview", (_req, res) => {
    const allCustomers = storage.getCustomers();
    const allActivities = storage.getAllActivities();

    const leads = allCustomers.filter((c) => c.status === "lead").length;
    const prospects = allCustomers.filter((c) => c.status === "prospect").length;
    const active = allCustomers.filter((c) => c.status === "active").length;
    const churned = allCustomers.filter((c) => c.status === "churned").length;
    const total = allCustomers.length;

    // Conversion rate: active customers / total leads ever (leads + prospects + active + churned)
    const conversionRate = total > 0 ? Math.round((active / total) * 100) : 0;

    // Activity type breakdown
    const activityByType: Record<string, number> = {};
    for (const a of allActivities) {
      activityByType[a.type] = (activityByType[a.type] || 0) + 1;
    }

    // Average sales cycle: days from first activity to customer becoming active
    const activeCustomers = allCustomers.filter((c) => c.status === "active");
    let avgSalesCycleDays: number | null = null;
    const cycleDays: number[] = [];
    for (const c of activeCustomers) {
      const custActivities = allActivities.filter((a) => a.customerId === c.id && a.completedAt);
      if (custActivities.length > 0) {
        const firstCompleted = custActivities.sort((a, b) =>
          (a.completedAt ?? "") < (b.completedAt ?? "") ? -1 : 1
        )[0];
        const lastCompleted = custActivities.sort((a, b) =>
          (a.completedAt ?? "") > (b.completedAt ?? "") ? -1 : 1
        )[0];
        const start = new Date(firstCompleted.completedAt!);
        const end = new Date(lastCompleted.completedAt!);
        const days = Math.round((end.getTime() - start.getTime()) / 86400000);
        if (days >= 0) cycleDays.push(days);
      }
    }
    if (cycleDays.length > 0) {
      avgSalesCycleDays = Math.round(cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length);
    }

    // Activities per month (last 6 months)
    const now = new Date();
    const monthlyActivities: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
      const count = allActivities.filter((a) => (a.createdAt ?? "").startsWith(key)).length;
      monthlyActivities.push({ month: label, count });
    }

    res.json({
      total,
      leads,
      prospects,
      active,
      churned,
      conversionRate,
      activityByType,
      avgSalesCycleDays,
      monthlyActivities,
      totalActivities: allActivities.length,
      completedActivities: allActivities.filter((a) => a.done).length,
    });
  });

  app.get("/api/analytics/conversion", (_req, res) => {
    const allCustomers = storage.getCustomers();
    const total = allCustomers.length;
    const byStatus = {
      lead: allCustomers.filter((c) => c.status === "lead").length,
      prospect: allCustomers.filter((c) => c.status === "prospect").length,
      active: allCustomers.filter((c) => c.status === "active").length,
      churned: allCustomers.filter((c) => c.status === "churned").length,
    };
    // Conversion rates
    const leadToProspect = total > 0 ? Math.round(((byStatus.prospect + byStatus.active) / total) * 100) : 0;
    const prospectToActive = (byStatus.prospect + byStatus.active) > 0
      ? Math.round((byStatus.active / (byStatus.prospect + byStatus.active)) * 100) : 0;
    const overallConversion = total > 0 ? Math.round((byStatus.active / total) * 100) : 0;

    // Monthly conversion trend (last 6 months based on createdAt)
    const now = new Date();
    const trend: { month: string; leads: number; active: number; rate: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
      const monthLeads = allCustomers.filter((c) => (c.createdAt ?? "").startsWith(key)).length;
      const monthActive = allCustomers.filter((c) => (c.createdAt ?? "").startsWith(key) && c.status === "active").length;
      trend.push({ month: label, leads: monthLeads, active: monthActive, rate: monthLeads > 0 ? Math.round((monthActive / monthLeads) * 100) : 0 });
    }

    res.json({ byStatus, leadToProspect, prospectToActive, overallConversion, trend });
  });

  app.get("/api/analytics/activities", (_req, res) => {
    const allActivities = storage.getAllActivities();
    const byType: Record<string, number> = {};
    for (const a of allActivities) {
      byType[a.type] = (byType[a.type] || 0) + 1;
    }
    const now = new Date();
    const byMonth: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
      byMonth.push({ month: label, count: allActivities.filter((a) => (a.createdAt ?? "").startsWith(key)).length });
    }
    res.json({ byType, byMonth, total: allActivities.length, completed: allActivities.filter((a) => a.done).length });
  });

  app.get("/api/analytics/sales-cycle", (_req, res) => {
    const allCustomers = storage.getCustomers();
    const allActivities = storage.getAllActivities();
    const activeCustomers = allCustomers.filter((c) => c.status === "active");
    const cycles: { customerId: number; companyName: string; days: number }[] = [];
    for (const c of activeCustomers) {
      const custActivities = allActivities.filter((a) => a.customerId === c.id && a.completedAt);
      if (custActivities.length >= 1) {
        const sorted = custActivities.sort((a, b) => (a.completedAt ?? "") < (b.completedAt ?? "") ? -1 : 1);
        const first = new Date(sorted[0].completedAt!);
        const last = new Date(sorted[sorted.length - 1].completedAt!);
        const days = Math.max(0, Math.round((last.getTime() - first.getTime()) / 86400000));
        cycles.push({ customerId: c.id, companyName: c.companyName, days });
      }
    }
    const avg = cycles.length > 0 ? Math.round(cycles.reduce((s, c) => s + c.days, 0) / cycles.length) : null;
    res.json({ avgDays: avg, cycles });
  });

  // ── CSV Import / Export ───────────────────────────────────────────────────
  app.get("/api/export/csv", (req, res) => {
    const allCustomers = storage.getCustomers();
    const allActivities = storage.getAllActivities();
    const withActivities = req.query.activities === "true";

    const headers = ["id", "company_name", "contact_name", "email", "phone", "city", "country", "industry", "status", "payment_volume", "created_at"];
    if (withActivities) headers.push("last_activity_type", "last_activity_date");

    const rows = allCustomers.map((c) => {
      const row: string[] = [
        String(c.id),
        csvEscape(c.companyName),
        csvEscape(c.contactName),
        csvEscape(c.email ?? ""),
        csvEscape(c.phone ?? ""),
        csvEscape(c.city ?? ""),
        csvEscape(c.country ?? ""),
        csvEscape(c.industry ?? ""),
        c.status,
        String(c.paymentVolume ?? ""),
        c.createdAt,
      ];
      if (withActivities) {
        const custActs = allActivities.filter((a) => a.customerId === c.id).sort((a, b) =>
          (b.createdAt ?? "") > (a.createdAt ?? "") ? 1 : -1
        );
        const last = custActs[0];
        row.push(last?.type ?? "", last?.createdAt ?? "");
      }
      return row.join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="kunden-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send("\uFEFF" + csv); // BOM for Excel
  });

  app.post("/api/import/csv", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });
      const text = req.file.buffer.toString("utf-8").replace(/^\uFEFF/, ""); // strip BOM
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return res.status(400).json({ message: "CSV leer oder nur Header" });

      const headerLine = lines[0].toLowerCase();
      const headers = headerLine.split(",").map((h) => h.trim().replace(/"/g, ""));

      const getCol = (row: string[], name: string): string => {
        const idx = headers.indexOf(name);
        return idx >= 0 ? (row[idx] ?? "").replace(/^"|"$/g, "").trim() : "";
      };

      const results: { row: number; status: "imported" | "duplicate" | "error"; message?: string; data?: any }[] = [];
      const existingCustomers = storage.getCustomers();

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        try {
          const companyName = getCol(cols, "company_name") || getCol(cols, "firmenname");
          const contactName = getCol(cols, "contact_name") || getCol(cols, "ansprechpartner");
          const email = getCol(cols, "email");
          const phone = getCol(cols, "phone") || getCol(cols, "telefon");
          const city = getCol(cols, "city") || getCol(cols, "stadt");
          const country = getCol(cols, "country") || getCol(cols, "land") || "Deutschland";
          const industry = getCol(cols, "industry") || getCol(cols, "branche");
          const status = (getCol(cols, "status") || "lead") as any;

          if (!companyName || !contactName) {
            results.push({ row: i + 1, status: "error", message: "Firmenname und Ansprechpartner sind Pflichtfelder" });
            continue;
          }

          // Duplicate check
          const isDuplicate = existingCustomers.some((c) =>
            (email && c.email && c.email.toLowerCase() === email.toLowerCase()) ||
            (phone && c.phone && c.phone.replace(/\s/g, "") === phone.replace(/\s/g, ""))
          );

          if (isDuplicate) {
            results.push({ row: i + 1, status: "duplicate", message: `Duplikat gefunden (Email/Telefon bereits vorhanden)` });
            continue;
          }

          const customer = storage.createCustomer({ companyName, contactName, email: email || undefined, phone: phone || undefined, city: city || undefined, country, industry: industry || undefined, status });
          existingCustomers.push(customer);
          results.push({ row: i + 1, status: "imported", data: customer });
        } catch (err: any) {
          results.push({ row: i + 1, status: "error", message: err.message });
        }
      }

      const imported = results.filter((r) => r.status === "imported").length;
      const duplicates = results.filter((r) => r.status === "duplicate").length;
      const errors = results.filter((r) => r.status === "error").length;
      res.json({ imported, duplicates, errors, results });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // ── Duplicate Detection ───────────────────────────────────────────────────
  app.post("/api/duplicates/check", (req, res) => {
    const allCustomers = storage.getCustomers();
    const duplicates: { type: string; customers: any[] }[] = [];

    // Email duplicates
    const byEmail: Record<string, typeof allCustomers> = {};
    for (const c of allCustomers) {
      if (c.email) {
        const key = c.email.toLowerCase();
        if (!byEmail[key]) byEmail[key] = [];
        byEmail[key].push(c);
      }
    }
    for (const [, group] of Object.entries(byEmail)) {
      if (group.length > 1) duplicates.push({ type: "email", customers: group });
    }

    // Phone duplicates
    const byPhone: Record<string, typeof allCustomers> = {};
    for (const c of allCustomers) {
      if (c.phone) {
        const key = c.phone.replace(/[\s\-\(\)]/g, "");
        if (!byPhone[key]) byPhone[key] = [];
        byPhone[key].push(c);
      }
    }
    for (const [, group] of Object.entries(byPhone)) {
      if (group.length > 1) {
        const alreadyFound = duplicates.some((d) => d.customers.some((dc) => group.some((g) => g.id === dc.id)));
        if (!alreadyFound) duplicates.push({ type: "phone", customers: group });
      }
    }

    // Fuzzy company name duplicates (simple: normalize and compare)
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/gmbh|ag|e\.k\.|kg|ohg|ug/gi, "").trim();
    const byName: Record<string, typeof allCustomers> = {};
    for (const c of allCustomers) {
      const key = normalize(c.companyName);
      if (!byName[key]) byName[key] = [];
      byName[key].push(c);
    }
    for (const [, group] of Object.entries(byName)) {
      if (group.length > 1) {
        const alreadyFound = duplicates.some((d) => d.customers.some((dc) => group.some((g) => g.id === dc.id)));
        if (!alreadyFound) duplicates.push({ type: "company_name", customers: group });
      }
    }

    res.json({ duplicates, total: duplicates.length });
  });

  app.post("/api/duplicates/merge", (req, res) => {
    const { keepId, mergeId } = req.body;
    if (!keepId || !mergeId) return res.status(400).json({ message: "keepId und mergeId erforderlich" });

    const keep = storage.getCustomer(Number(keepId));
    const merge = storage.getCustomer(Number(mergeId));
    if (!keep || !merge) return res.status(404).json({ message: "Kunde nicht gefunden" });

    // Move all activities from mergeId to keepId
    const mergeActivities = storage.getActivities(Number(mergeId));
    for (const a of mergeActivities) {
      storage.updateActivity(a.id, { customerId: Number(keepId) } as any);
    }

    // Move all notes from mergeId to keepId
    const mergeNotes = storage.getNotes(Number(mergeId));
    for (const n of mergeNotes) {
      storage.updateNote(n.id, { customerId: Number(keepId) });
    }

    // Delete the merged customer record directly (activities/notes already moved)
    // Use db directly to avoid cascade-deleting the moved records
    db.delete(customers).where(eq(customers.id, Number(mergeId))).run();

    // Update last_activity_date on kept customer
    storage.updateCustomer(Number(keepId), { lastActivityDate: new Date().toISOString() });

    res.json({ success: true, kept: storage.getCustomer(Number(keepId)) });
  });

  return httpServer;
}

// ── CSV helpers ──────────────────────────────────────────────────────────────
function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

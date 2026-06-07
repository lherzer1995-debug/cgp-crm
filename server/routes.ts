import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertNoteSchema, insertActivitySchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
// Anthropic SDK import removed — using rule-based parser instead (works in published sites)
import mammoth from "mammoth";
import { execFileSync } from "child_process";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { syncActivityToCalendar, gcalConfigured } from "./gcalDirect";
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
    // Use pdftotext CLI — most reliable for text extraction
    const tmpIn  = join(tmpdir(), `contract_${Date.now()}.pdf`);
    const tmpOut = join(tmpdir(), `contract_${Date.now()}.txt`);
    try {
      // Validate PDF magic bytes before processing
      if (!buffer.slice(0, 4).equals(Buffer.from("%PDF"))) {
        throw new Error("Ungültiges Dateiformat: Kein gültiges PDF");
      }
      writeFileSync(tmpIn, buffer);
      // Use execFileSync with array args to prevent command injection
      execFileSync("/usr/bin/pdftotext", [tmpIn, tmpOut]);
      const text = readFileSync(tmpOut, "utf-8");
      return text;
    } finally {
      try { unlinkSync(tmpIn); } catch {}
      try { unlinkSync(tmpOut); } catch {}
    }
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
    if (!result.success) return res.status(400).json({ message: result.error.message });
    const customer = storage.createCustomer(result.data);
    res.status(201).json(customer);
  });

  app.patch("/api/customers/:id", (req, res) => {
    const partial = insertCustomerSchema.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({ message: partial.error.message });
    const customer = storage.updateCustomer(Number(req.params.id), partial.data);
    if (!customer) return res.status(404).json({ message: "Kunde nicht gefunden" });
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
    res.status(201).json(storage.createNote(result.data));
  });

  app.delete("/api/notes/:id", (req, res) => {
    storage.deleteNote(Number(req.params.id));
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
  app.get("/api/activities", (_req, res) => {
    res.json(storage.getAllActivities());
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
    if (!result.success) return res.status(400).json({ message: result.error.message });
    const activity = storage.createActivity(result.data);

    // —— Direkter Google Calendar Sync (OAuth2, kein Perplexity nötig) ——
    if (activity.dueDate && gcalConfigured()) {
      const customer = storage.getCustomer(activity.customerId);
      syncActivityToCalendar(
        {
          id: activity.id,
          type: activity.type,
          description: activity.description,
          dueDate: activity.dueDate,
          dueTime: activity.dueTime,
        },
        customer?.companyName ?? "Kunde"
      ).then((eventId) => {
        storage.updateActivity(activity.id, { calendarEventId: eventId });
        console.log(`[GCal] Event erstellt: ${eventId}`);
      }).catch((err) => {
        console.error("[GCal] Sync fehlgeschlagen:", err.message);
      });
    }

    res.status(201).json(activity);
  });

  app.patch("/api/activities/:id", (req, res) => {
    const partial = insertActivitySchema.partial().safeParse(req.body);
    if (!partial.success) return res.status(400).json({ message: partial.error.message });
    const activity = storage.updateActivity(Number(req.params.id), partial.data);
    if (!activity) return res.status(404).json({ message: "Aktivität nicht gefunden" });
    res.json(activity);
  });

  app.delete("/api/activities/:id", (req, res) => {
    storage.deleteActivity(Number(req.params.id));
    res.status(204).end();
  });

  // ── Settings ──────────────────────────────────────────────────────────────
  app.get("/api/settings", (_req, res) => {
    res.json({
      gcalConfigured: gcalConfigured(),
    });
  });

  return httpServer;
}

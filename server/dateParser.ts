/**
 * German natural language date/time parser
 * Handles: "morgen 14 Uhr", "nächsten Montag 9:30", "in 3 Tagen", "Freitag 16:00", etc.
 * Returns ISO 8601 string or null if not parseable.
 */

const WEEKDAYS: Record<string, number> = {
  montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4,
  freitag: 5, samstag: 6, sonntag: 0,
  mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6, so: 0,
};

const MONTHS: Record<string, number> = {
  januar: 0, februar: 1, märz: 2, april: 3, mai: 4, juni: 5,
  juli: 6, august: 7, september: 8, oktober: 9, november: 10, dezember: 11,
  jan: 0, feb: 1, mär: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dez: 11,
};

function nextWeekday(from: Date, targetDay: number): Date {
  const d = new Date(from);
  const current = d.getDay();
  let diff = targetDay - current;
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function setTime(d: Date, hour: number, minute = 0): Date {
  const result = new Date(d);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function parseTimeFromText(text: string): { hour: number; minute: number } | null {
  // "14:30", "14 Uhr", "14.30 Uhr", "14:30 Uhr", "halb 3" (=14:30), "viertel nach 2" (=14:15)
  const t = text.toLowerCase();

  // halb X → X-1:30 (German "halb drei" = 2:30)
  const halbM = t.match(/halb\s+(\d{1,2})/);
  if (halbM) {
    const h = parseInt(halbM[1]) - 1;
    return { hour: h < 0 ? 23 : h, minute: 30 };
  }

  // HH:MM or HH.MM (with optional "Uhr")
  const colonM = t.match(/(\d{1,2})[:\.](\d{2})(?:\s*uhr)?/);
  if (colonM) return { hour: parseInt(colonM[1]), minute: parseInt(colonM[2]) };

  // X Uhr
  const uhrM = t.match(/(\d{1,2})\s*uhr/);
  if (uhrM) return { hour: parseInt(uhrM[1]), minute: 0 };

  return null;
}

export interface ParsedDate {
  iso: string;        // ISO 8601 with time
  isoEnd: string;     // iso + 1 hour (default event duration)
  display: string;    // Human readable in German
  hasTime: boolean;
}

export function parseGermanDateTime(input: string, now?: Date): ParsedDate | null {
  const base = now ?? new Date();
  const t = input.toLowerCase().trim();

  let date: Date | null = null;
  const time = parseTimeFromText(t);
  const defaultHour = 9; // fallback if no time given

  // ── Relative day keywords ──
  if (/^heute/.test(t)) {
    date = new Date(base);
  } else if (/^morgen/.test(t)) {
    date = new Date(base);
    date.setDate(date.getDate() + 1);
  } else if (/^übermorgen|^uebermorgen/.test(t)) {
    date = new Date(base);
    date.setDate(date.getDate() + 2);
  } else if (/in\s+(\d+)\s+tag/i.test(t)) {
    const m = t.match(/in\s+(\d+)\s+tag/i);
    if (m) {
      date = new Date(base);
      date.setDate(date.getDate() + parseInt(m[1]));
    }
  } else if (/in\s+einer\s+woche|in\s+1\s+woche/i.test(t)) {
    date = new Date(base);
    date.setDate(date.getDate() + 7);
  } else if (/nächste[rn]?\s+woche|naechste[rn]?\s+woche/i.test(t)) {
    date = new Date(base);
    date.setDate(date.getDate() + 7);
  }

  // ── Weekday ──
  if (!date) {
    for (const [name, dayNum] of Object.entries(WEEKDAYS)) {
      // "nächsten Montag" or just "Montag" or "am Montag"
      const re = new RegExp(`(?:n[äa]chsten?\\s+)?(?:am\\s+)?${name}(?:\\s|,|$)`, "i");
      if (re.test(t)) {
        date = nextWeekday(base, dayNum);
        break;
      }
    }
  }

  // ── DD.MM.YYYY or DD.MM. or DD. Month ──
  if (!date) {
    const fullDateM = t.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (fullDateM) {
      date = new Date(base);
      date.setFullYear(parseInt(fullDateM[3]), parseInt(fullDateM[2]) - 1, parseInt(fullDateM[1]));
    } else {
      const shortDateM = t.match(/(\d{1,2})\.(\d{1,2})\./);
      if (shortDateM) {
        date = new Date(base);
        date.setMonth(parseInt(shortDateM[2]) - 1, parseInt(shortDateM[1]));
        if (date < base) date.setFullYear(date.getFullYear() + 1);
      } else {
        // "15. Juni" or "15 Juni"
        for (const [mName, mIdx] of Object.entries(MONTHS)) {
          const re = new RegExp(`(\\d{1,2})\\.?\\s+${mName}`, "i");
          const mm = t.match(re);
          if (mm) {
            date = new Date(base);
            date.setMonth(mIdx, parseInt(mm[1]));
            if (date < base) date.setFullYear(date.getFullYear() + 1);
            break;
          }
        }
      }
    }
  }

  if (!date) return null;

  // Apply time
  const h = time?.hour ?? defaultHour;
  const m = time?.minute ?? 0;
  const start = setTime(date, h, m);
  const end = setTime(date, h + 1, m);

  const display = start.toLocaleDateString("de-DE", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  }) + (time ? ` um ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")} Uhr` : "");

  return {
    iso: start.toISOString(),
    isoEnd: end.toISOString(),
    display,
    hasTime: !!time,
  };
}

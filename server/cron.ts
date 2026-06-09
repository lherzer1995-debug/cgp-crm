import { storage } from "./storage";

const RENEWAL_THRESHOLD_DAYS = 60;

/**
 * Checks all customers with a contractEnd date.
 * If contractEnd is within RENEWAL_THRESHOLD_DAYS and no open "renewal"
 * activity exists, creates one automatically.
 * Returns a summary of what was created.
 */
export async function checkContractRenewals(): Promise<{
  checked: number;
  created: number;
  details: { customerId: number; companyName: string; daysLeft: number }[];
}> {
  const customers = storage.getCustomers();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let created = 0;
  const details: { customerId: number; companyName: string; daysLeft: number }[] = [];
  let checked = 0;

  for (const customer of customers) {
    if (!customer.contractEnd) continue;
    checked++;

    const contractEndDate = new Date(customer.contractEnd);
    contractEndDate.setHours(0, 0, 0, 0);

    const diffMs = contractEndDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Only act if within threshold and not already expired
    if (daysLeft < 0 || daysLeft > RENEWAL_THRESHOLD_DAYS) continue;

    // Check if an open renewal activity already exists
    const activities = storage.getActivities(customer.id);
    const hasOpenRenewal = activities.some(
      (a) => a.type === "renewal" && !a.done
    );

    if (hasOpenRenewal) continue;

    // Create renewal task
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 3); // Due in 3 days
    const dueDateStr = dueDate.toISOString().split("T")[0];

    storage.createActivity({
      customerId: customer.id,
      type: "renewal",
      description: `Verlängerungsgespräch mit ${customer.companyName} – Vertragsende in ${daysLeft} Tagen (${contractEndDate.toLocaleDateString("de-DE")})`,
      priority: daysLeft <= 30 ? "high" : "medium",
      dueDate: dueDateStr,
      dueTime: null,
      rawDateText: null,
      calendarEventId: null,
      done: false,
      completedAt: null,
    });

    created++;
    details.push({ customerId: customer.id, companyName: customer.companyName, daysLeft });
    console.log(
      `[Cron] Verlängerungsaufgabe erstellt für "${customer.companyName}" (${daysLeft} Tage bis Vertragsende)`
    );
  }

  return { checked, created, details };
}

/**
 * Starts the daily contract-renewal cron job.
 * Runs at 08:00 every day using setInterval (no external dependency).
 * Also fires once shortly after startup.
 */
export function startContractCron(): void {
  const runCheck = () => {
    checkContractRenewals()
      .then(({ checked, created }) => {
        console.log(
          `[Cron] Vertragsende-Check abgeschlossen: ${checked} Kunden geprüft, ${created} Aufgaben erstellt`
        );
      })
      .catch((err) => {
        console.error("[Cron] Fehler beim Vertragsende-Check:", err);
      });
  };

  // Run once shortly after startup
  setTimeout(runCheck, 15_000);

  // Calculate ms until next 08:00
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(8, 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    const msUntilNext = next.getTime() - now.getTime();
    setTimeout(() => {
      runCheck();
      // After first scheduled run, repeat every 24h
      setInterval(runCheck, 24 * 60 * 60 * 1000);
    }, msUntilNext);
    console.log(
      `[Cron] Vertragsende-Check geplant für ${next.toLocaleTimeString("de-DE")} (in ${Math.round(msUntilNext / 60000)} Minuten)`
    );
  };

  scheduleNext();
}

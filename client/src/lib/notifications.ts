// ── Browser Push Notifications ────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

export function sendNotification(title: string, options?: NotificationOptions): void {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(title, {
    icon: "/favicon.png",
    badge: "/favicon.png",
    ...options,
  });
}

export interface TaskForNotification {
  id: number;
  description: string;
  dueDate: string;
  dueTime?: string | null;
  customerId?: number;
}

/**
 * Schedules a browser notification for a task.
 * minutesBefore: how many minutes before the due time to fire the notification.
 * Returns a timeout ID (or null if not schedulable).
 */
export function scheduleNotification(
  task: TaskForNotification,
  minutesBefore: number,
): ReturnType<typeof setTimeout> | null {
  if (!("Notification" in window) || Notification.permission !== "granted") return null;
  if (!task.dueDate) return null;

  const dueDateTime = task.dueTime
    ? new Date(`${task.dueDate}T${task.dueTime}:00`)
    : new Date(`${task.dueDate}T09:00:00`);

  const fireAt = new Date(dueDateTime.getTime() - minutesBefore * 60 * 1000);
  const msUntilFire = fireAt.getTime() - Date.now();

  if (msUntilFire <= 0) return null; // already past

  return setTimeout(() => {
    sendNotification(`Aufgabe fällig: ${task.description}`, {
      body: task.dueTime
        ? `Fällig um ${task.dueTime} Uhr`
        : `Fällig am ${new Date(task.dueDate).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}`,
      tag: `task-${task.id}`,
    });
  }, msUntilFire);
}

/**
 * Checks all open tasks and sends notifications for overdue ones (if enabled).
 */
export function checkOverdueTasks(
  tasks: TaskForNotification[],
  enabled: boolean,
): void {
  if (!enabled || !("Notification" in window) || Notification.permission !== "granted") return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  });

  if (overdue.length > 0) {
    sendNotification(`${overdue.length} überfällige Aufgabe${overdue.length > 1 ? "n" : ""}`, {
      body: overdue.slice(0, 3).map((t) => `• ${t.description}`).join("\n"),
      tag: "overdue-tasks",
    });
  }
}

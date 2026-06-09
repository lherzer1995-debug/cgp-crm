import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Activity } from "@shared/schema";

interface CalendarWidgetProps {
  activities: Activity[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function CalendarWidget({
  activities,
  selectedDate,
  onSelectDate,
}: CalendarWidgetProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Build a set of dates that have activities
  const activityDates = useMemo(() => {
    const map: Record<string, { overdue: boolean; count: number }> = {};
    for (const a of activities) {
      if (!a.dueDate) continue;
      const key = a.dueDate.slice(0, 10);
      if (!map[key]) map[key] = { overdue: false, count: 0 };
      map[key].count++;
      if (!a.done) {
        const due = new Date(key);
        due.setHours(0, 0, 0, 0);
        if (due < today) map[key].overdue = true;
      }
    }
    return map;
  }, [activities]);

  // Calendar grid: first day of month to last day
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start from Monday
  const startOffset = (firstDay.getDay() + 6) % 7; // 0=Mon
  const totalCells = startOffset + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length < rows * 7) cells.push(null);

  const monthLabel = viewDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
  const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  return (
    <div className="rounded-xl border border-border bg-card p-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs font-bold text-foreground capitalize">{monthLabel}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} />;
          const key = isoDate(date);
          const isToday = isoDate(date) === isoDate(today);
          const isSelected = selectedDate === key;
          const info = activityDates[key];

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(isSelected ? null : key)}
              className={cn(
                "relative flex flex-col items-center justify-center h-8 w-full rounded-md text-[11px] font-medium transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                    ? "bg-primary/10 text-primary font-bold"
                    : "hover:bg-muted text-foreground",
              )}
            >
              {date.getDate()}
              {info && (
                <span
                  className={cn(
                    "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                    isSelected
                      ? "bg-primary-foreground"
                      : info.overdue
                        ? "bg-destructive"
                        : "bg-primary",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground text-center">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("de-DE", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
            {activityDates[selectedDate]
              ? ` · ${activityDates[selectedDate].count} Aufgabe${activityDates[selectedDate].count !== 1 ? "n" : ""}`
              : " · Keine Aufgaben"}
          </p>
        </div>
      )}
    </div>
  );
}

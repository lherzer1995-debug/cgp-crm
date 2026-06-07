import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-sm font-medium",
      ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
    )}>
      {ok
        ? <CheckCircle2 className="w-4 h-4" />
        : <XCircle className="w-4 h-4 text-muted-foreground/60" />}
      {label}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-1 h-10 rounded-full bg-[#FFD100] shrink-0 mt-0.5" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Einstellungen</h1>
          <p className="text-sm text-muted-foreground">Systemkonfiguration und Integrationen</p>
        </div>
      </div>

      {/* Google Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-[#0052CC]" />
            Google Kalender
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusBadge
            ok={true}
            label="Aktiv — Aufgaben werden automatisch eingetragen"
          />
          <p className="text-sm text-muted-foreground">
            Wenn du eine Aktivität mit Datum anlegst, wird sie automatisch in deinen Google Kalender eingetragen.
            Die Synchronisation erfolgt innerhalb weniger Minuten nach dem Speichern.
          </p>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">System-Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/40 rounded-md px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Berater</p>
              <p className="font-semibold">Lars Herzer</p>
            </div>
            <div className="bg-muted/40 rounded-md px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">System</p>
              <p className="font-semibold">Commerz Globalpay CRM</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Calendar, Loader2, LogOut, ExternalLink, FileText, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest, API_BASE } from "@/lib/queryClient";
import type { NoteTemplate } from "@shared/schema";

interface GCalStatus {
  connected: boolean;
  email?: string | null;
  connectedAt?: string | null;
  legacy?: boolean;
}

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
  const [location] = useLocation();
  const [flashMessage, setFlashMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", content: "" });

  // Note Templates
  const { data: templates = [] } = useQuery<NoteTemplate[]>({
    queryKey: ["/api/note-templates"],
  });
  const createTemplate = useMutation({
    mutationFn: (data: { name: string; content: string }) => apiRequest("POST", "/api/note-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/note-templates"] });
      setTemplateForm({ name: "", content: "" });
    },
  });
  const deleteTemplate = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/note-templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/note-templates"] }),
  });

  // Parse ?gcal= query param from the hash-based URL after OAuth redirect
  useEffect(() => {
    const hash = window.location.hash; // e.g. "#/settings?gcal=success"
    const queryStart = hash.indexOf("?");
    if (queryStart === -1) return;
    const params = new URLSearchParams(hash.slice(queryStart + 1));
    const gcal = params.get("gcal");
    if (gcal === "success") {
      setFlashMessage({ type: "success", text: "Google Kalender erfolgreich verbunden!" });
      queryClient.invalidateQueries({ queryKey: ["/api/oauth/google/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      // Clean up the URL
      window.history.replaceState(null, "", window.location.pathname + "#/settings");
    } else if (gcal === "error") {
      const reason = params.get("reason") ?? "Unbekannter Fehler";
      setFlashMessage({ type: "error", text: `Verbindung fehlgeschlagen: ${reason}` });
      window.history.replaceState(null, "", window.location.pathname + "#/settings");
    }
  }, [location]);

  // Fetch OAuth status
  const { data: gcalStatus, isLoading: statusLoading } = useQuery<GCalStatus>({
    queryKey: ["/api/oauth/google/status"],
  });

  // Connect: fetch auth URL then redirect
  const [connecting, setConnecting] = useState(false);
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch(`${API_BASE}/api/oauth/google/auth-url`);
      const data = await res.json() as { url?: string; message?: string };
      if (!data.url) throw new Error(data.message ?? "Keine URL erhalten");
      window.location.href = data.url;
    } catch (err: any) {
      setFlashMessage({ type: "error", text: `Fehler: ${err.message}` });
      setConnecting(false);
    }
  };

  // Disconnect
  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/oauth/google/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/oauth/google/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setFlashMessage({ type: "success", text: "Google Kalender getrennt." });
    },
    onError: (err: any) => {
      setFlashMessage({ type: "error", text: `Fehler beim Trennen: ${err.message}` });
    },
  });

  const isConnected = gcalStatus?.connected ?? false;
  const gcalEmail = gcalStatus?.email;
  const isLegacy = gcalStatus?.legacy;

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

      {/* Flash message */}
      {flashMessage && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium border",
          flashMessage.type === "success"
            ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
            : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
        )}>
          {flashMessage.type === "success"
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <XCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{flashMessage.text}</span>
          <button
            onClick={() => setFlashMessage(null)}
            className="text-current opacity-60 hover:opacity-100 transition-opacity ml-2"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>
      )}

      {/* Google Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-[#0052CC]" />
            Google Kalender
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Status wird geladen…
            </div>
          ) : isConnected ? (
            <>
              <StatusBadge
                ok={true}
                label={
                  isLegacy
                    ? "Verbunden (via Umgebungsvariable)"
                    : gcalEmail
                    ? `Verbunden als ${gcalEmail}`
                    : "Verbunden — Aufgaben werden automatisch eingetragen"
                }
              />
              <p className="text-sm text-muted-foreground">
                Wenn du eine Aktivität mit Datum anlegst, wird sie automatisch in deinen Google Kalender eingetragen.
                Die Synchronisation erfolgt innerhalb weniger Minuten nach dem Speichern.
              </p>
              {!isLegacy && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Kalender trennen
                </Button>
              )}
            </>
          ) : (
            <>
              <StatusBadge ok={false} label="Nicht verbunden" />
              <p className="text-sm text-muted-foreground">
                Verbinde deinen Google Kalender, damit Aktivitäten mit Datum automatisch eingetragen werden.
                Du wirst zu Google weitergeleitet, um die Berechtigung zu erteilen.
              </p>
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="gap-2"
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                {connecting ? "Weiterleitung…" : "Google Kalender verbinden"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Note Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-primary" />
            Notiz-Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Erstelle wiederverwendbare Templates für häufige Notiz-Typen (z.B. Demo-Notiz, Angebot-Notiz).
          </p>

          {/* Existing templates */}
          {templates.length > 0 && (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-secondary/40 border border-border">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.content.replace(/<[^>]+>/g, " ").slice(0, 80)}…</p>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteTemplate.mutate(t.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Create new template */}
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Neues Template</p>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Name</Label>
              <Input
                id="tpl-name"
                value={templateForm.name}
                onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="z.B. Demo-Notiz"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-content">Inhalt (HTML oder Text)</Label>
              <Textarea
                id="tpl-content"
                rows={4}
                value={templateForm.content}
                onChange={(e) => setTemplateForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Template-Inhalt…"
              />
            </div>
            <Button
              size="sm"
              className="gap-2 min-h-[40px]"
              onClick={() => {
                if (!templateForm.name.trim() || !templateForm.content.trim()) return;
                createTemplate.mutate(templateForm);
              }}
              disabled={createTemplate.isPending || !templateForm.name.trim() || !templateForm.content.trim()}
            >
              <Plus className="w-3.5 h-3.5" />
              Template erstellen
            </Button>
          </div>
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

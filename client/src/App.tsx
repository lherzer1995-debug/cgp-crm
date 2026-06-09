import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import CustomersPage from "@/pages/CustomersPage";
import CustomerDetailPage from "@/pages/CustomerDetailPage";
import DashboardPage from "@/pages/DashboardPage";
import ActivitiesPage from "@/pages/ActivitiesPage";
import TasksPage from "@/pages/TasksPage";
import SettingsPage from "@/pages/SettingsPage";
import AnalyticsPage from "@/pages/Analytics";
import DataManagementPage from "@/pages/DataManagement";
import NotFound from "@/pages/not-found";
import { useEffect, useState } from "react";
import { Calendar, Loader2, ExternalLink } from "lucide-react";
import { API_BASE } from "@/lib/queryClient";

interface AppSettings {
  crmName: string;
}

interface GCalStatus {
  connected: boolean;
  email?: string | null;
  connectedAt?: string | null;
  legacy?: boolean;
}

// ── Setup / Onboarding Screen ─────────────────────────────────────────────────
function GCalSetupScreen() {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for ?gcal=error in URL (returned after failed OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gcal = params.get("gcal");
    if (gcal === "error") {
      const reason = params.get("reason") ?? "Unbekannter Fehler";
      setError(`Verbindung fehlgeschlagen: ${reason}`);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/oauth/google/auth-url`);
      const data = await res.json() as { url?: string; message?: string };
      if (!data.url) throw new Error(data.message ?? "Keine URL erhalten");
      window.location.href = data.url;
    } catch (err: any) {
      setError(`Fehler: ${err.message}`);
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFD100] mb-2">
            <Calendar className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">CGP CRM</h1>
          <p className="text-sm text-muted-foreground">Commerz Globalpay · Vertrieb</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-foreground">
              Google Kalender verbinden
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bevor du das CRM nutzen kannst, verbinde bitte deinen Google Kalender.
              Aktivitäten mit Datum werden dann automatisch dort eingetragen.
            </p>
          </div>

          {/* Steps */}
          <ol className="space-y-2.5 text-sm text-muted-foreground">
            {[
              `Klicke auf „Jetzt verbinden"`,
              "Melde dich mit deinem Google-Konto an",
              "Erteile die Kalender-Berechtigung",
              "Du wirst automatisch ins CRM weitergeleitet",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#FFD100] text-black text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#FFD100] hover:bg-[#f0c600] text-black font-semibold px-4 py-2.5 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Weiterleitung zu Google…
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Jetzt verbinden
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Nur du hast Zugriff auf deinen Kalender.
        </p>
      </div>
    </div>
  );
}

// ── Main CRM App ──────────────────────────────────────────────────────────────
function CRMApp() {
  const { toast } = useToast();

  // Sync CRM name into document.title
  const { data: appSettings } = useQuery<AppSettings>({ queryKey: ["/api/settings"] });
  useEffect(() => {
    document.title = appSettings?.crmName ?? "CGP CRM";
  }, [appSettings?.crmName]);

  // Detect ?gcal=success after OAuth redirect and show toast
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gcal") === "success") {
      window.history.replaceState(null, "", window.location.pathname);
      toast({
        title: "Google Kalender verbunden ✓",
        description: "Aktivitäten mit Datum werden automatisch eingetragen.",
      });
    }
  }, []);

  return (
    <Router hook={useHashLocation}>
      <Layout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/customers" component={CustomersPage} />
          <Route path="/customers/:id" component={CustomerDetailPage} />
          <Route path="/activities" component={ActivitiesPage} />
          <Route path="/tasks" component={TasksPage} />
          <Route path="/analytics" component={AnalyticsPage} />
          <Route path="/data-management" component={DataManagementPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </Router>
  );
}

// ── Gate: check GCal before rendering anything ────────────────────────────────
function AppGate() {
  const { data: gcalStatus, isLoading } = useQuery<GCalStatus>({
    queryKey: ["/api/oauth/google/status"],
    retry: false,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!gcalStatus?.connected) {
    return <GCalSetupScreen />;
  }

  return <CRMApp />;
}

// ── Root ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppGate />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

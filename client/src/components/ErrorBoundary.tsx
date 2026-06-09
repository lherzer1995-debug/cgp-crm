import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ── Classify error for a user-friendly message ────────────────────────────────
function getFriendlyMessage(error: Error | null): {
  title: string;
  description: string;
} {
  if (!error) {
    return {
      title: "Unerwarteter Fehler",
      description: "Ein unbekannter Fehler ist aufgetreten.",
    };
  }

  const msg = error.message.toLowerCase();

  if (msg.includes("network") || msg.includes("fetch") || msg.includes("verbindung")) {
    return {
      title: "Verbindungsfehler",
      description:
        "Die Verbindung zum Server konnte nicht hergestellt werden. Bitte Internetverbindung prüfen.",
    };
  }

  if (msg.includes("chunk") || msg.includes("loading") || msg.includes("import")) {
    return {
      title: "Ladefehler",
      description:
        "Ein Teil der App konnte nicht geladen werden. Bitte Seite neu laden.",
    };
  }

  if (msg.includes("permission") || msg.includes("berechtigung") || msg.includes("401") || msg.includes("403")) {
    return {
      title: "Keine Berechtigung",
      description: "Du hast keine Berechtigung für diese Aktion. Bitte neu anmelden.",
    };
  }

  return {
    title: "Unerwarteter Fehler",
    description:
      "Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu oder versuche es später erneut.",
  };
}

// ── Error Boundary class component ───────────────────────────────────────────
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console in development; swap for a real error tracker in production
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    // Reset boundary state and navigate to root
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = "#/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const { title, description } = getFriendlyMessage(this.state.error);

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6 text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReload}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Seite neu laden
              </Button>
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Zur Startseite
              </Button>
            </div>

            {/* Technical detail (collapsed, dev-friendly) */}
            {this.state.error && (
              <details className="text-left rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-semibold select-none">
                  Technische Details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[11px]">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

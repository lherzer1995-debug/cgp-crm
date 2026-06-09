import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Global error boundary that catches unhandled React render errors and
 * displays a user-friendly German message instead of a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    // Translate common technical errors into friendly messages
    const msg = error?.message ?? "";
    let friendlyMessage =
      "Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu.";

    if (
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("Verbindung unterbrochen")
    ) {
      friendlyMessage =
        "Verbindung unterbrochen. Bitte Internetverbindung prüfen und Seite neu laden.";
    } else if (msg.includes("ChunkLoadError") || msg.includes("Loading chunk")) {
      friendlyMessage =
        "App-Update verfügbar. Bitte lade die Seite neu, um die neueste Version zu laden.";
    } else if (msg.includes("401") || msg.includes("Sitzung abgelaufen")) {
      friendlyMessage = "Sitzung abgelaufen. Bitte lade die Seite neu.";
    } else if (msg.includes("500") || msg.includes("Serverfehler")) {
      friendlyMessage = "Serverfehler. Bitte versuche es später erneut.";
    }

    return { hasError: true, errorMessage: friendlyMessage };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console for debugging — in production this could go to a monitoring service
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-5 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 mx-auto">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-foreground">
                Etwas ist schiefgelaufen
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {this.state.errorMessage}
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Erneut versuchen
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                Seite neu laden
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

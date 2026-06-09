import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary — catches unhandled render errors and shows a
 * user-friendly fallback UI with a reload button instead of a blank screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Unhandled render error:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-5 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 mx-auto">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-lg font-bold text-foreground">
                Etwas ist schief gelaufen
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu
                oder versuche es später erneut.
              </p>
            </div>

            {this.state.error && (
              <details className="text-left rounded-lg border bg-muted/40 px-3 py-2">
                <summary className="text-xs font-semibold text-muted-foreground cursor-pointer select-none">
                  Technische Details
                </summary>
                <pre className="mt-2 text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                Erneut versuchen
              </Button>
              <Button size="sm" onClick={this.handleReload} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
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

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Seite nicht gefunden</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Die angeforderte Seite existiert nicht oder wurde verschoben.
          </p>
          <Link href="/">
            <a>
              <Button className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Zurück zur Startseite
              </Button>
            </a>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatBriefing, copyToClipboard } from "@/lib/briefingHelpers";
import { Sparkles, Copy, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BriefingResponse {
  briefing: string;
  generatedAt: string;
}

interface BriefingCardProps {
  type: "daily" | "weekly";
  title: string;
  description?: string;
}

export function BriefingCard({ type, title, description }: BriefingCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const queryKey = [`/api/briefing/${type}`];

  const { data, isLoading, error } = useQuery<BriefingResponse>({
    queryKey,
    enabled: false, // Only load on demand
    staleTime: 5 * 60 * 1000,
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await apiRequest("GET", `/api/briefing/${type}`);
      const json = await res.json();
      queryClient.setQueryData(queryKey, json);
    } catch (err: any) {
      toast({
        title: "Fehler beim Generieren",
        description: err.message || "Bitte OpenAI API Key prüfen",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!data?.briefing) return;
    const ok = await copyToClipboard(data.briefing);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Briefing kopiert" });
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#0052CC] to-[#FFD100]" />
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0052CC]" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {data && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
                title="Kopieren"
              >
                {copied ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleGenerate}
              disabled={isGenerating}
              title="Neu generieren"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading || isGenerating ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">
            Fehler: {(error as any).message}
          </div>
        ) : data ? (
          <div className="space-y-1">
            <div
              className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: formatBriefing(data.briefing) }}
            />
            {data.generatedAt && (
              <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t border-border">
                Generiert: {new Date(data.generatedAt).toLocaleString("de-DE", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground font-medium">
              {type === "daily" ? "Tägliches KI-Briefing" : "Wöchentliche Zusammenfassung"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Klicke auf Generieren für ein personalisiertes Briefing
            </p>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {type === "daily" ? "Briefing generieren" : "Zusammenfassung generieren"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

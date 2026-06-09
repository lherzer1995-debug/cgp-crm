import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, API_BASE } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Download, Upload, Search, GitMerge, FileText, CheckCircle2, AlertCircle,
  Loader2, RefreshCw, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer } from "@shared/schema";

interface ImportResult {
  imported: number;
  duplicates: number;
  errors: number;
  results: { row: number; status: "imported" | "duplicate" | "error"; message?: string; data?: Customer }[];
}

interface DuplicateGroup {
  type: "email" | "phone" | "company_name";
  customers: Customer[];
}

interface DuplicatesResponse {
  duplicates: DuplicateGroup[];
  total: number;
}

const TYPE_LABEL: Record<string, string> = {
  email: "Gleiche E-Mail",
  phone: "Gleiches Telefon",
  company_name: "Ähnlicher Firmenname",
};

const STATUS_LABEL: Record<string, string> = {
  lead: "Lead", prospect: "Prospect", active: "Aktiv", churned: "Abgewandert",
};
const STATUS_CLASS: Record<string, string> = {
  lead: "badge-lead", prospect: "badge-prospect", active: "badge-active", churned: "badge-churned",
};

export default function DataManagementPage() {
  const { toast } = useToast();
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{ headers: string[]; previewRows: string[][]; totalRows: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[] | null>(null);
  const [dupLoading, setDupLoading] = useState(false);
  const [mergeDialog, setMergeDialog] = useState<{ keepId: number; mergeId: number; keepName: string; mergeName: string } | null>(null);

  // CSV Export
  const handleExport = (withActivities: boolean) => {
    const url = `${API_BASE}/api/export/csv${withActivities ? "?activities=true" : ""}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `kunden-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // CSV Preview
  const handlePreview = async (file: File) => {
    setPreviewLoading(true);
    setPreviewData(null);
    setPendingFile(file);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/import/csv/preview`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Vorschau fehlgeschlagen");
      setPreviewData(data);
    } catch (err: any) {
      toast({ title: "Vorschau fehlgeschlagen", description: err.message, variant: "destructive" });
      setPendingFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // CSV Import
  const handleImport = async (file: File) => {
    setImportLoading(true);
    setImportResult(null);
    setPreviewData(null);
    setPendingFile(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/import/csv`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Import fehlgeschlagen");
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: `Import abgeschlossen`,
        description: `${data.imported} importiert · ${data.duplicates} Duplikate · ${data.errors} Fehler`,
      });
    } catch (err: any) {
      toast({ title: "Import fehlgeschlagen", description: err.message, variant: "destructive" });
    } finally {
      setImportLoading(false);
    }
  };

  // Duplicate Check
  const handleDupCheck = async () => {
    setDupLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/duplicates/check`, { method: "POST" });
      const data: DuplicatesResponse = await res.json();
      setDuplicates(data.duplicates);
      if (data.total === 0) {
        toast({ title: "Keine Duplikate gefunden ✓", description: "Alle Kunden sind eindeutig." });
      }
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setDupLoading(false);
    }
  };

  // Merge
  const mergeMutation = useMutation({
    mutationFn: ({ keepId, mergeId }: { keepId: number; mergeId: number }) =>
      apiRequest("POST", "/api/duplicates/merge", { keepId, mergeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setMergeDialog(null);
      setDuplicates(null);
      toast({ title: "Kunden zusammengeführt ✓", description: "Aktivitäten und Notizen wurden übertragen." });
    },
    onError: (err: any) => {
      toast({ title: "Fehler beim Zusammenführen", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-1 h-10 rounded-full bg-[#FFD100] shrink-0 mt-0.5" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Daten-Management</h1>
          <p className="text-sm text-muted-foreground">CSV-Import/Export und Duplikat-Erkennung</p>
        </div>
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            CSV-Export
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Exportiere alle Kunden als CSV-Datei. Die Datei ist Excel-kompatibel (UTF-8 mit BOM).
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="gap-2 min-h-[44px]"
              onClick={() => handleExport(false)}
            >
              <Download className="w-4 h-4" />
              Kunden exportieren
            </Button>
            <Button
              variant="outline"
              className="gap-2 min-h-[44px]"
              onClick={() => handleExport(true)}
            >
              <Download className="w-4 h-4" />
              Mit letzter Aktivität
            </Button>
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
            <strong>Felder:</strong> ID, Firmenname, Ansprechpartner, E-Mail, Telefon, Stadt, Land, Branche, Status, Volumen, Erstellt
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            CSV-Import
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Importiere Kunden aus einer CSV-Datei. Duplikate (gleiche E-Mail oder Telefon) werden automatisch erkannt und übersprungen.
          </p>

          <div className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground space-y-1">
            <p><strong>Erwartete Spalten:</strong></p>
            <p className="font-mono">company_name, contact_name, email, phone, city, country, industry, status</p>
            <p className="mt-1">Status-Werte: <code>lead</code>, <code>prospect</code>, <code>active</code>, <code>churned</code></p>
          </div>

          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePreview(file);
              // Reset input so same file can be re-selected
              e.target.value = "";
            }}
          />
          <Button
            className="gap-2 min-h-[44px]"
            onClick={() => csvInputRef.current?.click()}
            disabled={importLoading || previewLoading}
          >
            {previewLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Lade Vorschau…</>
            ) : importLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Importiere…</>
            ) : (
              <><Upload className="w-4 h-4" /> CSV-Datei wählen</>
            )}
          </Button>

          {/* Preview */}
          {previewData && (
            <div className="space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    Vorschau: {previewData.totalRows} Zeilen erkannt
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setPreviewData(null); setPendingFile(null); }}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => pendingFile && handleImport(pendingFile)}
                    disabled={importLoading}
                  >
                    {importLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Importieren"}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      {previewData.headers.map((h, i) => (
                        <th key={i} className="text-left px-3 py-2 font-bold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.previewRows.map((row, ri) => (
                      <tr key={ri} className="border-b border-border/50 hover:bg-muted/30">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 text-foreground max-w-[150px] truncate">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.totalRows > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  Zeige 5 von {previewData.totalRows} Zeilen
                </p>
              )}
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-3 mt-2">
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {importResult.imported} importiert
                </div>
                {importResult.duplicates > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {importResult.duplicates} Duplikate
                  </div>
                )}
                {importResult.errors > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {importResult.errors} Fehler
                  </div>
                )}
              </div>

              {/* Error/Duplicate details */}
              {importResult.results.filter((r) => r.status !== "imported").length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/30 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Details
                  </div>
                  <div className="divide-y divide-border max-h-48 overflow-y-auto">
                    {importResult.results
                      .filter((r) => r.status !== "imported")
                      .map((r) => (
                        <div key={r.row} className="flex items-center gap-3 px-3 py-2">
                          <span className="text-[11px] text-muted-foreground shrink-0">Zeile {r.row}</span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] border-0 shrink-0",
                              r.status === "duplicate" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            )}
                          >
                            {r.status === "duplicate" ? "Duplikat" : "Fehler"}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">{r.message}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Duplicate Detection */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Duplikat-Erkennung
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Suche nach doppelten Kunden anhand von E-Mail, Telefon oder ähnlichem Firmennamen.
          </p>
          <Button
            variant="outline"
            className="gap-2 min-h-[44px]"
            onClick={handleDupCheck}
            disabled={dupLoading}
          >
            {dupLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Suche läuft…</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Duplikate suchen</>
            )}
          </Button>

          {duplicates !== null && (
            <div className="space-y-3 mt-2">
              {duplicates.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-800/40">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">Keine Duplikate gefunden</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-foreground">{duplicates.length} Duplikat-Gruppe{duplicates.length !== 1 ? "n" : ""} gefunden</p>
                  <div className="space-y-3">
                    {duplicates.map((group, gi) => (
                      <div key={gi} className="rounded-lg border border-border overflow-hidden">
                        <div className="bg-amber-50 dark:bg-amber-950/20 px-3 py-2 flex items-center gap-2 border-b border-border">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                            {TYPE_LABEL[group.type] ?? group.type}
                          </span>
                        </div>
                        <div className="divide-y divide-border">
                          {group.customers.map((c) => (
                            <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">{c.companyName.charAt(0)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{c.companyName}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {c.contactName}{c.email ? ` · ${c.email}` : ""}{c.phone ? ` · ${c.phone}` : ""}
                                </p>
                              </div>
                              <Badge variant="secondary" className={cn("text-[10px] border-0 shrink-0", STATUS_CLASS[c.status])}>
                                {STATUS_LABEL[c.status]}
                              </Badge>
                            </div>
                          ))}
                        </div>
                        {group.customers.length === 2 && (
                          <div className="px-3 py-2 bg-muted/30 border-t border-border flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs min-h-[36px]"
                              onClick={() => setMergeDialog({
                                keepId: group.customers[0].id,
                                mergeId: group.customers[1].id,
                                keepName: group.customers[0].companyName,
                                mergeName: group.customers[1].companyName,
                              })}
                            >
                              <GitMerge className="w-3.5 h-3.5" />
                              Zusammenführen (behalte {group.customers[0].companyName})
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Merge Confirmation Dialog */}
      <AlertDialog open={!!mergeDialog} onOpenChange={() => setMergeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunden zusammenführen?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{mergeDialog?.mergeName}</strong> wird mit <strong>{mergeDialog?.keepName}</strong> zusammengeführt.
              Alle Aktivitäten und Notizen von <strong>{mergeDialog?.mergeName}</strong> werden übertragen.
              <strong>{mergeDialog?.mergeName}</strong> wird danach gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => mergeDialog && mergeMutation.mutate({ keepId: mergeDialog.keepId, mergeId: mergeDialog.mergeId })}
              className="bg-destructive hover:bg-destructive/90"
            >
              {mergeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Zusammenführen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

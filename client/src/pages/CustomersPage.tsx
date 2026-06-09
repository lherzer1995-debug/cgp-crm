import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest, API_BASE } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, ExternalLink, Euro, Users, Building2, Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer, InsertCustomer } from "@shared/schema";

const INDUSTRIES = [
  "Einzelhandel", "Gastronomie", "E-Commerce", "Dienstleistung",
  "Handwerk", "Hotel & Tourismus", "Gesundheit", "Industrie", "Sonstiges",
];
const PAYMENT_METHODS: Record<string, string> = {
  card: "Kartenzahlung", sepa: "SEPA-Lastschrift", instant: "Echtzeit-Überweisung",
};

// Produkte von commerz-globalpay.com
const GLOBALPAY_PRODUCTS = [
  "EC-Terminal (stationär)",
  "EC-Terminal (portabel)",
  "EC-Terminal (mobil)",
  "Tap to Pay auf dem iPhone",
  "E-Commerce Zahlungslösung",
  "Payment-Check / Beratung",
  "Partnerprogramm",
];

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full bg-[#FFD100]" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 pl-3">
        {children}
      </div>
    </div>
  );
}

function ContractUploadBanner({
  onExtracted,
}: {
  onExtracted: (data: Partial<InsertCustomer>) => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fileName, setFileName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setStatus("loading");
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/analyze-contract`, { method: "POST", body: formData });
      const rawText = await res.text();
      let json: any;
      try {
        json = JSON.parse(rawText);
      } catch {
        throw new Error(
          res.ok
            ? "Ungültige Serverantwort (kein JSON). Bitte Vorschau-Version nutzen."
            : `Serverfehler ${res.status}: Bitte Vorschau-Version für die KI-Analyse nutzen.`
        );
      }
      if (!res.ok) throw new Error(json.message || "Analysefehler");
      onExtracted(json.data);
      setStatus("success");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e.message || "Unbekannter Fehler");
    }
  };

  return (
    <div className={cn(
      "rounded-xl border-2 border-dashed p-4 mb-2 transition-colors",
      status === "success" ? "border-green-400 bg-green-50 dark:bg-green-950/20" :
      status === "error" ? "border-destructive bg-destructive/5" :
      "border-[#FFD100] bg-[#FFD100]/5 hover:bg-[#FFD100]/10"
    )}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        data-testid="input-contract-upload"
      />
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          status === "success" ? "bg-green-100 dark:bg-green-900" :
          status === "error" ? "bg-destructive/10" :
          "bg-[#FFD100]/20"
        )}>
          {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin text-[#0052CC]" /> :
           status === "success" ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
           status === "error" ? <AlertCircle className="w-5 h-5 text-destructive" /> :
           <FileText className="w-5 h-5 text-[#0052CC]" />}
        </div>
        <div className="flex-1 min-w-0">
          {status === "idle" && (
            <>
              <p className="text-sm font-semibold text-foreground">Vertrag hochladen & KI-Analyse</p>
              <p className="text-[11px] text-muted-foreground">PDF oder Word-Datei — alle Felder werden automatisch ausgefüllt</p>
            </>
          )}
          {status === "loading" && (
            <>
              <p className="text-sm font-semibold text-foreground">KI analysiert Vertrag…</p>
              <p className="text-[11px] text-muted-foreground truncate">{fileName}</p>
            </>
          )}
          {status === "success" && (
            <>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">Felder erfolgreich befüllt</p>
              <p className="text-[11px] text-muted-foreground truncate">{fileName} — bitte prüfen und ggf. anpassen</p>
            </>
          )}
          {status === "error" && (
            <>
              <p className="text-sm font-semibold text-destructive">Analyse fehlgeschlagen</p>
              <p className="text-[11px] text-destructive/80 truncate">{errorMsg}</p>
            </>
          )}
        </div>
        <Button
          type="button"
          variant={status === "success" ? "outline" : "default"}
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={status === "loading"}
          className="shrink-0 gap-1.5"
          data-testid="button-upload-contract"
        >
          <Upload className="w-3.5 h-3.5" />
          {status === "success" ? "Neu laden" : "Vertrag wählen"}
        </Button>
      </div>
    </div>
  );
}

function CustomerForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: Partial<Customer>;
  onSave: (data: Partial<InsertCustomer>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Partial<InsertCustomer>>({
    companyName: initial?.companyName ?? "",
    contactName: initial?.contactName ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    city: initial?.city ?? "",
    country: initial?.country ?? "Deutschland",
    industry: initial?.industry ?? "",
    paymentVolume: initial?.paymentVolume ?? undefined,
    paymentMethod: initial?.paymentMethod ?? "",
    bankName: initial?.bankName ?? "",
    iban: initial?.iban ?? "",
    commerzAccountManager: "Lars Herzer",
    girocardDisagio: initial?.girocardDisagio ?? undefined,
    girocardInterchange: initial?.girocardInterchange ?? undefined,
    girocardSchemeFee: initial?.girocardSchemeFee ?? undefined,
    girocardAcquirer: initial?.girocardAcquirer ?? undefined,
    creditcardDisagio: initial?.creditcardDisagio ?? undefined,
    creditcardInterchange: initial?.creditcardInterchange ?? undefined,
    creditcardSchemeFee: initial?.creditcardSchemeFee ?? undefined,
    creditcardAcquirer: initial?.creditcardAcquirer ?? undefined,
    selectedProduct: initial?.selectedProduct ?? "",
    contractStart: initial?.contractStart ?? "",
    contractEnd: initial?.contractEnd ?? "",
  });

  const [laufzeit, setLaufzeit] = useState<string>("");

  // Auto-Berechnung Vertragsende wenn Beginn + Laufzeit gesetzt
  const handleLaufzeitChange = (monate: string) => {
    setLaufzeit(monate);
    if (form.contractStart && monate) {
      const start = new Date(form.contractStart);
      const end = new Date(start);
      end.setMonth(end.getMonth() + parseInt(monate));
      // Auf letzten Tag des Vormonats (Vertragsende = Tag vor Ablauf)
      const yyyy = end.getFullYear();
      const mm = String(end.getMonth() + 1).padStart(2, "0");
      const dd = String(end.getDate()).padStart(2, "0");
      set("contractEnd", `${yyyy}-${mm}-${dd}`);
    }
  };

  const handleStartChange = (dateStr: string) => {
    set("contractStart", dateStr);
    if (dateStr && laufzeit) {
      const start = new Date(dateStr);
      const end = new Date(start);
      end.setMonth(end.getMonth() + parseInt(laufzeit));
      const yyyy = end.getFullYear();
      const mm = String(end.getMonth() + 1).padStart(2, "0");
      const dd = String(end.getDate()).padStart(2, "0");
      set("contractEnd", `${yyyy}-${mm}-${dd}`);
    }
  };

  // Auto-Berechnung: Acquirer-Marge = Disagio - Interchange - SchemeFee
  const gcAcquirer = form.girocardDisagio != null && form.girocardInterchange != null && form.girocardSchemeFee != null
    ? Math.max(0, form.girocardDisagio - form.girocardInterchange - form.girocardSchemeFee)
    : undefined;
  const ccAcquirer = form.creditcardDisagio != null && form.creditcardInterchange != null && form.creditcardSchemeFee != null
    ? Math.max(0, form.creditcardDisagio - form.creditcardInterchange - form.creditcardSchemeFee)
    : undefined;

  const set = (k: keyof InsertCustomer, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const applyExtracted = (data: Partial<InsertCustomer>) => {
    setForm((f) => ({
      ...f,
      ...data,
      commerzAccountManager: "Lars Herzer", // always locked
    }));
    // If contractStart + contractEnd both extracted, also set laufzeit hint
    if (data.contractStart && data.contractEnd) {
      const start = new Date(data.contractStart as string);
      const end = new Date(data.contractEnd as string);
      const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      const snap = [12, 24, 36, 48, 60].reduce((a, b) => Math.abs(b - months) < Math.abs(a - months) ? b : a);
      setLaufzeit(String(snap));
    }
  };

  return (
    <div className="space-y-6 pt-2 pb-1">
      {/* KI-Upload Banner */}
      <ContractUploadBanner onExtracted={applyExtracted} />

      {/* Stammdaten */}
      <FieldGroup label="Stammdaten">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="f-company">Firmenname <span className="text-destructive">*</span></Label>
          <Input id="f-company" value={form.companyName} onChange={(e) => set("companyName", e.target.value)}
            placeholder="Mustermann GmbH" data-testid="input-company-name" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="f-contact">Ansprechpartner <span className="text-destructive">*</span></Label>
          <Input id="f-contact" value={form.contactName} onChange={(e) => set("contactName", e.target.value)}
            placeholder="Max Mustermann" data-testid="input-contact-name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-email">E-Mail</Label>
          <Input id="f-email" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)}
            placeholder="max@firma.de" data-testid="input-email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-phone">Telefon</Label>
          <Input id="f-phone" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)}
            placeholder="+49 69 123456" data-testid="input-phone" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-city">Stadt</Label>
          <Input id="f-city" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)}
            placeholder="Frankfurt" data-testid="input-city" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-country">Land</Label>
          <Input id="f-country" value={form.country ?? ""} onChange={(e) => set("country", e.target.value)}
            placeholder="Deutschland" data-testid="input-country" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Branche</Label>
          <Select value={form.industry ?? ""} onValueChange={(v) => set("industry", v)}>
            <SelectTrigger data-testid="select-industry"><SelectValue placeholder="Wählen…" /></SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </FieldGroup>

      {/* Allgemeine Zahlungsinfos */}
      <FieldGroup label="Zahlungsinformationen (Commerzbank)">
        <div className="space-y-1.5">
          <Label htmlFor="f-vol">Monatl. Umsatzvolumen (€)</Label>
          <Input id="f-vol" type="number" value={form.paymentVolume ?? ""}
            onChange={(e) => set("paymentVolume", parseFloat(e.target.value) || undefined)}
            placeholder="50 000" data-testid="input-payment-volume" />
        </div>
        <div className="space-y-1.5">
          <Label>Abrechnungsmodell</Label>
          <Select value={form.paymentMethod ?? ""} onValueChange={(v) => set("paymentMethod", v)}>
            <SelectTrigger data-testid="select-payment-method"><SelectValue placeholder="Wählen…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="disagio">Disagio (Blended)</SelectItem>
              <SelectItem value="interchange_plus">Interchange++ (transparent)</SelectItem>
              <SelectItem value="flat">Flatrate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-bank">Hausbank des Kunden</Label>
          <Input id="f-bank" value={form.bankName ?? ""} onChange={(e) => set("bankName", e.target.value)}
            placeholder="Commerzbank AG" data-testid="input-bank-name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-iban">IBAN</Label>
          <Input id="f-iban" value={form.iban ?? ""} onChange={(e) => set("iban", e.target.value)}
            placeholder="DE89 3704 0044…" data-testid="input-iban" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Gewähltes Produkt (Commerz Globalpay)</Label>
          <Select value={form.selectedProduct ?? ""} onValueChange={(v) => set("selectedProduct", v)}>
            <SelectTrigger data-testid="select-product"><SelectValue placeholder="Produkt wählen…" /></SelectTrigger>
            <SelectContent>
              {GLOBALPAY_PRODUCTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="f-manager">Berater</Label>
          <div className="relative">
            <Input id="f-manager" value="Lars Herzer" readOnly
              className="bg-muted text-muted-foreground cursor-not-allowed pr-24"
              data-testid="input-account-manager" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded-full">Festgelegt</span>
          </div>
        </div>
      </FieldGroup>

      {/* Girocard Disagio */}
      <FieldGroup label="🟦 Girocard — Disagio-Struktur">
        <div className="col-span-2">
          <div className="text-[11px] text-muted-foreground bg-secondary/60 rounded-md px-3 py-2 mb-2">
            <strong>Disagio</strong> = Interchange (an Hausbank) + Scheme Fee (an DK-Netz) + Acquirer-Marge (an Commerz Globalpay).
            EU-Regulierung: Interchange Girocard max. <strong>0,20 %</strong>.
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-gc-disagio">Gesamt-Disagio (%)</Label>
          <Input id="f-gc-disagio" type="number" step="0.01" min={0}
            value={form.girocardDisagio ?? ""}
            onChange={(e) => set("girocardDisagio", parseFloat(e.target.value) || undefined)}
            placeholder="z.B. 0.29" data-testid="input-gc-disagio" />
          <p className="text-[10px] text-muted-foreground">Gesamtgebühr die der Händler zahlt</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-gc-ic">davon: Interchange (%)</Label>
          <Input id="f-gc-ic" type="number" step="0.01" min={0} max={0.2}
            value={form.girocardInterchange ?? ""}
            onChange={(e) => set("girocardInterchange", parseFloat(e.target.value) || undefined)}
            placeholder="max. 0.20" data-testid="input-gc-interchange" />
          <p className="text-[10px] text-muted-foreground">Geht an die Hausbank des Kunden</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-gc-sf">davon: Scheme Fee (%)</Label>
          <Input id="f-gc-sf" type="number" step="0.01" min={0}
            value={form.girocardSchemeFee ?? ""}
            onChange={(e) => set("girocardSchemeFee", parseFloat(e.target.value) || undefined)}
            placeholder="z.B. 0.05" data-testid="input-gc-scheme" />
          <p className="text-[10px] text-muted-foreground">Geht ans DK-Kartennetz (girocard)</p>
        </div>
        <div className="space-y-1.5">
          <Label>davon: Acquirer-Marge CGP (%)</Label>
          <div className={cn(
            "flex items-center h-10 px-3 rounded-md border text-sm font-semibold",
            gcAcquirer != null ? "bg-primary/5 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground"
          )}>
            {gcAcquirer != null ? `${gcAcquirer.toFixed(3)} %` : "Auto-Berechnung"}
          </div>
          <p className="text-[10px] text-muted-foreground">= Disagio - Interchange - Scheme Fee</p>
        </div>
      </FieldGroup>

      {/* Kreditkarte Disagio */}
      <FieldGroup label="🟨 Kreditkarte (Visa / Mastercard) — Disagio-Struktur">
        <div className="col-span-2">
          <div className="text-[11px] text-muted-foreground bg-secondary/60 rounded-md px-3 py-2 mb-2">
            <strong>Disagio</strong> = Interchange (an kartenausgebende Bank) + Scheme Fee (an Visa/MC) + Acquirer-Marge (an Commerz Globalpay).
            EU-Regulierung: Interchange Kreditkarte max. <strong>0,30 %</strong>.
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-cc-disagio">Gesamt-Disagio (%)</Label>
          <Input id="f-cc-disagio" type="number" step="0.01" min={0}
            value={form.creditcardDisagio ?? ""}
            onChange={(e) => set("creditcardDisagio", parseFloat(e.target.value) || undefined)}
            placeholder="z.B. 0.50" data-testid="input-cc-disagio" />
          <p className="text-[10px] text-muted-foreground">Gesamtgebühr die der Händler zahlt</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-cc-ic">davon: Interchange (%)</Label>
          <Input id="f-cc-ic" type="number" step="0.01" min={0} max={0.3}
            value={form.creditcardInterchange ?? ""}
            onChange={(e) => set("creditcardInterchange", parseFloat(e.target.value) || undefined)}
            placeholder="max. 0.30" data-testid="input-cc-interchange" />
          <p className="text-[10px] text-muted-foreground">Geht an die kartenausgebende Bank</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-cc-sf">davon: Scheme Fee (%)</Label>
          <Input id="f-cc-sf" type="number" step="0.01" min={0}
            value={form.creditcardSchemeFee ?? ""}
            onChange={(e) => set("creditcardSchemeFee", parseFloat(e.target.value) || undefined)}
            placeholder="z.B. 0.10" data-testid="input-cc-scheme" />
          <p className="text-[10px] text-muted-foreground">Geht an Visa / Mastercard</p>
        </div>
        <div className="space-y-1.5">
          <Label>davon: Acquirer-Marge CGP (%)</Label>
          <div className={cn(
            "flex items-center h-10 px-3 rounded-md border text-sm font-semibold",
            ccAcquirer != null ? "bg-primary/5 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground"
          )}>
            {ccAcquirer != null ? `${ccAcquirer.toFixed(3)} %` : "Auto-Berechnung"}
          </div>
          <p className="text-[10px] text-muted-foreground">= Disagio - Interchange - Scheme Fee</p>
        </div>
      </FieldGroup>

      {/* Vertragslaufzeit */}
      <FieldGroup label="Vertragslaufzeit">
        <div className="space-y-1.5">
          <Label htmlFor="f-start">Vertragsbeginn</Label>
          <Input id="f-start" type="date" value={form.contractStart ?? ""}
            onChange={(e) => handleStartChange(e.target.value)} data-testid="input-contract-start" />
        </div>
        <div className="space-y-1.5">
          <Label>Laufzeit</Label>
          <Select value={laufzeit} onValueChange={handleLaufzeitChange}>
            <SelectTrigger data-testid="select-laufzeit"><SelectValue placeholder="Laufzeit wählen…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 Monate (1 Jahr)</SelectItem>
              <SelectItem value="24">24 Monate (2 Jahre)</SelectItem>
              <SelectItem value="36">36 Monate (3 Jahre)</SelectItem>
              <SelectItem value="48">48 Monate (4 Jahre)</SelectItem>
              <SelectItem value="60">60 Monate (5 Jahre)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="f-end">Vertragsende <span className="text-[10px] text-muted-foreground font-normal">(wird automatisch berechnet)</span></Label>
          <Input id="f-end" type="date" value={form.contractEnd ?? ""}
            onChange={(e) => set("contractEnd", e.target.value)} data-testid="input-contract-end" />
          {form.contractEnd && (
            <p className="text-[11px] text-primary font-medium">
              Vertragsende: {new Date(form.contractEnd).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      </FieldGroup>

      <div className="flex gap-3 justify-end pt-2 border-t border-border">
        <Button variant="outline" onClick={onCancel} disabled={saving} data-testid="button-cancel-customer">
          Abbrechen
        </Button>
        <Button onClick={() => onSave({ ...form, girocardAcquirer: gcAcquirer, creditcardAcquirer: ccAcquirer })} disabled={saving} data-testid="button-save-customer">
          {saving ? "Speichern…" : "Speichern"}
        </Button>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<InsertCustomer>) => apiRequest("POST", "/api/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDialogOpen(false);
      toast({ title: "Kunde erstellt" });
    },
    onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertCustomer> }) =>
      apiRequest("PATCH", `/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: "Kunde aktualisiert" });
    },
    onError: () => toast({ title: "Fehler beim Aktualisieren", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDeleteId(null);
      toast({ title: "Kunde gelöscht" });
    },
  });

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q) ||
      (c.city ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  const handleSave = (data: Partial<InsertCustomer>) => {
    if (!data.companyName?.trim() || !data.contactName?.trim()) {
      toast({ title: "Pflichtfelder fehlen", description: "Firmenname und Ansprechpartner sind erforderlich.", variant: "destructive" });
      return;
    }
    editing ? updateMutation.mutate({ id: editing.id, data }) : createMutation.mutate(data);
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-1 h-10 rounded-full bg-[#FFD100] shrink-0 mt-0.5" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Kunden</h1>
            <p className="text-sm text-muted-foreground">{customers.length} Einträge gesamt</p>
          </div>
        </div>
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          data-testid="button-add-customer"
          className="gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Neuer Kunde
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Firma, Kontakt, Stadt oder E-Mail suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Keine Kunden gefunden</p>
              {search && <p className="text-xs mt-1">Suche anpassen oder neuen Kunden anlegen</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {["Firma", "Kontakt", "Stadt", "Volumen / Mon.", ""].map((h) => (
                      <th
                        key={h}
                        className={cn(
                          "text-left px-4 py-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide",
                          h === "Stadt" && "hidden lg:table-cell",
                          h === "Volumen / Mon." && "hidden lg:table-cell",
                          h === "Kontakt" && "hidden md:table-cell",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors"
                      data-testid={`row-customer-${c.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm bg-primary/10 text-primary">
                            {c.companyName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate max-w-[180px]">{c.companyName}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{c.selectedProduct || c.contactName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-foreground">{c.contactName}</p>
                        {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {c.city || "—"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {c.paymentVolume ? (
                          <span className="font-semibold text-foreground">
                            € {c.paymentVolume.toLocaleString("de-DE")}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Link href={`/customers/${c.id}`}>
                            <a>
                              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-view-${c.id}`}>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                            </a>
                          </Link>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => { setEditing(c); setDialogOpen(true); }}
                            data-testid={`button-edit-${c.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(c.id)}
                            data-testid={`button-delete-${c.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editing ? "Kunde bearbeiten" : "Neuen Kunden anlegen"}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm
            initial={editing ?? undefined}
            onSave={handleSave}
            onCancel={() => { setDialogOpen(false); setEditing(null); }}
            saving={saving}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunde wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle Notizen und Aktivitäten dieses Kunden werden ebenfalls unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

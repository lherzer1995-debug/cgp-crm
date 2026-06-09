import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, API_BASE } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, Euro, CreditCard,
  Plus, Trash2, CheckSquare, Calendar, FileText, Loader2, Sparkles, CalendarCheck,
  TrendingUp, Copy, RefreshCw, Settings2, AlertTriangle, CheckCircle2, Clock, Bell, Check,
  Monitor, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer, Note, Activity, InsertNote, InsertActivity, NoteTemplate, Commission, Reminder } from "@shared/schema";
import NoteEditor from "@/components/NoteEditor";
import CommissionDialog from "@/components/CommissionDialog";
import ReminderDialog from "@/components/ReminderDialog";
import TerminalDialog from "@/components/TerminalDialog";
import ContractCard from "@/components/ContractCard";
import {
  parseTerminals, terminalStatusLabel, terminalStatusClass,
  calculateContractEnd, calculateCancellationDeadline, getDaysUntilEnd,
} from "@/lib/contractHelpers";
import type { Terminal } from "@/lib/contractHelpers";

const NOTE_TYPES: Record<string, string> = {
  note: "Notiz", call: "Anruf", meeting: "Meeting", email: "E-Mail",
};
const ACT_TYPES: Record<string, string> = {
  call: "Anruf", follow_up: "Follow-up", meeting: "Meeting", email: "E-Mail", renewal: "Verlängerung",
};
const ACT_CLASS: Record<string, string> = {
  call: "act-call", follow_up: "act-follow_up",
  meeting: "text-indigo-600 dark:text-indigo-400", email: "text-cyan-600 dark:text-cyan-400",
  renewal: "text-amber-600 dark:text-amber-400",
};

function InfoRow({ icon: Icon, label, value, href }: { icon: any; label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-primary font-medium hover:underline">{value}</a>
        ) : (
          <p className="text-sm text-foreground font-medium">{value}</p>
        )}
      </div>
    </div>
  );
}

/** Returns days until a date (negative = past) */
function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const custId = Number(id);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"notes" | "activities">("notes");
  const [noteDialog, setNoteDialog] = useState(false);
  const [actDialog, setActDialog] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);
  const [deleteActId, setDeleteActId] = useState<number | null>(null);
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [editReminder, setEditReminder] = useState<Reminder | null>(null);
  const [deleteReminderId, setDeleteReminderId] = useState<number | null>(null);

  // Provisions-Einstellungen
  const [provForm, setProvForm] = useState({ defaultDisagio: "", defaultVolume: "" });
  const [provSaving, setProvSaving] = useState(false);
  const [provInitialized, setProvInitialized] = useState(false);

  // Vertrag
  const [contractForm, setContractForm] = useState({
    contractEnd: "",
    contractProduct: "",
    contractStart: "",
    contractTermMonths: "",
    cancellationNoticeDays: "",
  });
  const [contractSaving, setContractSaving] = useState(false);
  const [contractInitialized, setContractInitialized] = useState(false);

  // Terminals
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [terminalDialogOpen, setTerminalDialogOpen] = useState(false);
  const [editTerminalIndex, setEditTerminalIndex] = useState<number | null>(null);
  const [terminalsSaving, setTerminalsSaving] = useState(false);

  // KI-Zusammenfassung
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [copied, setCopied] = useState(false);

  // Forms
  const [noteForm, setNoteForm] = useState<Partial<InsertNote>>({ title: "", content: "", type: "note" });
  const [actForm, setActForm] = useState<Partial<InsertActivity>>({ type: "call", description: "", dueDate: "", done: false });
  const [rawDateText, setRawDateText] = useState("");
  const [parsedDate, setParsedDate] = useState<{ display: string; iso: string; isoEnd: string; hasTime: boolean } | null>(null);
  const [parseDateLoading, setParseDateLoading] = useState(false);
  const [parseDateError, setParseDateError] = useState("");

  // Queries
  const { data: customer, isLoading: cLoad } = useQuery<Customer>({
    queryKey: ["/api/customers", custId],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/customers/${custId}`);
      return r.json();
    },
  });
  const { data: notes = [], isLoading: nLoad } = useQuery<Note[]>({
    queryKey: ["/api/customers", custId, "notes"],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/customers/${custId}/notes`);
      return r.json();
    },
  });
  const { data: templates = [] } = useQuery<NoteTemplate[]>({
    queryKey: ["/api/note-templates"],
  });
  const { data: activities = [], isLoading: aLoad } = useQuery<Activity[]>({
    queryKey: ["/api/customers", custId, "activities"],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/customers/${custId}/activities`);
      return r.json();
    },
  });
  const { data: commissionsData } = useQuery<{ commissions: Commission[]; total: number }>({
    queryKey: ["/api/customers", custId, "commissions"],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/customers/${custId}/commissions`);
      return r.json();
    },
  });
  const customerCommissions = commissionsData?.commissions ?? [];
  const customerCommissionsTotal = commissionsData?.total ?? 0;

  const { data: customerReminders = [] } = useQuery<Reminder[]>({
    queryKey: ["/api/customers", custId, "reminders"],
    queryFn: async () => {
      const r = await apiRequest("GET", `/api/customers/${custId}/reminders`);
      return r.json();
    },
  });

  // Initialize local forms once customer data arrives
  if (customer && !provInitialized) {
    setProvInitialized(true);
    setProvForm({
      defaultDisagio: customer.defaultDisagio != null ? String(customer.defaultDisagio) : "",
      defaultVolume: customer.defaultVolume != null ? String(customer.defaultVolume) : "",
    });
  }
  if (customer && !contractInitialized) {
    setContractInitialized(true);
    setContractForm({
      contractEnd: customer.contractEnd ?? "",
      contractProduct: customer.contractProduct ?? "",
      contractStart: customer.contractStart ?? "",
      contractTermMonths: customer.contractTermMonths != null ? String(customer.contractTermMonths) : "",
      cancellationNoticeDays: customer.cancellationNoticeDays != null ? String(customer.cancellationNoticeDays) : "",
    });
    setTerminals(parseTerminals(customer.terminals));
  }

  // Mutations — Notes
  const createNote = useMutation({
    mutationFn: (d: Partial<InsertNote>) => apiRequest("POST", `/api/customers/${custId}/notes`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", custId, "notes"] });
      setNoteDialog(false);
      setNoteForm({ title: "", content: "", type: "note" });
      toast({ title: "Notiz gespeichert" });
    },
  });
  const deleteNote = useMutation({
    mutationFn: (nid: number) => apiRequest("DELETE", `/api/notes/${nid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", custId, "notes"] });
      setDeleteNoteId(null);
    },
  });

  // Mutations — Activities
  const createActivity = useMutation({
    mutationFn: (d: Partial<InsertActivity>) => apiRequest("POST", `/api/customers/${custId}/activities`, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", custId, "activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setActDialog(false);
      setActForm({ type: "call", description: "", dueDate: "", done: false });
      setRawDateText("");
      setParsedDate(null);
      setParseDateError("");
      toast({ title: "Aktivität erstellt", description: parsedDate ? "→ Wird in Google Kalender eingetragen" : undefined });
    },
    onError: (err: any) => {
      toast({ title: "Fehler beim Speichern", description: err.message ?? "Unbekannter Fehler", variant: "destructive" });
    },
  });
  const toggleActivity = useMutation({
    mutationFn: ({ aid, done }: { aid: number; done: boolean }) =>
      apiRequest("PATCH", `/api/activities/${aid}`, { done }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", custId, "activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
  });
  const deleteActivity = useMutation({
    mutationFn: (aid: number) => apiRequest("DELETE", `/api/activities/${aid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", custId, "activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setDeleteActId(null);
    },
  });

  // Mutations — Reminders
  const markReminderDone = useMutation({
    mutationFn: (rid: number) => apiRequest("PATCH", `/api/reminders/${rid}`, { status: "done" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", custId, "reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    },
  });
  const deleteReminderMutation = useMutation({
    mutationFn: (rid: number) => apiRequest("DELETE", `/api/reminders/${rid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", custId, "reminders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      setDeleteReminderId(null);
    },
  });

  // ── Save handlers ──────────────────────────────────────────────────────────
  const saveProvisionSettings = async () => {
    setProvSaving(true);
    try {
      await apiRequest("PATCH", `/api/customers/${custId}`, {
        defaultDisagio: provForm.defaultDisagio ? parseFloat(provForm.defaultDisagio.replace(",", ".")) : null,
        defaultVolume: provForm.defaultVolume ? parseFloat(provForm.defaultVolume.replace(",", ".")) : null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", custId] });
      toast({ title: "Provisions-Einstellungen gespeichert ✓" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setProvSaving(false);
    }
  };

  const saveContractSettings = async () => {
    setContractSaving(true);
    try {
      const termMonths = contractForm.contractTermMonths ? parseInt(contractForm.contractTermMonths, 10) : null;
      const noticeDays = contractForm.cancellationNoticeDays ? parseInt(contractForm.cancellationNoticeDays, 10) : null;
      // Auto-calculate contractEnd if start + term are set but end is empty
      let contractEnd = contractForm.contractEnd || null;
      if (!contractEnd && contractForm.contractStart && termMonths) {
        contractEnd = calculateContractEnd(contractForm.contractStart, termMonths);
        const newEnd = contractEnd;
        setContractForm((f) => ({ ...f, contractEnd: newEnd ?? "" }));
      }
      await apiRequest("PATCH", `/api/customers/${custId}`, {
        contractEnd: contractEnd,
        contractProduct: contractForm.contractProduct || null,
        contractStart: contractForm.contractStart || null,
        contractTermMonths: termMonths,
        cancellationNoticeDays: noticeDays,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", custId] });
      toast({ title: "Vertragseinstellungen gespeichert ✓" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setContractSaving(false);
    }
  };

  const saveTerminals = async (updatedTerminals: Terminal[]) => {
    setTerminalsSaving(true);
    try {
      await apiRequest("PATCH", `/api/customers/${custId}`, {
        terminals: JSON.stringify(updatedTerminals),
      });
      setTerminals(updatedTerminals);
      queryClient.invalidateQueries({ queryKey: ["/api/customers", custId] });
      toast({ title: "Terminals gespeichert ✓" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    } finally {
      setTerminalsSaving(false);
    }
  };

  const handleTerminalSave = (terminal: Terminal) => {
    const updated = [...terminals];
    if (editTerminalIndex !== null) {
      updated[editTerminalIndex] = terminal;
    } else {
      updated.push(terminal);
    }
    saveTerminals(updated);
    setEditTerminalIndex(null);
  };

  const handleTerminalDelete = (index: number) => {
    const updated = terminals.filter((_, i) => i !== index);
    saveTerminals(updated);
  };

  const createRenewalTask = async () => {
    if (!contractForm.contractEnd) {
      toast({ title: "Bitte zuerst Vertragsende speichern", variant: "destructive" });
      return;
    }
    try {
      const endDate = new Date(contractForm.contractEnd);
      const days = daysUntil(contractForm.contractEnd);
      await apiRequest("POST", `/api/customers/${custId}/activities`, {
        type: "renewal",
        description: `Verlängerungsgespräch – Vertragsende in ${days} Tagen (${endDate.toLocaleDateString("de-DE")})`,
        priority: days <= 30 ? "high" : "medium",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        done: false,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers", custId, "activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Verlängerungsaufgabe erstellt ✓" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const fetchAiSummary = async () => {
    setAiLoading(true);
    setAiError("");
    setAiSummary("");
    try {
      const r = await apiRequest("POST", `/api/customers/${custId}/summarize`);
      const data = await r.json();
      setAiSummary(data.summary);
    } catch (err: any) {
      setAiError(err.message || "Fehler bei der KI-Zusammenfassung");
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!aiSummary) return;
    try {
      await navigator.clipboard.writeText(aiSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Kopieren fehlgeschlagen", variant: "destructive" });
    }
  };

  if (cLoad) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Kunde nicht gefunden.</p>
        <Link href="/customers"><a className="text-primary text-sm hover:underline mt-2 inline-block">← Zurück zu Kunden</a></Link>
      </div>
    );
  }

  const pendingActs = activities.filter((a) => !a.done).length;

  // Contract end status
  const contractDaysLeft = contractForm.contractEnd ? daysUntil(contractForm.contractEnd) : null;
  const contractStatusColor =
    contractDaysLeft === null ? "" :
    contractDaysLeft < 0 ? "text-muted-foreground" :
    contractDaysLeft < 60 ? "text-red-600 dark:text-red-400" :
    contractDaysLeft < 90 ? "text-amber-600 dark:text-amber-400" :
    "text-green-600 dark:text-green-400";
  const contractStatusIcon =
    contractDaysLeft === null ? null :
    contractDaysLeft < 0 ? <Clock className="w-3.5 h-3.5" /> :
    contractDaysLeft < 60 ? <AlertTriangle className="w-3.5 h-3.5" /> :
    contractDaysLeft < 90 ? <Clock className="w-3.5 h-3.5" /> :
    <CheckCircle2 className="w-3.5 h-3.5" />;

  // Cancellation deadline
  const cancellationDeadline =
    contractForm.contractEnd && contractForm.cancellationNoticeDays
      ? calculateCancellationDeadline(contractForm.contractEnd, parseInt(contractForm.cancellationNoticeDays, 10))
      : null;

  // Commission stats
  const commissionAvg = customerCommissions.length > 0
    ? customerCommissionsTotal / customerCommissions.length
    : 0;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Link href="/customers">
          <a className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Kunden
          </a>
        </Link>
      </div>

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-[#0052CC]" />
        <CardContent className="p-5">
          <div className="flex items-start gap-4 flex-wrap">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xl font-black text-primary">
                {customer.companyName.charAt(0).toUpperCase()}
              </span>
            </div>
            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{customer.companyName}</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{customer.contactName}</p>
              {customer.industry && (
                <p className="text-xs text-muted-foreground mt-0.5">{customer.industry}</p>
              )}
            </div>
            {/* Quick stats */}
            {customer.paymentVolume && (
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">Monatl. Volumen</p>
                <p className="text-2xl font-black text-primary mt-0.5">
                  € {customer.paymentVolume.toLocaleString("de-DE")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Kundenakte – Übersicht ── */}
      <Card className="overflow-hidden">
        <div className="h-1 bg-[#0052CC]" />
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Kundenakte – Übersicht
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Vertrag */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Vertrag</p>
              {contractForm.contractEnd ? (
                <div className={cn("flex items-center gap-1.5 text-sm font-semibold", contractStatusColor)}>
                  {contractStatusIcon}
                  {contractDaysLeft !== null && contractDaysLeft < 0
                    ? `Abgelaufen`
                    : contractDaysLeft === 0
                    ? "Läuft heute ab"
                    : `${contractDaysLeft}d verbleibend`}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">–</p>
              )}
              {contractForm.contractEnd && (
                <p className="text-xs text-muted-foreground">
                  bis {new Date(contractForm.contractEnd).toLocaleDateString("de-DE")}
                </p>
              )}
              {contractForm.contractProduct && (
                <p className="text-xs text-foreground font-medium">{contractForm.contractProduct}</p>
              )}
            </div>

            {/* Terminale */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Terminale</p>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", customer.girocardDisagio != null ? "bg-green-500" : "bg-muted")} />
                  <span className="text-xs text-foreground">Girocard</span>
                  {customer.girocardDisagio != null && (
                    <span className="text-[10px] text-muted-foreground">{customer.girocardDisagio.toFixed(3)}%</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", customer.creditcardDisagio != null ? "bg-green-500" : "bg-muted")} />
                  <span className="text-xs text-foreground">Kreditkarte</span>
                  {customer.creditcardDisagio != null && (
                    <span className="text-[10px] text-muted-foreground">{customer.creditcardDisagio.toFixed(3)}%</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", customer.selectedProduct?.toLowerCase().includes("portab") ? "bg-green-500" : "bg-muted")} />
                  <span className="text-xs text-foreground">Portable</span>
                </div>
              </div>
            </div>

            {/* Provisionen */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Provisionen</p>
              <p className="text-sm font-bold text-primary">
                € {customerCommissionsTotal.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-muted-foreground">Gesamt</p>
              {customerCommissions[0] && (
                <p className="text-xs text-muted-foreground">
                  Letzte: {new Date(customerCommissions[0].date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                  {" "}· € {customerCommissions[0].amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>

            {/* Nächste Aktion */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Nächste Aktion</p>
              {(() => {
                const nextReminder = customerReminders.filter((r) => r.status !== "done").sort((a, b) => a.dueDate > b.dueDate ? 1 : -1)[0];
                const nextActivity = activities.filter((a) => !a.done && a.dueDate).sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))[0];
                if (nextReminder) {
                  const days = Math.ceil((new Date(nextReminder.dueDate).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
                  return (
                    <>
                      <div className={cn("flex items-center gap-1.5 text-xs font-semibold",
                        days < 0 ? "text-destructive" : days === 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
                      )}>
                        <Bell className="w-3 h-3" />
                        {days < 0 ? "Überfällig" : days === 0 ? "Heute" : `in ${days}d`}
                      </div>
                      <p className="text-xs text-foreground truncate">{nextReminder.description}</p>
                    </>
                  );
                }
                if (nextActivity) {
                  const days = Math.ceil((new Date(nextActivity.dueDate!).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
                  return (
                    <>
                      <div className={cn("flex items-center gap-1.5 text-xs font-semibold",
                        days < 0 ? "text-destructive" : days === 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"
                      )}>
                        <Calendar className="w-3 h-3" />
                        {days < 0 ? "Überfällig" : days === 0 ? "Heute" : `in ${days}d`}
                      </div>
                      <p className="text-xs text-foreground truncate">{nextActivity.description}</p>
                    </>
                  );
                }
                if (contractDaysLeft !== null && contractDaysLeft > 0 && contractDaysLeft <= 90) {
                  return (
                    <>
                      <div className={cn("flex items-center gap-1.5 text-xs font-semibold",
                        contractDaysLeft < 60 ? "text-destructive" : "text-amber-600 dark:text-amber-400"
                      )}>
                        <RefreshCw className="w-3 h-3" />
                        Verlängerung in {contractDaysLeft}d
                      </div>
                    </>
                  );
                }
                return <p className="text-sm text-muted-foreground">–</p>;
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info + Payment grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact info */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Kontaktdaten
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <InfoRow icon={Mail} label="E-Mail" value={customer.email} href={customer.email ? `mailto:${customer.email}` : undefined} />
            <InfoRow icon={Phone} label="Telefon" value={customer.phone} href={customer.phone ? `tel:${customer.phone.replace(/\s/g, "")}` : undefined} />
            <InfoRow icon={MapPin} label="Stadt / Land" value={[customer.city, customer.country].filter(Boolean).join(", ")} />
          </CardContent>
        </Card>

        {/* Payment info */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Zahlungsinformationen
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <InfoRow icon={Euro} label="Zahlungsmethode" value={
              customer.paymentMethod === "card" ? "Kartenzahlung" :
              customer.paymentMethod === "sepa" ? "SEPA-Lastschrift" :
              customer.paymentMethod === "instant" ? "Echtzeit-Überweisung" :
              customer.paymentMethod ?? undefined
            } />
            <InfoRow icon={Building2} label="Bank" value={customer.bankName} />
            <InfoRow icon={CreditCard} label="IBAN" value={customer.iban} />
            <InfoRow icon={FileText} label="Berater" value={customer.commerzAccountManager} />
            {customer.selectedProduct && (
              <InfoRow icon={CreditCard} label="Gewähltes Produkt" value={customer.selectedProduct} />
            )}
            {(customer.contractStart || customer.contractEnd) && (
              <InfoRow icon={Calendar} label="Vertragszeitraum" value={
                [customer.contractStart && new Date(customer.contractStart).toLocaleDateString("de-DE"),
                 customer.contractEnd && new Date(customer.contractEnd).toLocaleDateString("de-DE")]
                  .filter(Boolean).join(" – ")
              } />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disagio-Karten */}
      {(customer.girocardDisagio != null || customer.creditcardDisagio != null) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Girocard */}
          {customer.girocardDisagio != null && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                  Girocard — Disagio-Struktur
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="flex justify-between items-center py-1.5 border-b border-border">
                  <span className="text-xs font-bold text-foreground">Gesamt-Disagio (Händler zahlt)</span>
                  <span className="text-sm font-black text-primary">{customer.girocardDisagio.toFixed(3)} %</span>
                </div>
                {[
                  { label: "Interchange (an Hausbank)", val: customer.girocardInterchange, color: "bg-blue-500", tip: "EU max. 0,20 %" },
                  { label: "Scheme Fee (ans DK-Netz)", val: customer.girocardSchemeFee, color: "bg-indigo-400", tip: "Girocard-Netzgebühr" },
                  { label: "Acquirer-Marge (CGP)", val: customer.girocardAcquirer, color: "bg-[#FFD100]", tip: "Commerz Globalpay" },
                ].map(({ label, val, color, tip }) => val != null && (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <div>
                        <span className="text-xs text-foreground font-medium">{label}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">({tip})</span>
                      </div>
                      <span className="text-xs font-bold text-foreground">{val.toFixed(3)} %</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", color)}
                        style={{ width: `${customer.girocardDisagio! > 0 ? (val / customer.girocardDisagio!) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Kreditkarte */}
          {customer.creditcardDisagio != null && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-amber-400" />
                  Kreditkarte (Visa / MC) — Disagio-Struktur
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="flex justify-between items-center py-1.5 border-b border-border">
                  <span className="text-xs font-bold text-foreground">Gesamt-Disagio (Händler zahlt)</span>
                  <span className="text-sm font-black text-primary">{customer.creditcardDisagio.toFixed(3)} %</span>
                </div>
                {[
                  { label: "Interchange (an kartenausg. Bank)", val: customer.creditcardInterchange, color: "bg-amber-500", tip: "EU max. 0,30 %" },
                  { label: "Scheme Fee (an Visa / Mastercard)", val: customer.creditcardSchemeFee, color: "bg-orange-400", tip: "Netzgebühr" },
                  { label: "Acquirer-Marge (CGP)", val: customer.creditcardAcquirer, color: "bg-[#FFD100]", tip: "Commerz Globalpay" },
                ].map(({ label, val, color, tip }) => val != null && (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <div>
                        <span className="text-xs text-foreground font-medium">{label}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">({tip})</span>
                      </div>
                      <span className="text-xs font-bold text-foreground">{val.toFixed(3)} %</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", color)}
                        style={{ width: `${customer.creditcardDisagio! > 0 ? (val / customer.creditcardDisagio!) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Vertrag & Terminals (Übersicht) ── */}
      <ContractCard
        contractProduct={contractForm.contractProduct || customer.contractProduct}
        contractStart={contractForm.contractStart || customer.contractStart}
        contractEnd={contractForm.contractEnd || customer.contractEnd}
        contractTermMonths={contractForm.contractTermMonths ? parseInt(contractForm.contractTermMonths, 10) : customer.contractTermMonths}
        cancellationNoticeDays={contractForm.cancellationNoticeDays ? parseInt(contractForm.cancellationNoticeDays, 10) : customer.cancellationNoticeDays}
        terminalsJson={terminals.length > 0 ? JSON.stringify(terminals) : customer.terminals}
      />

      {/* ── Vertrag bearbeiten + Provisions-Einstellungen ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Vertrag bearbeiten */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Vertrag bearbeiten
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="contract-product">Produkt</Label>
              <Input
                id="contract-product"
                value={contractForm.contractProduct}
                onChange={(e) => setContractForm((f) => ({ ...f, contractProduct: e.target.value }))}
                placeholder="z.B. EC-Terminal stationär"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contract-start">Vertragsbeginn</Label>
                <Input
                  id="contract-start"
                  type="date"
                  value={contractForm.contractStart}
                  onChange={(e) => {
                    const start = e.target.value;
                    setContractForm((f) => {
                      // Auto-calculate end date if term is set
                      const months = f.contractTermMonths ? parseInt(f.contractTermMonths, 10) : null;
                      const newEnd = start && months ? calculateContractEnd(start, months) : f.contractEnd;
                      return { ...f, contractStart: start, contractEnd: newEnd };
                    });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contract-term">Laufzeit (Monate)</Label>
                <Input
                  id="contract-term"
                  type="number"
                  min="1"
                  step="1"
                  value={contractForm.contractTermMonths}
                  onChange={(e) => {
                    const months = e.target.value;
                    setContractForm((f) => {
                      const m = parseInt(months, 10);
                      const newEnd = f.contractStart && m > 0 ? calculateContractEnd(f.contractStart, m) : f.contractEnd;
                      return { ...f, contractTermMonths: months, contractEnd: newEnd };
                    });
                  }}
                  placeholder="z.B. 24"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contract-end">Vertragsende</Label>
              <Input
                id="contract-end"
                type="date"
                value={contractForm.contractEnd}
                onChange={(e) => setContractForm((f) => ({ ...f, contractEnd: e.target.value }))}
              />
              {contractDaysLeft !== null && contractForm.contractEnd && (
                <div className={cn("flex items-center gap-1.5 text-xs font-semibold mt-1", contractStatusColor)}>
                  {contractStatusIcon}
                  {contractDaysLeft < 0
                    ? `Abgelaufen vor ${Math.abs(contractDaysLeft)} Tagen`
                    : contractDaysLeft === 0
                    ? "Läuft heute ab!"
                    : `Noch ${contractDaysLeft} Tage`}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contract-notice">Kündigungsfrist (Tage)</Label>
              <Input
                id="contract-notice"
                type="number"
                min="0"
                step="1"
                value={contractForm.cancellationNoticeDays}
                onChange={(e) => setContractForm((f) => ({ ...f, cancellationNoticeDays: e.target.value }))}
                placeholder="z.B. 30"
              />
              {cancellationDeadline && (
                <p className="text-[11px] text-muted-foreground">
                  Kündigungsstichtag:{" "}
                  <strong className={cn(
                    getDaysUntilEnd(cancellationDeadline) < 14 && getDaysUntilEnd(cancellationDeadline) >= 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                  )}>
                    {new Date(cancellationDeadline).toLocaleDateString("de-DE")}
                  </strong>
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs gap-1.5"
                onClick={saveContractSettings}
                disabled={contractSaving}
              >
                {contractSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Speichern
              </Button>
              {contractForm.contractEnd && contractDaysLeft !== null && contractDaysLeft <= 60 && contractDaysLeft >= 0 && (
                <Button
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700"
                  onClick={createRenewalTask}
                >
                  <RefreshCw className="w-3 h-3" /> Verlängerungsaufgabe
                </Button>
              )}
              {contractForm.contractEnd && (contractDaysLeft === null || contractDaysLeft > 60) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 h-8 text-xs gap-1.5"
                  onClick={createRenewalTask}
                >
                  <RefreshCw className="w-3 h-3" /> Verlängerungsaufgabe
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Provisions-Einstellungen */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" /> Provisions-Einstellungen
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Standard-Werte für neue Provisionen. Werden im Provisions-Dialog automatisch vorausgefüllt.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prov-disagio">Standard-Disagio (%)</Label>
                <Input
                  id="prov-disagio"
                  type="number"
                  min="0"
                  step="0.001"
                  value={provForm.defaultDisagio}
                  onChange={(e) => setProvForm((f) => ({ ...f, defaultDisagio: e.target.value }))}
                  placeholder="z.B. 0.25"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="prov-volume">Standard-Volumen (€)</Label>
                <Input
                  id="prov-volume"
                  type="number"
                  min="0"
                  step="1"
                  value={provForm.defaultVolume}
                  onChange={(e) => setProvForm((f) => ({ ...f, defaultVolume: e.target.value }))}
                  placeholder="z.B. 50000"
                />
              </div>
            </div>
            {provForm.defaultDisagio && provForm.defaultVolume && (
              <p className="text-[11px] text-muted-foreground">
                Vorschau:{" "}
                <strong>
                  {(parseFloat(provForm.defaultVolume) * parseFloat(provForm.defaultDisagio) / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </strong>{" "}
                Provision
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs"
              onClick={saveProvisionSettings}
              disabled={provSaving}
            >
              {provSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Speichern
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Terminals verwalten ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" /> Terminals verwalten
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => { setEditTerminalIndex(null); setTerminalDialogOpen(true); }}
            >
              <Plus className="w-3 h-3" /> Terminal hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {terminals.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Monitor className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
              <p className="text-xs">Noch keine Terminals erfasst</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Typ</th>
                    <th className="text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Anzahl</th>
                    <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {terminals.map((t, i) => (
                    <tr key={i} className={cn("border-b border-border last:border-0", i % 2 === 1 && "bg-muted/20")}>
                      <td className="px-3 py-2 font-medium text-foreground">{t.type}</td>
                      <td className="px-3 py-2 text-center font-bold text-foreground">{t.count}</td>
                      <td className="px-3 py-2">
                        <span className={cn("text-xs font-semibold", terminalStatusClass(t.status))}>
                          {terminalStatusLabel(t.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditTerminalIndex(i); setTerminalDialogOpen(true); }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleTerminalDelete(i)}
                            disabled={terminalsSaving}
                          >
                            <Trash2 className="w-3 h-3" />
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

      {/* ── KI-Zusammenfassung ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> KI-Zusammenfassung
            </CardTitle>
            <div className="flex items-center gap-2">
              {aiSummary && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1.5"
                  onClick={copyToClipboard}
                >
                  {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Kopiert!" : "Kopieren"}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={fetchAiSummary}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {aiLoading ? "Zusammenfassen…" : "Zusammenfassen"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {!aiSummary && !aiLoading && !aiError && (
            <div className="text-center py-6 text-muted-foreground">
              <Sparkles className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
              <p className="text-xs">
                Klicke "Zusammenfassen" um eine KI-Zusammenfassung aller Notizen und Aktivitäten zu erstellen.
              </p>
            </div>
          )}
          {aiLoading && (
            <div className="flex items-center gap-3 py-4 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <p className="text-sm">KI analysiert Notizen und Aktivitäten…</p>
            </div>
          )}
          {aiError && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{aiError}</p>
            </div>
          )}
          {aiSummary && !aiLoading && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-sm text-foreground leading-relaxed">{aiSummary}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commissions Card */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Provisionen
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5"
                onClick={() => setCommissionDialogOpen(true)}
              >
                <Plus className="w-3 h-3" /> Neue Provision
              </Button>
              <Link href={`/commissions?customerId=${custId}`}>
                <a className="text-xs text-primary hover:underline font-medium">
                  Alle anzeigen →
                </a>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* Total + Average */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex flex-col p-3 rounded-lg bg-primary/5 border border-primary/10">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                Gesamt-Provision
              </span>
              <span className="text-lg font-black text-primary">
                € {customerCommissionsTotal.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex flex-col p-3 rounded-lg bg-muted/40 border border-border">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                Ø pro Provision
              </span>
              <span className="text-lg font-black text-foreground">
                {customerCommissions.length > 0
                  ? `€ ${commissionAvg.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "–"}
              </span>
            </div>
          </div>

          {/* Last 5 commissions */}
          {customerCommissions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Euro className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
              <p className="text-xs">Noch keine Provisionen für diesen Kunden</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {customerCommissions.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(c.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    {c.description && (
                      <span className="text-xs text-foreground truncate">{c.description}</span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-foreground whitespace-nowrap ml-3">
                    € {c.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {customerCommissions.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{customerCommissions.length - 5} weitere
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Dialog */}
      <CommissionDialog
        open={commissionDialogOpen}
        onClose={() => setCommissionDialogOpen(false)}
        preselectedCustomerId={custId}
      />

      {/* Terminal Dialog */}
      <TerminalDialog
        open={terminalDialogOpen}
        onClose={() => { setTerminalDialogOpen(false); setEditTerminalIndex(null); }}
        editTerminal={editTerminalIndex !== null ? terminals[editTerminalIndex] : null}
        onSave={handleTerminalSave}
      />

      {/* ── Wiedervorlagen ── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" /> Wiedervorlagen
              {customerReminders.filter((r) => r.status !== "done").length > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {customerReminders.filter((r) => r.status !== "done").length}
                </span>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => { setEditReminder(null); setReminderDialogOpen(true); }}
            >
              <Plus className="w-3 h-3" /> Wiedervorlage hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {customerReminders.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Bell className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
              <p className="text-xs">Noch keine Wiedervorlagen für diesen Kunden</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {[...customerReminders]
                .sort((a, b) => {
                  if (a.status === "done" && b.status !== "done") return 1;
                  if (a.status !== "done" && b.status === "done") return -1;
                  return a.dueDate > b.dueDate ? 1 : -1;
                })
                .map((r) => {
                  const today = new Date().toISOString().split("T")[0];
                  const isOverdue = r.dueDate < today && r.status !== "done";
                  const isToday = r.dueDate === today && r.status !== "done";
                  const days = Math.ceil((new Date(r.dueDate).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
                        r.status === "done"
                          ? "bg-muted/30 border-border opacity-60"
                          : isOverdue
                          ? "bg-destructive/5 border-destructive/30"
                          : isToday
                          ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/40 dark:border-amber-800/30"
                          : "bg-secondary/30 border-border"
                      )}
                    >
                      {/* Done toggle */}
                      <button
                        onClick={() => r.status !== "done" && markReminderDone.mutate(r.id)}
                        className={cn(
                          "shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          r.status === "done"
                            ? "bg-green-500 border-green-500"
                            : isOverdue
                            ? "border-destructive hover:bg-destructive/20"
                            : "border-muted-foreground hover:border-green-500"
                        )}
                      >
                        {r.status === "done" && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm text-foreground truncate",
                          r.status === "done" && "line-through text-muted-foreground"
                        )}>
                          {r.description}
                        </p>
                        <p className={cn(
                          "text-[10px] font-semibold mt-0.5",
                          isOverdue ? "text-destructive" : isToday ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                        )}>
                          {r.status === "done"
                            ? "Erledigt"
                            : isOverdue
                            ? `Überfällig (${new Date(r.dueDate).toLocaleDateString("de-DE")})`
                            : isToday
                            ? "Heute fällig"
                            : `Fällig: ${new Date(r.dueDate).toLocaleDateString("de-DE")} (in ${days}d)`
                          }
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {r.status !== "done" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditReminder(r); setReminderDialogOpen(true); }}
                          >
                            ✏️
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteReminderId(r.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Dialog */}
      <ReminderDialog
        open={reminderDialogOpen}
        onClose={() => { setReminderDialogOpen(false); setEditReminder(null); }}
        preselectedCustomerId={custId}
        editReminder={editReminder}
      />

      {/* Delete Reminder */}
      <AlertDialog open={deleteReminderId !== null} onOpenChange={(o) => !o && setDeleteReminderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wiedervorlage löschen?</AlertDialogTitle>
            <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteReminderId && deleteReminderMutation.mutate(deleteReminderId)}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tabs: Notes / Activities */}
      <div>
        {/* Tab bar */}
        <div className="flex border-b border-border mb-4">
          {([
            { key: "notes", label: "Notizen", count: notes.length },
            { key: "activities", label: "Aktivitäten", count: pendingActs > 0 ? pendingActs : activities.length },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              data-testid={`tab-${key}`}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors",
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                activeTab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Notes panel */}
        {activeTab === "notes" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" className="gap-2" onClick={() => setNoteDialog(true)} data-testid="button-add-note">
                <Plus className="w-3.5 h-3.5" /> Notiz hinzufügen
              </Button>
            </div>
            {nLoad ? (
              <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : notes.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Noch keine Notizen</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...notes].reverse().map((n) => (
                  <Card key={n.id} data-testid={`note-card-${n.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                              {NOTE_TYPES[n.type] ?? n.type}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(n.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                            {n.updatedAt && n.updatedAt !== n.createdAt && (
                              <span className="text-[10px] text-muted-foreground/60">
                                · bearbeitet {new Date(n.updatedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-foreground">{n.title}</p>
                          {/* Render rich-text HTML content */}
                          <div
                            className="text-sm text-muted-foreground mt-1 prose prose-sm dark:prose-invert max-w-none [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-primary [&_a]:underline"
                            dangerouslySetInnerHTML={{ __html: n.content }}
                          />
                        </div>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteNoteId(n.id)}
                          data-testid={`button-delete-note-${n.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activities panel — Timeline */}
        {activeTab === "activities" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" className="gap-2" onClick={() => setActDialog(true)} data-testid="button-add-activity">
                <Plus className="w-3.5 h-3.5" /> Aktivität hinzufügen
              </Button>
            </div>
            {aLoad ? (
              <div className="space-y-4 pl-6">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : activities.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Noch keine Aktivitäten</p>
              </div>
            ) : (
              <div className="relative pl-6">
                {/* Vertical line */}
                <div className="absolute left-[9px] top-3 bottom-3 w-[2px] bg-border rounded-full" />

                <div className="space-y-4">
                  {[...activities]
                    .sort((a, b) => {
                      // Sort: undone first (by dueDate desc), then done
                      if (a.done !== b.done) return a.done ? 1 : -1;
                      const da = a.dueDate ?? a.createdAt ?? "";
                      const db = b.dueDate ?? b.createdAt ?? "";
                      return db > da ? 1 : -1;
                    })
                    .map((a) => {
                      const isOverdue = !a.done && a.dueDate && new Date(a.dueDate) < new Date();
                      return (
                        <div
                          key={a.id}
                          className={cn("relative flex gap-4", a.done && "opacity-60")}
                          data-testid={`activity-card-${a.id}`}
                        >
                          {/* Timeline dot */}
                          <button
                            onClick={() => toggleActivity.mutate({ aid: a.id, done: !a.done })}
                            className="absolute -left-6 top-3 shrink-0 transition-colors"
                            data-testid={`button-toggle-activity-${a.id}`}
                            title={a.done ? "Als offen markieren" : "Als erledigt markieren"}
                          >
                            {a.done ? (
                              <div className="w-[18px] h-[18px] rounded-full bg-green-500 flex items-center justify-center ring-2 ring-background">
                                <CheckSquare className="w-3 h-3 text-white" />
                              </div>
                            ) : (
                              <div className={cn(
                                "w-[18px] h-[18px] rounded-full ring-2 ring-background border-2 transition-colors",
                                isOverdue
                                  ? "bg-destructive/20 border-destructive"
                                  : "bg-background border-primary hover:bg-primary/10",
                              )} />
                            )}
                          </button>

                          {/* Card */}
                          <div className={cn(
                            "flex-1 rounded-lg border bg-card p-3 min-w-0",
                            isOverdue && "border-destructive/40",
                          )}>
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                {/* Type badge + date */}
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
                                    a.done
                                      ? "bg-muted text-muted-foreground"
                                      : cn("bg-primary/10", ACT_CLASS[a.type] ?? "text-muted-foreground"),
                                  )}>
                                    {ACT_TYPES[a.type] ?? a.type}
                                  </span>
                                  {a.dueDate && (
                                    <span className={cn(
                                      "text-[10px] flex items-center gap-1",
                                      isOverdue ? "text-destructive font-semibold" : "text-muted-foreground",
                                    )}>
                                      <Calendar className="w-2.5 h-2.5" />
                                      {new Date(a.dueDate).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                                      {a.dueTime ? ` · ${a.dueTime} Uhr` : ""}
                                      {isOverdue && <span className="font-bold"> · Überfällig</span>}
                                    </span>
                                  )}
                                  {a.calendarEventId && (
                                    <span className="text-[10px] flex items-center gap-1 text-green-600 dark:text-green-400">
                                      <CalendarCheck className="w-2.5 h-2.5" /> Google Kalender
                                    </span>
                                  )}
                                </div>
                                {/* Description */}
                                <p className={cn("text-sm text-foreground", a.done && "line-through text-muted-foreground")}>
                                  {a.description}
                                </p>
                              </div>
                              {/* Delete */}
                              <Button
                                variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive -mt-0.5 -mr-0.5"
                                onClick={() => setDeleteActId(a.id)}
                                data-testid={`button-delete-activity-${a.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Note Dialog */}
      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> Neue Notiz
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <NoteEditor
              title={noteForm.title ?? ""}
              content={noteForm.content ?? ""}
              type={noteForm.type ?? "note"}
              onTitleChange={(v) => setNoteForm((f) => ({ ...f, title: v }))}
              onContentChange={(v) => setNoteForm((f) => ({ ...f, content: v }))}
              onTypeChange={(v) => setNoteForm((f) => ({ ...f, type: v as any }))}
              templates={templates}
            />
            <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-border">
              <Button variant="outline" onClick={() => setNoteDialog(false)}>Abbrechen</Button>
              <Button
                onClick={() => {
                  if (!noteForm.title?.trim() || !noteForm.content?.trim()) {
                    toast({ title: "Titel und Inhalt erforderlich", variant: "destructive" }); return;
                  }
                  createNote.mutate(noteForm);
                }}
                disabled={createNote.isPending}
                data-testid="button-save-note"
              >
                {createNote.isPending ? "Speichern…" : "Speichern"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={actDialog} onOpenChange={setActDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Neue Aktivität
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Typ</Label>
              <Select value={actForm.type} onValueChange={(v) => setActForm((f) => ({ ...f, type: v as any }))}>
                <SelectTrigger data-testid="select-activity-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACT_TYPES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-desc">Beschreibung</Label>
              <Input id="a-desc" value={actForm.description}
                onChange={(e) => setActForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Was wurde besprochen / geplant? (Pflichtfeld)" data-testid="input-activity-description" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-when">Wann? <span className="text-muted-foreground font-normal">(Freitext)</span></Label>
              <div className="flex gap-2">
                <Input
                  id="a-when"
                  value={rawDateText}
                  onChange={(e) => {
                    setRawDateText(e.target.value);
                    setParsedDate(null);
                    setParseDateError("");
                  }}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && rawDateText.trim()) {
                      setParseDateLoading(true);
                      try {
                        const r = await fetch(`${API_BASE}/api/parse-date`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ text: rawDateText }),
                        });
                        const j = await r.json();
                        if (!r.ok) { setParseDateError(j.message); return; }
                        setParsedDate(j);
                        setParseDateError("");
                        setActForm((f) => ({ ...f, dueDate: j.iso.split("T")[0] }));
                      } catch { setParseDateError("Verbindungsfehler"); }
                      finally { setParseDateLoading(false); }
                    }
                  }}
                  placeholder="z.B. morgen 14 Uhr · Freitag 9:30 · nächsten Montag"
                  data-testid="input-activity-due-date"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={parseDateLoading || !rawDateText.trim()}
                  onClick={async () => {
                    if (!rawDateText.trim()) return;
                    setParseDateLoading(true);
                    try {
                      const r = await fetch(`${API_BASE}/api/parse-date`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: rawDateText }),
                      });
                      const j = await r.json();
                      if (!r.ok) { setParseDateError(j.message); return; }
                      setParsedDate(j);
                      setParseDateError("");
                      setActForm((f) => ({ ...f, dueDate: j.iso.split("T")[0] }));
                    } catch { setParseDateError("Verbindungsfehler"); }
                    finally { setParseDateLoading(false); }
                  }}
                  data-testid="button-parse-date"
                >
                  {parseDateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#0052CC]" />}
                </Button>
              </div>
              {parsedDate && (
                <div className="flex items-center gap-2 text-[12px] text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-md px-3 py-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{parsedDate.display} · wird in Google Kalender eingetragen</span>
                </div>
              )}
              {parseDateError && (
                <p className="text-[12px] text-destructive">{parseDateError}</p>
              )}
              {!parsedDate && !parseDateError && rawDateText && (
                <p className="text-[11px] text-muted-foreground">Enter drücken oder ✨ klicken zum Erkennen</p>
              )}
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <Button variant="outline" onClick={() => setActDialog(false)}>Abbrechen</Button>
              <Button
                onClick={() => {
                  if (!actForm.description?.trim()) {
                    toast({ title: "Bitte Beschreibung eingeben", description: "Was soll bei diesem Termin besprochen / erledigt werden?", variant: "destructive" }); return;
                  }
                  createActivity.mutate({ ...actForm, rawDateText: rawDateText || undefined } as any);
                }}
                disabled={createActivity.isPending || !actForm.description?.trim()}
                data-testid="button-save-activity"
              >
                {createActivity.isPending ? "Speichern…" : "Speichern"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Note */}
      <AlertDialog open={deleteNoteId !== null} onOpenChange={(o) => !o && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notiz löschen?</AlertDialogTitle>
            <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteNoteId && deleteNote.mutate(deleteNoteId)}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Activity */}
      <AlertDialog open={deleteActId !== null} onOpenChange={(o) => !o && setDeleteActId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktivität löschen?</AlertDialogTitle>
            <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteActId && deleteActivity.mutate(deleteActId)}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

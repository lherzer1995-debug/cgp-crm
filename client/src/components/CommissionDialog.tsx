import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Euro } from "lucide-react";
import type { Customer, Commission } from "@shared/schema";

const COMMISSION_TYPES: Record<string, string> = {
  sale: "Abschluss (Sale)",
  renewal: "Verlängerung (Renewal)",
  upsell: "Upsell",
  other: "Sonstiges",
};

interface CommissionDialogProps {
  open: boolean;
  onClose: () => void;
  /** Pre-selected customer (e.g. when opened from CustomerDetailPage) */
  preselectedCustomerId?: number;
  /** Existing commission to edit */
  editCommission?: Commission | null;
}

export default function CommissionDialog({
  open,
  onClose,
  preselectedCustomerId,
  editCommission,
}: CommissionDialogProps) {
  const { toast } = useToast();
  const isEdit = !!editCommission;

  const [form, setForm] = useState({
    customerId: preselectedCustomerId ? String(preselectedCustomerId) : "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    type: "sale",
    description: "",
    volume: "",
    disagio: "",
  });

  // Populate form when editing
  useEffect(() => {
    if (editCommission) {
      setForm({
        customerId: String(editCommission.customerId),
        amount: String(editCommission.amount),
        date: editCommission.date,
        type: editCommission.type,
        description: editCommission.description ?? "",
        volume: "",
        disagio: "",
      });
    } else {
      setForm({
        customerId: preselectedCustomerId ? String(preselectedCustomerId) : "",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        type: "sale",
        description: "",
        volume: "",
        disagio: "",
      });
    }
  }, [editCommission, preselectedCustomerId, open]);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/commissions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions/summary"] });
      if (form.customerId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/customers", Number(form.customerId), "commissions"],
        });
      }
      toast({ title: "Provision gespeichert ✓" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/commissions/${editCommission!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions/summary"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/customers", editCommission!.customerId, "commissions"],
      });
      toast({ title: "Provision aktualisiert ✓" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    if (!form.customerId) {
      toast({ title: "Bitte Kunden auswählen", variant: "destructive" });
      return;
    }
    const amountNum = parseFloat(form.amount.replace(",", "."));
    if (!form.amount || isNaN(amountNum) || amountNum <= 0) {
      toast({ title: "Bitte gültigen Betrag eingeben", variant: "destructive" });
      return;
    }
    if (!form.date) {
      toast({ title: "Bitte Datum eingeben", variant: "destructive" });
      return;
    }

    const payload = {
      customerId: Number(form.customerId),
      amount: amountNum,
      date: form.date,
      type: form.type,
      description: form.description || undefined,
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Euro className="w-4 h-4 text-primary" />
            {isEdit ? "Provision bearbeiten" : "Neue Provision"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Customer */}
          <div className="space-y-1.5">
            <Label>Kunde *</Label>
            <Select
              value={form.customerId}
              onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}
              disabled={!!preselectedCustomerId && !isEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kunden auswählen…" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Volume + Disagio auto-calc */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="comm-volume">Volumen (€) <span className="text-muted-foreground font-normal text-xs">optional</span></Label>
              <Input
                id="comm-volume"
                value={form.volume}
                onChange={(e) => {
                  const vol = e.target.value;
                  setForm((f) => {
                    const dis = parseFloat(f.disagio.replace(",", "."));
                    const v = parseFloat(vol.replace(",", "."));
                    const auto = !isNaN(v) && !isNaN(dis) && dis > 0
                      ? String((v * dis / 100).toFixed(2))
                      : f.amount;
                    return { ...f, volume: vol, amount: auto };
                  });
                }}
                placeholder="z.B. 50000"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comm-disagio">Disagio (%) <span className="text-muted-foreground font-normal text-xs">optional</span></Label>
              <Input
                id="comm-disagio"
                value={form.disagio}
                onChange={(e) => {
                  const dis = e.target.value;
                  setForm((f) => {
                    const vol = parseFloat(f.volume.replace(",", "."));
                    const d = parseFloat(dis.replace(",", "."));
                    const auto = !isNaN(vol) && !isNaN(d) && d > 0
                      ? String((vol * d / 100).toFixed(2))
                      : f.amount;
                    return { ...f, disagio: dis, amount: auto };
                  });
                }}
                placeholder="z.B. 0.25"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="comm-amount">Betrag (€) *</Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                id="comm-amount"
                className="pl-8"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0,00"
                type="number"
                min="0"
                step="0.01"
              />
            </div>
            {form.volume && form.disagio && (
              <p className="text-[11px] text-muted-foreground">
                Auto-berechnet: {form.volume} € × {form.disagio}% = {form.amount} €
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="comm-date">Datum *</Label>
            <Input
              id="comm-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Typ</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(COMMISSION_TYPES).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="comm-desc">
              Beschreibung{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="comm-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="z.B. Abschluss Demo-Paket, EC-Terminal stationär…"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Speichern…" : isEdit ? "Aktualisieren" : "Speichern"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

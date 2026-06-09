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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Bell, Loader2 } from "lucide-react";
import type { Customer, InsertReminder } from "@shared/schema";

interface ReminderDialogProps {
  open: boolean;
  onClose: () => void;
  preselectedCustomerId?: number;
  editReminder?: { id: number; customerId: number; description: string; dueDate: string; status: string } | null;
}

export default function ReminderDialog({ open, onClose, preselectedCustomerId, editReminder }: ReminderDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<InsertReminder>>({
    customerId: preselectedCustomerId,
    description: "",
    dueDate: new Date().toISOString().split("T")[0],
    status: "pending",
  });

  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  // Populate form when editing
  useEffect(() => {
    if (editReminder) {
      setForm({
        customerId: editReminder.customerId,
        description: editReminder.description,
        dueDate: editReminder.dueDate,
        status: editReminder.status as any,
      });
    } else {
      setForm({
        customerId: preselectedCustomerId,
        description: "",
        dueDate: new Date().toISOString().split("T")[0],
        status: "pending",
      });
    }
  }, [editReminder, preselectedCustomerId, open]);

  const createMutation = useMutation({
    mutationFn: (data: Partial<InsertReminder>) => apiRequest("POST", "/api/reminders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      if (form.customerId) {
        queryClient.invalidateQueries({ queryKey: ["/api/customers", form.customerId, "reminders"] });
      }
      toast({ title: "Wiedervorlage erstellt ✓" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<InsertReminder>) => apiRequest("PATCH", `/api/reminders/${editReminder!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      if (form.customerId) {
        queryClient.invalidateQueries({ queryKey: ["/api/customers", form.customerId, "reminders"] });
      }
      toast({ title: "Wiedervorlage gespeichert ✓" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!form.customerId) {
      toast({ title: "Bitte Kunden auswählen", variant: "destructive" });
      return;
    }
    if (!form.description?.trim()) {
      toast({ title: "Bitte Beschreibung eingeben", variant: "destructive" });
      return;
    }
    if (!form.dueDate) {
      toast({ title: "Bitte Datum eingeben", variant: "destructive" });
      return;
    }
    if (editReminder) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            {editReminder ? "Wiedervorlage bearbeiten" : "Neue Wiedervorlage"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Customer select */}
          <div className="space-y-1.5">
            <Label>Kunde</Label>
            <Select
              value={form.customerId ? String(form.customerId) : ""}
              onValueChange={(v) => setForm((f) => ({ ...f, customerId: Number(v) }))}
              disabled={!!preselectedCustomerId && !editReminder}
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

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="reminder-desc">Aufgabe / Beschreibung</Label>
            <Input
              id="reminder-desc"
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="z.B. Angebot senden, Vertrag verlängern…"
            />
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label htmlFor="reminder-date">Fällig am</Label>
            <Input
              id="reminder-date"
              type="date"
              value={form.dueDate ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </div>

          {/* Status (only when editing) */}
          {editReminder && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status ?? "pending"}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Offen</SelectItem>
                  <SelectItem value="done">Erledigt</SelectItem>
                  <SelectItem value="snoozed">Verschoben</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

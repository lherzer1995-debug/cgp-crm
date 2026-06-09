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
import { ListChecks } from "lucide-react";
import type { Customer, Activity, ActivityTemplate } from "@shared/schema";

const ACTIVITY_TYPES: Record<string, string> = {
  call: "Anruf",
  follow_up: "Follow-up",
  meeting: "Meeting",
  email: "E-Mail",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
};

interface ActivityDialogProps {
  open: boolean;
  onClose: () => void;
  preselectedCustomerId?: number;
  editActivity?: Activity | null;
}

export default function ActivityDialog({
  open,
  onClose,
  preselectedCustomerId,
  editActivity,
}: ActivityDialogProps) {
  const { toast } = useToast();
  const isEdit = !!editActivity;

  const [form, setForm] = useState({
    customerId: preselectedCustomerId ? String(preselectedCustomerId) : "",
    description: "",
    type: "follow_up",
    priority: "medium",
    dueDate: "",
    dueTime: "",
  });

  useEffect(() => {
    if (editActivity) {
      setForm({
        customerId: String(editActivity.customerId),
        description: editActivity.description,
        type: editActivity.type,
        priority: (editActivity as any).priority ?? "medium",
        dueDate: editActivity.dueDate ?? "",
        dueTime: editActivity.dueTime ?? "",
      });
    } else {
      setForm({
        customerId: preselectedCustomerId ? String(preselectedCustomerId) : "",
        description: "",
        type: "follow_up",
        priority: "medium",
        dueDate: "",
        dueTime: "",
      });
    }
  }, [editActivity, preselectedCustomerId, open]);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: open,
  });

  const { data: templates = [] } = useQuery<ActivityTemplate[]>({
    queryKey: ["/api/activity-templates"],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", `/api/customers/${data.customerId}/activities`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      if (form.customerId) {
        queryClient.invalidateQueries({
          queryKey: [`/api/customers/${form.customerId}/activities`],
        });
      }
      toast({ title: "Aufgabe gespeichert ✓" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/activities/${editActivity!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Aufgabe aktualisiert ✓" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => String(t.id) === templateId);
    if (!tpl) return;
    setForm((f) => ({
      ...f,
      description: tpl.description,
      type: tpl.type,
      priority: tpl.priority,
    }));
  };

  const handleSubmit = () => {
    if (!form.customerId) {
      toast({ title: "Bitte Kunden auswählen", variant: "destructive" });
      return;
    }
    if (!form.description.trim()) {
      toast({ title: "Bitte Beschreibung eingeben", variant: "destructive" });
      return;
    }

    const payload: any = {
      customerId: Number(form.customerId),
      description: form.description.trim(),
      type: form.type,
      priority: form.priority,
      dueDate: form.dueDate || null,
      dueTime: form.dueTime || null,
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
            <ListChecks className="w-4 h-4 text-primary" />
            {isEdit ? "Aufgabe bearbeiten" : "Neue Aufgabe"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Template selector */}
          {!isEdit && templates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Aus Template erstellen</Label>
              <Select onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Template wählen (optional)…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="act-desc">Beschreibung *</Label>
            <Textarea
              id="act-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Was ist zu tun?"
              rows={2}
            />
          </div>

          {/* Type + Priority row */}
          <div className="grid grid-cols-2 gap-3">
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
                  {Object.entries(ACTIVITY_TYPES).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priorität</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="act-date">Datum</Label>
              <Input
                id="act-date"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="act-time">Uhrzeit</Label>
              <Input
                id="act-time"
                type="time"
                value={form.dueTime}
                onChange={(e) => setForm((f) => ({ ...f, dueTime: e.target.value }))}
              />
            </div>
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

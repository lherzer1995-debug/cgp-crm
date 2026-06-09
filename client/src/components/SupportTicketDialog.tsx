import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Ticket } from "lucide-react";
import type { SupportTicket } from "@shared/schema";

interface SupportTicketDialogProps {
  open: boolean;
  customerId: number;
  editTicket?: SupportTicket | null;
  onClose: () => void;
}

export default function SupportTicketDialog({
  open,
  customerId,
  editTicket,
  onClose,
}: SupportTicketDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("medium");

  useEffect(() => {
    if (editTicket) {
      setTitle(editTicket.title);
      setDescription(editTicket.description ?? "");
      setStatus(editTicket.status);
      setPriority(editTicket.priority);
    } else {
      setTitle("");
      setDescription("");
      setStatus("open");
      setPriority("medium");
    }
  }, [editTicket, open]);

  const createTicket = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/customers/${customerId}/tickets`, {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "tickets"] });
      toast({ title: "Supportfall erstellt ✓" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const updateTicket = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/customers/${customerId}/tickets/${editTicket!.id}`, {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "tickets"] });
      toast({ title: "Supportfall aktualisiert ✓" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Titel erforderlich", variant: "destructive" });
      return;
    }
    if (editTicket) {
      updateTicket.mutate();
    } else {
      createTicket.mutate();
    }
  };

  const isPending = createTicket.isPending || updateTicket.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            {editTicket ? "Supportfall bearbeiten" : "Neuer Supportfall"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="ticket-title">Titel *</Label>
            <Input
              id="ticket-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kurze Beschreibung des Problems"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ticket-desc">Beschreibung</Label>
            <Textarea
              id="ticket-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detaillierte Beschreibung des Problems…"
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">🟢 Offen</SelectItem>
                  <SelectItem value="in_progress">🟡 In Bearbeitung</SelectItem>
                  <SelectItem value="resolved">✅ Gelöst</SelectItem>
                  <SelectItem value="closed">⚫ Geschlossen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priorität</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 Hoch</SelectItem>
                  <SelectItem value="medium">🟡 Mittel</SelectItem>
                  <SelectItem value="low">🟢 Niedrig</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={isPending || !title.trim()}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editTicket ? "Aktualisieren" : "Erstellen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

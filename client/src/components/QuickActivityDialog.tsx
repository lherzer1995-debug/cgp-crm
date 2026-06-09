import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, Mail, FileText, Loader2 } from "lucide-react";

type QuickType = "call" | "email" | "note";

interface QuickActivityDialogProps {
  open: boolean;
  type: QuickType;
  customerId: number;
  onClose: () => void;
}

const TYPE_CONFIG: Record<QuickType, { label: string; icon: any; placeholder: string; noteType?: string }> = {
  call: {
    label: "Anruf erfassen",
    icon: Phone,
    placeholder: "Was wurde besprochen? Ergebnis des Anrufs…",
  },
  email: {
    label: "E-Mail erfassen",
    icon: Mail,
    placeholder: "Betreff / Inhalt der E-Mail…",
  },
  note: {
    label: "Notiz erfassen",
    icon: FileText,
    placeholder: "Notiz eingeben…",
    noteType: "note",
  },
};

export default function QuickActivityDialog({
  open,
  type,
  customerId,
  onClose,
}: QuickActivityDialogProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  const createActivity = useMutation({
    mutationFn: (desc: string) =>
      apiRequest("POST", `/api/customers/${customerId}/activities`, {
        type: type === "note" ? "follow_up" : type,
        description: desc,
        priority: "medium",
        done: type === "note" ? false : true, // calls/emails are logged as done immediately
        completedAt: type !== "note" ? new Date().toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: `${config.label} gespeichert ✓` });
      setDescription("");
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const createNote = useMutation({
    mutationFn: (desc: string) =>
      apiRequest("POST", `/api/customers/${customerId}/notes`, {
        title: `Schnellnotiz – ${new Date().toLocaleDateString("de-DE")}`,
        content: desc,
        type: "note",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "notes"] });
      toast({ title: "Notiz gespeichert ✓" });
      setDescription("");
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!description.trim()) {
      toast({ title: "Bitte Beschreibung eingeben", variant: "destructive" });
      return;
    }
    if (type === "note") {
      createNote.mutate(description);
    } else {
      createActivity.mutate(description);
    }
  };

  const isPending = createActivity.isPending || createNote.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setDescription(""); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {config.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="quick-desc">Beschreibung</Label>
            <Textarea
              id="quick-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={config.placeholder}
              rows={4}
              className="resize-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  handleSave();
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground">Strg+Enter zum Speichern</p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setDescription(""); onClose(); }}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isPending || !description.trim()}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

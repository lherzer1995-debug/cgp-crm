import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Monitor } from "lucide-react";
import type { Terminal } from "@/lib/contractHelpers";

const TERMINAL_TYPES = [
  "stationär",
  "mobil",
  "portabel",
  "online",
  "SoftPOS / Tap to Pay",
  "Sonstiges",
];

const TERMINAL_STATUSES: { value: Terminal["status"]; label: string }[] = [
  { value: "active",   label: "Aktiv" },
  { value: "inactive", label: "Inaktiv" },
  { value: "defect",   label: "Defekt" },
];

interface TerminalDialogProps {
  open: boolean;
  onClose: () => void;
  /** Existing terminal to edit; undefined = new terminal */
  editTerminal?: Terminal | null;
  onSave: (terminal: Terminal) => void;
}

export default function TerminalDialog({
  open,
  onClose,
  editTerminal,
  onSave,
}: TerminalDialogProps) {
  const [form, setForm] = useState<{ type: string; count: string; status: Terminal["status"] }>({
    type: "stationär",
    count: "1",
    status: "active",
  });

  useEffect(() => {
    if (editTerminal) {
      setForm({
        type: editTerminal.type,
        count: String(editTerminal.count),
        status: editTerminal.status,
      });
    } else {
      setForm({ type: "stationär", count: "1", status: "active" });
    }
  }, [editTerminal, open]);

  const handleSave = () => {
    const count = parseInt(form.count, 10);
    if (!form.type.trim() || isNaN(count) || count < 1) return;
    onSave({ type: form.type.trim(), count, status: form.status });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            {editTerminal ? "Terminal bearbeiten" : "Terminal hinzufügen"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Typ */}
          <div className="space-y-1.5">
            <Label>Typ *</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Typ wählen…" />
              </SelectTrigger>
              <SelectContent>
                {TERMINAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Anzahl */}
          <div className="space-y-1.5">
            <Label htmlFor="terminal-count">Anzahl *</Label>
            <Input
              id="terminal-count"
              type="number"
              min="1"
              step="1"
              value={form.count}
              onChange={(e) => setForm((f) => ({ ...f, count: e.target.value }))}
              placeholder="1"
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as Terminal["status"] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMINAL_STATUSES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-1">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button
              onClick={handleSave}
              disabled={!form.type.trim() || !form.count || parseInt(form.count, 10) < 1}
            >
              Speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/queryClient";
import {
  Upload, FileText, Trash2, Download, Loader2, File, FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attachment } from "@shared/schema";

interface AttachmentUploadProps {
  noteId: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ fileType }: { fileType: string }) {
  if (fileType.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
  if (fileType.includes("sheet") || fileType.includes("excel")) return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
  return <File className="w-4 h-4 text-blue-500" />;
}

export default function AttachmentUpload({ noteId }: AttachmentUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: ["/api/notes", noteId, "attachments"],
    queryFn: async () => {
      // We fetch attachments via the note's attachment list
      // Since there's no dedicated GET endpoint, we store them in the note query
      return [];
    },
    enabled: false, // Attachments are loaded as part of the note detail
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`${API_BASE}/api/attachments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes", noteId, "attachments"] });
      toast({ title: "Anhang gelöscht" });
    },
  });

  const handleUpload = async (file: File) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "Datei zu groß", description: "Maximale Dateigröße: 10 MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/notes/${noteId}/attachments`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload fehlgeschlagen");
      queryClient.invalidateQueries({ queryKey: ["/api/notes", noteId, "attachments"] });
      toast({ title: "Datei hochgeladen ✓", description: file.name });
    } catch (err: any) {
      toast({ title: "Upload fehlgeschlagen", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2 min-h-[36px]"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Hochladen…</>
        ) : (
          <><Upload className="w-3.5 h-3.5" /> Datei anhängen</>
        )}
      </Button>
      <p className="text-[10px] text-muted-foreground">PDF, DOC, DOCX, XLS, XLSX · max. 10 MB</p>

      {attachments.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-secondary/40 border border-border"
            >
              <FileIcon fileType={att.fileType} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{att.fileName}</p>
                <p className="text-[10px] text-muted-foreground">{formatBytes(att.fileSize)}</p>
              </div>
              <a
                href={`${API_BASE}/api/attachments/${att.id}/download`}
                download={att.fileName}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Herunterladen"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(att.id)}
                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Löschen"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

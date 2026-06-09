import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, List, Link2, Type, AlignLeft, FileText, Phone, Users, Mail,
} from "lucide-react";

interface NoteEditorProps {
  title: string;
  content: string;
  type: string;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onTemplateApply?: (content: string) => void;
  templates?: { id: number; name: string; content: string }[];
}

const NOTE_TYPES = [
  { value: "note", label: "Notiz", icon: FileText, color: "text-muted-foreground" },
  { value: "call", label: "Anruf", icon: Phone, color: "text-green-600" },
  { value: "meeting", label: "Meeting", icon: Users, color: "text-indigo-600" },
  { value: "email", label: "E-Mail", icon: Mail, color: "text-cyan-600" },
];

// Simple rich-text toolbar that operates on a contenteditable div
export default function NoteEditor({
  title, content, type,
  onTitleChange, onContentChange, onTypeChange,
  onTemplateApply, templates = [],
}: NoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  const execCmd = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    // Sync content after command
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML);
    }
  }, [onContentChange]);

  const handleInput = () => {
    if (editorRef.current) {
      onContentChange(editorRef.current.innerHTML);
    }
  };

  const handleLinkInsert = () => {
    const url = window.prompt("URL eingeben:", "https://");
    if (url) execCmd("createLink", url);
  };

  const applyTemplate = (templateContent: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = templateContent;
      onContentChange(templateContent);
    }
    onTemplateApply?.(templateContent);
  };

  // Sync editor content when content prop changes externally (e.g. template apply)
  const syncedContent = useRef(content);
  if (editorRef.current && content !== syncedContent.current && !focused) {
    editorRef.current.innerHTML = content;
    syncedContent.current = content;
  }

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="note-title">Titel <span className="text-destructive">*</span></Label>
        <Input
          id="note-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Notiz-Titel…"
          data-testid="input-note-title"
        />
      </div>

      {/* Type pills + Template row */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Typ</Label>
          <div className="flex gap-2 flex-wrap">
            {NOTE_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  data-testid={t.value === type ? "select-note-type-active" : undefined}
                  onClick={() => onTypeChange(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                    type === t.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-3 h-3", type === t.value ? "text-primary-foreground" : t.color)} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {templates.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Template (optional)</Label>
            <Select onValueChange={(v) => {
              const tpl = templates.find((t) => String(t.id) === v);
              if (tpl) applyTemplate(tpl.content);
            }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Template wählen…" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Rich-text editor */}
      <div className="space-y-1.5">
        <Label>Inhalt</Label>
        <div className={cn(
          "rounded-md border bg-background transition-colors",
          focused ? "border-ring ring-1 ring-ring" : "border-input"
        )}>
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30 rounded-t-md flex-wrap">
            <ToolbarButton icon={Bold} title="Fett (Ctrl+B)" onClick={() => execCmd("bold")} />
            <ToolbarButton icon={Italic} title="Kursiv (Ctrl+I)" onClick={() => execCmd("italic")} />
            <div className="w-px h-4 bg-border mx-1" />
            <ToolbarButton icon={List} title="Liste" onClick={() => execCmd("insertUnorderedList")} />
            <ToolbarButton icon={AlignLeft} title="Nummerierte Liste" onClick={() => execCmd("insertOrderedList")} />
            <div className="w-px h-4 bg-border mx-1" />
            <ToolbarButton icon={Link2} title="Link einfügen" onClick={handleLinkInsert} />
            <div className="w-px h-4 bg-border mx-1" />
            <ToolbarButton icon={Type} title="Überschrift" onClick={() => execCmd("formatBlock", "<h3>")} />
          </div>

          {/* Editable area */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            dangerouslySetInnerHTML={{ __html: content }}
            data-testid="note-editor-content"
            className={cn(
              "min-h-[140px] max-h-[320px] overflow-y-auto px-3 py-2.5 text-sm text-foreground outline-none rounded-b-md",
              "prose prose-sm dark:prose-invert max-w-none",
              "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1",
              "[&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4",
              "[&_a]:text-primary [&_a]:underline",
              "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
            )}
            data-placeholder="Notiz-Inhalt eingeben…"
          />
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ icon: Icon, title, onClick }: { icon: any; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

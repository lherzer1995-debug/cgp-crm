import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, List, Link2, Type, AlignLeft,
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
  { value: "note", label: "Notiz" },
  { value: "call", label: "Anruf" },
  { value: "meeting", label: "Meeting" },
  { value: "email", label: "E-Mail" },
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

      {/* Type + Template row */}
      <div className="flex gap-3 flex-wrap">
        <div className="space-y-1.5 flex-1 min-w-[140px]">
          <Label>Typ</Label>
          <Select value={type} onValueChange={onTypeChange}>
            <SelectTrigger data-testid="select-note-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {templates.length > 0 && (
          <div className="space-y-1.5 flex-1 min-w-[140px]">
            <Label>Template</Label>
            <Select onValueChange={(v) => {
              const tpl = templates.find((t) => String(t.id) === v);
              if (tpl) applyTemplate(tpl.content);
            }}>
              <SelectTrigger>
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

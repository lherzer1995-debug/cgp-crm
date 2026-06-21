"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, Calendar,
  Sparkles, Send, Clock, AlertCircle, User, Tag,
  FileText, ListTodo, MessageSquare, Plus,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { getInitials, formatDate, getStatusColor } from "@/lib/utils";

interface Customer {
  id: string; name: string; contactPerson: string; email: string; phone: string;
  street: string; city: string; industry: string; status: string; priority: number;
  notes: string; latitude: number; longitude: number; lastVisit: string; createdAt: string;
  tags: { tag: { id: string; name: string; color: string } }[];
  _count: { activities: number; noteEntries: number; tasks: number; appointments: number };
}

interface TimelineItem {
  _type: string; _date: string; id: string; title?: string; content?: string;
  type?: string; startTime?: string; priority?: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [summary, setSummary] = useState("");
  const [activeTab, setActiveTab] = useState("timeline");
  const [noteInput, setNoteInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    loadData();
  }, [params.id]);

  async function loadData() {
    try {
      const [c, tl, s] = await Promise.all([
        apiClient.customers.get(params.id as string),
        apiClient.customers.timeline(params.id as string),
        apiClient.customers.summary(params.id as string),
      ]);
      setCustomer(c as any);
      setTimeline(tl as any);
      setSummary((s as any).summary);
    } catch (err) {
      console.error("Load error", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleProcessNote() {
    if (!noteInput.trim()) return;
    setProcessing(true);
    try {
      await apiClient.ai.processNote(params.id as string, noteInput);
      setNoteInput("");
      await loadData();
    } catch (err) {
      console.error("Note processing error", err);
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="bento-card text-center py-16">
        <p className="text-white/40">Kunde nicht gefunden</p>
      </div>
    );
  }

  const tabs = [
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "notes", label: "Notizen", icon: FileText },
    { id: "tasks", label: "Aufgaben", icon: ListTodo },
    { id: "info", label: "Info", icon: User },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Back */}
      <button onClick={() => router.back()} className="btn-ghost flex items-center gap-2">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </button>

      {/* Customer Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500/20 to-purple-600/20 flex items-center justify-center text-xl font-bold text-accent-400 flex-shrink-0">
            {getInitials(customer.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
              <span className={getStatusColor(customer.status)}>{customer.status}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                customer.priority >= 4 ? "bg-rose-500/10 text-rose-400" :
                customer.priority >= 3 ? "bg-accent-500/10 text-accent-400" : "bg-white/[0.04] text-white/30"
              }`}>P{customer.priority}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-white/40">
              {customer.contactPerson && <span className="flex items-center gap-1"><User className="w-3 h-3" />{customer.contactPerson}</span>}
              {customer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{customer.email}</span>}
              {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</span>}
              {customer.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{customer.city}</span>}
              {customer.industry && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{customer.industry}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">{customer._count?.appointments || 0} Termine</span>
            <span className="text-xs text-white/20">•</span>
            <span className="text-xs text-white/30">{customer._count?.tasks || 0} Tasks</span>
          </div>
        </div>

        {/* Tags */}
        {customer.tags?.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.04]">
            <Tag className="w-3 h-3 text-white/20" />
            {customer.tags.map((t) => (
              <span key={t.tag.id} className="badge-ghost text-xs">{t.tag.name}</span>
            ))}
          </div>
        )}

        {/* AI Summary */}
        {summary && (
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <div className="flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-white/60 leading-relaxed">{summary}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* AI Note Input */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-xs text-white/30">
              KI-Notiz — Beschreibe deinen Besuch, die KI erledigt den Rest
            </p>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="z.B. Kunde interessiert sich für Premium-Paket. Im August nochmal anrufen. Ehefrau entscheidet mit..."
              rows={3}
              className="glass-input resize-none"
            />
            <div className="flex justify-end">
              <button
                onClick={handleProcessNote}
                disabled={processing || !noteInput.trim()}
                className="btn-primary flex items-center gap-2 text-xs"
              >
                {processing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {processing ? "KI verarbeitet..." : "KI-Notiz verarbeiten"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.04]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-[1px] ${
                activeTab === tab.id
                  ? "text-white border-accent-500"
                  : "text-white/30 border-transparent hover:text-white/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {activeTab === "timeline" && (
          <TimelineView items={timeline} />
        )}
        {activeTab === "notes" && (
          <NotesView customerId={customer.id} />
        )}
        {activeTab === "tasks" && (
          <TasksView customerId={customer.id} />
        )}
        {activeTab === "info" && (
          <InfoView customer={customer} />
        )}
      </div>
    </div>
  );
}

function TimelineView({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <div className="bento-card text-center py-12">
        <Clock className="w-8 h-8 text-white/10 mx-auto mb-3" />
        <p className="text-sm text-white/30">Noch keine Aktivitäten</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.slice(0, 30).map((item) => (
        <div key={item.id} className="glass-card p-4 flex items-start gap-3">
          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
            item._type === "note" ? "bg-accent-400" :
            item._type === "appointment" ? "bg-success" :
            item._type === "task" ? "bg-warning" : "bg-white/20"
          }`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-white/50 uppercase">
                {item._type === "note" ? "Notiz" : item._type === "appointment" ? "Termin" : item._type === "task" ? "Aufgabe" : "Aktivität"}
              </span>
              <span className="text-xs text-white/20">{formatDate(item._date)}</span>
            </div>
            <p className="text-sm mt-1">{item.title || item.content || (item as any).summary || (item as any).name}</p>
            {item.priority && (
              <span className={`text-xs mt-1 inline-block ${
                item.priority === "high" || item.priority === "urgent" ? "text-rose-400" : "text-white/30"
              }`}>{item.priority}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesView({ customerId }: { customerId: string }) {
  const [notes, setNotes] = useState<any[]>([]);
  useEffect(() => {
    apiClient.customers.notes(customerId).then(setNotes).catch(() => {});
  }, [customerId]);

  if (notes.length === 0) {
    return (
      <div className="bento-card text-center py-12">
        <FileText className="w-8 h-8 text-white/10 mx-auto mb-3" />
        <p className="text-sm text-white/30">Keine Notizen vorhanden</p>
        <p className="text-xs text-white/20 mt-1">Verwende die KI-Notiz oben</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <div key={note.id} className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/30">{formatDate(note.createdAt)}</span>
            {note.aiProcessed && (
              <span className="badge-accent text-[10px]"><Sparkles className="w-2.5 h-2.5" />KI</span>
            )}
          </div>
          <p className="text-sm text-white/80 leading-relaxed">{note.content}</p>
          {note.actionItems?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/[0.04] space-y-1">
              <p className="text-xs text-white/30">Aufgaben extrahiert:</p>
              {note.actionItems.map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                  <div className="w-1 h-1 rounded-full bg-accent-400" />
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function TasksView({ customerId }: { customerId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  useEffect(() => {
    apiClient.tasks.list().then(setTasks).catch(() => {});
  }, [customerId]);

  const filtered = tasks.filter((t: any) => t.customerId === customerId);

  if (filtered.length === 0) {
    return (
      <div className="bento-card text-center py-12">
        <ListTodo className="w-8 h-8 text-white/10 mx-auto mb-3" />
        <p className="text-sm text-white/30">Keine Aufgaben</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((task: any) => (
        <div key={task.id} className="glass-card p-4 flex items-center gap-3">
          <div className={`w-5 h-5 rounded border ${
            task.status === "completed" ? "bg-success/20 border-success" : "border-white/[0.08]"
          } flex items-center justify-center`}>
            {task.status === "completed" && <span className="text-success text-xs">✓</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${task.status === "completed" ? "line-through text-white/30" : ""}`}>
              {task.title}
            </p>
            {task.dueDate && (
              <p className="text-xs text-white/30 mt-0.5">Fällig: {formatDate(task.dueDate)}</p>
            )}
          </div>
          <span className={`text-xs font-medium ${
            task.priority === "urgent" ? "text-rose-400" :
            task.priority === "high" ? "text-warning" : "text-white/30"
          }`}>{task.priority}</span>
        </div>
      ))}
    </div>
  );
}

function InfoView({ customer }: { customer: Customer }) {
  const fields = [
    { label: "Ansprechpartner", value: customer.contactPerson, icon: User },
    { label: "E-Mail", value: customer.email, icon: Mail },
    { label: "Telefon", value: customer.phone, icon: Phone },
    { label: "Straße", value: customer.street, icon: MapPin },
    { label: "Stadt", value: customer.city, icon: MapPin },
    { label: "Branche", value: customer.industry, icon: Building2 },
    { label: "Letzter Besuch", value: customer.lastVisit ? formatDate(customer.lastVisit) : "—", icon: Calendar },
    { label: "Kunde seit", value: formatDate(customer.createdAt), icon: Calendar },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {fields.map((f) => {
        const Icon = f.icon;
        return (
          <div key={f.label} className="glass-card p-4 flex items-center gap-3">
            <Icon className="w-4 h-4 text-white/20 flex-shrink-0" />
            <div>
              <p className="text-xs text-white/30">{f.label}</p>
              <p className="text-sm">{f.value || "—"}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus,
  Clock, MapPin, Sparkles, ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatTime } from "@/lib/utils";

interface Appointment {
  id: string; title: string; startTime: string; endTime: string;
  location: string; status: string; calendarLink?: string;
  customer?: { id: string; name: string; city: string };
}

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, [selectedDate]);

  async function loadAppointments() {
    try {
      const data = await apiClient.appointments.list(selectedDate);
      setAppointments(data as any);
    } catch (err) {
      console.error("Load appointments error", err);
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const isToday = selectedDate === today;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-display-sm gradient-text">Kalender</h2>
          <p className="text-sm text-white/40 mt-1">
            {appointments.length} Termine am {new Date(selectedDate).toLocaleDateString("de-DE", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(d.toISOString().split("T")[0]);
          }} className="btn-icon"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setSelectedDate(today)} className={`text-xs font-medium px-3 py-1.5 rounded-xl ${
            isToday ? "bg-accent-500/10 text-accent-400" : "btn-ghost"
          }`}>Heute</button>
          <button onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            setSelectedDate(d.toISOString().split("T")[0]);
          }} className="btn-icon"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-xs">
            <Plus className="w-3.5 h-3.5" /> Termin
          </button>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="bento-card text-center py-16">
          <CalendarDays className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">Keine Termine an diesem Tag</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 text-xs">Termin erstellen</button>
        </div>
      ) : (
        <div className="space-y-1">
          {appointments.map((app, i) => {
            const startHour = new Date(app.startTime).getHours();
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass-card p-4 flex items-center gap-4 group"
              >
                <div className="text-center flex-shrink-0 w-14">
                  <p className="text-lg font-semibold tracking-tight">{formatTime(app.startTime)}</p>
                  <p className="text-xs text-white/30">{formatTime(app.endTime)}</p>
                </div>
                <div className="w-0.5 h-12 rounded-full bg-accent-500/30 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{app.title}</p>
                    {app.calendarLink && (
                      <a href={app.calendarLink} target="_blank" className="text-accent-400">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {app.customer?.name && (
                    <p className="text-xs text-white/40 mt-0.5">{app.customer.name}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {app.location && (
                      <span className="flex items-center gap-1 text-xs text-white/30">
                        <MapPin className="w-3 h-3" />{app.location}
                      </span>
                    )}
                    {app.customer?.city && (
                      <span className="flex items-center gap-1 text-xs text-white/30">
                        <MapPin className="w-3 h-3" />{app.customer.city}
                      </span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      app.status === "confirmed" ? "badge-success" :
                      app.status === "completed" ? "badge-ghost" : "badge-accent"
                    }`}>{app.status}</span>
                  </div>
                </div>
                <button className="btn-secondary text-xs opacity-0 group-hover:opacity-100">
                  Google Calendar
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddAppointmentModal
          selectedDate={selectedDate}
          onClose={() => setShowAdd(false)}
          onCreated={loadAppointments}
        />
      )}
    </div>
  );
}

function AddAppointmentModal({
  selectedDate, onClose, onCreated,
}: {
  selectedDate: string; onClose: () => void; onCreated: () => void;
}) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "", customerId: "", location: "",
    startTime: `${selectedDate}T09:00`,
    endTime: `${selectedDate}T10:00`,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.customers.list().then(setCustomers).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.appointments.create(form);
      onCreated();
      onClose();
    } catch (err) {
      console.error("Create appointment error", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-md p-6 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Neuer Termin</h3>
          <button onClick={onClose} className="btn-icon">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-white/40">Titel *</label>
            <input required className="glass-input" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/40">Kunde</label>
            <select className="glass-input" value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Kein Kunde</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-white/40">Ort</label>
            <input className="glass-input" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Start</label>
              <input type="datetime-local" required className="glass-input" value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Ende</label>
              <input type="datetime-local" required className="glass-input" value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Wird erstellt..." : "Termin erstellen"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

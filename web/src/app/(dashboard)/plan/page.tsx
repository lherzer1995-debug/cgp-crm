"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Cpu, Sparkles, Clock, MapPin, RefreshCw,
  CheckCircle2, AlertCircle, Sun, Coffee,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface DailyPlan {
  date: string;
  appointments: { time: string; customer: string; title: string }[];
  priorityTasks: { title: string; customer: string; priority: string; dueDate: string }[];
  overdueCount: number;
  summary: string;
}

export default function PlanPage() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadPlan();
  }, []);

  async function loadPlan() {
    try {
      const data = await apiClient.ai.dailyPlan();
      setPlan(data as any);
    } catch (err) {
      console.error("Load plan error", err);
    } finally {
      setLoading(false);
    }
  }

  async function generateNewPlan() {
    setGenerating(true);
    try {
      const data = await apiClient.ai.dailyPlan();
      setPlan(data as any);
    } catch (err) {
      console.error("Generate plan error", err);
    } finally {
      setGenerating(false);
    }
  }

  // Timeline blocks for the day
  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-display-sm gradient-text">Tagesplan</h2>
          <p className="text-sm text-white/40 mt-1">
            {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <button
          onClick={generateNewPlan}
          disabled={generating}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "KI plant..." : "Neu planen"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : !plan ? (
        <div className="bento-card text-center py-16">
          <Cpu className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">Noch kein Tagesplan</p>
          <button onClick={generateNewPlan} className="btn-primary mt-4">
            Tagesplan erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2 space-y-1">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-accent-400" />
              <h3 className="text-sm font-semibold">Tagesablauf</h3>
              <span className="text-xs text-white/30 ml-auto">{plan.summary}</span>
            </div>

            <div className="relative">
              {/* Time axis line */}
              <div className="absolute left-[72px] top-0 bottom-0 w-px bg-white/[0.04]" />

              {timeSlots.map((slot) => {
                const appt = plan.appointments.find((a) => a.time.startsWith(slot.slice(0, 2)));
                const isLunch = slot === "12:00" || slot === "12:30";
                const isMorning = slot === "08:00";

                return (
                  <div key={slot} className="flex items-start gap-4 py-1.5 group">
                    <div className="w-16 text-right flex-shrink-0">
                      <span className={`text-xs font-medium ${
                        appt ? "text-white" : "text-white/20"
                      }`}>{slot}</span>
                    </div>
                    <div className="relative flex items-center py-1">
                      <div className={`w-2 h-2 rounded-full border-2 ${
                        appt ? "bg-accent-500 border-accent-500 shadow-[0_0_8px_rgba(43,159,255,0.3)]" :
                        isLunch ? "bg-amber-500/30 border-amber-500/20" :
                        "bg-white/[0.04] border-white/[0.06]"
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {appt ? (
                        <motion.div
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="glass-card p-3 -ml-1"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{appt.customer}</p>
                            <Sparkles className="w-3 h-3 text-accent-400" />
                          </div>
                          <p className="text-xs text-white/40 mt-0.5">{appt.title}</p>
                        </motion.div>
                      ) : isLunch ? (
                        <div className="flex items-center gap-2 text-xs text-white/20">
                          <Coffee className="w-3 h-3" />
                          Mittagspause
                        </div>
                      ) : isMorning ? (
                        <div className="flex items-center gap-2 text-xs text-white/20">
                          <Sun className="w-3 h-3" />
                          Reisezeit / Vorbereitung
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Priority Tasks Sidebar */}
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bento-card">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-4 h-4 text-accent-400" />
                <h3 className="text-sm font-semibold">Zusammenfassung</h3>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{plan.summary}</p>
            </div>

            {/* Priority Tasks */}
            <div className="bento-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  <h3 className="text-sm font-semibold">Prioritäten</h3>
                </div>
                {plan.overdueCount > 0 && (
                  <span className="badge-danger text-[10px]">{plan.overdueCount} überfällig</span>
                )}
              </div>

              <div className="space-y-2">
                {plan.priorityTasks.map((task, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      task.priority === "urgent" ? "text-rose-400" : "text-accent-400"
                    }`} />
                    <div>
                      <p className="text-sm">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.customer && (
                          <span className="text-xs text-white/30">{task.customer}</span>
                        )}
                        {task.dueDate && (
                          <span className="text-xs text-white/20">Fällig: {task.dueDate}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {plan.priorityTasks.length === 0 && (
                  <p className="text-sm text-white/30 text-center py-4">Keine prioritären Aufgaben</p>
                )}
              </div>
            </div>

            {/* Appointments Summary */}
            <div className="bento-card">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-accent-400" />
                <h3 className="text-sm font-semibold">Route</h3>
              </div>
              <div className="space-y-2">
                {plan.appointments.map((appt, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-white/30 w-10">{appt.time}</span>
                    <span className="text-white/60">{appt.customer}</span>
                    {i < plan.appointments.length - 1 && (
                      <span className="text-[10px] text-white/20">→</span>
                    )}
                  </div>
                ))}
                {plan.appointments.length === 0 && (
                  <p className="text-sm text-white/30 text-center py-4">Keine Termine</p>
                )}
              </div>
              <button className="btn-secondary w-full text-xs mt-4">
                Route optimieren lassen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

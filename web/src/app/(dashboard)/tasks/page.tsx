"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ListTodo, Plus, CheckCircle2, Clock, AlertCircle, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Task {
  id: string; title: string; description: string; priority: string; status: string;
  dueDate: string; aiGenerated: boolean; customer?: { id: string; name: string };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    loadTasks();
  }, [filter]);

  async function loadTasks() {
    try {
      const data = await apiClient.tasks.list(filter || undefined);
      setTasks(data as any);
    } catch (err) {
      console.error("Load tasks error", err);
    } finally {
      setLoading(false);
    }
  }

  async function completeTask(id: string) {
    await apiClient.tasks.complete(id);
    loadTasks();
  }

  async function deleteTask(id: string) {
    await apiClient.tasks.delete(id);
    loadTasks();
  }

  const pendingTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-display-sm gradient-text">Aufgaben</h2>
          <p className="text-sm text-white/40 mt-1">{pendingTasks.length} offen • {completedTasks.length} erledigt</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="glass-input w-36 text-xs">
            <option value="">Alle</option>
            <option value="urgent">Dringend</option>
            <option value="high">Hoch</option>
            <option value="medium">Mittel</option>
            <option value="low">Niedrig</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : pendingTasks.length === 0 ? (
        <div className="bento-card text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-success/30 mx-auto mb-4" />
          <p className="text-white/40">Alle Aufgaben erledigt! 🎉</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pendingTasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="glass-card p-4 flex items-center gap-4 group"
            >
              <button
                onClick={() => completeTask(task.id)}
                className="w-5 h-5 rounded border border-white/[0.08] hover:border-success/50 flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-transparent group-hover:text-success/50" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{task.title}</p>
                  {task.aiGenerated && (
                    <Sparkles className="w-3 h-3 text-accent-400" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {task.customer?.name && (
                    <span className="text-xs text-white/30">{task.customer.name}</span>
                  )}
                  {task.dueDate && (
                    <span className="flex items-center gap-1 text-xs text-white/30">
                      <Clock className="w-3 h-3" />
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                task.priority === "urgent" ? "bg-rose-500/10 text-rose-400" :
                task.priority === "high" ? "bg-warning/10 text-warning" :
                task.priority === "medium" ? "bg-accent-500/10 text-accent-400" :
                "bg-white/[0.04] text-white/30"
              }`}>{task.priority}</span>
              <button onClick={() => deleteTask(task.id)} className="btn-icon opacity-0 group-hover:opacity-100 text-rose-400/50 hover:text-rose-400">
                ✕
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Completed */}
      {completedTasks.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-white/30 uppercase tracking-wider mb-3">Erledigt</h3>
          <div className="space-y-1">
            {completedTasks.slice(0, 10).map((task) => (
              <div key={task.id} className="glass-card p-3 flex items-center gap-3 opacity-50">
                <div className="w-5 h-5 rounded border border-success/30 bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-success" />
                </div>
                <p className="text-sm line-through text-white/40">{task.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

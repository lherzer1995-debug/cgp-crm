"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, ListTodo, CalendarDays, TrendingUp, Sparkles,
  ArrowRight, Target, Clock, MapPin,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import Link from "next/link";

interface Stats {
  totalCustomers: number;
  openTasks: number;
  todayAppointments: number;
  highPriority: number;
}

interface Briefing {
  briefing: string;
}

interface Customer {
  id: string;
  name: string;
  city: string;
  industry: string;
  priority: number;
  status: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, briefingData, customersData] = await Promise.all([
          apiClient.ai.stats(),
          apiClient.ai.briefing(),
          apiClient.customers.list(),
        ]);
        setStats(statsData);
        setBriefing(briefingData as any);
        setCustomers(customersData as any);
      } catch (err) {
        console.error("Dashboard load error", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: "Kunden", value: stats?.totalCustomers ?? 0, icon: Users, color: "from-accent-500 to-blue-600" },
    { label: "Offene Aufgaben", value: stats?.openTasks ?? 0, icon: ListTodo, color: "from-amber-500 to-orange-600" },
    { label: "Termine heute", value: stats?.todayAppointments ?? 0, icon: CalendarDays, color: "from-emerald-500 to-teal-600" },
    { label: "Hohe Priorität", value: stats?.highPriority ?? 0, icon: TrendingUp, color: "from-rose-500 to-pink-600" },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      {/* AI Briefing */}
      {briefing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-border"
        >
          <div className="glass-panel p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/3 rounded-full blur-3xl" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-accent-400 uppercase tracking-wider">KI-Assistant</span>
                  <span className="text-[10px] text-white/20">•</span>
                  <span className="text-[10px] text-white/20">Guten Morgen</span>
                </div>
                <p className="text-sm md:text-base text-white/80 leading-relaxed text-balance">
                  {briefing.briefing}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bento-card"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl md:text-3xl font-semibold tracking-tight">{card.value}</p>
                <p className="text-xs text-white/40">{card.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Customers */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bento-card"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Target className="w-4 h-4 text-accent-400" />
              <h2 className="text-sm font-semibold">Wichtige Kunden</h2>
            </div>
            <Link href="/customers" className="text-xs text-accent-400 hover:text-accent-300 transition-colors">
              Alle anzeigen →
            </Link>
          </div>

          <div className="space-y-2">
            {customers
              .filter((c) => c.priority >= 3)
              .slice(0, 5)
              .map((c, i) => (
                <Link
                  key={c.id}
                  href={`/customers/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${
                      c.priority >= 4 ? "from-rose-500/20 to-pink-600/20 text-rose-400" : "from-accent-500/10 to-blue-600/10 text-accent-400"
                    } flex items-center justify-center text-xs font-semibold flex-shrink-0`}>
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-white/30 truncate">{c.city} • {c.industry}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium ${
                      c.priority >= 4 ? "text-rose-400" : c.priority >= 3 ? "text-accent-400" : "text-white/30"
                    }`}>
                      P{c.priority}
                    </span>
                    <ArrowRight className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
                  </div>
                </Link>
              ))}
            {customers.filter((c) => c.priority >= 3).length === 0 && (
              <p className="text-sm text-white/30 text-center py-6">Keine Kunden mit hoher Priorität</p>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bento-card"
        >
          <div className="flex items-center gap-3 mb-5">
            <Clock className="w-4 h-4 text-accent-400" />
            <h2 className="text-sm font-semibold">Schnellzugriff</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/customers" className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all group">
              <Users className="w-5 h-5 text-accent-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium">Kunden</p>
              <p className="text-xs text-white/30 mt-0.5">Verwalten</p>
            </Link>
            <Link href="/tasks" className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all group">
              <ListTodo className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium">Aufgaben</p>
              <p className="text-xs text-white/30 mt-0.5">Erledigen</p>
            </Link>
            <Link href="/map" className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all group">
              <MapPin className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium">Route</p>
              <p className="text-xs text-white/30 mt-0.5">Optimieren</p>
            </Link>
            <Link href="/plan" className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-all group">
              <Sparkles className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium">Tagesplan</p>
              <p className="text-xs text-white/30 mt-0.5">KI-generiert</p>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

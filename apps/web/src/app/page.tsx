"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles, Users, Calendar, Search, Plus, MapPin, Building2, Euro, Zap,
  Activity, ChevronRight, RefreshCw, Target, ArrowUpRight, ArrowDownRight,
  LayoutDashboard, Menu, X, AlertTriangle, AlertCircle, Command, BarChart3,
  Phone, Mail, CheckCircle2, Clock3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function fetchJSON(url: string, opts?: RequestInit) {
  const r = await fetch(`${API}${url}`, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

type View = "dashboard" | "customers" | "detail";
interface Customer { id: string; name: string; contactPerson?: string; email?: string; phone?: string; city?: string; industry?: string; notes?: string; contractEnd?: string; riskScore?: number; status?: string; }
interface Activity { id: string; customerId: string; type: string; title: string; done: boolean; dueDate?: string; createdAt: string; }
interface Commission { id: string; customerId: string; amount: number; date: string; type: string; }

const rings = ["from-accent-400 to-accent-600","from-violet-400 to-fuchsia-500","from-teal-400 to-emerald-500","from-amber-400 to-orange-500","from-rose-400 to-red-500","from-cyan-400 to-blue-500"];
const init = (n: string) => n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [briefing, setBriefing] = useState("");
  const [stats, setStats] = useState({ totalCustomers: 0, openActivities: 0, totalCommissions: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [filterTag, setFilterTag] = useState("all");

  const e = (msg: string) => { setError(msg); setTimeout(() => setError(null), 5000); };

  useEffect(() => {
    fetchJSON("/ai/stats").then(setStats).catch(() => {});
    fetchJSON("/customers").then(setCustomers).catch(() => {});
    fetchJSON("/ai/briefing").then((d: any) => setBriefing(d.briefing)).catch(() => {});
  }, []);

  const nav = (v: View, id?: string) => { setView(v); if (id) setSelectedId(id); setSearch(""); setMobileMenu(false); };
  const c = customers.find(x => x.id === selectedId);
  const tags = ["all", ...new Set(customers.flatMap(c => c.industry ? [c.industry] : []))];
  const filtered = customers.filter(c => filterTag === "all" || c.industry === filterTag)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-surface-base text-white">
      {/* ── Mobile Header ── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 bg-surface-base/80 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-glow-sm">
              <Command className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight">CGP CRM</span>
          </div>
          <button onClick={() => setMobileMenu(!mobileMenu)} className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center">
            {mobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
        <AnimatePresence>
          {mobileMenu && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-3 overflow-hidden">
              <NavBtn active={view==="dashboard"} onClick={()=>nav("dashboard")} icon={<LayoutDashboard className="w-4 h-4"/>} label="Dashboard" />
              <NavBtn active={view==="customers"} onClick={()=>nav("customers")} icon={<Users className="w-4 h-4"/>} label="Customers" badge={customers.length} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] bg-surface-base/70 backdrop-blur-2xl border-r border-white/[0.04] flex-col z-50">
        <div className="px-5 py-5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-glow-sm">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">CGP CRM</h1>
              <p className="text-[10px] text-muted font-medium">Enterprise Suite</p>
            </div>
          </div>
          <nav className="space-y-0.5">
            <NavBtn active={view==="dashboard"} onClick={()=>nav("dashboard")} icon={<LayoutDashboard className="w-4 h-4"/>} label="Dashboard" />
            <NavBtn active={view==="customers"} onClick={()=>nav("customers")} icon={<Users className="w-4 h-4"/>} label="Customers" badge={customers.length} />
          </nav>
        </div>
        <div className="mt-auto px-5 py-4 border-t border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center text-[10px] font-bold">AD</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">Admin</p>
              <p className="text-[10px] text-muted">admin@cgp.de</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="lg:pl-[240px] pt-14 lg:pt-0">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 py-6 lg:py-10">
          <AnimatePresence mode="wait">
            {view === "dashboard" && <Dashboard key="dash" />}
            {view === "customers" && <Customers key="cust" />}
            {view === "detail" && c && <Detail key="detail" customer={c} onBack={() => nav("customers")} />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );

  // ── Dashboard ──────────────────────────────────────────────────────
  function Dashboard() {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <header>
          <p className="text-[11px] font-medium text-muted uppercase tracking-[0.2em] mb-2">Field Sales Intelligence</p>
          <h1 className="text-display">Good morning, Admin</h1>
        </header>

        {error && <ErrorBanner msg={error} onClose={() => setError(null)} />}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={<Users className="w-5 h-5" />} label="Total Customers" value={String(stats.totalCustomers)} change="+12%" up ring="accent" />
          <StatCard icon={<Activity className="w-5 h-5" />} label="Open Tasks" value={String(stats.openActivities)} change={stats.openActivities > 5 ? "+2" : "-1"} up={stats.openActivities <= 5} ring="warning" />
          <StatCard icon={<Euro className="w-5 h-5" />} label="Commissions" value={`${stats.totalCommissions.toLocaleString("de-DE")} €`} change="+8%" up ring="success" />
        </div>

        {/* AI Briefing + Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 bento-card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-glow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">AI Briefing</h2>
                  <p className="text-[11px] text-muted">DeepSeek Analysis</p>
                </div>
              </div>
              <button onClick={() => fetchJSON("/ai/briefing").then((d: any) => setBriefing(d.briefing)).catch(() => {})} className="p-2 rounded-lg hover:bg-white/[0.04] text-muted transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-3/4" />
              </div>
            ) : (
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{briefing || "Lade KI-Briefing..."}</p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bento-card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Quick Stats</h2>
                <p className="text-[11px] text-muted">At a glance</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: BarChart3, label: "Avg Risk", value: `${customers.length ? Math.round(customers.reduce((s,c) => s + (c.riskScore||0), 0) / customers.length) : 0}%` },
                { icon: Euro, label: "Avg Commission", value: `${stats.totalCustomers ? Math.round(stats.totalCommissions / stats.totalCustomers) : 0} €` },
                { icon: Calendar, label: "With Contract", value: String(customers.filter(c => c.contractEnd).length) },
              ].map((q, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                  <div className="flex items-center gap-2"><q.icon className="w-3.5 h-3.5 text-muted" /><span className="text-xs text-muted">{q.label}</span></div>
                  <span className="text-xs font-semibold">{q.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Priority Customers */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Priority Customers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {customers.filter(c => (c.riskScore||0) >= 25).sort((a,b) => (b.riskScore||0) - (a.riskScore||0)).slice(0,6).map((c, i) => (
              <CustomerCard key={c.id} customer={c} index={i} onClick={() => nav("detail", c.id)} />
            ))}
            {customers.filter(c => (c.riskScore||0) >= 25).length === 0 && (
              <div className="col-span-full py-12 text-center"><p className="text-muted text-sm">No priority customers</p></div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Customers ──────────────────────────────────────────────────────
  function Customers() {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium text-muted uppercase tracking-[0.2em] mb-1">Database</p>
            <h1 className="text-display">Customers</h1>
            <p className="text-sm text-muted mt-1">{filtered.length} of {customers.length}</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </header>

        {error && <ErrorBanner msg={error} onClose={() => setError(null)} />}

        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="input-premium pl-11" />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {tags.map(t => (
            <button key={t} onClick={() => setFilterTag(t)} className={`px-3.5 py-2 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all ${filterTag === t ? "bg-accent-600/15 text-accent-400 border border-accent-500/20" : "glass-surface text-muted hover:text-white"}`}>
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c, i) => <CustomerCard key={c.id} customer={c} index={i} onClick={() => nav("detail", c.id)} />)}
          {filtered.length === 0 && (
            <div className="col-span-full py-24 text-center">
              <Users className="w-12 h-12 text-muted/20 mx-auto mb-4" />
              <p className="text-muted">No customers found</p>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showAdd && <AddCustomerModal onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); fetchJSON("/customers").then(setCustomers).catch(() => {}); }} />}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ── Add Customer Modal ─────────────────────────────────────────────
  function AddCustomerModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [form, setForm] = useState({ name: "", contact: "", email: "", phone: "", city: "", industry: "" });
    const submit = async (ev: React.FormEvent) => {
      ev.preventDefault();
      await fetchJSON("/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      onDone();
    };
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.form initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onSubmit={submit} onClick={e => e.stopPropagation()} className="relative glass-raised rounded-2xl p-8 w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold">New Customer</h2>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08]"><X className="w-4 h-4 text-muted" /></button>
          </div>
          <div className="space-y-4">
            <input required placeholder="Company name *" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="input-premium" />
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Contact" value={form.contact} onChange={e => setForm(p => ({...p, contact: e.target.value}))} className="input-premium" />
              <input placeholder="Industry" value={form.industry} onChange={e => setForm(p => ({...p, industry: e.target.value}))} className="input-premium" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} className="input-premium" />
              <input placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} className="input-premium" />
            </div>
            <input placeholder="City" value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} className="input-premium" />
          </div>
          <button type="submit" className="btn-primary w-full mt-6">Create Customer</button>
        </motion.form>
      </motion.div>
    );
  }
}

// ── Reusable Components ──────────────────────────────────────────────────

function NavBtn({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${active ? "bg-accent-600/10 text-accent-400" : "text-muted hover:text-white hover:bg-white/[0.03]"}`}>
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge != null && <span className="text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded-full font-semibold">{badge}</span>}
    </button>
  );
}

function StatCard({ icon, label, value, change, up, ring }: { icon: React.ReactNode; label: string; value: string; change?: string; up?: boolean; ring: "accent" | "warning" | "success" }) {
  const rm: Record<string, string> = { accent: "border-l-accent-500/40", warning: "border-l-warning/40", success: "border-l-success/40" };
  const gm: Record<string, string> = { accent: "shadow-glow-sm", warning: "shadow-[0_0_30px_-10px_rgba(251,191,36,0.1)]", success: "shadow-[0_0_30px_-10px_rgba(45,212,191,0.1)]" };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`glass-raised rounded-2xl p-6 border-l-2 ${rm[ring]} ${gm[ring]} transition-all duration-500 hover:border-white/[0.1]`}>
      <div className="flex items-start justify-between mb-4">{icon}<div className="w-1.5 h-1.5 rounded-full bg-white/10" /></div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <div className="flex items-center justify-between mt-3">
        <p className="text-[11px] text-muted font-medium">{label}</p>
        {change && <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${up ? "text-success" : "text-danger"}`}>{up ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>}{change}</span>}
      </div>
    </motion.div>
  );
}

function CustomerCard({ customer, index, onClick }: { customer: Customer; index: number; onClick: () => void }) {
  const r = rings[index % rings.length];
  const rc = (customer.riskScore || 0) >= 50 ? "text-danger bg-danger-muted" : (customer.riskScore || 0) >= 25 ? "text-warning bg-warning-muted" : "text-success bg-success-muted";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className="glass-raised rounded-2xl p-5 cursor-pointer group transition-all duration-500 hover:border-white/[0.12]"
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${r} flex items-center justify-center text-sm font-bold shadow-lg flex-shrink-0`}>{init(customer.name)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm truncate">{customer.name}</h3>
            {(customer.riskScore || 0) > 0 && <span className={`flex-shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-bold ${rc}`}>{customer.riskScore}%</span>}
          </div>
          <p className="text-[11px] text-muted mt-0.5">{customer.contactPerson || "—"}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {customer.city && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] text-[10px] text-white/60"><MapPin className="w-3 h-3" />{customer.city}</span>}
            {customer.industry && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] text-[10px] text-white/60"><Building2 className="w-3 h-3" />{customer.industry}</span>}
            {customer.contractEnd && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] text-[10px] text-white/60"><Calendar className="w-3 h-3" />{new Date(customer.contractEnd).toLocaleDateString("de-DE")}</span>}
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-[10px] text-muted/50">View details</span>
        <ChevronRight className="w-4 h-4 text-accent-400" />
      </div>
    </motion.div>
  );
}

function ErrorBanner({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-danger-muted border border-danger/20 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-danger">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="text-danger/50 hover:text-danger">&times;</button>
    </motion.div>
  );
}

// ── Customer Detail Page ────────────────────────────────────────────
function Detail({ customer, onBack }: { customer: Customer; onBack: () => void }) {
  const [acts, setActs] = useState<Activity[]>([]);
  const [comms, setComms] = useState<Commission[]>([]);
  const [summary, setSummary] = useState("");
  const [nextAction, setNextAction] = useState<any>(null);
  const [churn, setChurn] = useState<any>(null);
  const [tab, setTab] = useState<"overview" | "activities" | "commissions">("overview");
  const [newAct, setNewAct] = useState("");

  useEffect(() => {
    Promise.all([
      fetchJSON(`/customers/${customer.id}/activities`),
      fetchJSON(`/customers/${customer.id}/commissions`),
      fetchJSON(`/customers/${customer.id}/summary`),
      fetchJSON(`/customers/${customer.id}/next-action`),
      fetchJSON(`/customers/${customer.id}/churn`),
    ]).then(([a, c, s, n, ch]) => {
      setActs(a); setComms(c); setSummary(s.summary); setNextAction(n); setChurn(ch);
    }).catch(() => {});
  }, [customer.id]);

  const addActivity = async () => {
    if (!newAct.trim()) return;
    await fetchJSON(`/customers/${customer.id}/activities`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: newAct }) });
    setNewAct("");
    const a = await fetchJSON(`/customers/${customer.id}/activities`);
    setActs(a);
  };

  const ring = rings[parseInt(customer.id) % rings.length];
  const total = comms.reduce((s, c) => s + c.amount, 0);
  const cc = churn?.risk === "high" ? "danger" : churn?.risk === "medium" ? "warning" : "success";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl glass-surface flex items-center justify-center hover:bg-white/[0.06] transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180 text-muted" />
        </button>
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${ring} flex items-center justify-center text-lg font-bold shadow-glow-sm flex-shrink-0`}>
          {init(customer.name)}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight truncate">{customer.name}</h1>
          <p className="text-sm text-muted">{customer.contactPerson || "No contact"}</p>
        </div>
      </div>

      {/* Churn + AI Action + Commissions */}
      {churn && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`bento-card border-l-2 ${cc === "danger" ? "border-l-danger/40" : cc === "warning" ? "border-l-warning/40" : "border-l-success/40"}`}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className={`w-4 h-4 ${cc === "danger" ? "text-danger" : cc === "warning" ? "text-warning" : "text-success"}`} />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Churn Risk</span>
            </div>
            <p className={`text-3xl font-black ${cc === "danger" ? "text-danger" : cc === "warning" ? "text-warning" : "text-success"}`}>{churn.churnProbability}%</p>
            <div className="mt-3 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${cc === "danger" ? "bg-danger" : cc === "warning" ? "bg-warning" : "bg-success"}`} style={{ width: `${churn.churnProbability}%` }} />
            </div>
            <p className="text-[10px] text-muted mt-2">{churn.reasons?.join(", ") || "No risks"}</p>
          </div>

          {nextAction && (
            <div className="bento-card border-l-2 border-l-accent-500/40">
              <div className="flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-accent-400" /><span className="text-[10px] font-semibold uppercase tracking-widest text-muted">AI Action</span></div>
              <p className="font-semibold text-sm">{nextAction.action}</p>
              <p className="text-[11px] text-muted mt-1.5">{nextAction.reason}</p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded-lg text-[9px] font-bold ${nextAction.priority === "HIGH" ? "bg-danger-muted text-danger" : "bg-accent-600/10 text-accent-400"}`}>{nextAction.priority}</span>
            </div>
          )}

          <div className="bento-card border-l-2 border-l-success/40">
            <div className="flex items-center gap-2 mb-3"><Euro className="w-4 h-4 text-success" /><span className="text-[10px] font-semibold uppercase tracking-widest text-muted">Commissions</span></div>
            <p className="text-3xl font-black text-success">{total.toLocaleString("de-DE")} €</p>
            <p className="text-[10px] text-muted mt-2">{comms.length} transactions</p>
          </div>
        </div>
      )}

      {/* AI Summary */}
      {summary && (
        <div className="bento-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"><Sparkles className="w-4 h-4" /></div>
            <h2 className="text-sm font-semibold">AI Summary</h2>
          </div>
          <p className="text-sm text-white/80 leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-overlay/50 rounded-xl border border-white/[0.04] w-fit">
        {(["overview", "activities", "commissions"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-all capitalize ${tab === t ? "bg-accent-600/15 text-accent-400" : "text-muted hover:text-white"}`}>{t}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="bento-card">
          <h3 className="text-sm font-semibold mb-4">Contact Details</h3>
          <div className="space-y-2">
            {[
              { icon: Building2, label: "Industry", value: customer.industry },
              { icon: MapPin, label: "City", value: customer.city },
              { icon: Mail, label: "Email", value: customer.email },
              { icon: Phone, label: "Phone", value: customer.phone },
              { icon: Calendar, label: "Contract End", value: customer.contractEnd },
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2"><f.icon className="w-4 h-4 text-muted" /><span className="text-sm text-muted">{f.label}</span></div>
                <span className="text-sm font-medium">{f.value || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "activities" && (
        <div className="space-y-3">
          <form onSubmit={e => { e.preventDefault(); addActivity(); }} className="bento-card flex gap-3">
            <input value={newAct} onChange={e => setNewAct(e.target.value)} placeholder="Add activity..." className="flex-1 input-premium" />
            <button type="submit" className="btn-primary">Add</button>
          </form>
          <div className="glass-raised rounded-2xl divide-y divide-white/[0.04] overflow-hidden">
            {acts.length === 0 && <div className="p-8 text-center"><Activity className="w-8 h-8 text-muted/20 mx-auto mb-3" /><p className="text-sm text-muted">No activities</p></div>}
            {acts.map(a => (
              <div key={a.id} className="px-5 py-4 flex items-start gap-4 hover:bg-white/[0.02]">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${a.done ? "bg-success-muted" : "bg-accent-600/10"}`}>
                  {a.done ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Clock3 className="w-4 h-4 text-accent-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90">{a.title || a.type}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-muted">{new Date(a.createdAt).toLocaleDateString("de-DE")}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] text-muted">{a.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "commissions" && (
        <div className="glass-raised rounded-2xl divide-y divide-white/[0.04] overflow-hidden">
          {comms.length === 0 && <div className="p-8 text-center"><Euro className="w-8 h-8 text-muted/20 mx-auto mb-3" /><p className="text-sm text-muted">No commissions</p></div>}
          {comms.map(c => (
            <div key={c.id} className="px-5 py-4 flex items-center justify-between hover:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-success-muted flex items-center justify-center"><Euro className="w-4 h-4 text-success" /></div>
                <div>
                  <p className="text-sm font-medium">{c.amount.toLocaleString("de-DE")} €</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted">{new Date(c.date).toLocaleDateString("de-DE")}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] text-muted">{c.type}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

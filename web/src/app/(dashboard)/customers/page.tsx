"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, SlidersHorizontal, ArrowRight, MapPin, Building2, Phone, Mail } from "lucide-react";
import { apiClient } from "@/lib/api";
import Link from "next/link";
import { getInitials } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  industry: string;
  priority: number;
  status: string;
  _count: { activities: number; tasks: number };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filterIndustry, setFilterIndustry] = useState("");

  useEffect(() => {
    loadCustomers();
  }, [search, filterIndustry]);

  async function loadCustomers() {
    try {
      const data = await apiClient.customers.list(search || undefined, filterIndustry || undefined);
      setCustomers(data as any);
    } catch (err) {
      console.error("Failed to load customers", err);
    } finally {
      setLoading(false);
    }
  }

  const industries = [...new Set(customers.map((c) => c.industry).filter(Boolean))];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-display-sm gradient-text">Kunden</h2>
          <p className="text-sm text-white/40 mt-1">{customers.length} Bestandskunden</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Kunde hinzufügen
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="Kunden suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input pl-10"
          />
        </div>
        <select
          value={filterIndustry}
          onChange={(e) => setFilterIndustry(e.target.value)}
          className="glass-input w-40"
        >
          <option value="">Alle Branchen</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>

      {/* Customer List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <div className="bento-card text-center py-16">
          <Building2 className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">Keine Kunden gefunden</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mt-4">
            Ersten Kunden anlegen
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {customers.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Link
                href={`/customers/${c.id}`}
                className="glass-card flex items-center gap-4 p-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500/10 to-purple-600/10 flex items-center justify-center text-sm font-semibold text-accent-400 flex-shrink-0">
                  {getInitials(c.name)}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.contactPerson && (
                      <p className="text-xs text-white/30 truncate">{c.contactPerson}</p>
                    )}
                  </div>
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-white/30">
                    <MapPin className="w-3 h-3" />
                    {c.city || "—"}
                  </div>
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-white/30">
                    <Building2 className="w-3 h-3" />
                    {c.industry || "—"}
                  </div>
                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${c.status === "active" ? "bg-success" : "bg-white/20"}`} />
                      <span className={`text-xs font-medium ${
                        c.priority >= 4 ? "text-rose-400" : c.priority >= 3 ? "text-accent-400" : "text-white/30"
                      }`}>P{c.priority}</span>
                      <span className="text-xs text-white/20">|</span>
                      <span className="text-xs text-white/20">{c._count?.tasks || 0} Tasks</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddCustomerModal onClose={() => setShowAdd(false)} onCreated={loadCustomers} />
      )}
    </div>
  );
}

function AddCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: "", contactPerson: "", email: "", phone: "", street: "", city: "", industry: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.customers.create(form);
      onCreated();
      onClose();
    } catch (err) {
      console.error("Create error", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel w-full max-w-lg p-6 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Neuen Kunden anlegen</h3>
          <button onClick={onClose} className="btn-icon">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs text-white/40">Firmenname *</label>
              <input
                required
                className="glass-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Ansprechpartner</label>
              <input className="glass-input" value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">E-Mail</label>
              <input type="email" className="glass-input" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Telefon</label>
              <input className="glass-input" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Branche</label>
              <input className="glass-input" value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-xs text-white/40">Straße</label>
              <input className="glass-input" value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-white/40">Stadt</label>
              <input className="glass-input" value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Wird angelegt..." : "Kunde anlegen"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

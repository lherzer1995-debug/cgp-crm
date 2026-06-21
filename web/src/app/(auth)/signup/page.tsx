"use client";

import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full max-w-md"
    >
      <div className="glass-panel p-8 space-y-8">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center mx-auto shadow-[0_0_30px_-5px_rgba(43,159,255,0.3)]">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Konto erstellen</h1>
          <p className="text-sm text-white/40">
            Willkommen beim Premium CRM
          </p>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Vorname</label>
              <input type="text" placeholder="Max" className="glass-input" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Nachname</label>
              <input type="text" placeholder="Mustermann" className="glass-input" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">E-Mail</label>
            <input type="email" placeholder="name@company.de" className="glass-input" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Passwort</label>
            <input type="password" placeholder="••••••••" className="glass-input" />
          </div>

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
            Registrieren
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-white/30">
            Bereits registriert?{" "}
            <Link href="/login" className="text-accent-400 hover:text-accent-300">
              Anmelden
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

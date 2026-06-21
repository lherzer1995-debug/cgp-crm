"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, ListTodo, Map, CalendarDays,
  Cpu, ChevronLeft, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Kunden", icon: Users },
  { href: "/tasks", label: "Aufgaben", icon: ListTodo },
  { href: "/map", label: "Karte", icon: Map },
  { href: "/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/plan", label: "Tagesplan", icon: Cpu },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      className="fixed left-0 top-0 h-screen z-40 flex flex-col border-r border-white/[0.04] bg-[#0a0a0f]/90 backdrop-blur-3xl"
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 h-16 border-b border-white/[0.04]", collapsed && "justify-center")}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_-5px_rgba(43,159,255,0.3)] flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-semibold text-sm tracking-tight"
          >
            CGP CRM
          </motion.span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-3 mt-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                collapsed && "justify-center px-2",
                isActive
                  ? "text-white bg-white/[0.06]"
                  : "text-white/40 hover:text-white hover:bg-white/[0.03]",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-white/[0.06] border border-white/[0.04]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-4.5 h-4.5 relative z-10 flex-shrink-0" />
              {!collapsed && (
                <span className="relative z-10">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-white/[0.04] text-white/30 hover:text-white/60 transition-colors"
      >
        <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
      </button>
    </motion.aside>
  );
}

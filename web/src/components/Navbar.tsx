"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Sparkles, LogOut } from "lucide-react";
import { useState, useEffect } from "react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/customers": "Kunden",
  "/tasks": "Aufgaben",
  "/map": "Karte & Routen",
  "/calendar": "Kalender",
  "/plan": "Tagesplan",
};

export default function Navbar() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [UserBtn, setUserBtn] = useState<any>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      import("@clerk/nextjs").then((mod) => {
        if (mod.UserButton) setUserBtn(() => mod.UserButton);
      });
    }
  }, []);

  const title =
    Object.entries(pageTitles).find(([key]) => pathname.startsWith(key))?.[1] ||
    "CGP CRM";

  return (
    <header className="h-16 border-b border-white/[0.04] flex items-center justify-between px-6 bg-[#0a0a0f]/40 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
          <Sparkles className="w-3 h-3 text-accent-400" />
          <span className="text-xs text-white/30">KI-gestützt</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
          <input
            type="text"
            placeholder="Suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 lg:w-64 bg-white/[0.03] border border-white/[0.04] rounded-xl pl-9 pr-3 py-2 text-xs text-white/70 placeholder:text-white/20 outline-none focus:border-accent-500/20 transition-all"
          />
        </div>

        <button className="relative p-2 rounded-xl hover:bg-white/[0.04] text-white/40 hover:text-white transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent-500" />
        </button>

        {UserBtn ? (
          <UserBtn
            afterSignOutUrl="/login"
            appearance={{
              elements: {
                avatarBox:
                  "w-8 h-8 rounded-full border-2 border-white/[0.08] hover:border-accent-500/30 transition-all",
                userButtonPopoverCard:
                  "bg-[#111118]/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-2xl",
                userButtonPopoverActions: "border-white/[0.04]",
                userButtonPopoverActionButton:
                  "text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors",
                userButtonPopoverActionButtonText: "text-sm",
                userPreviewMainIdentifier: "text-white font-medium",
                userPreviewSecondaryIdentifier: "text-white/40 text-xs",
              },
            }}
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-400 to-purple-500 flex items-center justify-center text-xs font-semibold">
            AD
          </div>
        )}
      </div>
    </header>
  );
}

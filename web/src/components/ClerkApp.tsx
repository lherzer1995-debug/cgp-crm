"use client";

import { useCallback, useEffect, useState } from "react";

// Runtime check: only render Clerk when keys exist
const hasClerk = typeof process !== "undefined" &&
  typeof process.env !== "undefined" &&
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function ClerkApp({ children }: { children: React.ReactNode }) {
  const [ClerkProvider, setClerkProvider] = useState<any>(null);
  const [darkTheme, setDarkTheme] = useState<any>(null);

  useEffect(() => {
    if (!hasClerk) return;
    // Dynamic import to avoid build-time crashes
    import("@clerk/nextjs").then((mod) => setClerkProvider(() => mod.ClerkProvider));
    import("@clerk/themes").then((mod) => setDarkTheme(() => mod.dark));
  }, []);

  if (!ClerkProvider || !hasClerk) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      appearance={{
        baseTheme: darkTheme,
        variables: {
          colorPrimary: "#2b9fff",
          colorBackground: "#0a0a0f",
          colorInputBackground: "#18181f",
          colorInputText: "#ffffff",
          colorText: "#ffffff",
          colorTextSecondary: "#8b8b9e",
          colorNeutral: "#8b8b9e",
          borderRadius: "0.75rem",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: "0.875rem",
        },
        elements: {
          card: "bg-[#111118]/80 backdrop-blur-2xl border border-white/[0.06] shadow-2xl",
          headerTitle: "text-xl font-semibold tracking-tight",
          headerSubtitle: "text-white/40",
          formButtonPrimary:
            "bg-accent-600 hover:bg-accent-500 text-white font-semibold rounded-xl px-5 py-2.5 text-sm transition-all duration-200 shadow-[0_0_20px_-5px_rgba(43,159,255,0.12)] active:scale-[0.98] normal-case",
          formFieldInput:
            "w-full bg-[#18181f] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-accent-500/30 transition-all",
          formFieldLabel: "text-xs font-medium text-white/40 uppercase tracking-wider",
          footerActionLink: "text-accent-400 hover:text-accent-300 transition-colors",
          dividerLine: "bg-white/[0.06]",
          dividerText: "text-white/20 text-xs",
          socialButtonsBlockButton:
            "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white rounded-xl transition-all",
          socialButtonsBlockButtonText: "text-sm font-medium",
          identityPreviewText: "text-white/60",
          identityPreviewEditButton: "text-accent-400",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

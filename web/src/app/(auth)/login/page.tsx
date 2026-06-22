"use client";

import { Sparkles, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [SignIn, setSignIn] = useState<any>(null);

  useEffect(() => {
    // Only load Clerk SignIn if keys exist
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      import("@clerk/nextjs").then((mod) => setSignIn(() => mod.SignIn));
    }
  }, []);

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center mx-auto shadow-[0_0_30px_-5px_rgba(43,159,255,0.3)]">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight gradient-text">
          CGP CRM
        </h1>
        <p className="text-sm text-white/40">The Koenigsegg of CRM Systems</p>
      </div>

      {SignIn ? (
        <SignIn
          path="/login"
          routing="path"
          signUpUrl="/signup"
          fallbackRedirectUrl="/dashboard"
        />
      ) : (
        <div className="glass-panel p-8 text-center space-y-4">
          <p className="text-white/40 text-sm">
            Auth ist nicht konfiguriert
          </p>
          <p className="text-xs text-white/20">
            Setze NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY für den Login
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            Zum Dashboard <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

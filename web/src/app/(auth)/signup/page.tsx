import { SignUp } from "@clerk/nextjs";
import { Sparkles } from "lucide-react";

export default function SignupPage() {
  return (
    <div className="w-full max-w-md space-y-8">
      {/* Logo */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center mx-auto shadow-[0_0_30px_-5px_rgba(43,159,255,0.3)]">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight gradient-text">
          Konto erstellen
        </h1>
        <p className="text-sm text-white/40">
          Willkommen beim Premium CRM
        </p>
      </div>

      <SignUp
        path="/signup"
        routing="path"
        signInUrl="/login"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}

import type { Metadata } from "next";
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "CGP CRM — The Koenigsegg of CRMs",
  description: "AI-native field sales CRM for existing customers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="de" className="dark">
        <body className="min-h-screen aurora-bg">
          <SignedOut>
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="glass-raised rounded-2xl p-10 max-w-md w-full text-center space-y-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center shadow-glow">
                  <span className="text-2xl font-bold">CGP</span>
                </div>
                <h1 className="text-2xl font-bold">CGP CRM</h1>
                <p className="text-muted text-sm">The Koenigsegg of CRMs</p>
                <SignInButton mode="modal">
                  <button className="bg-accent-600 hover:bg-accent-500 text-white font-semibold rounded-xl px-6 py-3 text-sm w-full transition-all">Sign In</button>
                </SignInButton>
              </div>
            </div>
          </SignedOut>
          <SignedIn>{children}</SignedIn>
        </body>
      </html>
    </ClerkProvider>
  );
}

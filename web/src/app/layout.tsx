import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CGP CRM — The Koenigsegg of CRMs",
  description: "AI-native field sales CRM for existing customers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen aurora-bg">{children}</body>
    </html>
  );
}

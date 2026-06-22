import type { Metadata } from "next";
import { Inter } from "next/font/google";
import nextDynamic from "next/dynamic";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CGP CRM — The Koenigsegg of CRMs",
  description:
    "AI-native field sales CRM for existing customers. Premium customer relationship management with AI-powered workflows.",
};

const ClerkApp = nextDynamic(() => import("@/components/ClerkApp"));

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body
        className={`min-h-screen aurora-bg ${inter.variable} font-sans antialiased`}
      >
        <ClerkApp>{children}</ClerkApp>
      </body>
    </html>
  );
}

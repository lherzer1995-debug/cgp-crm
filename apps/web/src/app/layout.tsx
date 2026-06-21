import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CGP CRM — Premium Field Sales Intelligence",
  description: "The Koenigsegg of CRMs. AI-native customer management for elite sales teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <body className="min-h-screen aurora-bg">
        {children}
      </body>
    </html>
  );
}

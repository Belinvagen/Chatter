import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { Navbar } from "@/components/Navbar";
import { PresenceManager } from "@/components/PresenceManager";
import { GlobalNotifications } from "@/components/GlobalNotifications";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Chatter — Connect Instantly",
  description:
    "Chatter is a fast, modern messaging app for real-time conversations. Connect with friends and groups instantly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <PresenceManager />
            <GlobalNotifications />
            <Navbar />
            <main className="pt-16">{children}</main>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "#ffffff",
                  color: "#14532d",
                  border: "1px solid #bbf7d0",
                  boxShadow: "0 4px 24px rgba(34,197,94,0.1)",
                },
              }}
            />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

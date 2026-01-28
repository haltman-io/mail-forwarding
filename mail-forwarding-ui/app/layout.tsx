import "./globals.css";
import type { Metadata } from "next";
import ThemeProvider from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Free Mail Forwarding",
  description: "Privacy-first alias forwarding",
  alternates: {
    canonical: "https://forward.haltman.io",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        {/* Global background (same DNA as the card) */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          {/* base gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black" />

          {/* soft glows */}
          <div className="absolute left-1/2 top-[-10rem] h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-white/5 blur-3xl opacity-70" />
          <div className="absolute left-1/2 bottom-[-12rem] h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-white/5 blur-3xl opacity-60" />

          {/* subtle vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),rgba(0,0,0,0.0)_45%,rgba(0,0,0,0.55)_100%)]" />

          {/* light grain/noise (no external assets) */}
          <div className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_3px)]" />
        </div>

        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

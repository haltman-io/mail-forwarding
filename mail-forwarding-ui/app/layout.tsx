import "./globals.css";
import type { Metadata } from "next";
import ThemeProvider from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Free Mail Forwarding",
  description: "Privacy-first alias forwarding",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

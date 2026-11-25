import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JAROTCOMPILER — APK Builder (Flutter & Native)",
  description:
    "Bikin, edit, dan compile APK Android langsung dari HP. Engine Flutter & Native via GitHub Actions.",
  keywords: ["JAROTCOMPILER", "APK", "Flutter", "Native", "Android", "compiler"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0C0F14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <div className="min-h-[100dvh] bg-[#0C0F14] text-[#EDF2F7]">{children}</div>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

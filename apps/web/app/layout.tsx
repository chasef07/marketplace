import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { PerformanceProvider } from '@/components/performance-provider';
import { QuickActionsOverlay } from '@/components/marketplace/QuickActionsOverlay';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Marketplace - Intelligent Furniture Trading",
  description: "Watch AI agents negotiate furniture deals automatically. GPT-4 Vision analysis, 9 AI personalities, real-time negotiations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PerformanceProvider>
          {children}
          <QuickActionsOverlay />
        </PerformanceProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

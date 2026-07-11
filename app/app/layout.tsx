import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ActivityTicker } from "@/components/activity-ticker";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StatusBar } from "@/components/status-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Strata — trustless structured settlement",
  description:
    "Multi-leg, tiered-payout sports products settled on-chain via TxLINE Merkle proofs. No oracle trust, no self-attested results — every settlement is a permissionless CPI-verified proof.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <ActivityTicker />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <StatusBar />
        </Providers>
      </body>
    </html>
  );
}

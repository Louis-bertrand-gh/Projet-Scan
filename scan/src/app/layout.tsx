/* ═══════════════════════════════════════════════════════════════════════
 * layout.tsx — Layout racine de l'application Next.js
 *
 * Ce fichier est le point d'entrée du rendu. Il :
 * - Charge les styles globaux
 * - Enveloppe l'application avec les Providers (App + Thème)
 * - Applique le layout responsive (Sidebar + BottomNav)
 * - Configure les métadonnées PWA
 * ═══════════════════════════════════════════════════════════════════════ */

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "./ClientProviders";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/* ─── Métadonnées de l'application ───────────────────────────────────── */
export const metadata: Metadata = {
  title: "Scan — Traçabilité HACCP & Réassort",
  description:
    "Application de traçabilité HACCP et de gestion de réassort pour la chaîne de campings Huttopia.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Scan",
  },
};

/* ─── Configuration du viewport (PWA / Mobile-First) ─────────────────── */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2D5016",
};

/* ─── Layout racine ──────────────────────────────────────────────────── */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        {/*
         * ClientProviders encapsule les contextes client-side :
         * ThemeProvider et AppProvider.
         * Séparé dans un composant "use client" car le layout
         * racine est un Server Component par défaut dans Next.js.
         */}
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}

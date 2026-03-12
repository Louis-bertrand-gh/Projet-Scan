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
import "./globals.css";
import ClientProviders from "./ClientProviders";

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
      <head>
        {/* Pré-chargement de la police Inter pour la performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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

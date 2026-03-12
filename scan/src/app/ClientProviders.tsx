/* ═══════════════════════════════════════════════════════════════════════
 * ClientProviders.tsx — Wrapper client pour les Context Providers
 *
 * Next.js 14 App Router rend le layout racine en Server Component.
 * Les contextes React nécessitent "use client", donc on les
 * encapsule ici dans un composant client dédié.
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React from "react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppProvider } from "@/contexts/AppContext";
import Layout from "@/components/layout/Layout";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AppProvider>
        <Layout>{children}</Layout>
      </AppProvider>
    </ThemeProvider>
  );
}

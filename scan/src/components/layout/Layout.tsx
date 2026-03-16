/* ═══════════════════════════════════════════════════════════════════════
 * Layout.tsx — Layout principal hybride Desktop/Mobile
 *
 * Architecture responsive :
 * - Desktop (≥ 1024px) : Sidebar à gauche + contenu principal à droite
 * - Mobile (< 1024px) : Header en haut + contenu + BottomNav en bas
 *
 * La navigation hybride s'adapte automatiquement au viewport.
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import Header from "./Header";
import { useApp } from "@/contexts/AppContext";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { chargement, erreur, utilisateur } = useApp();
  const estRouteAuth = pathname.startsWith("/auth");
  const estRouteAdmin = pathname.startsWith("/admin");
  const estRouteInscription =
    pathname === "/auth/inscription" ||
    pathname.startsWith("/auth/inscription?");
  const estRouteConfirmationInscription = pathname.startsWith(
    "/auth/inscription/confirmation",
  );

  useEffect(() => {
    if (chargement) return;

    if (!utilisateur && estRouteInscription) {
      router.replace("/auth");
      return;
    }

    if (!utilisateur && !estRouteAuth) {
      router.replace("/auth");
      return;
    }

    if (utilisateur && estRouteAdmin && utilisateur.role !== "admin") {
      router.replace("/");
      return;
    }

    const adminPeutCreerCompte =
      utilisateur?.role === "admin" && estRouteInscription;

    if (
      utilisateur &&
      estRouteAuth &&
      !estRouteConfirmationInscription &&
      !adminPeutCreerCompte
    ) {
      router.replace("/");
    }
  }, [
    chargement,
    estRouteAdmin,
    estRouteAuth,
    estRouteInscription,
    estRouteConfirmationInscription,
    router,
    utilisateur,
  ]);

  /* ─── Écran de chargement ──────────────────────────────────── */
  if (chargement) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <ScanLine className="w-7 h-7 text-on-primary" />
          </div>
          <p className="text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  /* ─── Page d'authentification sans chrome applicatif ───────── */
  if (estRouteAuth) {
    const adminPeutCreerCompte =
      utilisateur?.role === "admin" && estRouteInscription;

    if (
      utilisateur &&
      !estRouteConfirmationInscription &&
      !adminPeutCreerCompte
    ) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center animate-pulse">
              <ScanLine className="w-7 h-7 text-on-primary" />
            </div>
            <p className="text-sm">Redirection…</p>
          </div>
        </div>
      );
    }

    return <div className="min-h-screen bg-background">{children}</div>;
  }

  /* ─── Invité non connecté : redirection vers /auth ─────────── */
  if (!utilisateur) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <ScanLine className="w-7 h-7 text-on-primary" />
          </div>
          <p className="text-sm">Redirection vers la connexion…</p>
        </div>
      </div>
    );
  }

  if (estRouteAdmin && utilisateur.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-danger font-medium">Accès non autorisé</p>
          <p className="text-muted text-sm">
            Cette section est réservée aux administrateurs.
          </p>
        </div>
      </div>
    );
  }

  /* ─── Message d'erreur ─────────────────────────────────────── */
  if (erreur) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-danger font-medium">Erreur de connexion</p>
          <p className="text-muted text-sm">{erreur}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      {/* ─── Sidebar Desktop (cachée sur mobile) ─────────────── */}
      <Sidebar />

      {/* ─── Header Mobile (caché sur desktop) ──────────────── */}
      <Header />

      {/* ─── Zone de contenu principal ───────────────────────── */}
      {/*
       * Sur Desktop : décalé de 16rem (w-64) pour la Sidebar
       * Sur Mobile : plein écran avec padding bottom pour la BottomNav
       */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>

      {/* ─── Navigation Mobile (cachée sur desktop) ─────────── */}
      <BottomNav />
    </div>
  );
}

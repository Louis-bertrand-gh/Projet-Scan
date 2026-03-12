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
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import Header from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
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

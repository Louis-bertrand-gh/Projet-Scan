/* ═══════════════════════════════════════════════════════════════════════
 * Header.tsx — En-tête mobile avec sélecteur de site et menu
 *
 * Affichée uniquement sur mobile. Fournit un accès rapide au
 * changement de site et affiche le contexte actuel.
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React, { useState } from "react";
import { MapPin, ChevronDown, ScanLine, User } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export default function Header() {
  const { siteActif, sitesAccessibles, changerSite, utilisateur } = useApp();
  const [menuOuvert, setMenuOuvert] = useState(false);

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-surface border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        {/* ─── Logo compact ─────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-on-primary" />
          </div>
          <span className="font-bold text-on-surface">Scan</span>
        </div>

        {/* ─── Sélecteur de site (compact) ──────────────────────── */}
        <div className="relative">
          <button
            onClick={() => setMenuOuvert(!menuOuvert)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-alt border border-border text-sm text-on-surface"
          >
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="max-w-[120px] truncate">{siteActif.nom}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted transition-transform ${
                menuOuvert ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Liste déroulante des sites */}
          {menuOuvert && (
            <>
              {/* Overlay pour fermer le menu au clic extérieur */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOuvert(false)}
              />
              <div className="absolute top-full right-0 mt-1 w-56 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 text-xs font-medium text-muted uppercase tracking-wider border-b border-border">
                  Changer de site
                </div>
                {sitesAccessibles.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => {
                      changerSite(site.id);
                      setMenuOuvert(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-surface-alt transition-colors ${
                      site.id === siteActif.id
                        ? "bg-surface-alt text-primary font-medium"
                        : "text-on-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" />
                      {site.nom}
                    </div>
                    <p className="text-xs text-muted ml-5 mt-0.5">
                      {site.localisation}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ─── Avatar utilisateur ───────────────────────────────── */}
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="w-4 h-4 text-on-primary" />
        </div>
      </div>
    </header>
  );
}

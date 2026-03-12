/* ═══════════════════════════════════════════════════════════════════════
 * Sidebar.tsx — Barre latérale de navigation (version Desktop)
 *
 * Affichée uniquement sur les écrans larges (≥ 1024px).
 * Destinée aux rôles Admin et Chef de Cuisine qui travaillent
 * principalement depuis un poste fixe.
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanLine,
  Package,
  Settings,
  MapPin,
  ChevronDown,
  User,
  LogOut,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useTheme } from "@/contexts/ThemeContext";

/* ─── Éléments de navigation ─────────────────────────────────────────── */
const navItems = [
  { label: "Tableau de bord", href: "/", icone: LayoutDashboard },
  { label: "Scanner", href: "/scan", icone: ScanLine },
  { label: "Réassort", href: "/reassort", icone: Package },
  { label: "Paramètres", href: "/parametres", icone: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { utilisateur, siteActif, sitesAccessibles, changerSite } = useApp();
  const { themeActif } = useTheme();
  const [siteMenuOuvert, setSiteMenuOuvert] = React.useState(false);

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-surface border-r border-border h-screen fixed left-0 top-0 z-40">
      {/* ─── Logo et nom de l'application ─────────────────────────── */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <ScanLine className="w-6 h-6 text-on-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-on-surface">Scan</h1>
            <p className="text-xs text-muted">HACCP & Réassort</p>
          </div>
        </div>
      </div>

      {/* ─── Sélecteur de site ────────────────────────────────────── */}
      <div className="p-4 border-b border-border">
        <label className="text-xs font-medium text-muted uppercase tracking-wider mb-2 block">
          Site actif
        </label>
        <div className="relative">
          <button
            onClick={() => setSiteMenuOuvert(!siteMenuOuvert)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-alt border border-border text-on-surface text-sm hover:border-primary transition-colors"
          >
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              {siteActif.nom}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted transition-transform ${
                siteMenuOuvert ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Menu déroulant des sites */}
          {siteMenuOuvert && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {sitesAccessibles.map((site) => (
                <button
                  key={site.id}
                  onClick={() => {
                    changerSite(site.id);
                    setSiteMenuOuvert(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-alt transition-colors ${
                    site.id === siteActif.id
                      ? "bg-surface-alt text-primary font-medium"
                      : "text-on-surface"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    {site.nom}
                  </span>
                  <span className="text-xs text-muted ml-5">
                    {site.localisation}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Navigation principale ────────────────────────────────── */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const actif = pathname === item.href;
          const Icone = item.icone;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                actif
                  ? "bg-primary text-on-primary shadow-md"
                  : "text-on-surface hover:bg-surface-alt"
              }`}
            >
              <Icone className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ─── Indicateur de thème actif ────────────────────────────── */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-alt text-xs text-muted">
          <div
            className="w-3 h-3 rounded-full border border-border"
            style={{ backgroundColor: themeActif.couleurs.primary }}
          />
          Thème : {themeActif.nom}
        </div>
      </div>

      {/* ─── Profil utilisateur ───────────────────────────────────── */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
            <User className="w-5 h-5 text-on-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-surface truncate">
              {utilisateur.prenom} {utilisateur.nom}
            </p>
            <p className="text-xs text-muted capitalize">{utilisateur.role}</p>
          </div>
          <button
            className="p-1.5 rounded-lg hover:bg-surface-alt text-muted hover:text-danger transition-colors"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

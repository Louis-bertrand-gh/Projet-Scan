/* ═══════════════════════════════════════════════════════════════════════
 * BottomNav.tsx — Barre de navigation inférieure (version Mobile)
 *
 * Affichée uniquement sur les écrans mobiles (< 1024px).
 * Optimisée pour l'utilisation d'une seule main (RP/Équipier
 * sur le terrain, en cuisine, etc.).
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
  Users,
  Activity,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export default function BottomNav() {
  const pathname = usePathname();
  const { utilisateur } = useApp();
  const estAdmin = utilisateur?.role === "admin";

  const navItems = [
    { label: "Accueil", href: "/", icone: LayoutDashboard },
    { label: "Scanner", href: "/scan", icone: ScanLine },
    { label: "Réassort", href: "/reassort", icone: Package },
    ...(estAdmin
      ? [
          { label: "Utilisateurs", href: "/admin/users", icone: Users },
          { label: "Logs", href: "/admin/logs", icone: Activity },
        ]
      : []),
    { label: "Réglages", href: "/parametres", icone: Settings },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const actif = pathname === item.href;
          const Icone = item.icone;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all min-w-[60px] ${
                actif ? "text-primary" : "text-muted hover:text-on-surface"
              }`}
            >
              {/* Indicateur actif : pastille animée */}
              <div className="relative">
                <Icone
                  className={`w-5 h-5 ${actif ? "scale-110" : ""} transition-transform`}
                />
                {actif && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${actif ? "font-semibold" : ""}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

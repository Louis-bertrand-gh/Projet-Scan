/* ═══════════════════════════════════════════════════════════════════════
 * reassort/page.tsx — Page du dashboard de réassort
 *
 * Point d'entrée de la fonctionnalité de gestion du réassort.
 * Délègue l'affichage au composant ReassortDashboard qui contient
 * toute la logique de filtrage et d'interaction.
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React from "react";
import ReassortDashboard from "@/components/reassort/ReassortDashboard";

export default function ReassortPage() {
  return <ReassortDashboard />;
}

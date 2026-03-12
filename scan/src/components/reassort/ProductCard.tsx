/* ═══════════════════════════════════════════════════════════════════════
 * ProductCard.tsx — Carte produit pour le dashboard de réassort
 *
 * Affiche les informations essentielles d'un produit :
 * - Nom, catégorie, stock actuel vs seuil de réassort
 * - Indicateur visuel du statut (OK, bas, critique)
 * - Bouton pour marquer "à commander"
 *
 * Le design utilise des codes couleur intuitifs pour permettre
 * une lecture rapide de l'état du stock en un coup d'œil.
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React from "react";
import {
  Package,
  AlertTriangle,
  AlertOctagon,
  ShoppingCart,
  Check,
  Thermometer,
} from "lucide-react";
import { Produit, StatutReassort } from "@/types";
import { categories } from "@/data/mockData";

/* ─── Props du composant ─────────────────────────────────────────────── */
interface ProductCardProps {
  produit: Produit;
  statut: StatutReassort;
  aCommander: boolean;
  /** Callback pour basculer l'état "à commander" */
  onToggleCommande: (produitId: string) => void;
}

/**
 * Retourne les styles visuels selon le statut de réassort.
 * Logique métier :
 * - "ok" : stock suffisant → vert
 * - "bas" : stock proche du seuil → orange
 * - "critique" : stock sous le seuil → rouge
 * - "a_commander" : marqué à commander → bleu
 */
function getStatutStyles(statut: StatutReassort, aCommander: boolean) {
  if (aCommander) {
    return {
      bg: "bg-secondary/10",
      border: "border-secondary/30",
      badge: "bg-secondary text-white",
      label: "À commander",
      icone: ShoppingCart,
    };
  }

  switch (statut) {
    case "critique":
      return {
        bg: "bg-danger/5",
        border: "border-danger/20",
        badge: "bg-danger text-white",
        label: "Critique",
        icone: AlertOctagon,
      };
    case "bas":
      return {
        bg: "bg-warning/5",
        border: "border-warning/20",
        badge: "bg-warning text-white",
        label: "Stock bas",
        icone: AlertTriangle,
      };
    default:
      return {
        bg: "bg-success/5",
        border: "border-success/20",
        badge: "bg-success text-white",
        label: "OK",
        icone: Check,
      };
  }
}

export default function ProductCard({
  produit,
  statut,
  aCommander,
  onToggleCommande,
}: ProductCardProps) {
  const styles = getStatutStyles(statut, aCommander);
  const Icone = styles.icone;

  /* Trouver la catégorie du produit */
  const categorie = categories.find((c) => c.id === produit.categorieId);

  /* Calcul du pourcentage de remplissage de la jauge de stock */
  const pourcentageStock = Math.min(
    (produit.stockActuel / (produit.seuilReassort * 2)) * 100,
    100,
  );

  return (
    <div
      className={`rounded-xl border ${styles.border} ${styles.bg} p-4 transition-all hover:shadow-md`}
    >
      {/* ─── En-tête : nom + badge statut ─────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-on-surface text-sm truncate">
            {produit.nom}
          </h4>
          {categorie && (
            <p className="text-xs text-muted mt-0.5">{categorie.nom}</p>
          )}
        </div>
        <span
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${styles.badge} whitespace-nowrap`}
        >
          <Icone className="w-3 h-3" />
          {styles.label}
        </span>
      </div>

      {/* ─── Informations de stock ────────────────────────────── */}
      <div className="space-y-2 mb-3">
        {/* Jauge de stock visuelle */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted">Stock actuel</span>
            <span className="font-medium text-on-surface">
              {produit.stockActuel} {produit.unite}
            </span>
          </div>
          <div className="h-2 bg-border/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                statut === "critique"
                  ? "bg-danger"
                  : statut === "bas"
                    ? "bg-warning"
                    : "bg-success"
              }`}
              style={{ width: `${pourcentageStock}%` }}
            />
          </div>
        </div>

        {/* Seuil de réassort */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted flex items-center gap-1">
            <Package className="w-3 h-3" />
            Seuil réassort
          </span>
          <span className="text-on-surface">
            {produit.seuilReassort} {produit.unite}
          </span>
        </div>

        {/* Température de conservation (si applicable) */}
        {produit.temperatureConservation !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted flex items-center gap-1">
              <Thermometer className="w-3 h-3" />
              Conservation
            </span>
            <span className="text-on-surface">
              {produit.temperatureConservation}°C
            </span>
          </div>
        )}
      </div>

      {/* ─── Bouton "À commander" ─────────────────────────────── */}
      <button
        onClick={() => onToggleCommande(produit.id)}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
          aCommander
            ? "bg-secondary text-white hover:bg-secondary/90"
            : "bg-surface border border-border text-on-surface hover:bg-surface-alt"
        }`}
      >
        <ShoppingCart className="w-4 h-4" />
        {aCommander ? "Marqué à commander" : "Marquer à commander"}
      </button>
    </div>
  );
}

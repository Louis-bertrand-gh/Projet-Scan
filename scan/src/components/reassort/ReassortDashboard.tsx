/* ═══════════════════════════════════════════════════════════════════════
 * ReassortDashboard.tsx — Dashboard interactif de gestion du réassort
 *
 * Vue complète permettant de :
 * - Filtrer les produits par point de vente
 * - Visualiser l'état du stock de chaque produit
 * - Marquer les produits "à commander" avec état persistant
 * - Voir un récapitulatif des commandes à passer
 *
 * L'état "à commander" est persisté dans le localStorage pour
 * survivre aux rechargements de page.
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Filter,
  Package,
  ShoppingCart,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Search,
} from "lucide-react";
import { StatutReassort } from "@/types";
import { produits, pointsDeVente, categories } from "@/data/mockData";
import { useApp } from "@/contexts/AppContext";
import ProductCard from "./ProductCard";

/* ─── Clé de stockage local pour l'état persistant ───────────────────── */
const COMMANDES_STORAGE_KEY = "scan-produits-a-commander";

/**
 * Détermine le statut de réassort d'un produit en fonction
 * de son stock actuel et de son seuil de réassort.
 *
 * Logique métier HACCP :
 * - Critique : stock à 0 ou négatif → rupture imminente
 * - Bas : stock sous le seuil → commande recommandée
 * - OK : stock au-dessus du seuil → pas d'action requise
 */
function calculerStatut(stockActuel: number, seuil: number): StatutReassort {
  if (stockActuel <= 0) return "critique";
  if (stockActuel <= seuil) return "bas";
  return "ok";
}

export default function ReassortDashboard() {
  const { siteActif, pdvActif, changerPdv, pdvDuSite } = useApp();

  /* ─── État des commandes (persisté en localStorage) ────────── */
  const [commandeIds, setCommandeIds] = useState<Set<string>>(new Set());
  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState<string>("all");

  /* Restaurer les commandes depuis le localStorage au montage */
  useEffect(() => {
    const sauvegarde = localStorage.getItem(COMMANDES_STORAGE_KEY);
    if (sauvegarde) {
      try {
        const ids = JSON.parse(sauvegarde) as string[];
        setCommandeIds(new Set(ids));
      } catch {
        /* Données corrompues : on repart de zéro */
      }
    }
  }, []);

  /* Persister les changements dans le localStorage */
  const sauvegarderCommandes = useCallback((ids: Set<string>) => {
    localStorage.setItem(
      COMMANDES_STORAGE_KEY,
      JSON.stringify(Array.from(ids)),
    );
  }, []);

  /** Bascule l'état "à commander" d'un produit */
  const toggleCommande = useCallback(
    (produitId: string) => {
      setCommandeIds((prev) => {
        const nouveau = new Set(prev);
        if (nouveau.has(produitId)) {
          nouveau.delete(produitId);
        } else {
          nouveau.add(produitId);
        }
        sauvegarderCommandes(nouveau);
        return nouveau;
      });
    },
    [sauvegarderCommandes],
  );

  /* ─── Filtrage des produits ────────────────────────────────── */
  const produitsFiltres = useMemo(() => {
    return produits.filter((p) => {
      /* Filtre par point de vente actif */
      if (pdvActif && !p.pointDeVenteIds.includes(pdvActif.id)) return false;

      /* Filtre par site : on n'affiche que les produits des PDV du site */
      if (!pdvActif) {
        const pdvIdsDuSite = pdvDuSite.map((pdv) => pdv.id);
        const produitDansSite = p.pointDeVenteIds.some((id) =>
          pdvIdsDuSite.includes(id),
        );
        if (!produitDansSite) return false;
      }

      /* Filtre par catégorie */
      if (filtreCategorie !== "all" && p.categorieId !== filtreCategorie) {
        return false;
      }

      /* Filtre par recherche textuelle */
      if (recherche) {
        const termeRecherche = recherche.toLowerCase();
        return p.nom.toLowerCase().includes(termeRecherche);
      }

      return true;
    });
  }, [pdvActif, pdvDuSite, filtreCategorie, recherche]);

  /* ─── Statistiques ─────────────────────────────────────────── */
  const stats = useMemo(() => {
    let ok = 0;
    let bas = 0;
    let critique = 0;
    let aCommander = 0;

    produitsFiltres.forEach((p) => {
      const statut = calculerStatut(p.stockActuel, p.seuilReassort);
      if (statut === "ok") ok++;
      else if (statut === "bas") bas++;
      else critique++;
      if (commandeIds.has(p.id)) aCommander++;
    });

    return { ok, bas, critique, aCommander, total: produitsFiltres.length };
  }, [produitsFiltres, commandeIds]);

  /* Catégories disponibles pour le filtre */
  const categoriesDisponibles = useMemo(() => {
    const catIds = new Set(produitsFiltres.map((p) => p.categorieId));
    return categories.filter((c) => catIds.has(c.id));
  }, [produitsFiltres]);

  return (
    <div className="space-y-6">
      {/* ─── En-tête ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-on-surface">
          Réassort — {siteActif.nom}
        </h2>
        <p className="text-muted text-sm mt-1">
          {pdvActif
            ? `Point de vente : ${pdvActif.nom}`
            : "Tous les points de vente"}
        </p>
      </div>

      {/* ─── Cartes statistiques ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-success/10 border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-xs font-medium text-success">Stock OK</span>
          </div>
          <p className="text-2xl font-bold text-success">{stats.ok}</p>
        </div>
        <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-xs font-medium text-warning">Stock bas</span>
          </div>
          <p className="text-2xl font-bold text-warning">{stats.bas}</p>
        </div>
        <div className="p-4 rounded-xl bg-danger/10 border border-danger/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertOctagon className="w-4 h-4 text-danger" />
            <span className="text-xs font-medium text-danger">Critique</span>
          </div>
          <p className="text-2xl font-bold text-danger">{stats.critique}</p>
        </div>
        <div className="p-4 rounded-xl bg-secondary/10 border border-secondary/20">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 text-secondary" />
            <span className="text-xs font-medium text-secondary">
              À commander
            </span>
          </div>
          <p className="text-2xl font-bold text-secondary">
            {stats.aCommander}
          </p>
        </div>
      </div>

      {/* ─── Filtres ──────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Filtre par PDV */}
        <div className="flex-1">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted mb-1">
            <Filter className="w-3 h-3" />
            Point de Vente
          </label>
          <select
            value={pdvActif?.id || ""}
            onChange={(e) => changerPdv(e.target.value || null)}
            className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          >
            <option value="">Tous les PDV</option>
            {pdvDuSite.map((pdv) => (
              <option key={pdv.id} value={pdv.id}>
                {pdv.nom}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre par catégorie */}
        <div className="flex-1">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted mb-1">
            <Package className="w-3 h-3" />
            Catégorie
          </label>
          <select
            value={filtreCategorie}
            onChange={(e) => setFiltreCategorie(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          >
            <option value="all">Toutes les catégories</option>
            {categoriesDisponibles.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nom}
              </option>
            ))}
          </select>
        </div>

        {/* Barre de recherche */}
        <div className="flex-1">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted mb-1">
            <Search className="w-3 h-3" />
            Rechercher
          </label>
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom du produit..."
            className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* ─── Liste des produits ───────────────────────────────── */}
      {produitsFiltres.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-on-surface font-medium">Aucun produit trouvé</p>
          <p className="text-muted text-sm mt-1">
            Essayez de modifier vos filtres
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {produitsFiltres.map((produit) => {
            const statut = calculerStatut(
              produit.stockActuel,
              produit.seuilReassort,
            );
            return (
              <ProductCard
                key={produit.id}
                produit={produit}
                statut={statut}
                aCommander={commandeIds.has(produit.id)}
                onToggleCommande={toggleCommande}
              />
            );
          })}
        </div>
      )}

      {/* ─── Récapitulatif commande ───────────────────────────── */}
      {stats.aCommander > 0 && (
        <div className="sticky bottom-20 lg:bottom-4 mx-auto max-w-md">
          <div className="bg-secondary text-white rounded-2xl p-4 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6" />
              <div>
                <p className="font-semibold">
                  {stats.aCommander} produit{stats.aCommander > 1 ? "s" : ""}
                </p>
                <p className="text-sm opacity-80">à commander</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors">
              Voir la liste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

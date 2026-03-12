/* ═══════════════════════════════════════════════════════════════════════
 * page.tsx — Page d'accueil / Tableau de bord
 *
 * Vue synthétique du site actif avec :
 * - Résumé des KPI (scans du jour, alertes, stocks)
 * - Accès rapide aux fonctionnalités principales
 * - Derniers scans HACCP réalisés
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React from "react";
import Link from "next/link";
import {
  ScanLine,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShieldX,
  Thermometer,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { produits, historiqueScans, pointsDeVente } from "@/data/mockData";

export default function DashboardPage() {
  const { siteActif, pdvDuSite } = useApp();

  /* ─── Calcul des KPI du site ───────────────────────────────── */
  const pdvIdsDuSite = pdvDuSite.map((p) => p.id);

  /* Produits du site actif */
  const produitsDuSite = produits.filter((p) =>
    p.pointDeVenteIds.some((id) => pdvIdsDuSite.includes(id)),
  );

  /* Produits en alerte (stock ≤ seuil) */
  const produitsEnAlerte = produitsDuSite.filter(
    (p) => p.stockActuel <= p.seuilReassort,
  );

  /* Produits critiques (stock = 0) */
  const produitsCritiques = produitsDuSite.filter((p) => p.stockActuel <= 0);

  /* Scans du jour (simulation) */
  const scansAujourdhui = historiqueScans.filter((s) =>
    s.dateScan.startsWith("2026-03-12"),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── En-tête de bienvenue ─────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold lg:text-3xl text-on-surface">
          Tableau de bord
        </h1>
        <p className="mt-1 text-muted">
          {siteActif.nom} — {siteActif.localisation}
        </p>
      </div>

      {/* ─── Cartes KPI ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {/* Scans aujourd'hui */}
        <div className="p-4 transition-shadow border rounded-xl bg-surface border-border hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <ScanLine className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-on-surface">
            {scansAujourdhui.length}
          </p>
          <p className="mt-1 text-xs text-muted">Scans aujourd&apos;hui</p>
        </div>

        {/* Total produits */}
        <div className="p-4 transition-shadow border rounded-xl bg-surface border-border hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-success/10">
              <Package className="w-4 h-4 text-success" />
            </div>
          </div>
          <p className="text-2xl font-bold text-on-surface">
            {produitsDuSite.length}
          </p>
          <p className="mt-1 text-xs text-muted">Produits référencés</p>
        </div>

        {/* Alertes stock */}
        <div className="p-4 transition-shadow border rounded-xl bg-surface border-border hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertTriangle className="w-4 h-4 text-warning" />
            </div>
          </div>
          <p className="text-2xl font-bold text-warning">
            {produitsEnAlerte.length}
          </p>
          <p className="mt-1 text-xs text-muted">Alertes stock</p>
        </div>

        {/* Critiques */}
        <div className="p-4 transition-shadow border rounded-xl bg-surface border-border hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-danger/10">
              <AlertTriangle className="w-4 h-4 text-danger" />
            </div>
          </div>
          <p className="text-2xl font-bold text-danger">
            {produitsCritiques.length}
          </p>
          <p className="mt-1 text-xs text-muted">Ruptures imminentes</p>
        </div>
      </div>

      {/* ─── Actions rapides ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Scanner un produit */}
        <Link
          href="/scan"
          className="flex items-center gap-4 p-5 transition-all shadow-lg group rounded-xl bg-primary text-on-primary hover:bg-primary-dark hover:shadow-xl"
        >
          <div className="p-3 rounded-xl bg-white/20">
            <ScanLine className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Scanner un produit</h3>
            <p className="text-sm opacity-80">Contrôle HACCP rapide avec OCR</p>
          </div>
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Link>

        {/* Gérer le réassort */}
        <Link
          href="/reassort"
          className="flex items-center gap-4 p-5 transition-all border group rounded-xl bg-surface border-border text-on-surface hover:border-primary hover:shadow-lg"
        >
          <div className="p-3 rounded-xl bg-secondary/10">
            <Package className="w-6 h-6 text-secondary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Gérer le réassort</h3>
            <p className="text-sm text-muted">
              {produitsEnAlerte.length} produit
              {produitsEnAlerte.length > 1 ? "s" : ""} à surveiller
            </p>
          </div>
          <ArrowRight className="w-5 h-5 transition-all text-muted group-hover:translate-x-1 group-hover:text-primary" />
        </Link>
      </div>

      {/* ─── Salles ──────────────────────────── */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-on-surface">Salles</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {pdvDuSite.map((pdv) => {
            const nbProduits = produits.filter((p) =>
              p.pointDeVenteIds.includes(pdv.id),
            ).length;
            const nbAlertes = produits.filter(
              (p) =>
                p.pointDeVenteIds.includes(pdv.id) &&
                p.stockActuel <= p.seuilReassort,
            ).length;

            return (
              <Link
                key={pdv.id}
                href="/reassort"
                className="p-4 transition-all border rounded-xl bg-surface border-border hover:border-primary hover:shadow-md"
              >
                <h4 className="font-medium text-on-surface">{pdv.nom}</h4>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                  <span>{nbProduits} produits</span>
                  {nbAlertes > 0 && (
                    <span className="flex items-center gap-1 text-warning">
                      <AlertTriangle className="w-3 h-3" />
                      {nbAlertes} alerte{nbAlertes > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ─── Derniers scans ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-on-surface">
            Derniers scans
          </h2>
          <Link
            href="/scan"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Voir tout <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-3">
          {historiqueScans.map((scan) => {
            const pdv = pointsDeVente.find((p) => p.id === scan.pointDeVenteId);
            return (
              <div
                key={scan.id}
                className="flex items-center gap-4 p-4 border rounded-xl bg-surface border-border"
              >
                {/* Indicateur de conformité */}
                <div
                  className={`p-2 rounded-lg ${
                    scan.conforme ? "bg-success/10" : "bg-danger/10"
                  }`}
                >
                  {scan.conforme ? (
                    <ShieldCheck className="w-5 h-5 text-success" />
                  ) : (
                    <ShieldX className="w-5 h-5 text-danger" />
                  )}
                </div>

                {/* Détails du scan */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-on-surface">
                    {scan.nomProduitValide}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                    <span>{pdv?.nom}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(scan.dateScan).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {scan.temperature !== undefined && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Thermometer className="w-3 h-3" />
                          {scan.temperature}°C
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* DLC */}
                <div className="text-right">
                  <p className="text-xs text-muted">DLC</p>
                  <p className="text-sm font-medium text-on-surface">
                    {new Date(scan.dlc).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

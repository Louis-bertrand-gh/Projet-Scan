/* ═══════════════════════════════════════════════════════════════════════
 * page.tsx — Page d'accueil / Tableau de bord
 *
 * Vue synthétique du site actif avec :
 * - Résumé des KPI (scans du jour, alertes, stocks)
 * - Accès rapide aux fonctionnalités principales
 * - Derniers scans HACCP réalisés
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React, { useMemo } from "react";
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
  UserCog,
  LogOut,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { produits, historiqueCaptures, emplacements } from "@/data/mockData";

const ROLES_VALIDES = ["admin", "cc", "cca", "rp", "equipier"] as const;

export default function DashboardPage() {
  const { siteActif, emplacementsDuSite, utilisateur, deconnecter } = useApp();
  const roleDefini = utilisateur
    ? ROLES_VALIDES.includes(utilisateur.role)
    : false;

  /* ─── Calcul des KPI du site ───────────────────────────────── */
  const emplacementIdsDuSite = useMemo(
    () => new Set(emplacementsDuSite.map((e) => e.id)),
    [emplacementsDuSite],
  );

  /* Produits du site actif */
  const produitsDuSite = useMemo(
    () =>
      produits.filter((p) =>
        p.emplacementIds.some((id) => emplacementIdsDuSite.has(id)),
      ),
    [emplacementIdsDuSite],
  );

  /* Produits en alerte (stock ≤ seuil) */
  const produitsEnAlerte = useMemo(
    () => produitsDuSite.filter((p) => p.stockActuel <= p.seuilReassort),
    [produitsDuSite],
  );

  /* Produits critiques (stock = 0) */
  const produitsCritiques = useMemo(
    () => produitsDuSite.filter((p) => p.stockActuel <= 0),
    [produitsDuSite],
  );

  /* Scans du jour (simulation) */
  const scansAujourdhui = useMemo(() => {
    const aujourdHui = new Date().toISOString().slice(0, 10);
    return historiqueCaptures.filter((s) =>
      s.dateCapture.startsWith(aujourdHui),
    );
  }, []);

  const emplacementParId = useMemo(
    () => new Map(emplacements.map((e) => [e.id, e])),
    [],
  );

  const statsParEmplacement = useMemo(() => {
    const map = new Map<string, { nbProduits: number; nbAlertes: number }>();

    for (const emp of emplacementsDuSite) {
      map.set(emp.id, { nbProduits: 0, nbAlertes: 0 });
    }

    for (const p of produits) {
      for (const empId of p.emplacementIds) {
        const current = map.get(empId);
        if (!current) continue;
        current.nbProduits += 1;
        if (p.stockActuel <= p.seuilReassort) current.nbAlertes += 1;
      }
    }

    return map;
  }, [emplacementsDuSite]);

  if (utilisateur && !roleDefini) {
    return (
      <div className="max-w-2xl p-6 border rounded-2xl border-border bg-surface">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-warning/10">
            <UserCog className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">
              Compte en attente d&apos;attribution
            </h1>
            <p className="mt-2 text-sm text-muted">
              Votre compte est bien créé, mais aucun rôle n&apos;est encore
              attribué.
            </p>
            <p className="mt-2 text-sm text-on-surface">
              Contactez un administrateur pour finaliser vos droits
              d&apos;accès.
            </p>
            <button
              type="button"
              onClick={() => {
                void deconnecter();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 mt-4 text-sm font-medium transition-colors border rounded-xl border-border text-on-surface hover:bg-surface-alt"
            >
              <LogOut className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!siteActif) {
    return (
      <div className="max-w-2xl p-6 border rounded-2xl border-border bg-surface">
        <h1 className="text-2xl font-bold text-on-surface">Tableau de bord</h1>
        <p className="mt-2 text-sm text-muted">
          Aucun site n&apos;est encore associé à votre compte.
        </p>
        {utilisateur?.role === "admin" ? (
          <p className="mt-3 text-sm text-on-surface">
            En tant qu&apos;administrateur, ajoutez des associations
            utilisateur/site depuis la gestion des utilisateurs.
          </p>
        ) : (
          <p className="mt-3 text-sm text-on-surface">
            Contactez un administrateur pour vous attribuer un site.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            void deconnecter();
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 mt-4 text-sm font-medium transition-colors border rounded-xl border-border text-on-surface hover:bg-surface-alt"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    );
  }

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

      {/* ─── Emplacements ────────────────────── */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-on-surface">
          Emplacements
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {emplacementsDuSite.map((emp) => {
            const stats = statsParEmplacement.get(emp.id);
            const nbProduits = stats?.nbProduits ?? 0;
            const nbAlertes = stats?.nbAlertes ?? 0;

            return (
              <Link
                key={emp.id}
                href="/reassort"
                className="p-4 transition-all border rounded-xl bg-surface border-border hover:border-primary hover:shadow-md"
              >
                <h4 className="font-medium text-on-surface">{emp.nom}</h4>
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
          {historiqueCaptures.map((scan) => {
            const emp = emplacementParId.get(scan.emplacementId);
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
                    <span>{emp?.nom}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(scan.dateCapture).toLocaleTimeString("fr-FR", {
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

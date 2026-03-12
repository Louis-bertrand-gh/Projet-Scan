/* ═══════════════════════════════════════════════════════════════════════
 * parametres/page.tsx — Page de paramètres / réglages
 *
 * Permet à l'utilisateur de :
 * - Choisir un thème visuel parmi les thèmes nature
 * - Consulter les informations de son profil
 * - Consulter les infos du site actif
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React from "react";
import { Palette, User, MapPin, Info, Check } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useApp } from "@/contexts/AppContext";

export default function ParametresPage() {
  const { themeActif, themesDisponibles, changerTheme } = useTheme();
  const { utilisateur, siteActif, pdvDuSite } = useApp();

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      {/* ─── En-tête ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Paramètres</h1>
        <p className="text-muted text-sm mt-1">
          Personnalisez votre expérience
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════
       * Section : Choix du thème
       * ═══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-on-surface">
            Thème visuel
          </h2>
        </div>
        <p className="text-muted text-sm mb-4">
          Choisissez un thème inspiré de la nature pour personnaliser
          l&apos;apparence de l&apos;application.
        </p>

        {/* Grille de sélection des thèmes */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {themesDisponibles.map((theme) => {
            const estActif = theme.id === themeActif.id;
            return (
              <button
                key={theme.id}
                onClick={() => changerTheme(theme.id)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all hover:shadow-md active:scale-[0.98] ${
                  estActif
                    ? "border-primary shadow-md"
                    : "border-border hover:border-muted"
                }`}
              >
                {/* Indicateur de sélection */}
                {estActif && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-on-primary" />
                  </div>
                )}

                {/* Palette de couleurs preview */}
                <div className="flex gap-1.5 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg"
                    style={{ backgroundColor: theme.couleurs.primary }}
                    title="Primaire"
                  />
                  <div
                    className="w-8 h-8 rounded-lg"
                    style={{ backgroundColor: theme.couleurs.secondary }}
                    title="Secondaire"
                  />
                  <div
                    className="w-8 h-8 rounded-lg"
                    style={{ backgroundColor: theme.couleurs.accent }}
                    title="Accent"
                  />
                  <div
                    className="w-8 h-8 rounded-lg border"
                    style={{
                      backgroundColor: theme.couleurs.background,
                      borderColor: theme.couleurs.border,
                    }}
                    title="Fond"
                  />
                </div>

                {/* Nom et description */}
                <h3
                  className={`font-semibold text-sm ${
                    estActif ? "text-primary" : "text-on-surface"
                  }`}
                >
                  {theme.nom}
                </h3>
                <p className="text-xs text-muted mt-0.5 line-clamp-2">
                  {theme.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
       * Section : Profil utilisateur
       * ═══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-on-surface">Profil</h2>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
              <User className="w-7 h-7 text-on-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-on-surface text-lg">
                {utilisateur.prenom} {utilisateur.nom}
              </h3>
              <p className="text-muted text-sm capitalize">
                {utilisateur.role}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-lg bg-surface-alt">
              <p className="text-xs text-muted mb-0.5">Email</p>
              <p className="text-sm font-medium text-on-surface">
                {utilisateur.email}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-alt">
              <p className="text-xs text-muted mb-0.5">Rôle</p>
              <p className="text-sm font-medium text-on-surface capitalize">
                {utilisateur.role}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-alt">
              <p className="text-xs text-muted mb-0.5">Sites accessibles</p>
              <p className="text-sm font-medium text-on-surface">
                {utilisateur.siteIds.length} site
                {utilisateur.siteIds.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
       * Section : Site actif
       * ═══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-on-surface">Site actif</h2>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5 space-y-3">
          <div>
            <h3 className="font-semibold text-on-surface">{siteActif.nom}</h3>
            <p className="text-muted text-sm">{siteActif.localisation}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-2">
              Points de vente ({pdvDuSite.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {pdvDuSite.map((pdv) => (
                <span
                  key={pdv.id}
                  className="px-3 py-1 rounded-lg bg-surface-alt text-on-surface text-sm border border-border"
                >
                  {pdv.nom}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
       * Section : À propos
       * ═══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-on-surface">À propos</h2>
        </div>

        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Application</span>
              <span className="text-on-surface font-medium">
                Scan — HACCP & Réassort
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Version</span>
              <span className="text-on-surface font-medium">0.1.0 (MVP)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Framework</span>
              <span className="text-on-surface font-medium">
                Next.js 14 + TypeScript
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Client</span>
              <span className="text-on-surface font-medium">Huttopia</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

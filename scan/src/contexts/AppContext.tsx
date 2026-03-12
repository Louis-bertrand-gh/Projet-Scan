/* ═══════════════════════════════════════════════════════════════════════
 * AppContext.tsx — Contexte principal de l'application
 *
 * Gère l'état global : utilisateur connecté, site actif et
 * point de vente sélectionné. Ces données déterminent la vue
 * et les données affichées dans toute l'application.
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { User, Site, PointDeVente } from "@/types";
import { utilisateurParDefaut, sites, pointsDeVente } from "@/data/mockData";

/* ─── Interface du contexte ──────────────────────────────────────────── */
interface AppContextType {
  /** Utilisateur actuellement connecté */
  utilisateur: User;
  /** Site (camping) actuellement sélectionné */
  siteActif: Site;
  /** Point de vente sélectionné dans le site actif (peut être null) */
  pdvActif: PointDeVente | null;
  /** Tous les sites accessibles par l'utilisateur */
  sitesAccessibles: Site[];
  /** Points de vente du site actif */
  pdvDuSite: PointDeVente[];
  /** Changer le site actif par son identifiant */
  changerSite: (siteId: string) => void;
  /** Changer le point de vente actif par son identifiant */
  changerPdv: (pdvId: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/* ─── Provider ───────────────────────────────────────────────────────── */
export function AppProvider({ children }: { children: React.ReactNode }) {
  /*
   * Pour le MVP, on utilise l'utilisateur par défaut (admin).
   * En production, cet état serait alimenté par l'authentification.
   */
  const [utilisateur] = useState<User>(utilisateurParDefaut);

  /* Filtrer les sites auxquels l'utilisateur a accès */
  const sitesAccessibles = sites.filter((s) =>
    utilisateur.siteIds.includes(s.id),
  );

  /* Site actif — initialisé au premier site accessible */
  const [siteActif, setSiteActif] = useState<Site>(sitesAccessibles[0]);

  /* Points de vente du site actif */
  const pdvDuSite = pointsDeVente.filter((p) => p.siteId === siteActif.id);

  /* Point de vente sélectionné */
  const [pdvActif, setPdvActif] = useState<PointDeVente | null>(null);

  /**
   * Change le site actif et réinitialise le PDV sélectionné.
   * Quand on change de site, le PDV précédent n'est plus valide.
   */
  const changerSite = useCallback(
    (siteId: string) => {
      const site = sitesAccessibles.find((s) => s.id === siteId);
      if (site) {
        setSiteActif(site);
        setPdvActif(null);
      }
    },
    [sitesAccessibles],
  );

  /** Sélectionne un point de vente ou le désélectionne (null) */
  const changerPdv = useCallback(
    (pdvId: string | null) => {
      if (pdvId === null) {
        setPdvActif(null);
        return;
      }
      const pdv = pdvDuSite.find((p) => p.id === pdvId);
      if (pdv) {
        setPdvActif(pdv);
      }
    },
    [pdvDuSite],
  );

  return (
    <AppContext.Provider
      value={{
        utilisateur,
        siteActif,
        pdvActif,
        sitesAccessibles,
        pdvDuSite,
        changerSite,
        changerPdv,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/* ─── Hook personnalisé ──────────────────────────────────────────────── */
export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp doit être utilisé à l'intérieur d'un AppProvider");
  }
  return context;
}

/* ═══════════════════════════════════════════════════════════════════════
 * AppContext.tsx — Contexte principal de l'application
 *
 * Gère l'état global : utilisateur connecté, site actif et
 * emplacement sélectionné. Les données sont chargées depuis
 * Supabase au montage du provider.
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { User, Site, Emplacement } from "@/types";
import {
  fetchProfil,
  fetchSites,
  fetchEmplacementsParSite,
  resendConfirmationEmail,
  signIn,
  signUpWithProfile,
  signOut,
} from "@/lib/db";
import {
  sites as mockSites,
  emplacements as mockEmplacements,
  utilisateurParDefaut,
} from "@/data/mockData";

type AuthMode = "pin" | "supabase" | null;

const ADMIN_PIN = "1111";
const PIN_SESSION_KEY = "scan-admin-pin-session";

function getEmplacementsForSite(siteId: string): Emplacement[] {
  return mockEmplacements.filter(
    (emplacement) => emplacement.siteId === siteId,
  );
}

/* ─── Interface du contexte ──────────────────────────────────────────── */
interface AppContextType {
  /** Utilisateur actuellement connecté (null = non connecté) */
  utilisateur: User | null;
  /** Mode d'authentification actif */
  authMode: AuthMode;
  /** Site (camping) actuellement sélectionné */
  siteActif: Site | null;
  /** Emplacement sélectionné dans le site actif (peut être null) */
  emplacementActif: Emplacement | null;
  /** Tous les sites accessibles par l'utilisateur */
  sitesAccessibles: Site[];
  /** Emplacements du site actif */
  emplacementsDuSite: Emplacement[];
  /** Indique si les données sont en cours de chargement */
  chargement: boolean;
  /** Erreur de chargement éventuelle */
  erreur: string | null;
  /** Changer le site actif par son identifiant */
  changerSite: (siteId: string) => void;
  /** Changer l'emplacement actif par son identifiant */
  changerEmplacement: (emplacementId: string | null) => void;
  /** Authentification temporaire par PIN admin */
  authentifierAvecPin: (pin: string) => Promise<boolean>;
  /** Authentification BDD (Supabase Auth) */
  authentifierAvecBdd: (email: string, password: string) => Promise<boolean>;
  /** Création de compte BDD (Supabase Auth + profil app) */
  creerCompteBdd: (payload: {
    prenom: string;
    nom: string;
    email: string;
    password: string;
  }) => Promise<{
    ok: boolean;
    requiresEmailConfirmation: boolean;
    confirmationEmailRequested: boolean;
    email: string;
  }>;
  /** Redemande l'envoi de l'email de confirmation */
  renvoyerEmailConfirmation: (email: string) => Promise<boolean>;
  /** Déconnexion */
  deconnecter: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/* ─── Provider ───────────────────────────────────────────────────────── */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [sitesAccessibles, setSitesAccessibles] = useState<Site[]>([]);
  const [siteActif, setSiteActif] = useState<Site | null>(null);
  const [emplacementsDuSite, setEmplacementsDuSite] = useState<Emplacement[]>(
    [],
  );
  const [emplacementActif, setEmplacementActif] = useState<Emplacement | null>(
    null,
  );
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const hydraterSessionPin = useCallback(() => {
    const premierSite = mockSites[0] ?? null;

    setUtilisateur(utilisateurParDefaut);
    setAuthMode("pin");
    setSitesAccessibles(mockSites);
    setSiteActif(premierSite);
    setEmplacementsDuSite(
      premierSite ? getEmplacementsForSite(premierSite.id) : [],
    );
    setEmplacementActif(null);
  }, []);

  const hydraterSessionSupabase = useCallback(async (profil: User) => {
    setUtilisateur(profil);
    setAuthMode("supabase");

    const tousLesSites = await fetchSites();
    const sitesUser = tousLesSites.filter((s) => profil.siteIds.includes(s.id));
    setSitesAccessibles(sitesUser);

    if (sitesUser.length === 0) {
      setSiteActif(null);
      setEmplacementsDuSite([]);
      setEmplacementActif(null);
      return;
    }

    const premierSite = sitesUser[0];
    setSiteActif(premierSite);

    const emps = await fetchEmplacementsParSite(premierSite.id);
    setEmplacementsDuSite(emps);
    setEmplacementActif(null);
  }, []);

  /* Chargement initial : profil utilisateur + ses sites */
  useEffect(() => {
    let annule = false;

    async function chargerDonnees() {
      try {
        setChargement(true);
        setErreur(null);

        const sessionPin = window.localStorage.getItem(PIN_SESSION_KEY);
        if (sessionPin === "admin") {
          if (!annule) {
            hydraterSessionPin();
            setChargement(false);
          }
          return;
        }

        const profil = await fetchProfil();
        if (annule) return;

        if (!profil) {
          setAuthMode(null);
          setChargement(false);
          return;
        }

        await hydraterSessionSupabase(profil);
        if (annule) return;
      } catch (e) {
        if (!annule)
          setErreur(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        if (!annule) setChargement(false);
      }
    }

    chargerDonnees();
    return () => {
      annule = true;
    };
  }, [hydraterSessionPin, hydraterSessionSupabase]);

  /* Recharger les emplacements quand le site actif change */
  useEffect(() => {
    if (!siteActif) return;

    if (authMode === "pin") {
      setEmplacementsDuSite(getEmplacementsForSite(siteActif.id));
      setEmplacementActif(null);
      return;
    }

    let annule = false;

    fetchEmplacementsParSite(siteActif.id)
      .then((emps) => {
        if (!annule) {
          setEmplacementsDuSite(emps);
          setEmplacementActif(null);
        }
      })
      .catch((e) => {
        if (!annule)
          setErreur(
            e instanceof Error ? e.message : "Erreur chargement emplacements",
          );
      });

    return () => {
      annule = true;
    };
  }, [authMode, siteActif?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const changerSite = useCallback(
    (siteId: string) => {
      const site = sitesAccessibles.find((s) => s.id === siteId);
      if (site) {
        setSiteActif(site);
        setEmplacementActif(null);
        if (authMode === "pin") {
          setEmplacementsDuSite(getEmplacementsForSite(site.id));
        }
      }
    },
    [authMode, sitesAccessibles],
  );

  const changerEmplacement = useCallback(
    (emplacementId: string | null) => {
      if (emplacementId === null) {
        setEmplacementActif(null);
        return;
      }
      const emp = emplacementsDuSite.find((e) => e.id === emplacementId);
      if (emp) setEmplacementActif(emp);
    },
    [emplacementsDuSite],
  );

  const authentifierAvecPin = useCallback(
    async (pin: string) => {
      if (pin !== ADMIN_PIN) {
        return false;
      }

      window.localStorage.setItem(PIN_SESSION_KEY, "admin");
      setErreur(null);
      hydraterSessionPin();
      setChargement(false);
      return true;
    },
    [hydraterSessionPin],
  );

  const authentifierAvecBdd = useCallback(
    async (email: string, password: string) => {
      try {
        setChargement(true);
        setErreur(null);

        const { user } = await signIn(email, password);
        await hydraterSessionSupabase(user);
        return true;
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Erreur de connexion BDD");
        return false;
      } finally {
        setChargement(false);
      }
    },
    [hydraterSessionSupabase],
  );

  const creerCompteBdd = useCallback(
    async (payload: {
      prenom: string;
      nom: string;
      email: string;
      password: string;
    }) => {
      try {
        setChargement(true);
        setErreur(null);

        const result = await signUpWithProfile(payload);

        if (!result.requiresEmailConfirmation) {
          await hydraterSessionSupabase(result.user);
        }

        return {
          ok: true,
          requiresEmailConfirmation: result.requiresEmailConfirmation,
          confirmationEmailRequested: result.confirmationEmailRequested,
          email: result.email,
        };
      } catch (e) {
        setErreur(
          e instanceof Error ? e.message : "Erreur de création de compte",
        );
        return {
          ok: false,
          requiresEmailConfirmation: false,
          confirmationEmailRequested: false,
          email: payload.email,
        };
      } finally {
        setChargement(false);
      }
    },
    [hydraterSessionSupabase],
  );

  const renvoyerEmailConfirmation = useCallback(async (email: string) => {
    try {
      setChargement(true);
      setErreur(null);
      await resendConfirmationEmail(email);
      return true;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de renvoi du mail");
      return false;
    } finally {
      setChargement(false);
    }
  }, []);

  const deconnecter = useCallback(async () => {
    window.localStorage.removeItem(PIN_SESSION_KEY);

    if (authMode === "supabase") {
      try {
        await signOut();
      } catch (e) {
        console.warn("Erreur de déconnexion Supabase :", e);
      }
    }

    setUtilisateur(null);
    setAuthMode(null);
    setSitesAccessibles([]);
    setSiteActif(null);
    setEmplacementsDuSite([]);
    setEmplacementActif(null);
    setErreur(null);
  }, [authMode]);

  const value = useMemo(
    () => ({
      utilisateur,
      authMode,
      siteActif,
      emplacementActif,
      sitesAccessibles,
      emplacementsDuSite,
      chargement,
      erreur,
      changerSite,
      changerEmplacement,
      authentifierAvecPin,
      authentifierAvecBdd,
      creerCompteBdd,
      renvoyerEmailConfirmation,
      deconnecter,
    }),
    [
      utilisateur,
      authMode,
      siteActif,
      emplacementActif,
      sitesAccessibles,
      emplacementsDuSite,
      chargement,
      erreur,
      changerSite,
      changerEmplacement,
      authentifierAvecPin,
      authentifierAvecBdd,
      creerCompteBdd,
      renvoyerEmailConfirmation,
      deconnecter,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/* ─── Hook personnalisé ──────────────────────────────────────────────── */
export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp doit être utilisé à l'intérieur d'un AppProvider");
  }
  return context;
}

/* ═══════════════════════════════════════════════════════════════════════
 * ThemeContext.tsx — Gestion globale du thème visuel
 *
 * Ce contexte permet à l'utilisateur de choisir un thème parmi
 * les thèmes inspirés de la nature. Les couleurs sont injectées
 * en tant que CSS custom properties sur le <html>, ce qui permet
 * à Tailwind de les utiliser dynamiquement sans rebuild.
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Theme } from "@/types";
import { themes, themeParDefaut } from "@/data/themes";

/* ─── Interface du contexte ──────────────────────────────────────────── */
interface ThemeContextType {
  /** Thème actuellement actif */
  themeActif: Theme;
  /** Liste de tous les thèmes disponibles */
  themesDisponibles: Theme[];
  /** Changer le thème actif par son identifiant */
  changerTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/* ─── Clé de stockage local pour persister le choix ──────────────────── */
const THEME_STORAGE_KEY = "scan-theme-id";

/* ─── Provider ───────────────────────────────────────────────────────── */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeActif, setThemeActif] = useState<Theme>(themeParDefaut);

  /**
   * Applique les couleurs du thème en tant que CSS custom properties
   * sur l'élément <html>. Cette approche permet un changement
   * instantané sans rechargement de la page.
   */
  const appliquerCouleurs = useCallback((theme: Theme) => {
    const root = document.documentElement;
    const c = theme.couleurs;
    root.style.setProperty("--color-primary", c.primary);
    root.style.setProperty("--color-primary-light", c.primaryLight);
    root.style.setProperty("--color-primary-dark", c.primaryDark);
    root.style.setProperty("--color-secondary", c.secondary);
    root.style.setProperty("--color-accent", c.accent);
    root.style.setProperty("--color-surface", c.surface);
    root.style.setProperty("--color-surface-alt", c.surfaceAlt);
    root.style.setProperty("--color-background", c.background);
    root.style.setProperty("--color-on-primary", c.onPrimary);
    root.style.setProperty("--color-on-surface", c.onSurface);
    root.style.setProperty("--color-on-background", c.onBackground);
    root.style.setProperty("--color-muted", c.muted);
    root.style.setProperty("--color-border", c.border);
    root.style.setProperty("--color-danger", c.danger);
    root.style.setProperty("--color-success", c.success);
    root.style.setProperty("--color-warning", c.warning);
  }, []);

  /* Au montage : restaurer le thème sauvegardé ou utiliser le défaut */
  useEffect(() => {
    const idSauvegarde = localStorage.getItem(THEME_STORAGE_KEY);
    const themeTrouve = themes.find((t) => t.id === idSauvegarde);
    const themeInitial = themeTrouve || themeParDefaut;
    setThemeActif(themeInitial);
    appliquerCouleurs(themeInitial);
  }, [appliquerCouleurs]);

  /**
   * Change le thème actif, applique les couleurs et persiste le choix
   * dans le localStorage pour les prochaines visites.
   */
  const changerTheme = useCallback(
    (themeId: string) => {
      const nouveau = themes.find((t) => t.id === themeId);
      if (!nouveau) return;
      setThemeActif(nouveau);
      appliquerCouleurs(nouveau);
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    },
    [appliquerCouleurs],
  );

  const value = useMemo(
    () => ({ themeActif, themesDisponibles: themes, changerTheme }),
    [themeActif, changerTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/* ─── Hook personnalisé pour accéder au thème ────────────────────────── */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error(
      "useTheme doit être utilisé à l'intérieur d'un ThemeProvider",
    );
  }
  return context;
}

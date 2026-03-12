/* ═══════════════════════════════════════════════════════════════════════
 * types.ts — Modèle de données complet de l'application Scan
 *
 * Structure hiérarchique : Sites > Points de Vente > Catégories > Produits
 * Conforme au MCD HACCP pour la traçabilité alimentaire.
 * ═══════════════════════════════════════════════════════════════════════ */

/* ─── Rôles utilisateur ──────────────────────────────────────────────── */
/**
 * Rôles possibles dans l'application :
 * - admin : Accès total (siège / direction)
 * - cc : Chef de Cuisine — gestion d'un ou plusieurs sites
 * - rp : Responsable Point de Vente — gestion d'un PDV
 * - equipier : Équipier terrain — scan et saisie uniquement
 */
export type UserRole = "admin" | "cc" | "rp" | "equipier";

/* ─── Utilisateur ────────────────────────────────────────────────────── */
export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  /** Identifiants des sites auxquels l'utilisateur a accès */
  siteIds: string[];
  avatar?: string;
}

/* ─── Site (camping) ─────────────────────────────────────────────────── */
export interface Site {
  id: string;
  nom: string;
  /** Ville ou localisation du camping */
  localisation: string;
  /** Liste des identifiants de points de vente rattachés */
  pointDeVenteIds: string[];
}

/* ─── Point de Vente (PDV) ───────────────────────────────────────────── */
/**
 * Un Point de Vente représente un lieu de restauration au sein d'un site
 * (ex: Pizzeria, Bar, Cuisine centrale).
 */
export interface PointDeVente {
  id: string;
  nom: string;
  /** Site parent */
  siteId: string;
  /** Icône descriptive (nom Lucide) */
  icone: string;
  /** Catégories de produits disponibles dans ce PDV */
  categorieIds: string[];
}

/* ─── Catégorie de produit ───────────────────────────────────────────── */
export interface Categorie {
  id: string;
  nom: string;
  /** Description courte pour l'affichage */
  description?: string;
  /** Icône Lucide associée */
  icone: string;
}

/* ─── Produit ────────────────────────────────────────────────────────── */
export interface Produit {
  id: string;
  nom: string;
  categorieId: string;
  /** Points de vente où ce produit est référencé */
  pointDeVenteIds: string[];
  /** Unité de mesure (kg, L, pièce, etc.) */
  unite: string;
  /** Seuil en-dessous duquel on déclenche un réassort */
  seuilReassort: number;
  /** Quantité actuellement en stock */
  stockActuel: number;
  /** Code-barres EAN si disponible */
  codeBarres?: string;
  /** Température de conservation recommandée (°C) */
  temperatureConservation?: number;
}

/* ─── Scan HACCP (résultat d'un contrôle) ────────────────────────────── */
/**
 * Représente un scan de traçabilité effectué par un utilisateur.
 * Contient les données extraites par OCR puis validées manuellement.
 */
export interface ScanHACCP {
  id: string;
  produitId: string;
  pointDeVenteId: string;
  /** Identifiant de l'utilisateur ayant réalisé le scan */
  userId: string;
  /** Date et heure du scan */
  dateScan: string;
  /** Numéro de lot extrait de l'étiquette */
  numeroLot: string;
  /** Date Limite de Consommation */
  dlc: string;
  /** Nom du produit tel qu'extrait par l'OCR */
  nomProduitOCR: string;
  /** Nom du produit validé/corrigé par l'utilisateur */
  nomProduitValide: string;
  /** Température relevée lors du contrôle (°C) */
  temperature?: number;
  /** Conformité du produit après vérification */
  conforme: boolean;
  /** Commentaire optionnel de l'utilisateur */
  commentaire?: string;
  /** URL de la photo capturée (base64 ou blob) */
  photoUrl?: string;
}

/* ─── Données OCR extraites ──────────────────────────────────────────── */
/** Résultat brut de l'analyse OCR avant validation */
export interface DonneesOCR {
  numeroLot: string;
  dlc: string;
  nomProduit: string;
  /** Niveau de confiance de l'extraction (0 à 1) */
  confiance: number;
}

/* ─── État de réassort d'un produit ──────────────────────────────────── */
export type StatutReassort = "ok" | "bas" | "critique" | "a_commander";

export interface ProduitReassort {
  produit: Produit;
  statut: StatutReassort;
  /** Marqué manuellement "à commander" par l'utilisateur */
  aCommander: boolean;
  /** Quantité suggérée à commander */
  quantiteSuggestion: number;
}

/* ─── Thème visuel ───────────────────────────────────────────────────── */
export interface Theme {
  id: string;
  nom: string;
  /** Description évocatrice du thème */
  description: string;
  couleurs: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    accent: string;
    surface: string;
    surfaceAlt: string;
    background: string;
    onPrimary: string;
    onSurface: string;
    onBackground: string;
    muted: string;
    border: string;
    danger: string;
    success: string;
    warning: string;
  };
}

/* ─── Navigation ─────────────────────────────────────────────────────── */
export interface NavItem {
  label: string;
  href: string;
  /** Nom de l'icône Lucide */
  icone: string;
  /** Rôles autorisés à voir cet item */
  roles: UserRole[];
}

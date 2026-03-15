/* ═══════════════════════════════════════════════════════════════════════
 * types.ts — Modèle de données complet de l'application Scan
 *
 * Structure hiérarchique : Sites > Emplacements > Catégories > Produits
 * Conforme au MCD HACCP pour la traçabilité alimentaire.
 * ═══════════════════════════════════════════════════════════════════════ */

/* ─── Rôles utilisateur ──────────────────────────────────────────────── */
/**
 * Rôles possibles dans l'application :
 * - admin : Accès total (siège / direction)
 * - cc : Chef de camp — gestion d'un ou plusieurs sites
 * - cca : Chef de camp adjoint
 * - rp : Responsable Emplacement — gestion d'un emplacement
 * - equipier : Équipier terrain — scan et saisie uniquement
 */
export type UserRole = "admin" | "cc" | "cca" | "rp" | "equipier";

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
  /** Liste des identifiants d'emplacements rattachés */
  emplacementIds: string[];
}

/* ─── Emplacement ────────────────────────────────────────────────────── */
/**
 * Un Emplacement représente un lieu de stockage ou d'utilisation au sein
 * d'un site (ex: Réserve sèche, Cuisine, Chambre froide, Chambre négative,
 * Frigo bar, Congélateur bar, etc.).
 */
export interface Emplacement {
  id: string;
  nom: string;
  /** Site parent */
  siteId: string;
  /** Icône descriptive (nom Lucide) */
  icone: string;
  /** Catégories de produits disponibles dans cet emplacement */
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
  /** Emplacements où ce produit est référencé */
  emplacementIds: string[];
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

/* ─── Capture HACCP (résultat d'un contrôle) ─────────────────────────── */
/**
 * Représente une capture de traçabilité effectuée par un utilisateur.
 * Contient les données extraites par OCR puis validées manuellement.
 */
export interface CaptureHACCP {
  id: string;
  produitId?: string;
  emplacementId: string;
  /** Identifiant de l'utilisateur ayant réalisé la capture */
  userId: string;
  /** Date et heure de la capture */
  dateCapture: string;
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
  /** URL de la photo dans le bucket Supabase Storage */
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
  /** Confiance par champ pour guider la validation utilisateur */
  confianceChamps?: {
    numeroLot: number;
    dlc: number;
    nomProduit: number;
  };
  /** Texte brut OCR (utile pour debug et amélioration parsing) */
  texteBrut?: string;
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

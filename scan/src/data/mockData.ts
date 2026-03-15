/* ═══════════════════════════════════════════════════════════════════════
 * mockData.ts — Données simulées pour le MVP
 *
 * Ces données représentent une chaîne de campings Huttopia avec
 * plusieurs sites, emplacements, catégories et produits.
 * En production, ces données proviendront de Supabase.
 * ═══════════════════════════════════════════════════════════════════════ */

import {
  Site,
  Emplacement,
  Categorie,
  Produit,
  User,
  CaptureHACCP,
} from "@/types";

/* ─── Sites Huttopia ─────────────────────────────────────────────────── */
export const sites: Site[] = [
  {
    id: "site-1",
    nom: "Huttopia Senonches",
    localisation: "Senonches, Eure-et-Loir",
    emplacementIds: [
      "emp-1",
      "emp-2",
      "emp-3",
      "emp-4",
      "emp-5",
      "emp-6",
      "emp-7",
    ],
  },
  {
    id: "site-2",
    nom: "Huttopia Sutton",
    localisation: "Sutton, Québec",
    emplacementIds: ["emp-8", "emp-9", "emp-10"],
  },
  {
    id: "site-3",
    nom: "Huttopia Divonne-les-Bains",
    localisation: "Divonne-les-Bains, Ain",
    emplacementIds: ["emp-11", "emp-12", "emp-13"],
  },
];

/* ─── Catégories de produits ─────────────────────────────────────────── */
export const categories: Categorie[] = [
  {
    id: "cat-1",
    nom: "Fromages",
    description: "Fromages frais et affinés",
    icone: "Milk",
  },
  {
    id: "cat-2",
    nom: "Boissons",
    description: "Boissons fraîches et chaudes",
    icone: "GlassWater",
  },
  {
    id: "cat-3",
    nom: "Viandes",
    description: "Viandes fraîches et charcuterie",
    icone: "Beef",
  },
  {
    id: "cat-4",
    nom: "Légumes",
    description: "Légumes frais et surgelés",
    icone: "Carrot",
  },
  {
    id: "cat-5",
    nom: "Pâtes & Bases",
    description: "Pâtes, sauces et bases de pizza",
    icone: "Pizza",
  },
  {
    id: "cat-6",
    nom: "Desserts",
    description: "Desserts et glaces",
    icone: "IceCreamCone",
  },
];

/* ─── Emplacements ───────────────────────────────────────────────────── */
export const emplacements: Emplacement[] = [
  // Site 1 — Senonches
  {
    id: "emp-1",
    nom: "Réserve sèche",
    siteId: "site-1",
    icone: "Archive",
    categorieIds: ["cat-5"],
  },
  {
    id: "emp-2",
    nom: "Cuisine centrale",
    siteId: "site-1",
    icone: "ChefHat",
    categorieIds: ["cat-1", "cat-2", "cat-3", "cat-4", "cat-5", "cat-6"],
  },
  {
    id: "emp-3",
    nom: "Chambre froide",
    siteId: "site-1",
    icone: "Thermometer",
    categorieIds: ["cat-1", "cat-3", "cat-4"],
  },
  {
    id: "emp-4",
    nom: "Chambre négative",
    siteId: "site-1",
    icone: "Snowflake",
    categorieIds: ["cat-3", "cat-6"],
  },
  {
    id: "emp-5",
    nom: "Frigo petit-déjeuner bar",
    siteId: "site-1",
    icone: "Coffee",
    categorieIds: ["cat-1", "cat-2"],
  },
  {
    id: "emp-6",
    nom: "Frigo boissons bar",
    siteId: "site-1",
    icone: "GlassWater",
    categorieIds: ["cat-2"],
  },
  {
    id: "emp-7",
    nom: "Congélateur bar",
    siteId: "site-1",
    icone: "Snowflake",
    categorieIds: ["cat-6"],
  },
  // Site 2 — Sutton
  {
    id: "emp-8",
    nom: "Cuisine restaurant",
    siteId: "site-2",
    icone: "ChefHat",
    categorieIds: ["cat-1", "cat-2", "cat-3", "cat-4"],
  },
  {
    id: "emp-9",
    nom: "Chambre froide restaurant",
    siteId: "site-2",
    icone: "Thermometer",
    categorieIds: ["cat-1", "cat-3", "cat-4"],
  },
  {
    id: "emp-10",
    nom: "Congélateur snack",
    siteId: "site-2",
    icone: "Snowflake",
    categorieIds: ["cat-5", "cat-6"],
  },
  // Site 3 — Divonne
  {
    id: "emp-11",
    nom: "Chambre froide brasserie",
    siteId: "site-3",
    icone: "Thermometer",
    categorieIds: ["cat-1", "cat-2", "cat-3", "cat-4"],
  },
  {
    id: "emp-12",
    nom: "Réserve épicerie",
    siteId: "site-3",
    icone: "Archive",
    categorieIds: ["cat-1", "cat-2", "cat-4", "cat-6"],
  },
  {
    id: "emp-13",
    nom: "Frigo épicerie",
    siteId: "site-3",
    icone: "Thermometer",
    categorieIds: ["cat-1", "cat-2"],
  },
];

/* ─── Produits ───────────────────────────────────────────────────────── */
export const produits: Produit[] = [
  // Fromages
  {
    id: "prod-1",
    nom: "Bûche de Chèvre",
    categorieId: "cat-1",
    emplacementIds: ["emp-2", "emp-3", "emp-5", "emp-8", "emp-11"],
    unite: "pièce",
    seuilReassort: 5,
    stockActuel: 3,
    codeBarres: "3250390000015",
    temperatureConservation: 4,
  },
  {
    id: "prod-2",
    nom: "Mozzarella di Bufala",
    categorieId: "cat-1",
    emplacementIds: ["emp-2", "emp-3", "emp-8"],
    unite: "kg",
    seuilReassort: 2,
    stockActuel: 4,
    codeBarres: "8000430000022",
    temperatureConservation: 4,
  },
  {
    id: "prod-3",
    nom: "Comté 18 mois",
    categorieId: "cat-1",
    emplacementIds: ["emp-3", "emp-5", "emp-11", "emp-13"],
    unite: "kg",
    seuilReassort: 1,
    stockActuel: 0.5,
    codeBarres: "3250390000039",
    temperatureConservation: 6,
  },
  {
    id: "prod-4",
    nom: "Parmesan Reggiano",
    categorieId: "cat-1",
    emplacementIds: ["emp-2", "emp-3"],
    unite: "kg",
    seuilReassort: 1,
    stockActuel: 2,
    codeBarres: "8000430000046",
    temperatureConservation: 6,
  },
  // Boissons
  {
    id: "prod-5",
    nom: "Jus d'Orange Bio",
    categorieId: "cat-2",
    emplacementIds: ["emp-5", "emp-6", "emp-2", "emp-12"],
    unite: "L",
    seuilReassort: 10,
    stockActuel: 6,
    codeBarres: "3250390000053",
    temperatureConservation: 4,
  },
  {
    id: "prod-6",
    nom: "Limonade Artisanale",
    categorieId: "cat-2",
    emplacementIds: ["emp-6", "emp-8", "emp-11"],
    unite: "L",
    seuilReassort: 15,
    stockActuel: 20,
    codeBarres: "3250390000060",
    temperatureConservation: 6,
  },
  {
    id: "prod-7",
    nom: "Eau Minérale 1.5L",
    categorieId: "cat-2",
    emplacementIds: ["emp-6", "emp-2", "emp-8", "emp-9", "emp-11", "emp-12"],
    unite: "pièce",
    seuilReassort: 30,
    stockActuel: 45,
    codeBarres: "3250390000077",
  },
  // Viandes
  {
    id: "prod-8",
    nom: "Jambon Sec Supérieur",
    categorieId: "cat-3",
    emplacementIds: ["emp-2", "emp-3", "emp-8", "emp-11"],
    unite: "kg",
    seuilReassort: 2,
    stockActuel: 1,
    codeBarres: "3250390000084",
    temperatureConservation: 4,
  },
  {
    id: "prod-9",
    nom: "Poulet Fermier",
    categorieId: "cat-3",
    emplacementIds: ["emp-3", "emp-8"],
    unite: "kg",
    seuilReassort: 3,
    stockActuel: 5,
    codeBarres: "3250390000091",
    temperatureConservation: 2,
  },
  {
    id: "prod-10",
    nom: "Saucisse de Toulouse",
    categorieId: "cat-3",
    emplacementIds: ["emp-3", "emp-4", "emp-11"],
    unite: "kg",
    seuilReassort: 2,
    stockActuel: 0,
    codeBarres: "3250390000107",
    temperatureConservation: 4,
  },
  // Légumes
  {
    id: "prod-11",
    nom: "Tomates Grappe Bio",
    categorieId: "cat-4",
    emplacementIds: ["emp-2", "emp-3", "emp-8", "emp-11"],
    unite: "kg",
    seuilReassort: 5,
    stockActuel: 8,
    codeBarres: "3250390000114",
    temperatureConservation: 8,
  },
  {
    id: "prod-12",
    nom: "Salade Batavia",
    categorieId: "cat-4",
    emplacementIds: ["emp-3", "emp-8", "emp-9", "emp-11"],
    unite: "pièce",
    seuilReassort: 10,
    stockActuel: 4,
    codeBarres: "3250390000121",
    temperatureConservation: 4,
  },
  {
    id: "prod-13",
    nom: "Champignons de Paris",
    categorieId: "cat-4",
    emplacementIds: ["emp-2", "emp-3"],
    unite: "kg",
    seuilReassort: 3,
    stockActuel: 2,
    codeBarres: "3250390000138",
    temperatureConservation: 4,
  },
  // Pâtes & Bases
  {
    id: "prod-14",
    nom: "Pâte à Pizza Fraîche",
    categorieId: "cat-5",
    emplacementIds: ["emp-1", "emp-2", "emp-10"],
    unite: "kg",
    seuilReassort: 5,
    stockActuel: 7,
    codeBarres: "3250390000145",
    temperatureConservation: 4,
  },
  {
    id: "prod-15",
    nom: "Sauce Tomate Maison",
    categorieId: "cat-5",
    emplacementIds: ["emp-1", "emp-2", "emp-10"],
    unite: "L",
    seuilReassort: 3,
    stockActuel: 1,
    codeBarres: "3250390000152",
    temperatureConservation: 4,
  },
  // Desserts
  {
    id: "prod-16",
    nom: "Glace Vanille 5L",
    categorieId: "cat-6",
    emplacementIds: ["emp-4", "emp-7", "emp-10", "emp-12"],
    unite: "bac",
    seuilReassort: 3,
    stockActuel: 2,
    codeBarres: "3250390000169",
    temperatureConservation: -18,
  },
  {
    id: "prod-17",
    nom: "Tarte aux Pommes",
    categorieId: "cat-6",
    emplacementIds: ["emp-2", "emp-7", "emp-12"],
    unite: "pièce",
    seuilReassort: 4,
    stockActuel: 6,
    codeBarres: "3250390000176",
    temperatureConservation: 4,
  },
];

/* ─── Utilisateur par défaut (pour le MVP) ───────────────────────────── */
export const utilisateurParDefaut: User = {
  id: "user-1",
  nom: "Dupont",
  prenom: "Marie",
  email: "marie.dupont@huttopia.com",
  role: "admin",
  siteIds: ["site-1", "site-2", "site-3"],
  avatar: undefined,
};

/* ─── Historique de captures simulé ──────────────────────────────────── */
export const historiqueCaptures: CaptureHACCP[] = [
  {
    id: "capture-1",
    produitId: "prod-1",
    emplacementId: "emp-3",
    userId: "user-1",
    dateCapture: "2026-03-12T08:30:00",
    numeroLot: "LOT-2026-0312-A",
    dlc: "2026-03-25",
    nomProduitOCR: "Buche de chevre",
    nomProduitValide: "Bûche de Chèvre",
    temperature: 3.5,
    conforme: true,
    commentaire: "Étiquette bien lisible",
  },
  {
    id: "capture-2",
    produitId: "prod-8",
    emplacementId: "emp-2",
    userId: "user-1",
    dateCapture: "2026-03-11T14:15:00",
    numeroLot: "LOT-2026-0210-B",
    dlc: "2026-03-15",
    nomProduitOCR: "Jambon sec sup",
    nomProduitValide: "Jambon Sec Supérieur",
    temperature: 5.2,
    conforme: false,
    commentaire: "DLC proche — à consommer en priorité",
  },
];

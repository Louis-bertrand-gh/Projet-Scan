/* ═══════════════════════════════════════════════════════════════════════
 * ocrEngine.ts — Moteur OCR complet pour étiquettes alimentaires
 *
 * Pipeline :
 *   1. Prétraitement Canvas (niveaux de gris, contraste, seuillage)
 *   2. Reconnaissance Tesseract.js v7 (fra+eng)
 *   3. Parsing intelligent : Lot, DLC, Produit
 *   4. Assemblage du résultat avec confiance par champ
 *
 * L'intégralité de la logique OCR est isolée ici — aucun couplage
 * avec React ni avec le DOM visible.
 * ═══════════════════════════════════════════════════════════════════════ */

import Tesseract from "tesseract.js";
import type { DonneesOCR } from "@/types";

/* ─── Configuration ──────────────────────────────────────────────────── */

/** Active l'affichage du texte brut OCR + scores dans la console */
const OCR_DEBUG = true;

/**
 * Page Segmentation Modes utiles :
 *   3  = Fully automatic page segmentation (défaut Tesseract)
 *   11 = Sparse text — Find as much text as possible in no particular order
 */
type PSMMode = 3 | 11;
const DEFAULT_PSM: PSMMode = 11;

/* ─── 1. Prétraitement de l'image (OffscreenCanvas) ──────────────────── */

/**
 * Prépare l'image pour l'OCR en la transformant en "document scanné" :
 *   - Niveaux de gris (luminance pondérée ITU‑R BT.601)
 *   - Contraste élevé (facteur 1.8)
 *   - Seuillage binaire (threshold = 140) → noir ou blanc
 *
 * @param imageSource — data URL (base64) ou URL d'image
 * @returns Blob PNG de l'image prétraitée
 */
async function prepareImageForOCR(imageSource: string): Promise<Blob> {
  /* ── Charger l'image dans un ImageBitmap ────────────────────────── */
  const response = await fetch(imageSource);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  /* ── OffscreenCanvas au lieu du DOM visible ─────────────────────── */
  const width = bitmap.width;
  const height = bitmap.height;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("OffscreenCanvas 2D context unavailable");

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data; // Uint8ClampedArray [R,G,B,A, …]

  /* ── Étape A : Niveaux de gris ─────────────────────────────────── */
  // Luminance pondérée ITU-R BT.601 : Y = 0.299·R + 0.587·G + 0.114·B
  for (let i = 0; i < pixels.length; i += 4) {
    const gray =
      0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
    // alpha (pixels[i+3]) inchangé
  }

  /* ── Étape B : Contraste élevé (facteur 1.8 centré sur 128) ────── */
  const CONTRAST_FACTOR = 1.8;
  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      pixels[i + c] = Math.min(
        255,
        Math.max(0, (pixels[i + c] - 128) * CONTRAST_FACTOR + 128),
      );
    }
  }

  /* ── Étape C : Seuillage binaire (threshold = 140) ────────────── */
  const THRESHOLD = 140;
  for (let i = 0; i < pixels.length; i += 4) {
    const val = pixels[i] >= THRESHOLD ? 255 : 0;
    pixels[i] = val;
    pixels[i + 1] = val;
    pixels[i + 2] = val;
  }

  ctx.putImageData(imageData, 0, 0);

  /* ── Exporter en PNG blob ──────────────────────────────────────── */
  const resultBlob = await canvas.convertToBlob({ type: "image/png" });
  return resultBlob;
}

/* ─── 2. Reconnaissance Tesseract.js v7 ─────────────────────────────── */

interface TesseractResult {
  texte: string;
  confianceMoyenne: number;
}

/**
 * Lance la reconnaissance OCR sur un Blob image via Tesseract.js v7.
 *
 * @param imageBlob — Blob PNG prétraité
 * @param psm — Page Segmentation Mode (11 sparse ou 3 auto)
 * @returns texte brut + confiance moyenne (0–1)
 */
async function reconnaitreTesseract(
  imageBlob: Blob,
  psm: PSMMode = DEFAULT_PSM,
): Promise<TesseractResult> {
  const worker = await Tesseract.createWorker("fra+eng");

  await worker.setParameters({
    tessedit_pageseg_mode: String(psm) as Tesseract.PSM,
  });

  const {
    data: { text, confidence },
  } = await worker.recognize(imageBlob);

  await worker.terminate();

  const texte = text.trim();
  // Tesseract renvoie la confiance sur 0-100, on normalise en 0-1
  const confianceMoyenne = Math.max(0, Math.min(1, (confidence ?? 0) / 100));

  if (OCR_DEBUG) {
    console.group("🔍 [OCR DEBUG] Résultat Tesseract");
    console.log("PSM :", psm);
    console.log("Confiance brute :", confidence, "→ normalisée :", confianceMoyenne);
    console.log("Texte brut extrait :\n", texte);
    console.groupEnd();
  }

  return { texte, confianceMoyenne };
}

/* ─── 3. Parsing intelligent ─────────────────────────────────────────── */

/* ─── 3a. Extraction du Numéro de Lot ────────────────────────────────── */

interface LotResult {
  lot: string;
  confiance: number;
}

// ┌─────────────────────────────────────────────────────────────────────┐
// │ REGEX_LOT_PREFIXE                                                  │
// │                                                                    │
// │ Capture les lots précédés d'un préfixe explicite :                 │
// │   • L.   → ex: L.ABC123                                           │
// │   • Lot                                                            │
// │   • LOT                                                            │
// │   • N° lot / N° de lot / No lot                                    │
// │                                                                    │
// │ Le groupe 2 capture la valeur alphanumérique (min 3 car.)          │
// └─────────────────────────────────────────────────────────────────────┘
const REGEX_LOT_PREFIXE =
  /(L\.|Lot\s*[:.]?\s*|LOT\s*[:.]?\s*|N°?\s*(?:de\s+)?lot\s*[:.]?\s*)([A-Z0-9][A-Z0-9\-._/]{2,})/gi;

// ┌─────────────────────────────────────────────────────────────────────┐
// │ REGEX_LOT_NU                                                       │
// │                                                                    │
// │ Détecte les blocs alphanumériques "nus" qui ressemblent à des lots │
// │ mais sans préfixe. Exemples : A23B45, 2025-X8, ABC1234             │
// │                                                                    │
// │ Trois patterns alternatifs :                                       │
// │   1. Lettre + 2 chiffres + Lettre + 2+ chiffres (A23B45)          │
// │   2. 4 chiffres + tiret + Lettre + chiffres (2025-X8)             │
// │   3. 1-3 lettres + 4+ chiffres (ABC1234)                          │
// └─────────────────────────────────────────────────────────────────────┘
const REGEX_LOT_NU =
  /\b([A-Z]\d{2}[A-Z]\d{2,}|\d{4}-[A-Z]\d+|[A-Z]{1,3}\d{4,})\b/gi;

// ┌─────────────────────────────────────────────────────────────────────┐
// │ REGEX_PROXIMITE_PEREMPTION                                         │
// │                                                                    │
// │ Détecte les mentions de péremption / DLC dans le texte pour        │
// │ identifier la zone d'un lot nu par proximité.                      │
// └─────────────────────────────────────────────────────────────────────┘
const REGEX_PROXIMITE_PEREMPTION =
  /(?:d\.?l\.?c|date\s+limit|péremption|peremption|best\s+before|use\s+by|exp(?:iry|iration)?\.?\s*(?:date)?|à\s+consommer)/gi;

/**
 * Extrait le numéro de lot du texte OCR avec trois stratégies :
 *   1. Lot préfixé (confiance haute)
 *   2. Lot "nu" avec proximité de mentions péremption (confiance moyenne)
 *   3. Lot "nu" isolé (confiance basse)
 */
function extraireNumeroLot(texte: string): LotResult {
  /* ── Stratégie 1 : lot préfixé ─────────────────────────────────── */
  const matchsPrefixes: string[] = [];
  let m: RegExpExecArray | null;

  REGEX_LOT_PREFIXE.lastIndex = 0;
  while ((m = REGEX_LOT_PREFIXE.exec(texte)) !== null) {
    matchsPrefixes.push(m[2].trim());
  }

  if (matchsPrefixes.length > 0) {
    // Prendre le plus long (souvent le plus complet)
    const meilleur = matchsPrefixes.reduce((a, b) =>
      a.length >= b.length ? a : b,
    );
    return { lot: meilleur, confiance: 0.9 };
  }

  /* ── Stratégie 2 & 3 : lot "nu" ───────────────────────────────── */
  const lignes = texte.split(/\n/);
  const lotsNus: { valeur: string; ligne: number }[] = [];

  // Collecter les dates présentes dans le texte pour les exclure
  const datesPresentes = new Set<string>();
  for (const rex of [REGEX_DATE_JJMMAAAA, REGEX_DATE_JJMMYY]) {
    rex.lastIndex = 0;
    let dm: RegExpExecArray | null;
    while ((dm = rex.exec(texte)) !== null) {
      datesPresentes.add(dm[0]);
    }
  }

  for (let i = 0; i < lignes.length; i++) {
    REGEX_LOT_NU.lastIndex = 0;
    let lotMatch: RegExpExecArray | null;
    while ((lotMatch = REGEX_LOT_NU.exec(lignes[i])) !== null) {
      const candidat = lotMatch[1];
      // Exclure si le candidat EST une date déjà détectée
      if (datesPresentes.has(candidat)) continue;
      lotsNus.push({ valeur: candidat, ligne: i });
    }
  }

  if (lotsNus.length === 0) {
    return { lot: "", confiance: 0 };
  }

  // Trouver les lignes contenant des mentions de péremption
  const lignesPeremption: number[] = [];
  for (let i = 0; i < lignes.length; i++) {
    REGEX_PROXIMITE_PEREMPTION.lastIndex = 0;
    if (REGEX_PROXIMITE_PEREMPTION.test(lignes[i])) {
      lignesPeremption.push(i);
    }
  }

  // Stratégie 2 : lot nu PROCHE (±3 lignes) d'une mention péremption
  if (lignesPeremption.length > 0) {
    const proches = lotsNus.filter((l) =>
      lignesPeremption.some((lp) => Math.abs(l.ligne - lp) <= 3),
    );
    if (proches.length > 0) {
      const meilleur = proches.reduce((a, b) =>
        a.valeur.length >= b.valeur.length ? a : b,
      );
      return { lot: meilleur.valeur, confiance: 0.65 };
    }
  }

  // Stratégie 3 : lot nu isolé (confiance basse)
  const meilleur = lotsNus.reduce((a, b) =>
    a.valeur.length >= b.valeur.length ? a : b,
  );
  return { lot: meilleur.valeur, confiance: 0.4 };
}

/* ─── 3b. Extraction de la DLC ───────────────────────────────────────── */

interface DLCResult {
  dlc: string; // ISO YYYY-MM-DD
  confiance: number;
}

// ┌─────────────────────────────────────────────────────────────────────┐
// │ REGEX_DATE_JJMMAAAA                                                │
// │                                                                    │
// │ Capture les dates au format JJ/MM/AAAA, JJ-MM-AAAA, JJ.MM.AAAA   │
// │ Groupes : (1)=jour  (2)=mois  (3)=année 4 chiffres                │
// └─────────────────────────────────────────────────────────────────────┘
const REGEX_DATE_JJMMAAAA = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/g;

// ┌─────────────────────────────────────────────────────────────────────┐
// │ REGEX_DATE_JJMMYY                                                  │
// │                                                                    │
// │ Capture les dates au format JJ/MM/YY, JJ-MM-YY, JJ.MM.YY         │
// │ Groupes : (1)=jour  (2)=mois  (3)=année 2 chiffres                │
// └─────────────────────────────────────────────────────────────────────┘
const REGEX_DATE_JJMMYY = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})\b/g;

// ┌─────────────────────────────────────────────────────────────────────┐
// │ REGEX_DATE_TEXTE                                                   │
// │                                                                    │
// │ Capture les dates textuelles : JJ MMM YYYY                        │
// │ Ex : 15 janvier 2025, 3 déc. 2024, 28 fév 2026                   │
// │ Groupes : (1)=jour  (2)=mois abrégé  (3)=année 4 chiffres        │
// └─────────────────────────────────────────────────────────────────────┘
const REGEX_DATE_TEXTE =
  /(\d{1,2})\s+(jan|fev|fév|mar|avr|mai|jun|jui|jul|aoû|aou|sep|oct|nov|dec|déc)[a-zéûô]*\.?\s+(\d{4})/gi;

/** Table de correspondance mois texte → numéro (1-12) */
const MOIS_MAP: Record<string, number> = {
  jan: 1,
  fev: 2,
  fév: 2,
  mar: 3,
  avr: 4,
  mai: 5,
  jun: 6,
  jui: 7,
  jul: 7,
  aoû: 8,
  aou: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
  déc: 12,
};

/**
 * Convertit année courte (2 chiffres) en année longue (4 chiffres).
 *   00-79 → 2000-2079
 *   80-99 → 1980-1999
 */
function anneeComplete(yy: number): number {
  return yy < 80 ? 2000 + yy : 1900 + yy;
}

/**
 * Valide et formate une date en ISO (YYYY-MM-DD).
 * Retourne null si la date est invalide.
 */
function formaterDateISO(
  jour: number,
  mois: number,
  annee: number,
): string | null {
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;
  // Vérification basique : le Date constructor JS gère les débordements
  const date = new Date(annee, mois - 1, jour);
  if (
    date.getFullYear() !== annee ||
    date.getMonth() !== mois - 1 ||
    date.getDate() !== jour
  ) {
    return null; // date invalide (ex: 31 février)
  }
  // Format ISO : YYYY-MM-DD
  const aa = String(annee).padStart(4, "0");
  const mm = String(mois).padStart(2, "0");
  const jj = String(jour).padStart(2, "0");
  return `${aa}-${mm}-${jj}`;
}

/**
 * Extrait la Date Limite de Consommation du texte OCR.
 *
 * Stratégie :
 *   1. Collecter toutes les dates valides trouvées (3 formats)
 *   2. Si plusieurs dates : sélectionner la plus éloignée dans le futur
 *   3. Normaliser au format ISO YYYY-MM-DD
 */
function extraireDLC(texte: string): DLCResult {
  const candidates: Date[] = [];
  const candidatesISO: string[] = [];

  /* ── Format JJ/MM/AAAA ─────────────────────────────────────────── */
  REGEX_DATE_JJMMAAAA.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = REGEX_DATE_JJMMAAAA.exec(texte)) !== null) {
    const iso = formaterDateISO(
      parseInt(m[1], 10),
      parseInt(m[2], 10),
      parseInt(m[3], 10),
    );
    if (iso) {
      candidates.push(new Date(iso));
      candidatesISO.push(iso);
    }
  }

  /* ── Format JJ/MM/YY ──────────────────────────────────────────── */
  REGEX_DATE_JJMMYY.lastIndex = 0;
  while ((m = REGEX_DATE_JJMMYY.exec(texte)) !== null) {
    const annee = anneeComplete(parseInt(m[3], 10));
    const iso = formaterDateISO(
      parseInt(m[1], 10),
      parseInt(m[2], 10),
      annee,
    );
    if (iso) {
      candidates.push(new Date(iso));
      candidatesISO.push(iso);
    }
  }

  /* ── Format JJ MMM YYYY (textuel) ─────────────────────────────── */
  REGEX_DATE_TEXTE.lastIndex = 0;
  while ((m = REGEX_DATE_TEXTE.exec(texte)) !== null) {
    const moisKey = m[2].toLowerCase().slice(0, 3) as string;
    const moisNum = MOIS_MAP[moisKey];
    if (moisNum) {
      const iso = formaterDateISO(
        parseInt(m[1], 10),
        moisNum,
        parseInt(m[3], 10),
      );
      if (iso) {
        candidates.push(new Date(iso));
        candidatesISO.push(iso);
      }
    }
  }

  if (candidates.length === 0) {
    return { dlc: "", confiance: 0 };
  }

  /* ── Sélection : la date la plus éloignée dans le futur ────────── */
  let bestIndex = 0;
  let bestTime = candidates[0].getTime();
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].getTime() > bestTime) {
      bestTime = candidates[i].getTime();
      bestIndex = i;
    }
  }

  // Confiance basée sur la validité : date dans le futur → plus fiable
  const now = Date.now();
  const confiance = bestTime > now ? 0.85 : 0.6;

  return { dlc: candidatesISO[bestIndex], confiance };
}

/* ─── 3c. Identification du Produit ──────────────────────────────────── */

interface ProduitResult {
  nom: string;
  confiance: number;
}

/**
 * Dictionnaire de mots-clés alimentaires pour l'identification produit.
 * Triés par longueur décroissante pour matcher le plus spécifique d'abord.
 */
const MOTS_CLES_PRODUITS: string[] = [
  // Fromages
  "Mozzarella",
  "Saint-Nectaire",
  "Reblochon",
  "Camembert",
  "Roquefort",
  "Emmental",
  "Gruyère",
  "Comté",
  "Brie",
  "Chèvre",
  "Fromage",
  "Raclette",
  "Parmesan",
  "Cheddar",
  // Produits laitiers
  "Crème fraîche",
  "Crème",
  "Beurre",
  "Yaourt",
  "Yogourt",
  "Lait",
  "Mascarpone",
  "Ricotta",
  // Charcuterie
  "Saucisson",
  "Saucisse",
  "Jambon",
  "Pâté",
  "Rillettes",
  "Chorizo",
  "Coppa",
  "Rosette",
  "Mortadelle",
  "Andouille",
  "Boudin",
  "Merguez",
  "Chipolata",
  "Lardons",
  // Viandes
  "Poulet",
  "Bœuf",
  "Boeuf",
  "Porc",
  "Agneau",
  "Veau",
  "Dinde",
  "Canard",
  "Lapin",
  "Steak",
  "Escalope",
  // Poissons & fruits de mer
  "Saumon",
  "Truite",
  "Cabillaud",
  "Thon",
  "Crevette",
  "Moule",
  "Huître",
  "Sardine",
  "Maquereau",
  "Bar",
  "Dorade",
  // Fruits & légumes courants (étiquettes)
  "Salade",
  "Tomate",
  "Carotte",
  "Pomme",
  "Fraise",
  "Banane",
  "Avocat",
  // Autres
  "Pâtes",
  "Pizza",
  "Quiche",
  "Tarte",
  "Pain",
  "Brioche",
  "Croissant",
  "Glace",
  "Sorbet",
  "Compote",
  "Confiture",
  "Miel",
  "Mayonnaise",
  "Ketchup",
  "Moutarde",
  "Vinaigrette",
  "Sauce",
  "Soupe",
  "Bouillon",
].sort((a, b) => b.length - a.length); // Plus long en premier

/**
 * Cherche un mot-clé alimentaire dans le texte OCR.
 * Retourne le premier match (le plus spécifique grâce au tri).
 */
function identifierProduit(texte: string): ProduitResult {
  const texteLower = texte.toLowerCase();

  for (const motCle of MOTS_CLES_PRODUITS) {
    // Recherche insensible à la casse avec détection de limites de mots
    const escaped = motCle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(texteLower)) {
      return { nom: motCle, confiance: 0.8 };
    }
  }

  return { nom: "Produit inconnu", confiance: 0.4 };
}

/* ─── 4. Fonction principale : analyserImageOCR ─────────────────────── */

/**
 * Point d'entrée unique du moteur OCR.
 *
 * @param imageSource — data URL (base64) ou URL de l'image capturée
 * @returns DonneesOCR conformes à l'interface `types.ts`
 *
 * Workflow :
 *   1. Prétraitement Canvas → image "document scanné"
 *   2. Reconnaissance Tesseract.js v7 (fra+eng, PSM 11)
 *   3. Parsing intelligent → Lot, DLC, Produit
 *   4. Assemblage avec confiance pondérée par champ
 */
export async function analyserImageOCR(
  imageSource: string,
): Promise<DonneesOCR> {
  /* ── Étape 1 : Prétraitement ───────────────────────────────────── */
  let imageBlob: Blob;
  try {
    imageBlob = await prepareImageForOCR(imageSource);
    if (OCR_DEBUG) {
      console.log(
        "🖼️ [OCR DEBUG] Image prétraitée :",
        Math.round(imageBlob.size / 1024),
        "Ko",
      );
    }
  } catch (err) {
    console.warn("⚠️ Prétraitement échoué, utilisation de l'image brute", err);
    // Fallback : utiliser l'image brute
    const response = await fetch(imageSource);
    imageBlob = await response.blob();
  }

  /* ── Étape 2 : Reconnaissance Tesseract ────────────────────────── */
  let result: TesseractResult;
  try {
    result = await reconnaitreTesseract(imageBlob, DEFAULT_PSM);
  } catch (err) {
    console.error("❌ [OCR] Erreur Tesseract :", err);
    // En cas d'échec total, retourner un résultat vide
    return {
      numeroLot: "",
      dlc: "",
      nomProduit: "Produit inconnu",
      confiance: 0,
      confianceChamps: { numeroLot: 0, dlc: 0, nomProduit: 0 },
      texteBrut: "",
    };
  }

  const { texte, confianceMoyenne } = result;

  /* ── Étape 3 : Parsing intelligent ─────────────────────────────── */
  const lotResult = extraireNumeroLot(texte);
  const dlcResult = extraireDLC(texte);
  const produitResult = identifierProduit(texte);

  /* ── Pondération de la confiance par champ ──────────────────────── */
  // La confiance finale par champ = min(confiance Tesseract, confiance parsing)
  // pour refléter que même un bon match est incertain si l'OCR est mauvais.
  const confianceLot = lotResult.confiance > 0
    ? Math.min(confianceMoyenne, lotResult.confiance)
    : 0;
  const confianceDlc = dlcResult.confiance > 0
    ? Math.min(confianceMoyenne, dlcResult.confiance)
    : 0;
  const confianceProduit = produitResult.confiance > 0
    ? Math.min(confianceMoyenne, produitResult.confiance)
    : 0;

  const confianceGlobale =
    (confianceLot + confianceDlc + confianceProduit) / 3;

  if (OCR_DEBUG) {
    console.group("📊 [OCR DEBUG] Résultats du parsing");
    console.log("Lot :", lotResult.lot || "(non détecté)", "→ confiance :", confianceLot.toFixed(2));
    console.log("DLC :", dlcResult.dlc || "(non détectée)", "→ confiance :", confianceDlc.toFixed(2));
    console.log("Produit :", produitResult.nom, "→ confiance :", confianceProduit.toFixed(2));
    console.log("Confiance globale :", confianceGlobale.toFixed(2));
    console.groupEnd();
  }

  return {
    numeroLot: lotResult.lot || "",
    dlc: dlcResult.dlc || "",
    nomProduit: produitResult.nom,
    confiance: confianceGlobale,
    confianceChamps: {
      numeroLot: confianceLot,
      dlc: confianceDlc,
      nomProduit: confianceProduit,
    },
    texteBrut: texte,
  };
}

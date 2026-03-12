/* ═══════════════════════════════════════════════════════════════════════
 * ocrSimulation.ts — Simulation de l'analyse OCR
 *
 * En version MVP, cette fonction simule le comportement d'un service
 * OCR réel (Google Vision API, Tesseract.js, etc.).
 *
 * Après un délai de 2 secondes (simulation du traitement), elle
 * retourne des données réalistes extraites d'une étiquette produit :
 * - Numéro de lot
 * - Date Limite de Consommation (DLC)
 * - Nom du produit
 * ═══════════════════════════════════════════════════════════════════════ */

import { DonneesOCR } from "@/types";

/**
 * Données simulées que l'OCR pourrait extraire.
 * Chaque entrée représente un résultat plausible avec un niveau
 * de confiance variable (simule les aléas de la reconnaissance).
 */
const resultatsSimules: DonneesOCR[] = [
  {
    numeroLot: "LOT-2026-0312-A",
    dlc: "2026-03-25",
    nomProduit: "Buche de chevre frais",
    confiance: 0.92,
  },
  {
    numeroLot: "LOT-2026-0210-B",
    dlc: "2026-04-01",
    nomProduit: "Mozzarella di Bufala 125g",
    confiance: 0.88,
  },
  {
    numeroLot: "LOT-2026-0115-C",
    dlc: "2026-03-18",
    nomProduit: "Jambon sec superieur",
    confiance: 0.85,
  },
  {
    numeroLot: "LOT-2026-0301-D",
    dlc: "2026-06-30",
    nomProduit: "Jus d orange bio 1L",
    confiance: 0.95,
  },
  {
    numeroLot: "LOT-2026-0228-E",
    dlc: "2026-03-20",
    nomProduit: "Pate a pizza fraiche",
    confiance: 0.78,
  },
  {
    numeroLot: "LOT-2026-0305-F",
    dlc: "2026-09-15",
    nomProduit: "Comte 18 mois AOP",
    confiance: 0.91,
  },
];

/**
 * Simule une analyse OCR avec un délai réaliste de 2 secondes.
 *
 * En production, cette fonction serait remplacée par un appel à :
 * - Google Cloud Vision API
 * - Azure Computer Vision
 * - Tesseract.js (côté client)
 * - Un microservice OCR dédié
 */
export function simulerAnalyseOCR(): Promise<DonneesOCR> {
  return new Promise((resolve) => {
    setTimeout(() => {
      /* Sélection aléatoire parmi les résultats simulés */
      const index = Math.floor(Math.random() * resultatsSimules.length);
      resolve(resultatsSimules[index]);
    }, 2000); // Délai de 2 secondes pour simuler le traitement
  });
}

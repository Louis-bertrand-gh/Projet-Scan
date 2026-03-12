/* ═══════════════════════════════════════════════════════════════════════
 * scan/page.tsx — Page de scan HACCP
 *
 * Page complète intégrant :
 * 1. Le module caméra (CameraScanner) pour la capture photo
 * 2. Le formulaire de validation (ValidationForm) pour les données OCR
 * 3. La confirmation d'enregistrement
 *
 * Workflow utilisateur :
 * Ouvrir caméra → Capturer → Analyser OCR → Vérifier → Valider
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React, { useState, useCallback } from "react";
import {
  ScanLine,
  CheckCircle2,
  Plus,
  History,
  ShieldCheck,
  ShieldX,
  Clock,
} from "lucide-react";
import CameraScanner from "@/components/scan/CameraScanner";
import ValidationForm, {
  DonneesValidees,
} from "@/components/scan/ValidationForm";
import { DonneesOCR } from "@/types";
import { historiqueScans, pointsDeVente } from "@/data/mockData";

/* ─── Étapes du workflow de scan ─────────────────────────────────────── */
type EtapeScan = "capture" | "validation" | "confirme";

export default function ScanPage() {
  const [etape, setEtape] = useState<EtapeScan>("capture");
  const [donneesOCR, setDonneesOCR] = useState<DonneesOCR | null>(null);
  const [derniereValidation, setDerniereValidation] =
    useState<DonneesValidees | null>(null);
  /** Photos capturées — persistées entre les étapes pour le retour depuis validation */
  const [photosCapturees, setPhotosCapturees] = useState<string[]>([]);

  /**
   * Callback appelé par le CameraScanner quand l'OCR a
   * extrait les données. On passe à l'étape de validation.
   */
  const handleResultatOCR = useCallback((donnees: DonneesOCR) => {
    setDonneesOCR(donnees);
    setEtape("validation");
  }, []);

  /**
   * Callback du formulaire de validation.
   * En production, on enverrait les données au serveur ici.
   */
  const handleValidation = useCallback((donnees: DonneesValidees) => {
    setDerniereValidation(donnees);
    setEtape("confirme");
    /* TODO (production) : POST vers l'API pour sauvegarder le scan */
  }, []);

  /**
   * Retour vers la capture en conservant les photos existantes.
   * Utilisé quand l'utilisateur annule la validation OCR.
   */
  const retourVersCapture = useCallback(() => {
    setEtape("capture");
    setDonneesOCR(null);
  }, []);

  /** Réinitialise entièrement le workflow pour un tout nouveau scan */
  const nouveauScan = useCallback(() => {
    setEtape("capture");
    setDonneesOCR(null);
    setDerniereValidation(null);
    setPhotosCapturees([]);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── En-tête ──────────────────────────────────────────── */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-on-surface">
          <ScanLine className="w-6 h-6 text-primary" />
          Smart Scan HACCP
        </h1>
        <p className="mt-1 text-sm text-muted">
          {etape === "capture" &&
            "Scannez l'étiquette d'un produit pour extraire les information  ."}
          {etape === "validation" &&
            "Vérifiez les données extraites et validez le contrôle."}
          {etape === "confirme" && "Scan enregistré avec succès !"}
        </p>
      </div>

      {/* ─── Indicateur d'étapes ──────────────────────────────── */}
      <div className="flex items-center gap-2">
        {[
          { label: "Capture", step: "capture" as const },
          { label: "Validation", step: "validation" as const },
          { label: "Terminé", step: "confirme" as const },
        ].map((item, index) => {
          const etapeIndex = ["capture", "validation", "confirme"].indexOf(
            etape,
          );
          const itemIndex = index;
          const estActif = etapeIndex === itemIndex;
          const estFait = etapeIndex > itemIndex;

          return (
            <React.Fragment key={item.step}>
              {index > 0 && (
                <div
                  className={`flex-1 h-0.5 ${
                    estFait ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    estActif
                      ? "bg-primary text-on-primary"
                      : estFait
                        ? "bg-success text-white"
                        : "bg-surface-alt text-muted border border-border"
                  }`}
                >
                  {estFait ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    estActif ? "text-on-surface" : "text-muted"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ─── Contenu selon l'étape ────────────────────────────── */}
      <div className="max-w-2xl mx-auto">
        {/* Étape 1 : Capture photo */}
        {etape === "capture" && (
          <CameraScanner
            onResultatOCR={handleResultatOCR}
            initialPhotos={photosCapturees}
            onPhotosChange={setPhotosCapturees}
          />
        )}

        {/* Étape 2 : Validation des données OCR */}
        {etape === "validation" && donneesOCR && (
          <div className="animate-slide-up">
            <ValidationForm
              donneesOCR={donneesOCR}
              onValider={handleValidation}
              onAnnuler={retourVersCapture}
            />
          </div>
        )}

        {/* Étape 3 : Confirmation */}
        {etape === "confirme" && derniereValidation && (
          <div className="py-8 text-center animate-slide-up">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-success/10">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-on-surface">
              Scan enregistré !
            </h2>
            <p className="mb-6 text-muted">
              Le contrôle HACCP pour{" "}
              <strong>{derniereValidation.nomProduit}</strong> a été sauvegardé.
            </p>

            {/* Résumé du scan */}
            <div className="max-w-sm p-4 mx-auto mb-6 space-y-2 text-left bg-surface-alt rounded-xl">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Produit</span>
                <span className="font-medium text-on-surface">
                  {derniereValidation.nomProduit}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Lot</span>
                <span className="font-medium text-on-surface">
                  {derniereValidation.numeroLot}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">DLC</span>
                <span className="font-medium text-on-surface">
                  {new Date(derniereValidation.dlc).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Conforme</span>
                <span
                  className={`font-medium ${
                    derniereValidation.conforme ? "text-success" : "text-danger"
                  }`}
                >
                  {derniereValidation.conforme ? "Oui ✓" : "Non ✗"}
                </span>
              </div>
            </div>

            <button
              onClick={nouveauScan}
              className="inline-flex items-center gap-2 px-6 py-3 font-medium transition-colors shadow-lg bg-primary text-on-primary rounded-xl hover:bg-primary-dark active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Nouveau scan
            </button>
          </div>
        )}
      </div>

      {/* ─── Historique récent ─────────────────────────────────── */}
      <div className="pt-4">
        <h3 className="flex items-center gap-2 mb-3 text-lg font-semibold text-on-surface">
          <History className="w-5 h-5 text-muted" />
          Historique récent
        </h3>
        <div className="space-y-2">
          {historiqueScans.map((scan) => {
            const pdv = pointsDeVente.find((p) => p.id === scan.pointDeVenteId);
            return (
              <div
                key={scan.id}
                className="flex items-center gap-3 p-3 border rounded-xl bg-surface border-border"
              >
                <div
                  className={`p-1.5 rounded-lg ${
                    scan.conforme ? "bg-success/10" : "bg-danger/10"
                  }`}
                >
                  {scan.conforme ? (
                    <ShieldCheck className="w-4 h-4 text-success" />
                  ) : (
                    <ShieldX className="w-4 h-4 text-danger" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-on-surface">
                    {scan.nomProduitValide}
                  </p>
                  <p className="text-xs text-muted">
                    {pdv?.nom} • <Clock className="inline w-3 h-3" />{" "}
                    {new Date(scan.dateScan).toLocaleString("fr-FR")}
                  </p>
                </div>
                <span className="text-xs text-muted">
                  Lot: {scan.numeroLot}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

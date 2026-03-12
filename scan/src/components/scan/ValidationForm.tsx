/* ═══════════════════════════════════════════════════════════════════════
 * ValidationForm.tsx — Formulaire de validation des données OCR
 *
 * Affiche les données extraites par l'OCR pour permettre à
 * l'utilisateur de les vérifier, corriger et valider.
 *
 * Le formulaire est dynamique :
 * - Les champs sont pré-remplis avec les données OCR
 * - Un indicateur de confiance aide l'utilisateur à repérer
 *   les champs qui nécessitent une vérification
 * - Le formulaire s'adapte au contexte (PDV, température, etc.)
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Thermometer,
  Hash,
  Calendar,
  Tag,
  MessageSquare,
  ShieldCheck,
  ShieldX,
  Save,
} from "lucide-react";
import { DonneesOCR } from "@/types";
import { useApp } from "@/contexts/AppContext";

/* ─── Props du composant ─────────────────────────────────────────────── */
interface ValidationFormProps {
  /** Données extraites par l'OCR */
  donneesOCR: DonneesOCR;
  /** Callback de soumission du formulaire validé */
  onValider: (donnees: DonneesValidees) => void;
  /** Callback d'annulation */
  onAnnuler: () => void;
}

/** Données après validation par l'utilisateur */
export interface DonneesValidees {
  numeroLot: string;
  dlc: string;
  nomProduit: string;
  temperature: number | null;
  conforme: boolean;
  commentaire: string;
  pointDeVenteId: string;
}

/* ─── Composant indicateur de confiance OCR ──────────────────────────── */
function IndicateurConfiance({ confiance }: { confiance: number }) {
  const pourcentage = Math.round(confiance * 100);
  const couleur =
    pourcentage >= 90
      ? "text-success"
      : pourcentage >= 75
        ? "text-warning"
        : "text-danger";

  return (
    <span className={`text-xs font-medium ${couleur} flex items-center gap-1`}>
      {pourcentage >= 90 ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <AlertTriangle className="w-3 h-3" />
      )}
      {pourcentage}% confiance
    </span>
  );
}

export default function ValidationForm({
  donneesOCR,
  onValider,
  onAnnuler,
}: ValidationFormProps) {
  const { pdvDuSite, pdvActif } = useApp();

  /* ─── État du formulaire ─────────────────────────────────────── */
  const [numeroLot, setNumeroLot] = useState(donneesOCR.numeroLot);
  const [dlc, setDlc] = useState(donneesOCR.dlc);
  const [nomProduit, setNomProduit] = useState(donneesOCR.nomProduit);
  const [temperature, setTemperature] = useState<string>("");
  const [conforme, setConforme] = useState(true);
  const [commentaire, setCommentaire] = useState("");
  const [pdvId, setPdvId] = useState(pdvActif?.id || "");
  const [enregistrement, setEnregistrement] = useState(false);

  /* Mise à jour si les données OCR changent */
  useEffect(() => {
    setNumeroLot(donneesOCR.numeroLot);
    setDlc(donneesOCR.dlc);
    setNomProduit(donneesOCR.nomProduit);
  }, [donneesOCR]);

  /**
   * Soumission du formulaire.
   * Simule un délai d'enregistrement pour le feedback visuel.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnregistrement(true);

    /* Simulation d'enregistrement (500ms) */
    await new Promise((res) => setTimeout(res, 500));

    onValider({
      numeroLot,
      dlc,
      nomProduit,
      temperature: temperature ? parseFloat(temperature) : null,
      conforme,
      commentaire,
      pointDeVenteId: pdvId,
    });

    setEnregistrement(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ─── En-tête avec confiance globale ────────────────────── */}
      <div className="flex items-center justify-between p-4 bg-surface-alt rounded-xl border border-border">
        <div>
          <h3 className="font-semibold text-on-surface">Données extraites</h3>
          <p className="text-sm text-muted">
            Vérifiez et corrigez si nécessaire
          </p>
        </div>
        <IndicateurConfiance confiance={donneesOCR.confiance} />
      </div>

      {/* ─── Sélection du Point de Vente ──────────────────────── */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-on-surface mb-1.5">
          <Tag className="w-4 h-4 text-primary" />
          Point de Vente
        </label>
        <select
          value={pdvId}
          onChange={(e) => setPdvId(e.target.value)}
          required
          className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        >
          <option value="">Sélectionner un PDV</option>
          {pdvDuSite.map((pdv) => (
            <option key={pdv.id} value={pdv.id}>
              {pdv.nom}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Nom du produit ───────────────────────────────────── */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-on-surface mb-1.5">
          <Tag className="w-4 h-4 text-primary" />
          Nom du produit
        </label>
        <input
          type="text"
          value={nomProduit}
          onChange={(e) => setNomProduit(e.target.value)}
          required
          className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          placeholder="Nom du produit"
        />
      </div>

      {/* ─── Numéro de lot ────────────────────────────────────── */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-on-surface mb-1.5">
          <Hash className="w-4 h-4 text-primary" />
          Numéro de lot
        </label>
        <input
          type="text"
          value={numeroLot}
          onChange={(e) => setNumeroLot(e.target.value)}
          required
          className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          placeholder="LOT-XXXX-XXXX-X"
        />
      </div>

      {/* ─── Date Limite de Consommation ──────────────────────── */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-on-surface mb-1.5">
          <Calendar className="w-4 h-4 text-primary" />
          DLC (Date Limite de Consommation)
        </label>
        <input
          type="date"
          value={dlc}
          onChange={(e) => setDlc(e.target.value)}
          required
          className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
      </div>

      {/* ─── Température ──────────────────────────────────────── */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-on-surface mb-1.5">
          <Thermometer className="w-4 h-4 text-primary" />
          Température relevée (°C)
          <span className="text-muted font-normal">(optionnel)</span>
        </label>
        <input
          type="number"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
          placeholder="Ex: 3.5"
        />
      </div>

      {/* ─── Conformité ───────────────────────────────────────── */}
      <div>
        <label className="text-sm font-medium text-on-surface mb-2 block">
          Conformité du produit
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setConforme(true)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all ${
              conforme
                ? "border-success bg-success/10 text-success"
                : "border-border bg-surface text-muted hover:border-muted"
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            Conforme
          </button>
          <button
            type="button"
            onClick={() => setConforme(false)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 font-medium transition-all ${
              !conforme
                ? "border-danger bg-danger/10 text-danger"
                : "border-border bg-surface text-muted hover:border-muted"
            }`}
          >
            <ShieldX className="w-5 h-5" />
            Non conforme
          </button>
        </div>
      </div>

      {/* ─── Commentaire ──────────────────────────────────────── */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-on-surface mb-1.5">
          <MessageSquare className="w-4 h-4 text-primary" />
          Commentaire
          <span className="text-muted font-normal">(optionnel)</span>
        </label>
        <textarea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
          placeholder="Remarques sur l'état du produit..."
        />
      </div>

      {/* ─── Boutons de soumission ────────────────────────────── */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={enregistrement || !pdvId}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary rounded-xl font-medium shadow-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          {enregistrement ? (
            <>
              <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Valider le scan
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onAnnuler}
          className="px-4 py-3 bg-surface border border-border text-on-surface rounded-xl font-medium hover:bg-surface-alt transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

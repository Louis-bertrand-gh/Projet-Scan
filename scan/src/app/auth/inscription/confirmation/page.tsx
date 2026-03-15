"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Mail, RefreshCw, ArrowLeft } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export default function InscriptionConfirmationPage() {
  const searchParams = useSearchParams();
  const { renvoyerEmailConfirmation } = useApp();

  const [erreur, setErreur] = useState<string | null>(null);
  const [infoRenvoi, setInfoRenvoi] = useState<string | null>(null);
  const [renvoiEnCours, setRenvoiEnCours] = useState(false);

  const email = searchParams.get("email")?.trim() ?? "";
  const requiresEmailConfirmation = searchParams.get("requires") === "1";
  const confirmationEmailRequested = searchParams.get("requested") === "1";

  const messagePrincipal = useMemo(() => {
    if (!requiresEmailConfirmation) {
      return "Compte cree. La confirmation email n'est pas requise pour ce projet.";
    }

    if (confirmationEmailRequested) {
      return "Compte cree. Supabase a accepte la demande d'envoi du mail de confirmation.";
    }

    return "Compte cree. Une confirmation email est requise, mais le statut d'envoi du mail n'a pas pu etre confirme.";
  }, [confirmationEmailRequested, requiresEmailConfirmation]);

  async function handleResend() {
    if (!email) {
      setErreur("Adresse email introuvable pour renvoyer la confirmation.");
      return;
    }

    setErreur(null);
    setInfoRenvoi(null);
    setRenvoiEnCours(true);

    try {
      const ok = await renvoyerEmailConfirmation(email);
      if (!ok) {
        setErreur("Le renvoi de l'email de confirmation a echoue.");
        return;
      }

      setInfoRenvoi(
        "Nouvelle demande acceptee par Supabase. La livraison finale depend du provider email et de votre boite mail.",
      );
    } finally {
      setRenvoiEnCours(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl px-4 py-10 mx-auto">
        <Link
          href="/auth/inscription"
          className="inline-flex items-center gap-2 mb-5 text-sm text-muted hover:text-on-surface"
        >
          <ArrowLeft className="w-4 h-4" /> Retour a l'inscription
        </Link>

        <div className="p-6 border shadow-xl rounded-3xl border-border bg-surface sm:p-8 shadow-primary/5">
          <div className="flex items-start gap-3 mb-5">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-success text-white">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-on-surface">
                Compte enregistre
              </h1>
              <p className="text-sm text-muted">{messagePrincipal}</p>
            </div>
          </div>

          <div className="p-4 mb-4 text-sm border rounded-xl border-primary/20 bg-primary/5 text-on-surface">
            <p className="font-semibold">
              Statut verifiable depuis l'application
            </p>
            <p className="mt-1 text-muted">
              L'application peut confirmer la reponse de Supabase, mais ne peut
              pas prouver la livraison finale dans la boite de reception.
            </p>
          </div>

          {email && (
            <div className="p-4 mb-4 text-sm border rounded-xl border-border bg-surface-alt text-on-surface">
              <p className="flex items-center gap-2 font-medium">
                <Mail className="w-4 h-4 text-primary" /> Adresse concernee
              </p>
              <p className="mt-1 text-muted break-all">{email}</p>
            </div>
          )}

          {erreur && (
            <div className="px-4 py-3 mb-4 text-sm border rounded-xl border-danger/20 bg-danger/10 text-danger">
              {erreur}
            </div>
          )}

          {infoRenvoi && (
            <div className="px-4 py-3 mb-4 text-sm border rounded-xl border-success/20 bg-success/10 text-success">
              {infoRenvoi}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={renvoiEnCours || !email || !requiresEmailConfirmation}
              className="inline-flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-medium transition-colors border rounded-xl border-border text-on-surface hover:bg-surface-alt disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={`w-4 h-4 ${renvoiEnCours ? "animate-spin" : ""}`}
              />
              {renvoiEnCours
                ? "Renvoi en cours..."
                : "Renvoyer l'email de confirmation"}
            </button>

            <Link
              href="/auth"
              className="inline-flex items-center justify-center w-full px-4 py-3 text-sm font-semibold transition-colors rounded-xl bg-primary text-on-primary hover:bg-primary-dark"
            >
              Aller a la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

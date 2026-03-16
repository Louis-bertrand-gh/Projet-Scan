"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Mail, RefreshCw, ArrowLeft } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export default function InscriptionConfirmationPage() {
  const searchParams = useSearchParams();
  const { renvoyerEmailConfirmation } = useApp();

  const styles = {
    page: "min-h-screen bg-background",
    container: "max-w-xl px-4 py-10 mx-auto",
    backLink:
      "inline-flex items-center gap-2 mb-5 text-sm text-muted hover:text-on-surface",
    card: "p-6 border shadow-xl rounded-3xl border-border bg-surface sm:p-8 shadow-primary/5",
    topRow: "flex items-start gap-3 mb-5",
    topIconWrap:
      "flex items-center justify-center w-11 h-11 rounded-2xl bg-success text-white",
    title: "text-xl font-bold text-on-surface",
    subtitle: "text-sm text-muted",
    infoBox:
      "p-4 mb-4 text-sm border rounded-xl border-primary/20 bg-primary/5 text-on-surface",
    infoTitle: "font-semibold",
    infoMuted: "mt-1 text-muted",
    emailBox:
      "p-4 mb-4 text-sm border rounded-xl border-border bg-surface-alt text-on-surface",
    emailTitle: "flex items-center gap-2 font-medium",
    emailValue: "mt-1 text-muted break-all",
    errorBox:
      "px-4 py-3 mb-4 text-sm border rounded-xl border-danger/20 bg-danger/10 text-danger",
    successBox:
      "px-4 py-3 mb-4 text-sm border rounded-xl border-success/20 bg-success/10 text-success",
    actions: "space-y-3",
    resendButton:
      "inline-flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-medium transition-colors border rounded-xl border-border text-on-surface hover:bg-surface-alt disabled:opacity-50 disabled:cursor-not-allowed",
    loginLink:
      "inline-flex items-center justify-center w-full px-4 py-3 text-sm font-semibold transition-colors rounded-xl bg-primary text-on-primary hover:bg-primary-dark",
  };

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
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/auth/inscription" className={styles.backLink}>
          <ArrowLeft className="w-4 h-4" /> Retour a l&apos;inscription
        </Link>

        <div className={styles.card}>
          <div className={styles.topRow}>
            <div className={styles.topIconWrap}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className={styles.title}>Compte enregistre</h1>
              <p className={styles.subtitle}>{messagePrincipal}</p>
            </div>
          </div>

          <div className={styles.infoBox}>
            <p className={styles.infoTitle}>
              Statut verifiable depuis l&apos;application
            </p>
            <p className={styles.infoMuted}>
              L&apos;application peut confirmer la reponse de Supabase, mais ne
              peut pas prouver la livraison finale dans la boite de reception.
            </p>
          </div>

          {email && (
            <div className={styles.emailBox}>
              <p className={styles.emailTitle}>
                <Mail className="w-4 h-4 text-primary" /> Adresse concernee
              </p>
              <p className={styles.emailValue}>{email}</p>
            </div>
          )}

          {erreur && <div className={styles.errorBox}>{erreur}</div>}

          {infoRenvoi && <div className={styles.successBox}>{infoRenvoi}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleResend}
              disabled={renvoiEnCours || !email || !requiresEmailConfirmation}
              className={styles.resendButton}
            >
              <RefreshCw
                className={`w-4 h-4 ${renvoiEnCours ? "animate-spin" : ""}`}
              />
              {renvoiEnCours
                ? "Renvoi en cours..."
                : "Renvoyer l'email de confirmation"}
            </button>

            <Link
              href={
                email
                  ? `/auth?from=confirmation&email=${encodeURIComponent(email)}`
                  : "/auth?from=confirmation"
              }
              className={styles.loginLink}
            >
              Aller a la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

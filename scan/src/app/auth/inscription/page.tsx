"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Mail, Key, User, ArrowLeft, UserX } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export default function InscriptionPage() {
  const router = useRouter();
  const { creerCompteBdd } = useApp();

  const styles = {
    page: "min-h-screen bg-background",
    container: "max-w-lg px-4 py-10 mx-auto",
    backLink:
      "inline-flex items-center gap-2 mb-5 text-sm text-muted hover:text-on-surface",
    card: "p-6 border shadow-xl rounded-3xl border-border bg-surface sm:p-8 shadow-primary/5",
    header: "flex items-center gap-3 mb-5",
    headerIconWrap:
      "flex items-center justify-center w-11 h-11 rounded-2xl bg-primary text-on-primary",
    title: "text-xl font-bold text-on-surface",
    subtitle: "text-sm text-muted",
    form: "space-y-4",
    namesGrid: "grid grid-cols-1 gap-4 sm:grid-cols-2",
    label: "flex items-center gap-2 mb-2 text-sm font-medium text-on-surface",
    input:
      "w-full px-3 py-2.5 border rounded-xl border-border bg-surface-alt text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
    duplicateAlert:
      "p-4 border rounded-xl border-warning/30 bg-warning/10 text-on-surface",
    duplicateContent: "flex items-start gap-3",
    duplicateIcon: "w-5 h-5 mt-0.5 text-warning",
    duplicateTextWrap: "space-y-1 text-sm",
    duplicateTitle: "font-semibold",
    duplicateMuted: "text-muted",
    duplicateLink: "inline-block mt-1 font-medium text-primary hover:underline",
    errorBox:
      "px-4 py-3 text-sm border rounded-xl border-danger/20 bg-danger/10 text-danger",
    submitButton:
      "w-full px-4 py-3 text-sm font-semibold transition-colors rounded-xl bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed",
  };

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [soumission, setSoumission] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [emailDejaUtilise, setEmailDejaUtilise] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setEmailDejaUtilise(false);

    const emailNormalise = email.trim().toLowerCase();

    if (!emailNormalise) {
      setErreur("Veuillez saisir votre adresse email.");
      return;
    }

    const formatEmailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalise);
    if (!formatEmailValide) {
      setErreur("Le format de l'email est invalide.");
      return;
    }

    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (motDePasse !== confirmation) {
      setErreur("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    setSoumission(true);

    try {
      const result = await creerCompteBdd({
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: emailNormalise,
        password: motDePasse,
      });

      if (result.emailDejaUtilise) {
        setEmailDejaUtilise(true);
        return;
      }

      if (!result.ok) {
        setErreur(
          result.messageErreur ??
            "Impossible de créer le compte pour le moment.",
        );
        return;
      }

      const params = new URLSearchParams({
        email: result.email,
        requires: result.requiresEmailConfirmation ? "1" : "0",
        requested: result.confirmationEmailRequested ? "1" : "0",
      });

      router.replace(`/auth/inscription/confirmation?${params.toString()}`);
    } finally {
      setSoumission(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/auth" className={styles.backLink}>
          <ArrowLeft className="w-4 h-4" /> Retour à la connexion
        </Link>

        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.headerIconWrap}>
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className={styles.title}>Créer un compte</h1>
              <p className={styles.subtitle}>Inscription sur Scan </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.namesGrid}>
              <div>
                <label className={styles.label}>
                  <User className="w-4 h-4 text-primary" /> Prénom
                </label>
                <input
                  type="text"
                  value={prenom}
                  onChange={(event) => setPrenom(event.target.value)}
                  className={styles.input}
                  placeholder="Alexandre"
                  required
                />
              </div>

              <div>
                <label className={styles.label}>
                  <User className="w-4 h-4 text-primary" /> Nom
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(event) => setNom(event.target.value)}
                  className={styles.input}
                  placeholder="Leroy"
                  required
                />
              </div>
            </div>

            <div>
              <label className={styles.label}>
                <Mail className="w-4 h-4 text-primary" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={styles.input}
                placeholder="prenom.nom@huttopia.com"
                required
              />
            </div>

            <div>
              <label className={styles.label}>
                <Key className="w-4 h-4 text-primary" /> Mot de passe
              </label>
              <input
                type="password"
                value={motDePasse}
                onChange={(event) => setMotDePasse(event.target.value)}
                className={styles.input}
                placeholder="8 caractères minimum"
                required
              />
            </div>

            <div>
              <label className={styles.label}>
                <Key className="w-4 h-4 text-primary" /> Confirmer le mot de
                passe
              </label>
              <input
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className={styles.input}
                placeholder="Retapez le mot de passe"
                required
              />
            </div>

            {emailDejaUtilise && (
              <div className={styles.duplicateAlert}>
                <div className={styles.duplicateContent}>
                  <UserX className={styles.duplicateIcon} />
                  <div className={styles.duplicateTextWrap}>
                    <p className={styles.duplicateTitle}>
                      Adresse email déjà utilisée
                    </p>
                    <p className={styles.duplicateMuted}>
                      Un compte existe déjà avec cette adresse. Essayez de vous
                      connecter ou utilisez une autre adresse.
                    </p>
                    <Link href="/auth" className={styles.duplicateLink}>
                      Se connecter avec ce compte
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {erreur && <div className={styles.errorBox}>{erreur}</div>}

            <button
              type="submit"
              disabled={soumission}
              className={styles.submitButton}
            >
              {soumission ? "Création du compte..." : "Créer mon compte"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

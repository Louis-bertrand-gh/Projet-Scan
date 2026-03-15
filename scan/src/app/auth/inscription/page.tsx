"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Mail, Key, User, ArrowLeft } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export default function InscriptionPage() {
  const router = useRouter();
  const { creerCompteBdd } = useApp();

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [soumission, setSoumission] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);

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
        email: email.trim(),
        password: motDePasse,
      });

      if (!result.ok) {
        setErreur("Impossible de créer le compte pour le moment.");
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
    <div className="min-h-screen bg-background">
      <div className="max-w-lg px-4 py-10 mx-auto">
        <Link
          href="/auth"
          className="inline-flex items-center gap-2 mb-5 text-sm text-muted hover:text-on-surface"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à la connexion
        </Link>

        <div className="p-6 border shadow-xl rounded-3xl border-border bg-surface sm:p-8 shadow-primary/5">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary text-on-primary">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-on-surface">
                Créer un compte
              </h1>
              <p className="text-sm text-muted">Inscription sur Scan </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-medium text-on-surface">
                  <User className="w-4 h-4 text-primary" /> Prénom
                </label>
                <input
                  type="text"
                  value={prenom}
                  onChange={(event) => setPrenom(event.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl border-border bg-surface-alt text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Alexandre"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-medium text-on-surface">
                  <User className="w-4 h-4 text-primary" /> Nom
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(event) => setNom(event.target.value)}
                  className="w-full px-3 py-2.5 border rounded-xl border-border bg-surface-alt text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Leroy"
                  required
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-on-surface">
                <Mail className="w-4 h-4 text-primary" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-3 py-2.5 border rounded-xl border-border bg-surface-alt text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="prenom.nom@huttopia.com"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-on-surface">
                <Key className="w-4 h-4 text-primary" /> Mot de passe
              </label>
              <input
                type="password"
                value={motDePasse}
                onChange={(event) => setMotDePasse(event.target.value)}
                className="w-full px-3 py-2.5 border rounded-xl border-border bg-surface-alt text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="8 caractères minimum"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 mb-2 text-sm font-medium text-on-surface">
                <Key className="w-4 h-4 text-primary" /> Confirmer le mot de
                passe
              </label>
              <input
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="w-full px-3 py-2.5 border rounded-xl border-border bg-surface-alt text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Retapez le mot de passe"
                required
              />
            </div>

            {erreur && (
              <div className="px-4 py-3 text-sm border rounded-xl border-danger/20 bg-danger/10 text-danger">
                {erreur}
              </div>
            )}

            <button
              type="submit"
              disabled={soumission}
              className="w-full px-4 py-3 text-sm font-semibold transition-colors rounded-xl bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {soumission ? "Création du compte..." : "Créer mon compte"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

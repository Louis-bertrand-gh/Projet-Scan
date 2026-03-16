"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LockKeyhole,
  ShieldCheck,
  ScanLine,
  KeyRound,
  Mail,
  Key,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    authentifierAvecPin,
    authentifierAvecBdd,
    erreur: erreurContexte,
  } = useApp();
  const emailDepuisLien = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const from = searchParams.get("from") ?? "";

  const [pin, setPin] = useState("");
  const [email, setEmail] = useState(emailDepuisLien);
  const [motDePasse, setMotDePasse] = useState("");
  const [erreurPin, setErreurPin] = useState<string | null>(null);
  const [erreurBdd, setErreurBdd] = useState<string | null>(null);
  const [lienConfirmationVisible, setLienConfirmationVisible] = useState(false);
  const [soumissionPin, setSoumissionPin] = useState(false);
  const [soumissionBdd, setSoumissionBdd] = useState(false);
  const [tentativesBdd, setTentativesBdd] = useState(0);
  const erreurBddAffichee =
    erreurBdd ?? (!soumissionBdd && erreurContexte ? erreurContexte : null);
  const messageInfoInitial =
    from === "confirmation"
      ? "Vous pouvez maintenant vous connecter avec votre email et mot de passe."
      : "";

  async function handleSubmitPin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSoumissionPin(true);
    setErreurPin(null);

    try {
      const succes = await authentifierAvecPin(pin);

      if (!succes) {
        setErreurPin("Code PIN incorrect.");
        return;
      }

      router.replace("/");
    } finally {
      setSoumissionPin(false);
    }
  }

  async function handleSubmitBdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreurBdd(null);
    setLienConfirmationVisible(false);

    const emailNettoye = email.trim().toLowerCase();

    if (!emailNettoye) {
      setErreurBdd("Veuillez saisir votre adresse email.");
      return;
    }

    const formatEmailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNettoye);
    if (!formatEmailValide) {
      setErreurBdd("Le format de l'email est invalide.");
      return;
    }

    if (!motDePasse) {
      setErreurBdd("Veuillez saisir votre mot de passe.");
      return;
    }

    setSoumissionBdd(true);

    try {
      const result = await authentifierAvecBdd(emailNettoye, motDePasse);
      if (!result.ok) {
        setTentativesBdd((n) => n + 1);
        setErreurBdd(result.messageErreur ?? "Identifiants invalides.");
        setLienConfirmationVisible(Boolean(result.needsEmailConfirmation));
        return;
      }

      setTentativesBdd(0);
      router.replace("/");
    } catch {
      setTentativesBdd((n) => n + 1);
      setErreurBdd("Erreur de connexion. Veuillez reessayer.");
    } finally {
      setSoumissionBdd(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[-5%] h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative flex items-center max-w-6xl min-h-screen px-4 py-10 mx-auto lg:px-8">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="hidden lg:block">
            <div className="max-w-xl space-y-6 animate-fade-in">
              <div className="inline-flex items-center gap-3 px-4 py-3 border shadow-sm rounded-2xl border-border bg-surface">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-on-primary">
                  <ScanLine className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Accès sécurisé
                  </p>
                  <h1 className="text-lg font-bold text-on-surface">
                    Administration Scan
                  </h1>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl font-bold leading-tight text-on-surface">
                  Authentification admin temporaire par code PIN.
                </h2>
                <p className="max-w-lg text-base leading-7 text-muted">
                  Cette page ouvre une session locale pour tester
                  l&apos;application sans créer d&apos;utilisateur Supabase. Le
                  mode actuel est prévu pour l&apos;administration et les
                  démonstrations internes.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-4 border shadow-sm rounded-2xl border-border bg-surface">
                  <ShieldCheck className="w-5 h-5 mb-3 text-success" />
                  <p className="text-sm font-semibold text-on-surface">
                    Session locale admin
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Aucun compte backend requis pour entrer dans
                    l&apos;interface.
                  </p>
                </div>
                <div className="p-4 border shadow-sm rounded-2xl border-border bg-surface">
                  <KeyRound className="w-5 h-5 mb-3 text-primary" />
                  <p className="text-sm font-semibold text-on-surface">
                    Connexion BDD
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Les utilisateurs créés dans Supabase peuvent se connecter.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="w-full max-w-md mx-auto animate-slide-up">
            <div className="rounded-[28px] border border-border bg-surface p-6 shadow-xl shadow-primary/5 sm:p-8">
              <div className="flex items-center gap-4 mb-6 lg:hidden">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-on-primary">
                  <ScanLine className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Admin
                  </p>
                  <h1 className="text-lg font-bold text-on-surface">
                    Connexion Scan
                  </h1>
                </div>
              </div>

              <div className="mb-6 space-y-2">
                <h2 className="text-2xl font-bold text-on-surface">
                  Connexion
                </h2>
                <p className="text-sm leading-6 text-muted">
                  Connectez-vous avec votre compte Supabase ou utilisez le PIN
                  admin temporaire.
                </p>
              </div>

              <form onSubmit={handleSubmitBdd} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="flex items-center gap-2 mb-2 text-sm font-medium text-on-surface"
                  >
                    <Mail className="w-4 h-4 text-primary" />
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (erreurBdd) setErreurBdd(null);
                      if (lienConfirmationVisible) {
                        setLienConfirmationVisible(false);
                      }
                    }}
                    placeholder="prenom.nom@gmail.com"
                    className="w-full px-4 py-3 transition-colors border rounded-2xl border-border bg-surface-alt text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="flex items-center gap-2 mb-2 text-sm font-medium text-on-surface"
                  >
                    <Key className="w-4 h-4 text-primary" />
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={motDePasse}
                    onChange={(event) => {
                      setMotDePasse(event.target.value);
                      if (erreurBdd) setErreurBdd(null);
                      if (lienConfirmationVisible) {
                        setLienConfirmationVisible(false);
                      }
                    }}
                    placeholder="Votre mot de passe"
                    className="w-full px-4 py-3 transition-colors border rounded-2xl border-border bg-surface-alt text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                {erreurBddAffichee && (
                  <div className="px-4 py-3 text-sm border rounded-2xl border-danger/20 bg-danger/10 text-danger">
                    {erreurBddAffichee}

                    {lienConfirmationVisible && (email || emailDepuisLien) && (
                      <div className="mt-2">
                        <Link
                          href={`/auth/inscription/confirmation?email=${encodeURIComponent(
                            (email || emailDepuisLien).trim().toLowerCase(),
                          )}&requires=1&requested=0`}
                          className="font-semibold underline"
                        >
                          Renvoyer l&apos;email de confirmation
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {messageInfoInitial && !erreurBdd && (
                  <div className="px-4 py-3 text-sm border rounded-2xl border-primary/20 bg-primary/5 text-on-surface">
                    {messageInfoInitial}
                  </div>
                )}

                {tentativesBdd >= 3 && (
                  <div className="px-4 py-3 text-sm border rounded-2xl border-primary/20 bg-primary/5 text-on-surface">
                    Vous avez eu {tentativesBdd} tentatives sans succès.
                    Vérifiez vos identifiants ou contactez un administrateur.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={soumissionBdd || !email || !motDePasse}
                  className="flex items-center justify-center w-full gap-2 px-4 py-3 text-sm font-semibold transition-all shadow-lg rounded-2xl bg-primary text-on-primary shadow-primary/20 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {soumissionBdd ? "Connexion..." : "se connecter"}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs tracking-widest uppercase text-muted">
                  ou
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form onSubmit={handleSubmitPin} className="space-y-5">
                <div>
                  <label
                    htmlFor="pin"
                    className="flex items-center gap-2 mb-2 text-sm font-medium text-on-surface"
                  >
                    <LockKeyhole className="w-4 h-4 text-primary" />
                    Code PIN admin
                  </label>
                  <input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pin}
                    onChange={(event) => {
                      const valeur = event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4);
                      setPin(valeur);
                    }}
                    placeholder="••••"
                    className="w-full rounded-2xl border border-border bg-surface-alt px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] text-on-surface outline-none transition-colors placeholder:tracking-normal placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="mt-2 text-xs text-muted">
                    Mode temporaire de démonstration.
                  </p>
                </div>

                {erreurPin && (
                  <div className="px-4 py-3 text-sm border rounded-2xl border-danger/20 bg-danger/10 text-danger">
                    {erreurPin}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={soumissionPin || pin.length !== 4}
                  className="flex items-center justify-center w-full gap-2 px-4 py-4 text-sm font-semibold transition-all shadow-lg rounded-2xl bg-primary text-on-primary shadow-primary/20 hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {soumissionPin ? "Vérification..." : "Se connecter en admin"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ShieldCheck,
  Trash2,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import {
  adminCreateUser,
  adminDeleteUser,
  adminUpdateUserSites,
  fetchAllUsers,
  fetchSites,
  updateUserRole,
} from "@/lib/db";
import type { Site, User, UserRole } from "@/types";
import { getRoleLabel } from "@/utils/roles";

const ROLE_OPTIONS: UserRole[] = ["admin", "cc", "cca", "rp", "equipier"];

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin: "bg-danger/10 text-danger border-danger/20",
  cc: "bg-primary/10 text-primary border-primary/20",
  cca: "bg-secondary/10 text-secondary border-secondary/20",
  rp: "bg-warning/10 text-warning border-warning/20",
  equipier: "bg-success/10 text-success border-success/20",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { utilisateur } = useApp();
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [savingSitesUserId, setSavingSitesUserId] = useState<string | null>(
    null,
  );
  const [creationOuverte, setCreationOuverte] = useState(false);
  const [editionSitesOuverte, setEditionSitesOuverte] = useState(false);
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [userEditionSites, setUserEditionSites] = useState<User | null>(null);
  const [siteIdsEdition, setSiteIdsEdition] = useState<string[]>([]);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    password: "",
    role: "equipier" as UserRole,
    siteIds: [] as string[],
  });

  useEffect(() => {
    if (!utilisateur) return;
    if (utilisateur.role !== "admin") {
      router.replace("/");
      return;
    }

    void chargerUtilisateurs();
    void chargerSites();
  }, [router, utilisateur]);

  const nbAdmins = useMemo(
    () => users.filter((user) => user.role === "admin").length,
    [users],
  );

  async function chargerUtilisateurs() {
    try {
      setLoading(true);
      setErreur(null);
      const liste = await fetchAllUsers();
      setUsers(liste);
    } catch (e) {
      setErreur(
        e instanceof Error
          ? e.message
          : "Impossible de charger la liste des utilisateurs.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function chargerSites() {
    try {
      const liste = await fetchSites();
      setSites(liste);
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "Impossible de charger les sites.",
      );
    }
  }

  async function handleChangeRole(userId: string, role: UserRole) {
    try {
      setSavingUserId(userId);
      setErreur(null);
      await updateUserRole(userId, role);
      setUsers((current) =>
        current.map((user) => (user.id === userId ? { ...user, role } : user)),
      );
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "Impossible de mettre à jour le rôle.",
      );
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = form.email.trim().toLowerCase();
    const prenom = form.prenom.trim();
    const nom = form.nom.trim();

    if (!email || !prenom || !nom || !form.password) {
      setErreur("Tous les champs obligatoires doivent être renseignés.");
      return;
    }

    if (form.password.length < 8) {
      setErreur(
        "Le mot de passe temporaire doit contenir au moins 8 caractères.",
      );
      return;
    }

    try {
      setCreationEnCours(true);
      setErreur(null);

      await adminCreateUser({
        email,
        prenom,
        nom,
        password: form.password,
        role: form.role,
        siteIds: form.siteIds,
      });

      setCreationOuverte(false);
      setForm({
        prenom: "",
        nom: "",
        email: "",
        password: "",
        role: "equipier",
        siteIds: [],
      });

      await chargerUtilisateurs();
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "Impossible de créer le compte.",
      );
    } finally {
      setCreationEnCours(false);
    }
  }

  function ouvrirEditionSites(user: User) {
    setUserEditionSites(user);
    setSiteIdsEdition(user.siteIds);
    setEditionSitesOuverte(true);
    setErreur(null);
  }

  async function handleSaveSites() {
    if (!userEditionSites) return;

    try {
      setSavingSitesUserId(userEditionSites.id);
      setErreur(null);

      await adminUpdateUserSites(userEditionSites.id, siteIdsEdition);

      setUsers((current) =>
        current.map((user) =>
          user.id === userEditionSites.id
            ? { ...user, siteIds: [...siteIdsEdition] }
            : user,
        ),
      );

      setEditionSitesOuverte(false);
      setUserEditionSites(null);
      setSiteIdsEdition([]);
    } catch (e) {
      setErreur(
        e instanceof Error
          ? e.message
          : "Impossible de mettre à jour les accès site.",
      );
    } finally {
      setSavingSitesUserId(null);
    }
  }

  async function handleDeleteUser(user: User) {
    if (!utilisateur) return;

    if (user.id === utilisateur.id) {
      setErreur("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }

    const confirmed = window.confirm(
      `Supprimer définitivement le compte ${user.prenom} ${user.nom} ?`,
    );
    if (!confirmed) return;

    try {
      setDeletingUserId(user.id);
      setErreur(null);
      await adminDeleteUser(user.id);
      setUsers((current) => current.filter((u) => u.id !== user.id));

      if (userEditionSites?.id === user.id) {
        setEditionSitesOuverte(false);
        setUserEditionSites(null);
        setSiteIdsEdition([]);
      }
    } catch (e) {
      setErreur(
        e instanceof Error ? e.message : "Impossible de supprimer le compte.",
      );
    } finally {
      setDeletingUserId(null);
    }
  }

  if (!utilisateur) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Gestion Utilisateurs
          </h1>
          <p className="mt-1 text-sm text-muted">
            Gérez les rôles et les accès des comptes applicatifs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreationOuverte(true);
            setErreur(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-dark transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Nouvel Utilisateur
        </button>
      </header>

      {creationOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl border shadow-2xl rounded-2xl border-border bg-surface">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-on-surface">
                  Nouvel utilisateur
                </h3>
                <p className="text-sm text-muted">
                  Création sécurisée (Auth Supabase + profil applicatif)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreationOuverte(false)}
                className="p-2 rounded-lg text-muted hover:text-on-surface hover:bg-surface-alt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-on-surface">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={form.prenom}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        prenom: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 border rounded-xl border-border bg-surface-alt text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-medium text-on-surface">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={form.nom}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, nom: event.target.value }))
                    }
                    className="w-full px-3 py-2.5 border rounded-xl border-border bg-surface-alt text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-on-surface">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 border rounded-xl border-border bg-surface-alt text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-medium text-on-surface">
                    Mot de passe temporaire
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 border rounded-xl border-border bg-surface-alt text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-on-surface">
                    Rôle
                  </label>
                  <select
                    value={form.role}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        role: event.target.value as UserRole,
                      }))
                    }
                    className="w-full px-3 py-2.5 border rounded-xl border-border bg-surface-alt text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {getRoleLabel(role)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4">
                  <label className="block mb-1.5 text-sm font-medium text-on-surface">
                    Sites d&apos;accès
                  </label>
                  <div className="max-h-44 overflow-y-auto p-3 border rounded-xl border-border bg-surface-alt space-y-2">
                    {sites.length === 0 ? (
                      <p className="text-sm text-muted">
                        Aucun site disponible.
                      </p>
                    ) : (
                      sites.map((site) => {
                        const checked = form.siteIds.includes(site.id);
                        return (
                          <label
                            key={site.id}
                            className="flex items-center gap-2 text-sm text-on-surface"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                const enabled = event.target.checked;
                                setForm((prev) => ({
                                  ...prev,
                                  siteIds: enabled
                                    ? [...prev.siteIds, site.id]
                                    : prev.siteIds.filter(
                                        (id) => id !== site.id,
                                      ),
                                }));
                              }}
                            />
                            <span className="inline-flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-primary" />
                              {site.nom}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreationOuverte(false)}
                  className="px-4 py-2.5 text-sm border rounded-xl border-border text-on-surface hover:bg-surface-alt"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creationEnCours}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-60"
                >
                  <UserPlus className="w-4 h-4" />
                  {creationEnCours ? "Création..." : "Créer l'utilisateur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="p-4 border rounded-xl border-border bg-surface">
          <p className="text-xs uppercase tracking-wide text-muted">
            Total comptes
          </p>
          <p className="mt-2 text-2xl font-bold text-on-surface">
            {users.length}
          </p>
        </div>
        <div className="p-4 border rounded-xl border-border bg-surface">
          <p className="text-xs uppercase tracking-wide text-muted">
            Administrateurs
          </p>
          <p className="mt-2 text-2xl font-bold text-danger">{nbAdmins}</p>
        </div>
        <div className="p-4 border rounded-xl border-border bg-surface">
          <p className="text-xs uppercase tracking-wide text-muted">
            Compte connecté
          </p>
          <p className="mt-2 text-sm font-medium text-on-surface">
            {utilisateur.prenom} {utilisateur.nom}
          </p>
        </div>
      </section>

      {erreur && (
        <div className="px-4 py-3 text-sm border rounded-xl border-danger/20 bg-danger/10 text-danger">
          {erreur}
        </div>
      )}

      <section className="overflow-hidden border rounded-2xl border-border bg-surface">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-on-surface">
            Utilisateurs
          </h2>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-sm text-muted">
            Chargement des utilisateurs...
          </div>
        ) : users.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted">
            Aucun utilisateur trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-alt text-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Nom</th>
                  <th className="px-4 py-3 text-left">Prénom</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Rôle</th>
                  <th className="px-4 py-3 text-left">Sites</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-border">
                    <td className="px-4 py-3 text-on-surface">{user.nom}</td>
                    <td className="px-4 py-3 text-on-surface">{user.prenom}</td>
                    <td className="px-4 py-3 text-muted">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${ROLE_BADGE_CLASS[user.role]}`}
                      >
                        {user.role === "admin" && (
                          <ShieldCheck className="w-3.5 h-3.5" />
                        )}
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => ouvrirEditionSites(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg border-border text-on-surface hover:bg-surface-alt"
                      >
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        {user.siteIds.length} site
                        {user.siteIds.length > 1 ? "s" : ""}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <label className="sr-only" htmlFor={`role-${user.id}`}>
                          Modifier le rôle
                        </label>
                        <select
                          id={`role-${user.id}`}
                          value={user.role}
                          onChange={(event) => {
                            const role = event.target.value as UserRole;
                            void handleChangeRole(user.id, role);
                          }}
                          disabled={savingUserId === user.id}
                          className="px-3 py-2 border rounded-lg border-border bg-surface-alt text-on-surface disabled:opacity-60"
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {getRoleLabel(role)}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => void handleDeleteUser(user)}
                          disabled={
                            deletingUserId === user.id ||
                            user.id === utilisateur.id
                          }
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold border rounded-lg border-danger/30 text-danger hover:bg-danger/10 disabled:opacity-60"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {deletingUserId === user.id
                            ? "Suppression..."
                            : "Supprimer"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editionSitesOuverte && userEditionSites && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl border shadow-2xl rounded-2xl border-border bg-surface">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-on-surface">
                  Modifier les accès site
                </h3>
                <p className="text-sm text-muted">
                  {userEditionSites.prenom} {userEditionSites.nom}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditionSitesOuverte(false)}
                className="p-2 rounded-lg text-muted hover:text-on-surface hover:bg-surface-alt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="max-h-64 overflow-y-auto p-3 border rounded-xl border-border bg-surface-alt space-y-2">
                {sites.length === 0 ? (
                  <p className="text-sm text-muted">Aucun site disponible.</p>
                ) : (
                  sites.map((site) => {
                    const checked = siteIdsEdition.includes(site.id);
                    return (
                      <label
                        key={site.id}
                        className="flex items-center gap-2 text-sm text-on-surface"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const enabled = event.target.checked;
                            setSiteIdsEdition((prev) =>
                              enabled
                                ? [...prev, site.id]
                                : prev.filter((id) => id !== site.id),
                            );
                          }}
                        />
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-primary" />
                          {site.nom}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditionSitesOuverte(false)}
                  className="px-4 py-2.5 text-sm border rounded-xl border-border text-on-surface hover:bg-surface-alt"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveSites()}
                  disabled={savingSitesUserId === userEditionSites.id}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-60"
                >
                  <Building2 className="w-4 h-4" />
                  {savingSitesUserId === userEditionSites.id
                    ? "Enregistrement..."
                    : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * db.ts — Couche de service Supabase
 *
 * Fonctions CRUD typées pour chaque entité de l'application.
 * Toutes les fonctions retournent des types de l'application (types.ts)
 * et lèvent une Error en cas d'échec Supabase.
 * ═══════════════════════════════════════════════════════════════════════ */

import { supabase } from "./supabase";
import type {
  Site,
  Emplacement,
  Categorie,
  Produit,
  User,
  CaptureHACCP,
  UserRole,
} from "@/types";

/* ══════════════════════════════════════════════════════════════════════
 * Helpers de mapping (snake_case BDD → camelCase app)
 * ══════════════════════════════════════════════════════════════════════ */

function mapSite(row: {
  id: string;
  nom: string;
  localisation: string;
  emplacements?: { id: string }[];
}): Site {
  return {
    id: row.id,
    nom: row.nom,
    localisation: row.localisation,
    emplacementIds: row.emplacements?.map((e) => e.id) ?? [],
  };
}

function mapEmplacement(row: {
  id: string;
  nom: string;
  site_id: string;
  icone: string;
  emplacement_categories?: { categorie_id: string }[];
}): Emplacement {
  return {
    id: row.id,
    nom: row.nom,
    siteId: row.site_id,
    icone: row.icone,
    categorieIds: row.emplacement_categories?.map((c) => c.categorie_id) ?? [],
  };
}

function mapCategorie(row: {
  id: string;
  nom: string;
  description: string | null;
  icone: string;
}): Categorie {
  return {
    id: row.id,
    nom: row.nom,
    description: row.description ?? undefined,
    icone: row.icone,
  };
}

function mapProduit(row: {
  id: string;
  nom: string;
  categorie_id: string;
  unite: string;
  seuil_reassort: number;
  stock_actuel: number;
  code_barres: string | null;
  temperature_conservation: number | null;
  emplacement_produits?: { emplacement_id: string }[];
}): Produit {
  return {
    id: row.id,
    nom: row.nom,
    categorieId: row.categorie_id,
    emplacementIds:
      row.emplacement_produits?.map((e) => e.emplacement_id) ?? [],
    unite: row.unite,
    seuilReassort: row.seuil_reassort,
    stockActuel: row.stock_actuel,
    codeBarres: row.code_barres ?? undefined,
    temperatureConservation: row.temperature_conservation ?? undefined,
  };
}

function mapUser(row: {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  avatar: string | null;
  utilisateur_sites?: { site_id: string }[];
}): User {
  const roleNormalise = normalizeUserRole(row.role);

  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    email: row.email,
    role: roleNormalise,
    siteIds: row.utilisateur_sites?.map((us) => us.site_id) ?? [],
    avatar: row.avatar ?? undefined,
  };
}

function normalizeUserRole(role: string | null | undefined): UserRole {
  const roleNettoye = (role ?? "")
    .toLowerCase()
    .trim()
    .replace(/[éèêë]/g, "e");

  if (roleNettoye === "admin") return "admin";
  if (roleNettoye === "cc") return "cc";
  if (roleNettoye === "cca") return "cca";
  if (roleNettoye === "rp") return "rp";
  if (roleNettoye === "equipier") return "equipier";

  return "equipier";
}

function mapCapture(row: {
  id: string;
  produit_id: string | null;
  emplacement_id: string;
  user_id: string;
  date_capture: string;
  numero_lot: string;
  dlc: string;
  nom_produit_ocr: string;
  nom_produit_valide: string;
  temperature: number | null;
  conforme: boolean;
  commentaire: string | null;
  photo_url: string | null;
}): CaptureHACCP {
  return {
    id: row.id,
    produitId: row.produit_id ?? undefined,
    emplacementId: row.emplacement_id,
    userId: row.user_id,
    dateCapture: row.date_capture,
    numeroLot: row.numero_lot,
    dlc: row.dlc,
    nomProduitOCR: row.nom_produit_ocr,
    nomProduitValide: row.nom_produit_valide,
    temperature: row.temperature ?? undefined,
    conforme: row.conforme,
    commentaire: row.commentaire ?? undefined,
    photoUrl: row.photo_url ?? undefined,
  };
}

async function parseApiJson<T>(response: Response): Promise<T> {
  const raw = await response.text();

  if (!raw) {
    return {} as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    const preview = raw.slice(0, 180).replace(/\s+/g, " ").trim();
    throw new Error(
      `Réponse API invalide (attendu JSON, reçu autre chose): ${preview}`,
    );
  }
}

export interface CaptureSystemLog extends CaptureHACCP {
  utilisateurNom: string;
  utilisateurPrenom: string;
  utilisateurEmail: string;
  confianceOCR?: number;
}

/* ══════════════════════════════════════════════════════════════════════
 * Sites
 * ══════════════════════════════════════════════════════════════════════ */

/** Récupère tous les sites accessibles par l'utilisateur connecté */
export async function fetchSites(): Promise<Site[]> {
  const { data, error } = await supabase
    .from("sites")
    .select("id, nom, localisation, emplacements(id)")
    .order("nom");

  if (error) throw new Error(`fetchSites : ${error.message}`);
  return (data ?? []).map(mapSite);
}

/** Récupère un site par son identifiant */
export async function fetchSite(id: string): Promise<Site | null> {
  const { data, error } = await supabase
    .from("sites")
    .select("id, nom, localisation, emplacements(id)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`fetchSite : ${error.message}`);
  }
  return data ? mapSite(data) : null;
}

/* ══════════════════════════════════════════════════════════════════════
 * Emplacements
 * ══════════════════════════════════════════════════════════════════════ */

/** Récupère tous les emplacements d'un site donné */
export async function fetchEmplacementsParSite(
  siteId: string,
): Promise<Emplacement[]> {
  const { data, error } = await supabase
    .from("emplacements")
    .select("id, nom, site_id, icone, emplacement_categories(categorie_id)")
    .eq("site_id", siteId)
    .order("nom");

  if (error) throw new Error(`fetchEmplacementsParSite : ${error.message}`);
  return (data ?? []).map(mapEmplacement);
}

/* ══════════════════════════════════════════════════════════════════════
 * Catégories
 * ══════════════════════════════════════════════════════════════════════ */

/** Récupère toutes les catégories */
export async function fetchCategories(): Promise<Categorie[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, nom, description, icone")
    .order("nom");

  if (error) throw new Error(`fetchCategories : ${error.message}`);
  return (data ?? []).map(mapCategorie);
}

/* ══════════════════════════════════════════════════════════════════════
 * Produits
 * ══════════════════════════════════════════════════════════════════════ */

/** Récupère tous les produits d'un emplacement donné */
export async function fetchProduitsParEmplacement(
  emplacementId: string,
): Promise<Produit[]> {
  const { data, error } = await supabase
    .from("produits")
    .select(
      "id, nom, categorie_id, unite, seuil_reassort, stock_actuel, code_barres, temperature_conservation, emplacement_produits!inner(emplacement_id)",
    )
    .eq("emplacement_produits.emplacement_id", emplacementId);

  if (error) throw new Error(`fetchProduitsParEmplacement : ${error.message}`);
  return (data ?? []).map(mapProduit);
}

/** Récupère tous les produits */
export async function fetchProduits(): Promise<Produit[]> {
  const { data, error } = await supabase
    .from("produits")
    .select(
      "id, nom, categorie_id, unite, seuil_reassort, stock_actuel, code_barres, temperature_conservation, emplacement_produits(emplacement_id)",
    )
    .order("nom");

  if (error) throw new Error(`fetchProduits : ${error.message}`);
  return (data ?? []).map(mapProduit);
}

/** Met à jour le stock d'un produit */
export async function updateStockProduit(
  produitId: string,
  stockActuel: number,
): Promise<void> {
  const { error } = await supabase
    .from("produits")
    .update({ stock_actuel: stockActuel })
    .eq("id", produitId);

  if (error) throw new Error(`updateStockProduit : ${error.message}`);
}

/* ══════════════════════════════════════════════════════════════════════
 * Utilisateurs
 * ══════════════════════════════════════════════════════════════════════ */

/** Récupère le profil de l'utilisateur connecté */
export async function fetchProfil(): Promise<User | null> {
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data, error } = await supabase
    .from("utilisateurs")
    .select("id, nom, prenom, email, role, avatar, utilisateur_sites(site_id)")
    .eq("id", authUser.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`fetchProfil : ${error.message}`);
  }
  return data ? mapUser(data) : null;
}

/** Récupère tous les utilisateurs (admin only via RLS) */
export async function fetchAllUsers(): Promise<User[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    throw new Error(
      "Session expirée. Reconnectez-vous pour charger les utilisateurs.",
    );
  }

  const response = await fetch("/api/admin/users/list", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await parseApiJson<{
    error?: string;
    users?: User[];
  }>(response);

  if (!response.ok) {
    throw new Error(result.error ?? "Impossible de charger les utilisateurs.");
  }

  return result.users ?? [];
}

/** Met à jour le rôle d'un utilisateur (admin only via RLS) */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
): Promise<void> {
  const { error } = await supabase
    .from("utilisateurs")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) throw new Error(`updateUserRole : ${error.message}`);
}

/** Récupère les derniers logs de captures avec l'utilisateur ayant scanné */
export async function fetchRecentCaptureLogs(
  limit = 20,
): Promise<CaptureSystemLog[]> {
  const baseSelect =
    "id, produit_id, emplacement_id, user_id, date_capture, numero_lot, dlc, nom_produit_ocr, nom_produit_valide, temperature, conforme, commentaire, photo_url, utilisateurs!captures_user_id_fkey(nom, prenom, email)";

  const { data, error } = await supabase
    .from("captures")
    .select(baseSelect)
    .order("date_capture", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`fetchRecentCaptureLogs : ${error.message}`);

  return (data ?? []).map((row) => {
    const utilisateur = Array.isArray(row.utilisateurs)
      ? row.utilisateurs[0]
      : row.utilisateurs;

    const capture = mapCapture({
      id: row.id,
      produit_id: row.produit_id,
      emplacement_id: row.emplacement_id,
      user_id: row.user_id,
      date_capture: row.date_capture,
      numero_lot: row.numero_lot,
      dlc: row.dlc,
      nom_produit_ocr: row.nom_produit_ocr,
      nom_produit_valide: row.nom_produit_valide,
      temperature: row.temperature,
      conforme: row.conforme,
      commentaire: row.commentaire,
      photo_url: row.photo_url,
    });

    return {
      ...capture,
      confianceOCR: 0.9,
      utilisateurNom: utilisateur?.nom ?? "Inconnu",
      utilisateurPrenom: utilisateur?.prenom ?? "",
      utilisateurEmail: utilisateur?.email ?? "",
    };
  });
}

/* ══════════════════════════════════════════════════════════════════════
 * Storage — Images de captures
 * ══════════════════════════════════════════════════════════════════════ */

const BUCKET_CAPTURES = "captures-images";

/**
 * Uploade une image base64 dans le bucket Supabase Storage.
 * Retourne l'URL publique du fichier uploadé.
 */
export async function uploadImageCapture(
  imageBase64: string,
  captureId: string,
): Promise<string> {
  const match = imageBase64.match(
    /^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/]+);base64,(.+)$/,
  );
  if (!match) throw new Error("uploadImageCapture : format base64 invalide");

  const mimeType = match[1];
  const base64Data = match[2];
  const byteCharacters = atob(base64Data);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: mimeType });

  const extension = mimeType.split("/")[1] ?? "jpg";
  const filePath = `${captureId}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET_CAPTURES)
    .upload(filePath, blob, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`uploadImageCapture : ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(BUCKET_CAPTURES)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/* ══════════════════════════════════════════════════════════════════════
 * Captures HACCP
 * ══════════════════════════════════════════════════════════════════════ */

/** Récupère les captures d'un emplacement (50 dernières par défaut) */
export async function fetchCapturesParEmplacement(
  emplacementId: string,
  limit = 50,
): Promise<CaptureHACCP[]> {
  const { data, error } = await supabase
    .from("captures")
    .select(
      "id, produit_id, emplacement_id, user_id, date_capture, numero_lot, dlc, nom_produit_ocr, nom_produit_valide, temperature, conforme, commentaire, photo_url",
    )
    .eq("emplacement_id", emplacementId)
    .order("date_capture", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`fetchCapturesParEmplacement : ${error.message}`);
  return (data ?? []).map(mapCapture);
}

/**
 * Insère une nouvelle capture HACCP avec upload optionnel de l'image.
 * Si `photoBase64` est fourni, l'image est uploadée vers le bucket
 * `captures-images` et l'URL publique est stockée dans `photo_url`.
 */
export async function insertCapture(
  capture: Omit<CaptureHACCP, "id" | "dateCapture" | "photoUrl">,
  photoBase64?: string,
): Promise<CaptureHACCP> {
  const { data: newRow, error: insertError } = await supabase
    .from("captures")
    .insert({
      produit_id: capture.produitId ?? null,
      emplacement_id: capture.emplacementId,
      user_id: capture.userId,
      numero_lot: capture.numeroLot,
      dlc: capture.dlc,
      nom_produit_ocr: capture.nomProduitOCR,
      nom_produit_valide: capture.nomProduitValide,
      temperature: capture.temperature ?? null,
      conforme: capture.conforme,
      commentaire: capture.commentaire ?? null,
      photo_url: null,
    })
    .select(
      "id, produit_id, emplacement_id, user_id, date_capture, numero_lot, dlc, nom_produit_ocr, nom_produit_valide, temperature, conforme, commentaire, photo_url",
    )
    .single();

  if (insertError) throw new Error(`insertCapture : ${insertError.message}`);
  if (!newRow) throw new Error("insertCapture : données manquantes");

  if (photoBase64) {
    try {
      const photoUrl = await uploadImageCapture(photoBase64, newRow.id);

      const { error: updateError } = await supabase
        .from("captures")
        .update({ photo_url: photoUrl })
        .eq("id", newRow.id);

      if (updateError) {
        throw new Error(
          `insertCapture (photo update) : ${updateError.message}`,
        );
      }

      return mapCapture({ ...newRow, photo_url: photoUrl });
    } catch (uploadErr) {
      console.warn(
        "Upload image échoué, capture enregistrée sans photo :",
        uploadErr,
      );
    }
  }

  return mapCapture(newRow);
}

/* ══════════════════════════════════════════════════════════════════════
 * Authentification
 * ══════════════════════════════════════════════════════════════════════ */

export interface SignUpInput {
  prenom: string;
  nom: string;
  email: string;
  password: string;
}

export async function adminCreateUser(
  payload: SignUpInput & { role: UserRole; siteIds?: string[] },
): Promise<{ userId: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    throw new Error(
      "Session expirée. Reconnectez-vous pour créer un utilisateur.",
    );
  }

  const response = await fetch("/api/admin/create-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await parseApiJson<{
    error?: string;
    userId?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(result.error ?? "Impossible de créer le compte.");
  }

  if (!result.userId) {
    throw new Error("Réponse invalide du serveur lors de la création.");
  }

  return { userId: result.userId };
}

export async function adminUpdateUserSites(
  userId: string,
  siteIds: string[],
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    throw new Error(
      "Session expirée. Reconnectez-vous pour modifier les accès site.",
    );
  }

  const response = await fetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ siteIds }),
  });

  const result = await parseApiJson<{
    error?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(
      result.error ?? "Impossible de mettre à jour les accès site.",
    );
  }
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    throw new Error(
      "Session expirée. Reconnectez-vous pour supprimer le compte.",
    );
  }

  const response = await fetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await parseApiJson<{
    error?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(result.error ?? "Impossible de supprimer le compte.");
  }
}

export interface SignUpResult {
  user: User | null;
  requiresEmailConfirmation: boolean;
  confirmationEmailRequested: boolean;
  email: string;
  emailDejaUtilise: boolean;
  messageErreur?: string;
}

function buildFallbackUserFromAuth(input: {
  id: string;
  email: string;
  nom?: string;
  prenom?: string;
}): User {
  return {
    id: input.id,
    email: input.email,
    nom: input.nom ?? "Utilisateur",
    prenom: input.prenom ?? "Nouveau",
    role: "equipier",
    siteIds: [],
  };
}

/**
 * Crée un compte Supabase Auth puis provisionne le profil applicatif.
 * `confirmationEmailRequested` indique uniquement que Supabase a accepté
 * une inscription nécessitant une confirmation email. Cela ne garantit pas
 * la livraison finale du message dans la boîte de réception.
 */
export async function signUpWithProfile(
  payload: SignUpInput,
): Promise<SignUpResult> {
  const emailNormalise = payload.email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email: emailNormalise,
    password: payload.password,
    options: {
      data: {
        nom: payload.nom,
        prenom: payload.prenom,
      },
    },
  });

  if (error) {
    if (/already registered/i.test(error.message)) {
      return {
        user: null,
        requiresEmailConfirmation: false,
        confirmationEmailRequested: false,
        email: emailNormalise,
        emailDejaUtilise: true,
        messageErreur: "Cette adresse email est deja utilisee.",
      };
    }

    if (/password/i.test(error.message)) {
      return {
        user: null,
        requiresEmailConfirmation: false,
        confirmationEmailRequested: false,
        email: emailNormalise,
        emailDejaUtilise: false,
        messageErreur:
          "Le mot de passe ne respecte pas les contraintes de securite.",
      };
    }

    throw new Error(`signUpWithProfile : ${error.message}`);
  }
  if (!data.user) throw new Error("signUpWithProfile : aucun utilisateur créé");

  const compteExistantObfusque =
    Array.isArray(data.user.identities) && data.user.identities.length === 0;

  if (compteExistantObfusque) {
    return {
      user: null,
      requiresEmailConfirmation: false,
      confirmationEmailRequested: false,
      email: emailNormalise,
      emailDejaUtilise: true,
      messageErreur: "Cette adresse email est deja utilisee.",
    };
  }

  const { error: insertError } = await supabase.from("utilisateurs").upsert(
    {
      id: data.user.id,
      nom: payload.nom,
      prenom: payload.prenom,
      email: emailNormalise,
    },
    { onConflict: "id" },
  );

  const requiresEmailConfirmation = data.session === null;
  const confirmationEmailRequested = requiresEmailConfirmation;

  if (insertError && !requiresEmailConfirmation) {
    throw new Error(`signUpWithProfile (profil) : ${insertError.message}`);
  }

  const profil = await fetchProfil();
  const user =
    profil ??
    buildFallbackUserFromAuth({
      id: data.user.id,
      email: emailNormalise,
      nom: payload.nom,
      prenom: payload.prenom,
    });

  return {
    user,
    requiresEmailConfirmation,
    confirmationEmailRequested,
    email: emailNormalise,
    emailDejaUtilise: false,
  };
}

export async function resendConfirmationEmail(email: string): Promise<void> {
  const emailNormalise = email.trim().toLowerCase();
  const emailRedirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth`
      : undefined;

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: emailNormalise,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });

  if (error) {
    throw new Error(`resendConfirmationEmail : ${error.message}`);
  }
}

/** Connexion par email + mot de passe */
export async function signIn(
  email: string,
  password: string,
): Promise<{ user: User }> {
  const emailNormalise = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailNormalise,
    password,
  });

  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      throw new Error("Email ou mot de passe incorrect.");
    }
    if (/email not confirmed/i.test(error.message)) {
      throw new Error(
        "Votre adresse email n'a pas encore ete confirmee. Verifiez votre boite de reception.",
      );
    }
    if (/too many requests/i.test(error.message)) {
      throw new Error("Trop de tentatives. Reessayez dans quelques instants.");
    }
    throw new Error(`Erreur de connexion : ${error.message}`);
  }
  if (!data.user) throw new Error("signIn : aucun utilisateur retourné");

  let profil = await fetchProfil();

  if (!profil) {
    const nomMeta =
      typeof data.user.user_metadata?.nom === "string"
        ? data.user.user_metadata.nom
        : undefined;
    const prenomMeta =
      typeof data.user.user_metadata?.prenom === "string"
        ? data.user.user_metadata.prenom
        : undefined;

    const fallbackNom = nomMeta ?? "Utilisateur";
    const fallbackPrenom = prenomMeta ?? "Nouveau";

    const { error: insertError } = await supabase.from("utilisateurs").upsert(
      {
        id: data.user.id,
        nom: fallbackNom,
        prenom: fallbackPrenom,
        email: data.user.email ?? emailNormalise,
      },
      { onConflict: "id" },
    );

    if (insertError) {
      throw new Error(`signIn (provision profil) : ${insertError.message}`);
    }

    profil = await fetchProfil();
  }

  if (!profil) {
    return {
      user: buildFallbackUserFromAuth({
        id: data.user.id,
        email: data.user.email ?? emailNormalise,
      }),
    };
  }

  return { user: profil };
}

/** Déconnexion */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`signOut : ${error.message}`);
}

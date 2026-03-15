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
  role: "admin" | "cc" | "cca" | "rp" | "equipier";
  avatar: string | null;
  utilisateur_sites?: { site_id: string }[];
}): User {
  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    email: row.email,
    role: row.role,
    siteIds: row.utilisateur_sites?.map((us) => us.site_id) ?? [],
    avatar: row.avatar ?? undefined,
  };
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

export interface SignUpResult {
  user: User;
  requiresEmailConfirmation: boolean;
  confirmationEmailRequested: boolean;
  email: string;
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
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        nom: payload.nom,
        prenom: payload.prenom,
      },
    },
  });

  if (error) throw new Error(`signUpWithProfile : ${error.message}`);
  if (!data.user) throw new Error("signUpWithProfile : aucun utilisateur créé");

  const { error: insertError } = await supabase.from("utilisateurs").upsert(
    {
      id: data.user.id,
      nom: payload.nom,
      prenom: payload.prenom,
      email: payload.email,
      role: "equipier",
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
      email: payload.email,
      nom: payload.nom,
      prenom: payload.prenom,
    });

  return {
    user,
    requiresEmailConfirmation,
    confirmationEmailRequested,
    email: payload.email,
  };
}

export async function resendConfirmationEmail(email: string): Promise<void> {
  const emailRedirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth`
      : undefined;

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(`signIn : ${error.message}`);
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
        email: data.user.email ?? email,
        role: "equipier",
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
        email: data.user.email ?? email,
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

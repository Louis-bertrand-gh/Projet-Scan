import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { UserRole } from "@/types";

type CreateUserPayload = {
  email: string;
  password: string;
  prenom: string;
  nom: string;
  role: UserRole;
  siteIds?: string[];
};

const ROLE_SET = new Set<UserRole>(["admin", "cc", "cca", "rp", "equipier"]);

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missingEnvVars = [
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
  ].filter((value): value is string => Boolean(value));

  if (missingEnvVars.length > 0) {
    return NextResponse.json(
      {
        error: `Configuration serveur manquante: ${missingEnvVars.join(", ")}.`,
      },
      { status: 500 },
    );
  }

  const adminClient = createClient<Database>(
    supabaseUrl as string,
    serviceRoleKey as string,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    return NextResponse.json(
      { error: "Token d'authentification manquant." },
      { status: 401 },
    );
  }

  const {
    data: { user: requester },
    error: requesterError,
  } = await adminClient.auth.getUser(token);

  if (requesterError || !requester) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  const { data: requesterProfile, error: requesterProfileError } =
    await adminClient
      .from("utilisateurs")
      .select("nom, prenom, email, role")
      .eq("id", requester.id)
      .maybeSingle();

  if (requesterProfileError) {
    return NextResponse.json(
      { error: "Impossible de vérifier le rôle du compte connecté." },
      { status: 403 },
    );
  }

  const metadataRole =
    typeof requester.app_metadata?.role === "string"
      ? requester.app_metadata.role.toLowerCase().trim()
      : "";

  const profileRole =
    typeof requesterProfile?.role === "string"
      ? requesterProfile.role.toLowerCase().trim()
      : "";

  const isAdminByMetadata = metadataRole === "admin";
  const isAdminByProfile = profileRole === "admin";

  if (!isAdminByMetadata && !isAdminByProfile) {
    return NextResponse.json(
      { error: "Accès réservé aux administrateurs." },
      { status: 403 },
    );
  }

  // Synchronise les deux sources de vérité (profil + app_metadata)
  // pour éviter les régressions sur les futurs comptes admin.
  if (!isAdminByProfile) {
    const fallbackNom =
      requesterProfile?.nom ??
      (typeof requester.user_metadata?.nom === "string"
        ? requester.user_metadata.nom
        : "Admin");
    const fallbackPrenom =
      requesterProfile?.prenom ??
      (typeof requester.user_metadata?.prenom === "string"
        ? requester.user_metadata.prenom
        : "Utilisateur");
    const fallbackEmail = requesterProfile?.email ?? requester.email ?? "";

    const { error: syncProfileError } = await adminClient
      .from("utilisateurs")
      .upsert(
        {
          id: requester.id,
          nom: fallbackNom,
          prenom: fallbackPrenom,
          email: fallbackEmail,
          role: "admin",
        },
        { onConflict: "id" },
      );

    if (syncProfileError) {
      return NextResponse.json(
        {
          error: `Impossible de synchroniser le rôle admin dans le profil: ${syncProfileError.message}`,
        },
        { status: 500 },
      );
    }
  }

  if (!isAdminByMetadata) {
    const nextAppMetadata = {
      ...(requester.app_metadata ?? {}),
      role: "admin",
    };

    const { error: syncMetadataError } =
      await adminClient.auth.admin.updateUserById(requester.id, {
        app_metadata: nextAppMetadata,
      });

    if (syncMetadataError) {
      return NextResponse.json(
        {
          error: `Impossible de synchroniser le rôle admin côté Auth: ${syncMetadataError.message}`,
        },
        { status: 500 },
      );
    }
  }

  let payload: CreateUserPayload;
  try {
    payload = (await request.json()) as CreateUserPayload;
  } catch {
    return NextResponse.json(
      { error: "Corps de requête invalide." },
      { status: 400 },
    );
  }

  const email = payload.email?.trim().toLowerCase();
  const prenom = payload.prenom?.trim();
  const nom = payload.nom?.trim();
  const password = payload.password ?? "";
  const role = payload.role;
  const siteIds = Array.isArray(payload.siteIds)
    ? payload.siteIds.filter(
        (id) => typeof id === "string" && id.trim().length > 0,
      )
    : [];

  if (!email || !prenom || !nom || !password) {
    return NextResponse.json(
      { error: "Les champs email, prénom, nom et mot de passe sont requis." },
      { status: 400 },
    );
  }

  if (!ROLE_SET.has(role)) {
    return NextResponse.json(
      { error: "Rôle utilisateur invalide." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 },
    );
  }

  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        prenom,
        nom,
      },
      app_metadata: {
        role,
      },
    });

  if (createError || !created.user) {
    const message =
      createError?.message ?? "Impossible de créer le compte Auth.";
    const isDuplicate =
      /already registered|already been registered|duplicate/i.test(message);

    return NextResponse.json(
      {
        error: isDuplicate ? "Cette adresse email est déjà utilisée." : message,
      },
      { status: 400 },
    );
  }

  const { error: profileError } = await adminClient.from("utilisateurs").upsert(
    {
      id: created.user.id,
      email,
      prenom,
      nom,
      role,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    const enumMismatch = /invalid input value for enum user_role/i.test(
      profileError.message,
    );

    return NextResponse.json(
      {
        error: enumMismatch
          ? "Impossible de créer le profil applicatif: enum user_role non synchronisé. Exécutez la migration SQL des rôles (admin, cc, cca, rp, equipier)."
          : `Impossible de créer le profil applicatif: ${profileError.message}`,
      },
      { status: 400 },
    );
  }

  if (siteIds.length > 0) {
    const associations = siteIds.map((siteId) => ({
      utilisateur_id: created.user.id,
      site_id: siteId,
    }));

    const { error: associationError } = await adminClient
      .from("utilisateur_sites")
      .upsert(associations, { onConflict: "utilisateur_id,site_id" });

    if (associationError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return NextResponse.json(
        {
          error: `Impossible d'associer les sites à l'utilisateur: ${associationError.message}`,
        },
        { status: 400 },
      );
    }
  }

  return NextResponse.json(
    { ok: true, userId: created.user.id },
    { status: 201 },
  );
}

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
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missingEnvVars = [
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !supabaseAnonKey
      ? "NEXT_PUBLIC_SUPABASE_ANON_KEY ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"
      : null,
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

  const validatedSupabaseUrl = supabaseUrl as string;
  const validatedSupabaseAnonKey = supabaseAnonKey as string;
  const validatedServiceRoleKey = serviceRoleKey as string;

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

  const anonClient = createClient<Database>(
    validatedSupabaseUrl,
    validatedSupabaseAnonKey,
  );
  const adminClient = createClient<Database>(
    validatedSupabaseUrl,
    validatedServiceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const {
    data: { user: requester },
    error: requesterError,
  } = await anonClient.auth.getUser(token);

  if (requesterError || !requester) {
    return NextResponse.json({ error: "Session invalide." }, { status: 401 });
  }

  const { data: requesterProfil, error: requesterProfilError } =
    await adminClient
      .from("utilisateurs")
      .select("role")
      .eq("id", requester.id)
      .single();

  if (requesterProfilError || !requesterProfil) {
    return NextResponse.json(
      { error: "Impossible de vérifier le rôle du compte connecté." },
      { status: 403 },
    );
  }

  if (requesterProfil.role !== "admin") {
    return NextResponse.json(
      { error: "Accès réservé aux administrateurs." },
      { status: 403 },
    );
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
    });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Impossible de créer le compte Auth." },
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
    return NextResponse.json(
      {
        error: `Impossible de créer le profil applicatif: ${profileError.message}`,
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
      return NextResponse.json(
        {
          error:
            "Compte créé, mais impossible d'associer les sites. Corrigez depuis la gestion des associations.",
        },
        { status: 207 },
      );
    }
  }

  return NextResponse.json(
    { ok: true, userId: created.user.id },
    { status: 201 },
  );
}

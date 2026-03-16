import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { User, UserRole } from "@/types";

function normalizeUserRole(role: string | null | undefined): UserRole {
  const normalized = (role ?? "")
    .toLowerCase()
    .trim()
    .replace(/[éèêë]/g, "e");

  if (normalized === "admin") return "admin";
  if (normalized === "cc") return "cc";
  if (normalized === "cca") return "cca";
  if (normalized === "rp") return "rp";
  if (normalized === "equipier") return "equipier";
  return "equipier";
}

async function getAdminClientFromRequest(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missingEnvVars = [
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
  ].filter((value): value is string => Boolean(value));

  if (missingEnvVars.length > 0) {
    return {
      errorResponse: NextResponse.json(
        {
          error: `Configuration serveur manquante: ${missingEnvVars.join(", ")}.`,
        },
        { status: 500 },
      ),
      adminClient: null,
    };
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
    return {
      errorResponse: NextResponse.json(
        { error: "Token d'authentification manquant." },
        { status: 401 },
      ),
      adminClient: null,
    };
  }

  const {
    data: { user: requester },
    error: requesterError,
  } = await adminClient.auth.getUser(token);

  if (requesterError || !requester) {
    return {
      errorResponse: NextResponse.json(
        { error: "Session invalide." },
        { status: 401 },
      ),
      adminClient: null,
    };
  }

  const { data: requesterProfile, error: requesterProfileError } =
    await adminClient
      .from("utilisateurs")
      .select("role")
      .eq("id", requester.id)
      .maybeSingle();

  if (requesterProfileError) {
    return {
      errorResponse: NextResponse.json(
        { error: "Impossible de vérifier le rôle du compte connecté." },
        { status: 403 },
      ),
      adminClient: null,
    };
  }

  const metadataRole =
    typeof requester.app_metadata?.role === "string"
      ? requester.app_metadata.role.toLowerCase().trim()
      : "";

  const profileRole =
    typeof requesterProfile?.role === "string"
      ? requesterProfile.role.toLowerCase().trim()
      : "";

  if (metadataRole !== "admin" && profileRole !== "admin") {
    return {
      errorResponse: NextResponse.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 },
      ),
      adminClient: null,
    };
  }

  return {
    errorResponse: null,
    adminClient,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAdminClientFromRequest(request);
    if (auth.errorResponse || !auth.adminClient) {
      return auth.errorResponse;
    }

    const { data, error } = await auth.adminClient
      .from("utilisateurs")
      .select(
        "id, nom, prenom, email, role, avatar, utilisateur_sites(site_id)",
      )
      .order("prenom", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: `Impossible de charger les utilisateurs: ${error.message}` },
        { status: 400 },
      );
    }

    const users: User[] = (data ?? []).map((row) => ({
      id: row.id,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      role: normalizeUserRole(row.role),
      avatar: row.avatar ?? undefined,
      siteIds: (row.utilisateur_sites ?? []).map((site) => site.site_id),
    }));

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Erreur serveur GET /api/admin/users/list: ${error.message}`
            : "Erreur serveur inattendue.",
      },
      { status: 500 },
    );
  }
}

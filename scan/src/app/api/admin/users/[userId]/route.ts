import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type RouteContext = {
  params:
    | {
        userId: string;
      }
    | Promise<{
        userId: string;
      }>;
};

async function getUserIdFromContext(context: RouteContext): Promise<string> {
  const params = await context.params;
  const userId = params?.userId;
  return typeof userId === "string" ? userId.trim() : "";
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
      requesterId: null,
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
      requesterId: null,
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
      requesterId: null,
    };
  }

  const { data: requesterProfile, error: requesterProfileError } =
    await adminClient
      .from("utilisateurs")
      .select("nom, prenom, email, role")
      .eq("id", requester.id)
      .maybeSingle();

  if (requesterProfileError) {
    return {
      errorResponse: NextResponse.json(
        { error: "Impossible de vérifier le rôle du compte connecté." },
        { status: 403 },
      ),
      adminClient: null,
      requesterId: null,
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

  const isAdminByMetadata = metadataRole === "admin";
  const isAdminByProfile = profileRole === "admin";

  if (!isAdminByMetadata && !isAdminByProfile) {
    return {
      errorResponse: NextResponse.json(
        { error: "Accès réservé aux administrateurs." },
        { status: 403 },
      ),
      adminClient: null,
      requesterId: null,
    };
  }

  return {
    errorResponse: null,
    adminClient,
    requesterId: requester.id,
  };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAdminClientFromRequest(request);
    if (auth.errorResponse || !auth.adminClient) {
      return (
        auth.errorResponse ??
        NextResponse.json(
          { error: "Impossible d'initialiser le client administrateur." },
          { status: 500 },
        )
      );
    }

    const userId = await getUserIdFromContext(context);
    if (!userId) {
      return NextResponse.json(
        { error: "Identifiant utilisateur manquant." },
        { status: 400 },
      );
    }

    let payload: { siteIds?: string[] };
    try {
      payload = (await request.json()) as { siteIds?: string[] };
    } catch {
      return NextResponse.json(
        { error: "Corps de requête invalide." },
        { status: 400 },
      );
    }

    const siteIds = Array.isArray(payload.siteIds)
      ? payload.siteIds.filter(
          (id) => typeof id === "string" && id.trim().length > 0,
        )
      : [];

    const { error: deleteError } = await auth.adminClient
      .from("utilisateur_sites")
      .delete()
      .eq("utilisateur_id", userId);

    if (deleteError) {
      return NextResponse.json(
        {
          error: `Impossible de supprimer les accès existants: ${deleteError.message}`,
        },
        { status: 400 },
      );
    }

    if (siteIds.length > 0) {
      const rows = siteIds.map((siteId) => ({
        utilisateur_id: userId,
        site_id: siteId,
      }));

      const { error: insertError } = await auth.adminClient
        .from("utilisateur_sites")
        .upsert(rows, { onConflict: "utilisateur_id,site_id" });

      if (insertError) {
        return NextResponse.json(
          {
            error: `Impossible de mettre à jour les accès site: ${insertError.message}`,
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Erreur serveur PATCH /api/admin/users/[userId]: ${error.message}`
            : "Erreur serveur inattendue.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAdminClientFromRequest(request);
    if (auth.errorResponse || !auth.adminClient || !auth.requesterId) {
      return (
        auth.errorResponse ??
        NextResponse.json(
          { error: "Impossible d'initialiser le client administrateur." },
          { status: 500 },
        )
      );
    }

    const userId = await getUserIdFromContext(context);
    if (!userId) {
      return NextResponse.json(
        { error: "Identifiant utilisateur manquant." },
        { status: 400 },
      );
    }

    if (userId === auth.requesterId) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte." },
        { status: 400 },
      );
    }

    const { error } = await auth.adminClient.auth.admin.deleteUser(userId);

    if (error) {
      return NextResponse.json(
        { error: `Impossible de supprimer le compte: ${error.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Erreur serveur DELETE /api/admin/users/[userId]: ${error.message}`
            : "Erreur serveur inattendue.",
      },
      { status: 500 },
    );
  }
}

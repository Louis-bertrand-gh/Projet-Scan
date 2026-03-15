/* ═══════════════════════════════════════════════════════════════════════
 * supabase.ts — Client Supabase singleton
 *
 * Usage: importer `supabase` pour toutes les opérations BDD.
 * Les clés sont lues depuis les variables d'environnement Next.js.
 * ═══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variables d'environnement Supabase manquantes : " +
      "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "(ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) sont requises.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

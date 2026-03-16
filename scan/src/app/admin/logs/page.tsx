"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Database, RefreshCw } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { fetchRecentCaptureLogs, type CaptureSystemLog } from "@/lib/db";

export default function AdminLogsPage() {
  const router = useRouter();
  const { utilisateur } = useApp();
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [logs, setLogs] = useState<CaptureSystemLog[]>([]);
  const [supabaseOk, setSupabaseOk] = useState(false);

  useEffect(() => {
    if (!utilisateur) return;
    if (utilisateur.role !== "admin") {
      router.replace("/");
      return;
    }

    void chargerLogs();
  }, [router, utilisateur]);

  const totalConformes = useMemo(
    () => logs.filter((log) => log.conforme).length,
    [logs],
  );

  async function chargerLogs() {
    try {
      setLoading(true);
      setErreur(null);
      const rows = await fetchRecentCaptureLogs(20);
      setLogs(rows);
      setSupabaseOk(true);
    } catch (e) {
      setSupabaseOk(false);
      setErreur(
        e instanceof Error
          ? e.message
          : "Impossible de charger les logs système.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!utilisateur) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Logs Système</h1>
          <p className="mt-1 text-sm text-muted">
            Monitoring des 20 dernières captures enregistrées.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void chargerLogs();
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-alt transition-colors text-on-surface"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="p-4 border rounded-xl border-border bg-surface">
          <p className="text-xs uppercase tracking-wide text-muted">
            Connexion Supabase
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                supabaseOk ? "bg-success" : "bg-danger"
              }`}
            />
            <p
              className={
                supabaseOk
                  ? "text-success font-medium"
                  : "text-danger font-medium"
              }
            >
              {supabaseOk ? "Connecté" : "Déconnecté"}
            </p>
          </div>
        </div>

        <div className="p-4 border rounded-xl border-border bg-surface">
          <p className="text-xs uppercase tracking-wide text-muted">
            Logs chargés
          </p>
          <p className="mt-2 text-2xl font-bold text-on-surface">
            {logs.length}
          </p>
        </div>

        <div className="p-4 border rounded-xl border-border bg-surface">
          <p className="text-xs uppercase tracking-wide text-muted">
            Captures conformes
          </p>
          <p className="mt-2 text-2xl font-bold text-success">
            {totalConformes}
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
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-on-surface">
            Dernières captures
          </h2>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-sm text-muted">
            Chargement des logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted">
            Aucun log disponible.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-alt text-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Utilisateur</th>
                  <th className="px-4 py-3 text-left">Produit OCR</th>
                  <th className="px-4 py-3 text-left">Produit validé</th>
                  <th className="px-4 py-3 text-left">Confiance OCR</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-border">
                    <td className="px-4 py-3 text-on-surface">
                      {new Date(log.dateCapture).toLocaleString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-on-surface">
                        {log.utilisateurPrenom} {log.utilisateurNom}
                      </p>
                      <p className="text-xs text-muted">
                        {log.utilisateurEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {log.nomProduitOCR}
                    </td>
                    <td className="px-4 py-3 text-on-surface">
                      {log.nomProduitValide}
                    </td>
                    <td className="px-4 py-3 text-on-surface">
                      {typeof log.confianceOCR === "number"
                        ? `${Math.round(log.confianceOCR * 100)}%`
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${
                          log.conforme
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-danger/10 text-danger border-danger/20"
                        }`}
                      >
                        <Database className="w-3.5 h-3.5" />
                        {log.conforme ? "Conforme" : "Non conforme"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

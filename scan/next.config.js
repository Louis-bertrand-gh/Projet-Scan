/** @type {import('next').NextConfig} */
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

const nextConfig = {
  /* ──────────────────────────────────────────────
   * Configuration Next.js pour l'application Scan
   * - PWA-ready : headers de cache et manifest
   * - Export statique optionnel (si NEXT_PUBLIC_STATIC_EXPORT=true)
   * ────────────────────────────────────────────── */
  reactStrictMode: true,
  ...(isStaticExport
    ? {
        output: "export",
        basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
        assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || "",
      }
    : {}),
};

module.exports = nextConfig;

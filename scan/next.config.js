/** @type {import('next').NextConfig} */
const nextConfig = {
  /* ──────────────────────────────────────────────
   * Configuration Next.js pour l'application Scan
   * - PWA-ready : headers de cache et manifest
   * - Export statique pour GitHub Pages
   * ────────────────────────────────────────────── */
  reactStrictMode: true,
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

module.exports = nextConfig;

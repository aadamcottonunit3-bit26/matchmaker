import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/** The Supabase address the browser is allowed to load images from (signed CNIC links, CMS images). */
function supabaseOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "https://*.supabase.co";
  }
}
const sb = supabaseOrigin();

/**
 * Content-Security-Policy. Next.js adds small inline scripts, so script-src needs 'unsafe-inline'
 * (a nonce-based policy is a possible later hardening). Everything else is locked down:
 * no framing, no plugins, forms and base URL only to this site, images/connections only to this site + Supabase.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${sb}`,
  "font-src 'self' data:",
  `connect-src 'self' ${sb}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
];

const nextConfig: NextConfig = {
  // Classic dynamic rendering model: pages that read the session are rendered per request.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
  },
  async headers() {
    const noStore = [
      { key: "Cache-Control", value: "no-store" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      // private pages must never be cached or indexed
      ...["/admin/:path*", "/login", "/forgot-password", "/reset-password", "/auth/:path*", "/my-profile", "/billing"].map(
        (source) => ({ source, headers: noStore })
      ),
    ];
  },
};

export default nextConfig;

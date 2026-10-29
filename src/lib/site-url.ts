import "server-only";
import { headers } from "next/headers";

/**
 * The public address of this website, used for the redirect inside the password-reset email.
 * Order: NEXT_PUBLIC_SITE_URL -> Vercel's production URL -> (development only) the request host.
 * In production the request's Host header is NEVER trusted, so nobody can make the reset email point elsewhere.
 * Returns "" when it cannot be determined (Supabase then falls back to the Site URL set in its dashboard).
 */
export async function siteUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) return `https://${prod.replace(/^https?:\/\//, "")}`;
  if (process.env.NODE_ENV !== "production") {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  }
  return "";
}

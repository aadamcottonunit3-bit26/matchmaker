import "server-only";
import { createHmac } from "crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Shared rate limiting for every serverless instance (the counters live in Postgres, see migration 0008).
 * Keys never contain a plaintext email or IP: they are HMAC-hashed with a server secret first.
 * If the limiter itself is unavailable (for example migration 0008 not applied yet) requests are allowed
 * and an error is logged, so a limiter outage can never lock every user out.
 */
export const TOO_MANY = "Too many attempts. Please wait a while and try again.";

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-only-secret";
}

export function hashId(value: string) {
  return createHmac("sha256", secret()).update(value.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const raw = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  return raw.trim().slice(0, 64) || "unknown";
}

/** true = the request is allowed */
export async function allow(scope: string, id: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
      p_key: `${scope}:${hashId(id)}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] unavailable:", error.code ?? error.message);
      return true;
    }
    return data === true;
  } catch (e) {
    console.error("[rate-limit] unavailable:", e instanceof Error ? e.message : "error");
    return true;
  }
}

/** Convenience: limit by the caller's IP address. */
export async function allowIp(scope: string, limit: number, windowSeconds: number) {
  return allow(`ip:${scope}`, await clientIp(), limit, windowSeconds);
}

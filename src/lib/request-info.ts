import "server-only";
import { headers } from "next/headers";

export async function getRequestInfo() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() || null;
  const ua = h.get("user-agent") ?? "";
  const device = /ipad|tablet/i.test(ua)
    ? "Tablet"
    : /mobi|android|iphone/i.test(ua)
    ? "Mobile"
    : "Desktop";
  return { ip, ua: ua.slice(0, 300), device };
}

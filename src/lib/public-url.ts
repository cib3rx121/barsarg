import { headers } from "next/headers";

/**
 * Origem pública da app (https://dominio.pt) para links e QR codes.
 * Ordem: cabeçalhos do pedido → NEXT_PUBLIC_APP_URL → VERCEL_URL → localhost.
 */
export async function getPublicOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protoHeader = h.get("x-forwarded-proto");
  const proto =
    protoHeader?.split(",")[0]?.trim() ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");

  if (host) {
    return `${proto}://${host}`;
  }

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

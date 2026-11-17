// Revogação de token (RFC 7009) — PÚBLICO, excluído do gate em src/proxy.ts.
// Idempotente e sempre 200, como o RFC manda: responder diferente para token
// desconhecido entregaria ao chamador se aquele token existe.
import { NextResponse } from "next/server"
import { oauthLigado, revogar } from "@/lib/oauth/fluxo"
import { rateLimit } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  if (!oauthLigado()) return NextResponse.json({ error: "not_found" }, { status: 404 })
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon"
  if (!rateLimit(`oauth-revoke:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 429 })
  }
  const texto = await req.text()
  const token = new URLSearchParams(texto).get("token")
  if (token) await revogar(token)
  return new NextResponse(null, { status: 200, headers: { "cache-control": "no-store" } })
}

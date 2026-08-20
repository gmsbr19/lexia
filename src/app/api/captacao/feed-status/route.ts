// GET /api/captacao/feed-status — a tela de Configurações mostra só
// "configurado/não configurado", NUNCA o usuário/senha (ficam só no .env).
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { env } from "@/lib/env"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest(["admin"])
  if (denied) return denied
  return NextResponse.json({ configurado: !!(env.GADS_FEED_USER && env.GADS_FEED_PASS) })
}

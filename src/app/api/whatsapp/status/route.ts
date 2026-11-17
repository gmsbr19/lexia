// GET /api/whatsapp/status — estado da conexão DO USUÁRIO LOGADO (nunca de
// outro: o userId sai da sessão). Leitura, então não passa por runMutation nem
// gera auditoria.
import { NextResponse } from "next/server"
import { AuthError, guardRequest } from "@/lib/auth/session"
import { moduloDesligado, userIdDaSessao } from "@/lib/whatsapp/acesso"
import { getSessaoView } from "@/lib/whatsapp/sessoes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const off = moduloDesligado()
  if (off) return off
  const denied = await guardRequest()
  if (denied) return denied
  try {
    const userId = await userIdDaSessao()
    return NextResponse.json(await getSessaoView(userId))
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    throw e
  }
}

// GET /api/notificacoes — the caller's own notifications (?naoLidas=1 to filter).
import { NextResponse } from "next/server"
import { guardRequest, requireUser } from "@/lib/auth/session"
import { listNotificacoes } from "@/lib/processos/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied
  const user = await requireUser()
  const naoLidas = new URL(req.url).searchParams.get("naoLidas")
  return NextResponse.json(await listNotificacoes(user.email, naoLidas === "1" || naoLidas === "true"))
}

import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { criarLandingPage, listarLandingPages } from "@/lib/captacao/landing-pages"
import { landingPageSchema } from "@/lib/captacao/schemas"
import { runMutation } from "@/lib/finance/api"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest(["admin"])
  if (denied) return denied
  return NextResponse.json(await listarLandingPages())
}

/** POST — devolve `{row, chave}`. A chave em claro só aparece UMA vez, aqui —
 *  nunca mais é recuperável (só rotacionar gera outra). */
export async function POST(req: Request) {
  const body = await req.json()
  return runMutation(() => criarLandingPage(parseBody(landingPageSchema, body)), {
    action: "captacao.landingPage.criar",
    entity: "LandingPage",
    payload: body, // nunca contém a chave — ela só existe no RESULTADO (§7.1)
    roles: ["admin"],
  })
}

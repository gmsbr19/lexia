// GET /api/comercial/campanhas-options — lista enxuta {id,nome,plataforma}
// para pickers (ex.: "Campanha padrão" de uma landing page em Configurações →
// Landing pages). Reusa a query pura já existente; qualquer usuário logado
// pode ler (mesmo padrão de /api/comercial/pipeline).
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getCampanhaOptions } from "@/lib/comercial/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied
  return NextResponse.json(await getCampanhaOptions())
}

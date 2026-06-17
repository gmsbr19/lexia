import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { getAgendaDataset } from "@/lib/agenda/queries"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** GET /api/agenda?de=YYYY-MM-DD&ate=YYYY-MM-DD — eventos + scheduled tarefas + pickers. */
export async function GET(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied

  const url = new URL(req.url)
  const de = url.searchParams.get("de") ?? undefined
  const ate = url.searchParams.get("ate") ?? undefined
  return NextResponse.json(await getAgendaDataset(de, ate))
}

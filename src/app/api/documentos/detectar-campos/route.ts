// POST /api/documentos/detectar-campos { texto, opus? } — AI field detection.
import { NextResponse } from "next/server"
import { z } from "zod"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { readJson } from "@/lib/finance/api"
import { detectarCampos } from "@/lib/documents/detectar-campos"
import { UserError } from "@/lib/errors"
import { log } from "@/lib/log"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({ texto: z.string().max(60_000), opus: z.boolean().optional() })

export async function POST(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied

  const body = await readJson(req)
  const { texto, opus } = parseBody(schema, body)
  const userEmail = await sessionEmail()

  try {
    const campos = await detectarCampos(texto, { opus, userEmail })
    return NextResponse.json({ campos })
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    log.error({ err: e instanceof Error ? e.message : String(e) }, "detectarCampos falhou")
    return NextResponse.json({ error: "Falha ao detectar campos" }, { status: 500 })
  }
}

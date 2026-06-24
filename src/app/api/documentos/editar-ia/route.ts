// POST /api/documentos/editar-ia — LexIA proposes edit ops for the open document.
import { NextResponse } from "next/server"
import { z } from "zod"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { readJson } from "@/lib/finance/api"
import { editarDocIA } from "@/lib/documents/editar-ia"
import { UserError } from "@/lib/errors"
import { log } from "@/lib/log"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  instrucao: z.string().min(1).max(2000),
  texto: z.string().max(60_000).optional().default(""),
  campos: z.array(z.object({ name: z.string().max(60), label: z.string().max(160) })).max(200).optional().default([]),
  valores: z.record(z.string(), z.string()).optional().default({}),
  opus: z.boolean().optional(),
})

export async function POST(req: Request) {
  const denied = await guardRequest()
  if (denied) return denied

  const body = await readJson(req)
  const { instrucao, texto, campos, valores, opus } = parseBody(schema, body)
  const userEmail = await sessionEmail()

  try {
    const ops = await editarDocIA({ instrucao, texto, campos, valores, opus, userEmail })
    return NextResponse.json({ ops })
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    log.error({ err: e instanceof Error ? e.message : String(e) }, "editarDocIA falhou")
    return NextResponse.json({ error: "Falha ao editar com a LexIA" }, { status: 500 })
  }
}

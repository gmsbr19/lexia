// POST /api/documentos/de-template — create a draft Documento from a template.
import { z } from "zod"
import { sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { criarDocumentoDeTemplate } from "@/lib/documentos/mutations"
import { idOpt, idReq, parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  templateId: idReq,
  nome: z.string().max(300).optional(),
  clienteId: idOpt,
  casoId: idOpt,
})

export async function POST(req: Request) {
  const body = await readJson(req)
  const criadoPor = await sessionEmail()
  const input = parseBody(schema, body)
  return runMutation(() => criarDocumentoDeTemplate(input.templateId, input, criadoPor), {
    action: "documento.de_template",
    entity: "Documento",
    payload: body,
  })
}

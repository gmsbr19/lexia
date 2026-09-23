// POST /api/tarefas/[id]/anexos — link (JSON { nome, url }) ou arquivo
// (multipart, campo "arquivo"; até 10 MB, guardado no banco).
import { parseId, readJson, type RouteCtx } from "@/lib/finance/api"
import { UserError } from "@/lib/errors"
import { ANEXO_MAX_BYTES, anexarArquivo, anexarLink } from "@/lib/tarefas/mutations"
import { mutacaoTarefa } from "@/lib/tarefas/rota"
import { anexoLinkSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params
  const multipart = (req.headers.get("content-type") ?? "").includes("multipart/form-data")
  if (!multipart) {
    const body = await readJson(req)
    return mutacaoTarefa(req, { action: "tarefa.anexo", entityId: id, payload: body }, (ator) => {
      const b = parseBody(anexoLinkSchema, body)
      return anexarLink(parseId(id), b.nome, b.url, ator)
    })
  }
  const form = await req.formData().catch(() => null)
  const arq = form?.get("arquivo")
  return mutacaoTarefa(req, { action: "tarefa.anexo", entityId: id }, async (ator) => {
    if (!arq || typeof arq === "string") throw new UserError("Arquivo não enviado")
    if (arq.size > ANEXO_MAX_BYTES) throw new UserError("Arquivo acima de 10 MB")
    const bytes = Buffer.from(await arq.arrayBuffer())
    return anexarArquivo(parseId(id), { nome: arq.name || "arquivo", mimeType: arq.type, bytes }, ator)
  })
}

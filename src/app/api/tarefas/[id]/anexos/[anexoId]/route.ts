// GET    /api/tarefas/[id]/anexos/[anexoId] — baixa o arquivo.
// DELETE /api/tarefas/[id]/anexos/[anexoId] — remove (reversível pelo "Desfazer").
import { NextResponse } from "next/server"
import { guardRequest } from "@/lib/auth/session"
import { parseId } from "@/lib/finance/api"
import { lerAnexo, removerAnexo } from "@/lib/tarefas/mutations"
import { mutacaoTarefa, type RotaAnexo } from "@/lib/tarefas/rota"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: Request, ctx: RotaAnexo) {
  const denied = await guardRequest()
  if (denied) return denied
  const { id, anexoId } = await ctx.params
  const a = await lerAnexo(Number(id), Number(anexoId))
  if (!a) return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 })
  const nome = encodeURIComponent(a.nome)
  return new NextResponse(new Uint8Array(a.bytes), {
    headers: {
      "Content-Type": a.mimeType,
      "Content-Length": String(a.bytes.length),
      "Content-Disposition": `attachment; filename*=UTF-8''${nome}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  })
}

export async function DELETE(req: Request, ctx: RotaAnexo) {
  const { id, anexoId } = await ctx.params
  return mutacaoTarefa(req, { action: "tarefa.anexo", entityId: id }, (ator) =>
    removerAnexo(parseId(id), parseId(anexoId), ator),
  )
}

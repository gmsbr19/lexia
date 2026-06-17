// LexIA chat — read layer. SERVER ONLY. Every query is scoped by the owner's
// e-mail so users only ever see their own conversations.
import { prisma } from "@/lib/db"
import type { LexiaConversaDetail, LexiaConversaRow, LexiaMensagemRow, LexiaMsgRole, UiBlock } from "./types"

function parseBlocks(raw: string | null): UiBlock[] | undefined {
  if (!raw) return undefined
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? (v as UiBlock[]) : undefined
  } catch {
    return undefined
  }
}

export async function listConversas(userEmail: string): Promise<LexiaConversaRow[]> {
  const rows = await prisma.lexiaConversa.findMany({
    where: { userEmail },
    select: {
      id: true,
      titulo: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { mensagens: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  })
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    criadaEm: r.createdAt.toISOString(),
    atualizadaEm: r.updatedAt.toISOString(),
    numMensagens: r._count.mensagens,
  }))
}

export async function getConversa(id: number, userEmail: string): Promise<LexiaConversaDetail | null> {
  const r = await prisma.lexiaConversa.findFirst({
    where: { id, userEmail },
    select: {
      id: true,
      titulo: true,
      createdAt: true,
      updatedAt: true,
      mensagens: {
        select: {
          id: true,
          role: true,
          content: true,
          blocks: true,
          model: true,
          createdAt: true,
          anexos: { select: { nome: true, mimeType: true, tamanho: true }, orderBy: { id: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!r) return null
  const mensagens: LexiaMensagemRow[] = r.mensagens.map((m) => ({
    id: m.id,
    role: m.role as LexiaMsgRole,
    content: m.content,
    criadaEm: m.createdAt.toISOString(),
    blocks: parseBlocks(m.blocks),
    model: m.model,
    anexos: m.anexos.length ? m.anexos : undefined,
  }))
  return {
    id: r.id,
    titulo: r.titulo,
    criadaEm: r.createdAt.toISOString(),
    atualizadaEm: r.updatedAt.toISOString(),
    numMensagens: mensagens.length,
    mensagens,
  }
}

// LexIA chat — write layer + history helpers. SERVER ONLY. The agent loop lives
// in ./agent; this module owns conversation ownership and message persistence.
import type Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { anexoParaBloco } from "./agent/anexos"
import { getAnexoStore } from "./anexos/storage"
import { bytesDeBase64, type AnexoEntrada } from "./anexos/validacao"
import type { MsgMeta, UiBlock } from "./types"

const TITULO_LEN = 60
const HIST_MAX_MSGS = 30
const HIST_MAX_CHARS = 24_000
// Quanto de anexo replicar ao reconstruir o histórico (só o turno de usuário
// mais recente com anexos é reenviado — segura o custo de turnos seguintes).
const HIST_MAX_ANEXO_BYTES = 12 * 1024 * 1024

export async function ownConversa(id: number, userEmail: string) {
  const conversa = await prisma.lexiaConversa.findFirst({ where: { id, userEmail }, select: { id: true } })
  if (!conversa) throw new UserError("Conversa não encontrada")
  return conversa
}

export async function criarConversa(userEmail: string, titulo?: string | null) {
  return prisma.lexiaConversa.create({
    data: { userEmail, titulo: titulo?.trim() || null },
    select: { id: true, titulo: true },
  })
}

/** Chip de entidade no histórico (Fase 7/8): guarda a ÚLTIMA menção "@" do
 * turno — best-effort, chamado fire-and-forget (nunca deve quebrar o turno). */
export async function atualizarContextoConversa(
  id: number,
  entidade: { tipo: string; id: number; nome: string; rota: string },
): Promise<void> {
  await prisma.lexiaConversa.update({ where: { id }, data: { contexto: JSON.stringify(entidade) } })
}

export async function renomearConversa(id: number, userEmail: string, titulo: string) {
  await ownConversa(id, userEmail)
  return prisma.lexiaConversa.update({
    where: { id },
    data: { titulo: titulo.trim().slice(0, 200) || null },
    select: { id: true, titulo: true },
  })
}

/** Fixa/desafixa uma conversa no topo do histórico (Histórico v2, Fase 8). */
export async function fixarConversa(id: number, userEmail: string, fixada: boolean) {
  await ownConversa(id, userEmail)
  return prisma.lexiaConversa.update({ where: { id }, data: { fixada }, select: { id: true, fixada: true } })
}

export async function excluirConversa(id: number, userEmail: string) {
  await ownConversa(id, userEmail)
  await prisma.lexiaConversa.delete({ where: { id } }) // mensagens + ações cascade
  return { id }
}

/** Resolve the target conversa, creating one (titled from the first message) when none was given. */
export async function ensureConversa(userEmail: string, conversaId: number | null, primeira: string): Promise<number> {
  if (conversaId) {
    await ownConversa(conversaId, userEmail)
    return conversaId
  }
  const nova = await criarConversa(userEmail, primeira.slice(0, TITULO_LEN))
  return nova.id
}

export async function persistUserMsg(conversaId: number, content: string, anexos?: AnexoEntrada[]) {
  const row = await prisma.lexiaMensagem.create({
    data: { conversaId, role: "user", content },
    select: { id: true, createdAt: true },
  })
  if (anexos && anexos.length) {
    const store = getAnexoStore()
    for (const a of anexos) {
      const guardado = await store.salvar(a)
      await prisma.lexiaAnexo.create({
        data: {
          mensagemId: row.id,
          nome: a.nome,
          mimeType: a.mimeType,
          tamanho: bytesDeBase64(a.dataBase64),
          storage: guardado.storage,
          data: guardado.data,
          ref: guardado.ref,
        },
      })
    }
  }
  return row
}

export async function persistAssistantMsg(
  conversaId: number,
  data: { text: string; blocks: UiBlock[]; model: string; inputTokens: number; outputTokens: number; meta?: MsgMeta },
) {
  const content = data.text.trim() || resumoBlocks(data.blocks)
  const row = await prisma.lexiaMensagem.create({
    data: {
      conversaId,
      role: "assistant",
      content,
      blocks: JSON.stringify(data.blocks),
      model: data.model,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      meta: data.meta ? JSON.stringify(data.meta) : undefined,
    },
    select: { id: true, createdAt: true },
  })
  await prisma.lexiaConversa.update({ where: { id: conversaId }, data: { updatedAt: new Date() } })
  return row
}

/** A textual stand-in for an assistant turn that produced no prose (cards/tools only). */
function resumoBlocks(blocks: UiBlock[]): string {
  for (const b of blocks) {
    if (b.type === "confirm") return `(propôs: ${b.resumo})`
    if (b.type === "notice") return b.text
    if (b.type === "navigate") return `(abriu ${b.rota})`
  }
  return "(ação realizada)"
}

/**
 * Editar pergunta / RetryMenu (Fase 5): descarta a mensagem `mensagemId` (deve
 * ser do usuário, dona da conversa) e TUDO que veio depois — o chamador
 * reenvia como um turno novo. Expira (não apaga) as ações pendentes criadas a
 * partir dali, já que o cartão de confirmação que as mostrava desapareceu.
 */
export async function truncarConversaDesde(conversaId: number, userEmail: string, mensagemId: number): Promise<void> {
  await ownConversa(conversaId, userEmail)
  const ancora = await prisma.lexiaMensagem.findFirst({
    where: { id: mensagemId, conversaId, role: "user" },
    select: { id: true, createdAt: true },
  })
  if (!ancora) throw new UserError("Mensagem não encontrada")
  await prisma.$transaction([
    prisma.lexiaAcaoPendente.updateMany({
      where: { conversaId, status: "pendente", createdAt: { gte: ancora.createdAt } },
      data: { status: "expirada", resolvedAt: new Date() },
    }),
    prisma.lexiaMensagem.deleteMany({ where: { conversaId, id: { gte: mensagemId } } }),
  ])
}

/** Registra 👍/👎 numa resposta da IA (AiActionsBar). Só o dono da conversa pode marcar. */
export async function marcarFeedback(mensagemId: number, userEmail: string, feedback: "up" | "down" | null) {
  const { count } = await prisma.lexiaMensagem.updateMany({
    where: { id: mensagemId, role: "assistant", conversa: { userEmail } },
    data: { feedback },
  })
  if (count === 0) throw new UserError("Mensagem não encontrada")
  return { id: mensagemId, feedback }
}

/** Model used on the conversa's most recent assistant turn (resume stickiness). */
export async function ultimoModelo(conversaId: number): Promise<string | null> {
  const r = await prisma.lexiaMensagem.findFirst({
    where: { conversaId, role: "assistant", model: { not: null } },
    select: { model: true },
    orderBy: { createdAt: "desc" },
  })
  return r?.model ?? null
}

/** Flip a confirmation card's status (in the stored assistant blocks) after the user decides. */
export async function marcarCartao(
  conversaId: number,
  acaoId: number,
  status: "confirmada" | "recusada" | "expirada",
): Promise<void> {
  const rows = await prisma.lexiaMensagem.findMany({
    where: { conversaId, role: "assistant", blocks: { not: null } },
    select: { id: true, blocks: true },
  })
  for (const r of rows) {
    let arr: UiBlock[]
    try {
      arr = JSON.parse(r.blocks ?? "[]")
    } catch {
      continue
    }
    let changed = false
    for (const b of arr) {
      if (b.type === "confirm" && b.acaoId === acaoId) {
        b.status = status
        changed = true
      }
    }
    if (changed) {
      await prisma.lexiaMensagem.update({ where: { id: r.id }, data: { blocks: JSON.stringify(arr) } })
      return
    }
  }
}

/** Flip a choice card's status (in the stored assistant blocks) after the user
 * answers/expires — a "pergunta" analog of marcarCartao (Fase 6, D3). */
export async function marcarEscolha(
  conversaId: number,
  acaoId: number,
  status: "respondida" | "expirada",
  resposta?: { selecionadas: string[]; outro?: string },
): Promise<void> {
  const rows = await prisma.lexiaMensagem.findMany({
    where: { conversaId, role: "assistant", blocks: { not: null } },
    select: { id: true, blocks: true },
  })
  for (const r of rows) {
    let arr: UiBlock[]
    try {
      arr = JSON.parse(r.blocks ?? "[]")
    } catch {
      continue
    }
    let changed = false
    for (const b of arr) {
      if (b.type === "choice" && b.acaoId === acaoId) {
        b.status = status
        if (resposta) b.resposta = resposta
        changed = true
      }
    }
    if (changed) {
      await prisma.lexiaMensagem.update({ where: { id: r.id }, data: { blocks: JSON.stringify(arr) } })
      return
    }
  }
}

/**
 * Build the prior-turns message array for the API (text-only — past tool
 * exchanges are summarized by the assistant text, not replayed) and report the
 * model used on the last assistant turn (for routing stickiness).
 */
export async function carregarHistorico(
  conversaId: number,
): Promise<{ messages: Anthropic.MessageParam[]; lastModel: string | null }> {
  const rows = await prisma.lexiaMensagem.findMany({
    where: { conversaId },
    select: { id: true, role: true, content: true, model: true, _count: { select: { anexos: true } } },
    orderBy: { createdAt: "desc" },
    take: HIST_MAX_MSGS,
  })
  rows.reverse()

  const messages: Anthropic.MessageParam[] = []
  let chars = 0
  let lastModel: string | null = null
  // id da mensagem de usuário (mais recente) com anexos que entrou na janela,
  // e a posição dela no array — para reanexar os blocos depois.
  let anexoMsgId: number | null = null
  let anexoIndex = -1
  for (const r of rows) {
    if (r.role === "assistant" && r.model) lastModel = r.model
    const comAnexos = r.role === "user" && r._count.anexos > 0
    const text = r.content.trim() || (comAnexos ? "(documento anexado)" : "")
    if (!text) continue
    chars += text.length
    if (chars > HIST_MAX_CHARS) continue
    if (comAnexos) {
      anexoMsgId = r.id
      anexoIndex = messages.length
    }
    messages.push({ role: r.role === "user" ? "user" : "assistant", content: text })
  }

  // Reanexa os arquivos do último turno de usuário (mantém follow-ups que ainda
  // dependem do documento, sem reenviar anexos de todos os turnos).
  if (anexoMsgId != null && anexoIndex >= 0) {
    const anexos = await prisma.lexiaAnexo.findMany({
      where: { mensagemId: anexoMsgId },
      select: { mimeType: true, storage: true, data: true, ref: true },
      orderBy: { id: "asc" },
    })
    const store = getAnexoStore()
    const blocos: Anthropic.ContentBlockParam[] = []
    let bytes = 0
    for (const a of anexos) {
      let base64: string
      try {
        base64 = await store.carregar(a)
      } catch {
        continue // anexo indisponível (ex.: storage externo) — segue text-only
      }
      bytes += bytesDeBase64(base64)
      if (bytes > HIST_MAX_ANEXO_BYTES) break
      blocos.push(anexoParaBloco(a.mimeType, base64))
    }
    if (blocos.length) {
      const msg = messages[anexoIndex]
      messages[anexoIndex] = { role: "user", content: [{ type: "text", text: msg.content as string }, ...blocos] }
    }
  }

  return { messages, lastModel }
}

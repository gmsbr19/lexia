// Serviço central de notificações — ÚNICO ponto de escrita. SERVER ONLY.
// Usado pelo cron (gerarNotificacoes), pelos triggers de evento dos módulos e
// pela ferramenta de debug admin. Três caminhos de gravação:
//   • dedupeKey (cron)  → cria só se a chave ainda não existir (idempotente);
//   • grupoKey (evento) → agrega numa linha não-lida recente (anti-spam);
//   • simples (evento)  → sempre cria.
// Toda criação/atualização in-app é publicada no bus (→ SSE → toast ao vivo) e,
// conforme as preferências do destinatário, dispara um e-mail best-effort.
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { emitNotificacao } from "./bus"
import { enviarEmailNotificacao } from "./email/enviar"
import { linkParaNotificacao } from "./links"
import { toRow } from "./map"
import { getPrefs, permiteApp, permiteEmail } from "./preferencias"
import type { Modulo, NotificacaoRow, Prioridade } from "./types"

export interface CriarNotificacaoInput {
  userEmail: string
  tipo: string
  mensagem: string
  modulo?: Modulo | null
  prioridade?: Prioridade
  refTipo?: string | null
  refId?: number | null
  /** deep-link pronto; se ausente, é derivado de (modulo, refTipo, refId, processoId). */
  link?: string | null
  actorEmail?: string | null
  /** cron: chave determinística → cria só se não existir (idempotência). */
  dedupeKey?: string | null
  /** eventos repetidos → agrega numa linha não-lida recente (anti-spam). */
  grupoKey?: string | null
  /** processoId p/ montar o deep-link de prazo quando `link` não vier pronto. */
  processoId?: number | null
  /** debug/simulador: força o e-mail mesmo sem opt-in nas preferências. */
  forcarEmail?: boolean
  /** corpo HTML rico do e-mail (ex.: texto do comentário); ausente → e-mail fino padrão. */
  emailCorpoHtml?: string | null
  /** rótulo do CTA do e-mail (default "Abrir no LexIA"). */
  emailCtaLabel?: string | null
}

// Janela de agrupamento: só agrega com uma linha não-lida criada nas últimas 6h.
const COALESCE_JANELA_MS = 6 * 60 * 60 * 1000

// Serializa o coalesce por (userEmail|grupoKey): o find+create/update não é atômico
// e dois triggers concorrentes com a mesma chave criariam linhas duplicadas em vez
// de agregar (TOCTOU). Lock em processo — basta no deploy single-server.
const grupoLocks = new Map<string, Promise<void>>()
async function comLockGrupo<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = grupoLocks.get(key) ?? Promise.resolve()
  let liberar!: () => void
  const tail = prev.then(() => new Promise<void>((r) => (liberar = r)))
  grupoLocks.set(key, tail)
  await prev.catch(() => {})
  try {
    return await fn()
  } finally {
    liberar()
    if (grupoLocks.get(key) === tail) grupoLocks.delete(key)
  }
}

const SELECT = {
  id: true,
  tipo: true,
  modulo: true,
  prioridade: true,
  refTipo: true,
  refId: true,
  mensagem: true,
  link: true,
  actorEmail: true,
  contador: true,
  lida: true,
  createdAt: true,
} satisfies Prisma.NotificacaoSelect

/**
 * Cria (ou atualiza, por dedupe/grupo) UMA notificação para um destinatário.
 * Retorna a linha criada/atualizada, ou `null` quando o dedupe achou uma
 * existente (cron idempotente) ou o canal in-app está silenciado.
 */
export async function criarNotificacao(input: CriarNotificacaoInput): Promise<NotificacaoRow | null> {
  const prioridade: Prioridade = input.prioridade ?? "normal"
  const modulo = input.modulo ?? null
  const link =
    input.link ?? linkParaNotificacao(modulo, input.refTipo ?? null, input.refId ?? null, { processoId: input.processoId })

  const prefs = await getPrefs(input.userEmail)
  const wantApp = permiteApp(prefs, modulo)
  const wantEmail = input.forcarEmail === true || permiteEmail(prefs, modulo, prioridade)

  // Persistimos quando o usuário quer in-app, OU há dedupeKey (cron, âncora de
  // idempotência), OU há grupoKey (âncora do anti-spam de e-mail / coalesce) —
  // senão um módulo com app mudo + e-mail ligado reenviaria e-mail a cada evento.
  const persistir = wantApp || !!input.dedupeKey || !!input.grupoKey

  const dadosBase = {
    userEmail: input.userEmail,
    tipo: input.tipo,
    modulo,
    prioridade,
    refTipo: input.refTipo ?? null,
    refId: input.refId ?? null,
    mensagem: input.mensagem,
    link,
    actorEmail: input.actorEmail ?? null,
  }

  let row: NotificacaoRow | null = null
  let coalesceu = false
  let primeiraDoGrupo = true // controla o anti-spam do e-mail

  if (persistir) {
    if (input.dedupeKey) {
      const existing = await prisma.notificacao.findUnique({
        where: { dedupeKey: input.dedupeKey },
        select: { id: true },
      })
      if (existing) return null // cron já criou essa janela — nada a fazer (sem e-mail)
      try {
        const created = await prisma.notificacao.create({
          data: { ...dadosBase, dedupeKey: input.dedupeKey },
          select: SELECT,
        })
        row = toRow(created)
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return null // corrida
        throw e
      }
    } else if (input.grupoKey) {
      const grupoKey = input.grupoKey
      await comLockGrupo(`${input.userEmail}|${grupoKey}`, async () => {
        const desde = new Date(Date.now() - COALESCE_JANELA_MS)
        const recente = await prisma.notificacao.findFirst({
          where: { userEmail: input.userEmail, grupoKey, lida: false, createdAt: { gte: desde } },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
        if (recente) {
          coalesceu = true
          primeiraDoGrupo = false
          const updated = await prisma.notificacao.update({
            where: { id: recente.id },
            data: {
              contador: { increment: 1 },
              mensagem: input.mensagem,
              link,
              prioridade,
              actorEmail: input.actorEmail ?? null,
              createdAt: new Date(),
            },
            select: SELECT,
          })
          row = toRow(updated)
        } else {
          const created = await prisma.notificacao.create({
            data: { ...dadosBase, grupoKey },
            select: SELECT,
          })
          row = toRow(created)
        }
      })
    } else {
      const created = await prisma.notificacao.create({ data: dadosBase, select: SELECT })
      row = toRow(created)
    }

    // Push em tempo real só quando o usuário quer in-app (cron+app-mudo persiste mas não toca).
    if (wantApp && row) {
      emitNotificacao(input.userEmail, { kind: coalesceu ? "atualizada" : "nova", notif: row })
    }
  }

  // E-mail best-effort, fora do caminho crítico, só na 1ª ocorrência de um grupo.
  if (wantEmail && primeiraDoGrupo) {
    void enviarEmailNotificacao({
      to: input.userEmail,
      mensagem: input.mensagem,
      modulo,
      prioridade,
      link,
      corpoHtml: input.emailCorpoHtml ?? null,
      ctaLabel: input.emailCtaLabel ?? null,
    })
  }

  return row
}

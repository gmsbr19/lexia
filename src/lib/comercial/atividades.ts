// Timeline de atividades de uma Oportunidade (Lead) — registro manual de
// ligação/e-mail/reunião/WhatsApp/nota (o WhatsApp é click-to-chat via wa.me
// no cliente; aqui é sempre um registro manual, nunca sincronizado por API).
// SERVER ONLY. Leitura/exclusão são ESCOPADAS ao `leadId` (anti-IDOR: um id de
// atividade de outra oportunidade não é atingível pela URL desta). Espelha
// tarefas/comentarios.ts.
import { avaliarRegrasPerda, contarToques, parseSinais, proximoToque } from "@/lib/comercial/score"
import { prisma } from "@/lib/db"
import { ForbiddenError, UserError } from "@/lib/errors"
import { log } from "@/lib/log"
import { notificarLeadPerdido } from "@/lib/notificacoes/triggers"
import { userIdPorEmail, usuarioPorEmail } from "@/lib/notificacoes/recipients"
import { getFollowupConfig, type FollowupConfig } from "@/lib/settings"
import { marcarPerdido } from "./mutations"

const CANAL_LABEL: Record<string, string> = { ligacao: "ligação", whatsapp: "WhatsApp", email: "e-mail", reuniao: "reunião", outro: "outro canal" }
const MOTIVO_CATEGORIA_AUTO: Record<"sem_resposta" | "desinteresse", { motivo: string; categoria: string }> = {
  sem_resposta: { motivo: "3 toques sem resposta consecutivos", categoria: "sem_retorno" },
  desinteresse: { motivo: "Toques acumulados sem avanço (frio)", categoria: "desinteresse" },
}

/** Avalia as regras automáticas de perda (score.ts avaliarRegrasPerda) para UM
 *  lead já carregado + sua timeline (asc), e aplica marcarPerdido + nota de
 *  sistema na timeline + notificação quando disparar. Usado tanto pelo
 *  caminho síncrono (criarAtividade, abaixo) quanto pela varredura catch-up
 *  do cron (processos/notificacoes.ts) — mesma regra, duas entradas.
 *  Retorna true quando o lead foi marcado perdido. */
export async function avaliarEAplicarPerdaAutomatica(
  lead: { id: number; nome: string; responsavelUserId: number | null },
  atividadesAsc: { resultado: string | null; ocorreuEm: string }[],
  regras: FollowupConfig["regrasPerda"],
): Promise<boolean> {
  const perda = avaliarRegrasPerda(atividadesAsc, regras)
  if (!perda) return false
  const { motivo, categoria } = MOTIVO_CATEGORIA_AUTO[perda.motivo]
  await marcarPerdido(lead.id, motivo, categoria, { automatico: true })
  await prisma.oportunidadeAtividade.create({ data: { leadId: lead.id, tipo: "nota", descricao: `Perdido automaticamente — ${motivo}.` } })
  void notificarLeadPerdido({ leadId: lead.id, nome: lead.nome, motivo, responsavelUserId: lead.responsavelUserId })
  return true
}

const TIPOS = ["ligacao", "email", "reuniao", "whatsapp", "nota", "outro"]

export interface AtividadeRow {
  id: number
  tipo: string
  titulo: string | null
  descricao: string | null
  resultado: string | null
  toqueNumero: number | null
  sinais: string[]
  ocorreuEm: string // ISO
  autorId: number | null
  autor: string | null
  createdAt: string
}

const SELECT = {
  id: true,
  tipo: true,
  titulo: true,
  descricao: true,
  resultado: true,
  toqueNumero: true,
  sinais: true,
  ocorreuEm: true,
  autorId: true,
  autor: { select: { nome: true } },
  createdAt: true,
} as const

type Row = {
  id: number
  tipo: string
  titulo: string | null
  descricao: string | null
  resultado: string | null
  toqueNumero: number | null
  sinais: string
  ocorreuEm: Date
  autorId: number | null
  autor: { nome: string } | null
  createdAt: Date
}

function toRow(r: Row): AtividadeRow {
  return {
    id: r.id,
    tipo: r.tipo,
    titulo: r.titulo,
    descricao: r.descricao,
    resultado: r.resultado,
    toqueNumero: r.toqueNumero,
    sinais: parseSinais(r.sinais),
    ocorreuEm: r.ocorreuEm.toISOString(),
    autorId: r.autorId,
    autor: r.autor?.nome ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}

function toDate(v: string | null | undefined): Date | null {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Mais recente primeiro (timeline). */
export async function listAtividades(leadId: number): Promise<AtividadeRow[]> {
  const rows = await prisma.oportunidadeAtividade.findMany({
    where: { leadId },
    orderBy: { ocorreuEm: "desc" },
    select: SELECT,
  })
  return rows.map(toRow)
}

const RESULTADOS = ["sem_resposta", "fria", "positiva"]

export interface AtividadeInput {
  tipo: string
  titulo?: string | null
  descricao?: string | null
  resultado?: string | null
  toqueNumero?: number | null
  sinais?: string[]
  ocorreuEm?: string | null
}

export async function criarAtividade(
  leadId: number,
  input: AtividadeInput,
  actorEmail?: string | null,
): Promise<AtividadeRow> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } })
  if (!lead) throw new UserError("Oportunidade não encontrada")
  const autorId = await userIdPorEmail(actorEmail)
  const criado = await prisma.oportunidadeAtividade.create({
    data: {
      leadId,
      tipo: TIPOS.includes(input.tipo) ? input.tipo : "outro",
      titulo: input.titulo?.trim() || null,
      descricao: input.descricao?.trim() || null,
      resultado: input.resultado && RESULTADOS.includes(input.resultado) ? input.resultado : null,
      toqueNumero: typeof input.toqueNumero === "number" ? input.toqueNumero : null,
      sinais: JSON.stringify(input.sinais ?? []),
      ocorreuEm: toDate(input.ocorreuEm) ?? new Date(),
      autorId,
    },
    select: SELECT,
  })

  // Automação de follow-up: melhor-esforço — uma falha aqui nunca desfaz a
  // atividade já persistida (o usuário só perde o avanço automático da
  // cadência/regra de perda desta rodada; o cron faz o catch-up).
  try {
    const leadFull = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, nome: true, etapa: true, dataEntrada: true, responsavelUserId: true },
    })
    if (leadFull && leadFull.etapa !== "ganho" && leadFull.etapa !== "perdido") {
      const timeline = await prisma.oportunidadeAtividade.findMany({
        where: { leadId },
        orderBy: { ocorreuEm: "asc" },
        select: { resultado: true, toqueNumero: true, ocorreuEm: true },
      })
      const followupCfg = await getFollowupConfig()
      const perdeu = await avaliarEAplicarPerdaAutomatica(
        leadFull,
        timeline.map((a) => ({ resultado: a.resultado, ocorreuEm: a.ocorreuEm.toISOString() })),
        followupCfg.regrasPerda,
      )
      // Sugestão de cadência (D3 — sempre sobrescreve): só quando ESTA atividade
      // é um toque registrado de propósito (toqueNumero setado), não qualquer nota.
      if (!perdeu && criado.toqueNumero != null) {
        const toquesFeitos = contarToques(timeline.map((a) => ({ toqueNumero: a.toqueNumero })))
        const ancoraISO = (leadFull.dataEntrada ?? new Date()).toISOString()
        const hojeISO = new Date().toISOString().slice(0, 10)
        const proximo = proximoToque(followupCfg.cadencia, toquesFeitos, ancoraISO, hojeISO)
        if (proximo) {
          await prisma.lead.update({
            where: { id: leadId },
            data: {
              proximaAcaoEm: new Date(proximo.dataISO),
              proximaAcaoNota: `Toque ${proximo.numero}/${followupCfg.cadencia.length} — ${proximo.canais.map((c) => CANAL_LABEL[c] ?? c).join(" ou ")}`,
            },
          })
        }
      }
    }
  } catch (e) {
    log.error({ leadId, err: e instanceof Error ? e.message : String(e) }, "automação de follow-up falhou")
  }

  return toRow(criado)
}

/** Autor OU gestor (admin/sócio) — os demais não excluem. Hard-delete (a
 *  timeline não tem soft-delete; a oportunidade em si é hard-delete também). */
export async function excluirAtividade(
  leadId: number,
  atividadeId: number,
  actorEmail?: string | null,
): Promise<{ id: number }> {
  const ator = await usuarioPorEmail(actorEmail)
  const row = await prisma.oportunidadeAtividade.findFirst({
    where: { id: atividadeId, leadId },
    select: { id: true, autorId: true },
  })
  if (!row) throw new UserError("Atividade não encontrada")
  const podeGerir = !!ator && (row.autorId === ator.id || ator.role === "admin" || ator.role === "socio")
  if (!podeGerir) throw new ForbiddenError()
  await prisma.oportunidadeAtividade.delete({ where: { id: row.id } })
  return { id: row.id }
}

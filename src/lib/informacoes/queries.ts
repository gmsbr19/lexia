// Informações fixadas — leitura. SERVER ONLY. O autor (e quem fixou/editou) é
// gravado como e-mail; aqui vira o nome do usuário (notas importadas guardam um
// texto qualquer, que é mantido).
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import type { Ancora, InformacaoRow } from "./core"

type Tx = Prisma.TransactionClient | typeof prisma

export interface Pessoas {
  id: (email: string | null | undefined) => number | null
  nome: (email: string | null | undefined) => string | null
}

export async function pessoasPorEmail(tx: Tx = prisma): Promise<Pessoas> {
  const us = await tx.user.findMany({ select: { id: true, email: true, nome: true } })
  const m = new Map(us.map((u) => [u.email.toLowerCase(), u]))
  const get = (e: string | null | undefined) => (e ? m.get(e.toLowerCase()) : undefined)
  return {
    id: (e) => get(e)?.id ?? null,
    nome: (e) => (e ? (get(e)?.nome ?? e) : null),
  }
}

export const INFO_SELECT = {
  id: true,
  autor: true,
  conteudo: true,
  fixado: true,
  fixadoEm: true,
  fixadoPor: true,
  editadoEm: true,
  editadoPor: true,
  origemTarefaId: true,
  createdAt: true,
} as const

type InfoSel = Prisma.AnotacaoGetPayload<{ select: typeof INFO_SELECT }>

export function toInformacao(r: InfoSel, fonte: InformacaoRow["fonte"], ancora: Ancora, p: Pessoas): InformacaoRow {
  return {
    fonte,
    id: r.id,
    ancora,
    conteudo: r.conteudo,
    autor: p.nome(r.autor) ?? "—",
    autorId: p.id(r.autor),
    criadaEm: r.createdAt.toISOString(),
    editadaEm: r.editadoEm?.toISOString() ?? null,
    editadaPor: p.nome(r.editadoPor),
    fixado: r.fixado,
    fixadaEm: r.fixado ? (r.fixadoEm?.toISOString() ?? null) : null,
    fixadaPor: r.fixado ? p.nome(r.fixadoPor) : null,
    origemTarefaId: r.origemTarefaId,
  }
}

/** Âncora de uma Anotacao (caso ou projeto interno); null = nota de processo. */
export function ancoraDaAnotacao(r: { casoId: number | null; projetoId: number | null; processoId: number | null }): Ancora | null {
  if (r.processoId != null) return null
  if (r.casoId != null) return { tipo: "caso", id: r.casoId }
  if (r.projetoId != null) return { tipo: "projeto", id: r.projetoId }
  return null
}

/** Filtro das notas de caso/projeto VIVAS que podem ser informações (não as de processo). */
const ANOTACAO_VIVA = {
  excluidoEm: null,
  processoId: null,
  OR: [
    { casoId: { not: null }, caso: { excluidoEm: null } },
    { casoId: null, projetoId: { not: null }, projeto: { excluidoEm: null, casoId: null } },
  ],
} satisfies Prisma.AnotacaoWhereInput

const SEL_ANOTACAO = { ...INFO_SELECT, casoId: true, projetoId: true, processoId: true } as const

/** Todas as fixadas vivas do escritório — o quadro de Tarefas indexa por âncora. */
export async function getFixadas(): Promise<InformacaoRow[]> {
  const [cli, ano, p] = await Promise.all([
    prisma.clienteAnotacao.findMany({
      where: { fixado: true, excluidoEm: null, tipo: "nota" },
      select: { ...INFO_SELECT, clienteId: true },
    }),
    prisma.anotacao.findMany({ where: { ...ANOTACAO_VIVA, fixado: true }, select: SEL_ANOTACAO }),
    pessoasPorEmail(),
  ])
  const out: InformacaoRow[] = cli.map((r) => toInformacao(r, "cliente", { tipo: "cliente", id: r.clienteId }, p))
  for (const r of ano) {
    const a = ancoraDaAnotacao(r)
    if (a) out.push(toInformacao(r, "anotacao", a, p))
  }
  return out
}

/** Uma informação viva (devolvida pelas mutações para a tela). */
export async function getInformacao(fonte: InformacaoRow["fonte"], id: number): Promise<InformacaoRow | null> {
  const p = await pessoasPorEmail()
  if (fonte === "cliente") {
    const r = await prisma.clienteAnotacao.findFirst({ where: { id, excluidoEm: null }, select: { ...INFO_SELECT, clienteId: true } })
    return r ? toInformacao(r, "cliente", { tipo: "cliente", id: r.clienteId }, p) : null
  }
  const r = await prisma.anotacao.findFirst({ where: { id, excluidoEm: null }, select: SEL_ANOTACAO })
  const a = r ? ancoraDaAnotacao(r) : null
  return r && a ? toInformacao(r, "anotacao", a, p) : null
}

/** Fixadas antes, depois a mais recente. */
const ORDEM = [{ fixado: "desc" as const }, { createdAt: "desc" as const }]

/** Notas (fixadas ou não) de uma âncora — ficha do cliente/caso. Cliente: só `tipo='nota'`. */
export async function getInformacoes(ancora: Ancora, opts: { soFixadas?: boolean } = {}): Promise<InformacaoRow[]> {
  const p = await pessoasPorEmail()
  const fix = opts.soFixadas ? { fixado: true } : {}
  if (ancora.tipo === "cliente") {
    const rows = await prisma.clienteAnotacao.findMany({
      where: { clienteId: ancora.id, excluidoEm: null, tipo: "nota", ...fix },
      select: INFO_SELECT,
      orderBy: ORDEM,
    })
    return rows.map((r) => toInformacao(r, "cliente", ancora, p))
  }
  const rows = await prisma.anotacao.findMany({
    where: {
      ...(ancora.tipo === "caso" ? { casoId: ancora.id } : { projetoId: ancora.id, casoId: null }),
      processoId: null,
      excluidoEm: null,
      ...fix,
    },
    select: INFO_SELECT,
    orderBy: ORDEM,
  })
  return rows.map((r) => toInformacao(r, "anotacao", ancora, p))
}

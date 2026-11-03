// Casos — executor da conversão dos dados de processo LEGADOS do caso em
// Processos (ver ./legado-core.ts para as regras). SERVER ONLY.
//
// Usado por scripts/converter-casos-processos.ts (uma vez, sobre a base toda) e
// pelo import do Astrea (sobre os casos recém-importados). Idempotente: um caso
// já convertido não tem mais campos legados → "nada". Cada caso roda na sua
// própria transação (um erro não derruba os demais).
// Recebe o PrismaClient por parâmetro (como importAstrea) — assim roda sob tsx
// sem puxar @/lib/db → env.ts.
import type { Prisma, PrismaClient } from "@prisma/client"
import {
  AUTOR_CONVERSAO,
  CAMPOS_LEGADOS,
  planejarConversaoLegado,
  type CasoLegado,
  type PlanoLegado,
  type ProcessoExistente,
} from "./legado-core"

export interface RelatorioConversao {
  analisados: number
  criados: number
  completados: number
  registrados: number
  mantidos: number
  conflitos: { casoId: number; titulo: string; numeroCnj: string; processoId: number; outroCasoId: number }[]
  semCnjValido: { casoId: number; titulo: string; numero: string }[]
  erros: { casoId: number; titulo: string; erro: string }[]
}

const LEGADO_WHERE: Prisma.CasoWhereInput = {
  OR: [
    { numeroProcesso: { not: null } },
    { tribunal: { not: null } },
    { vara: { not: null } },
    { instancia: { not: null } },
    { tipoAcao: { not: null } },
    { valorCausaCents: { gt: 0 } },
    { dataDistribuicao: { not: null } },
  ],
}

const LIMPAR = {
  numeroProcesso: null,
  tribunal: null,
  vara: null,
  instancia: null,
  tipoAcao: null,
  valorCausaCents: null,
  dataDistribuicao: null,
} satisfies Record<(typeof CAMPOS_LEGADOS)[number], null> & Prisma.CasoUncheckedUpdateInput

/**
 * Converte os campos legados em Processos. `casoIds` restringe o universo (import);
 * `dry` só calcula o relatório, sem escrever.
 */
export async function converterDadosProcessuaisLegados(
  prisma: PrismaClient,
  opts: { dry?: boolean; casoIds?: number[] } = {},
): Promise<RelatorioConversao> {
  const rel: RelatorioConversao = {
    analisados: 0, criados: 0, completados: 0, registrados: 0, mantidos: 0, conflitos: [], semCnjValido: [], erros: [],
  }
  const casos = await prisma.caso.findMany({
    where: { AND: [{ excluidoEm: null }, LEGADO_WHERE, ...(opts.casoIds ? [{ id: { in: opts.casoIds } }] : [])] },
    select: {
      id: true, titulo: true, tipo: true, status: true, responsavelUserId: true, numeroProcesso: true, tribunal: true,
      vara: true, instancia: true, tipoAcao: true, valorCausaCents: true, dataDistribuicao: true,
    },
    orderBy: { id: "asc" },
  })
  if (!casos.length) return rel

  // Universo de processos vivos (pequeno): mantido em memória e atualizado a cada
  // criação, para que dois casos com o mesmo CNJ não gerem dois processos.
  const processos: ProcessoExistente[] = await prisma.processo.findMany({
    where: { excluidoEm: null },
    select: {
      id: true, casoId: true, numeroCnj: true, tribunal: true, vara: true, instancia: true, classe: true,
      valorCausaCents: true, dataDistribuicao: true,
    },
  })

  for (const c of casos) {
    rel.analisados++
    const caso: CasoLegado = c
    const plano: PlanoLegado = planejarConversaoLegado(caso, processos)
    try {
      switch (plano.acao) {
        case "nada":
          break
        case "manter":
          rel.mantidos++
          break
        case "conflito":
          rel.conflitos.push({
            casoId: c.id, titulo: c.titulo, numeroCnj: plano.numeroCnj, processoId: plano.processoId, outroCasoId: plano.casoIdDoProcesso,
          })
          break
        case "completar":
          rel.completados++
          if (!opts.dry) {
            await prisma.$transaction([
              ...(Object.keys(plano.patch).length
                ? [prisma.processo.update({ where: { id: plano.processoId }, data: plano.patch })]
                : []),
              prisma.caso.update({ where: { id: c.id }, data: LIMPAR }),
            ])
          }
          break
        case "registrar":
          rel.registrados++
          if (!opts.dry) {
            await prisma.$transaction(async (tx) => {
              const ja = await tx.anotacao.findFirst({
                where: { casoId: c.id, conteudo: plano.anotacaoCaso, excluidoEm: null },
                select: { id: true },
              })
              if (!ja) await tx.anotacao.create({ data: { casoId: c.id, autor: AUTOR_CONVERSAO, conteudo: plano.anotacaoCaso } })
              await tx.caso.update({ where: { id: c.id }, data: LIMPAR })
            })
          }
          break
        case "criar": {
          rel.criados++
          if (plano.anotacaoProcesso) rel.semCnjValido.push({ casoId: c.id, titulo: c.titulo, numero: c.numeroProcesso ?? "" })
          if (opts.dry) {
            // simula a criação para os próximos casos da mesma rodada
            processos.push({ id: -rel.criados, ...plano.processo })
            break
          }
          const criado = await prisma.$transaction(async (tx) => {
            const p = await tx.processo.create({ data: plano.processo })
            if (plano.anotacaoProcesso) {
              await tx.anotacao.create({ data: { processoId: p.id, autor: AUTOR_CONVERSAO, conteudo: plano.anotacaoProcesso } })
            }
            await tx.caso.update({ where: { id: c.id }, data: LIMPAR })
            return p
          })
          processos.push({ ...plano.processo, id: criado.id })
          break
        }
      }
    } catch (e) {
      rel.erros.push({ casoId: c.id, titulo: c.titulo, erro: e instanceof Error ? e.message : String(e) })
    }
  }
  return rel
}

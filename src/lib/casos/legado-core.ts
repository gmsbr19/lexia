// Casos — conversão dos "dados do processo" LEGADOS do caso em Processos. PURE
// (sem prisma) — o executor com banco é ./legado.ts; testes em
// tests/casos-legado.test.ts.
//
// Antes do Processo virar entidade própria, o import do Astrea gravava nº do
// processo, tribunal, vara, instância, tipo de ação, valor da causa e data de
// distribuição DIRETO no Caso. Isso misturava caso (a matéria/o cliente/os
// honorários) com processo (o que corre no tribunal). Este planejador decide,
// caso a caso, o que fazer com esses campos:
//   nada       — o caso não tem nenhum campo legado.
//   manter     — só há campos "não judiciais" num consultivo (ex.: valor): ficam
//                como estão (colunas dormentes; nada é inventado).
//   criar      — vira um Processo novo vinculado ao caso; os campos do caso são limpos.
//   completar  — o caso JÁ tem um processo com o mesmo CNJ: só preenche lacunas
//                desse processo e limpa o caso.
//   conflito   — o mesmo CNJ já está num processo de OUTRO caso: não mexe em nada
//                (vai para o relatório, decisão humana).
//   registrar  — número ausente/fora do padrão CNJ e o caso já tem processo(s):
//                não dá para saber a qual processo pertence → guarda os dados numa
//                anotação do caso e limpa.
// Imports RELATIVOS de propósito: este módulo roda também sob tsx (scripts/import).
import { dadosTribunalCnj } from "../processos/cnj-tribunal"
import { formatarCnj, validarCnj } from "../processos/validacao"
import { casoStatusBucket } from "./status"

export interface CasoLegado {
  id: number
  tipo: string
  status: string | null
  responsavelUserId: number | null
  numeroProcesso: string | null
  tribunal: string | null
  vara: string | null
  instancia: string | null
  tipoAcao: string | null
  valorCausaCents: number | null
  dataDistribuicao: Date | null
}

export interface ProcessoExistente {
  id: number
  casoId: number
  numeroCnj: string | null
  tribunal: string | null
  vara: string | null
  instancia: string | null
  classe: string | null
  valorCausaCents: number
  dataDistribuicao: Date | null
}

export interface NovoProcessoLegado {
  casoId: number
  numeroCnj: string | null
  tribunal: string | null
  uf: string | null
  vara: string | null
  instancia: string | null
  classe: string | null
  valorCausaCents: number
  dataDistribuicao: Date | null
  responsavelUserId: number | null
  status: "ativo" | "suspenso" | "arquivado"
}

export type PatchProcessoLegado = Partial<
  Pick<NovoProcessoLegado, "tribunal" | "vara" | "instancia" | "classe" | "valorCausaCents" | "dataDistribuicao">
>

export type PlanoLegado =
  | { acao: "nada" }
  | { acao: "manter" }
  | { acao: "criar"; processo: NovoProcessoLegado; anotacaoProcesso: string | null }
  | { acao: "completar"; processoId: number; patch: PatchProcessoLegado }
  | { acao: "conflito"; processoId: number; casoIdDoProcesso: number; numeroCnj: string }
  | { acao: "registrar"; anotacaoCaso: string }

/** Campos do Caso que a conversão zera (a coluna fica dormente no schema). */
export const CAMPOS_LEGADOS = [
  "numeroProcesso",
  "tribunal",
  "vara",
  "instancia",
  "tipoAcao",
  "valorCausaCents",
  "dataDistribuicao",
] as const

/** Autor das anotações criadas pela conversão. */
export const AUTOR_CONVERSAO = "Sistema · conversão Astrea"

const txt = (v: string | null | undefined): string | null => {
  const t = (v ?? "").trim()
  return t ? t : null
}
const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "")

export function temDadosLegados(c: CasoLegado): boolean {
  return (
    !!txt(c.numeroProcesso) ||
    !!txt(c.tribunal) ||
    !!txt(c.vara) ||
    !!txt(c.instancia) ||
    !!txt(c.tipoAcao) ||
    (c.valorCausaCents ?? 0) > 0 ||
    c.dataDistribuicao != null
  )
}

/** Há algo que identifique um processo judicial (e não só um valor/tipo)? */
function temMarcaJudicial(c: CasoLegado): boolean {
  return (
    !!txt(c.numeroProcesso) || !!txt(c.tribunal) || !!txt(c.vara) || c.dataDistribuicao != null || c.tipo === "litigio"
  )
}

const brl = (cents: number) =>
  "R$ " +
  (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dataBr = (d: Date) => {
  const iso = d.toISOString().slice(0, 10)
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

/** Texto legível com os dados legados (anotação do caso). */
export function descreverDadosLegados(c: CasoLegado): string {
  const partes: string[] = []
  if (txt(c.numeroProcesso)) partes.push(`Nº ${txt(c.numeroProcesso)}`)
  if (txt(c.tribunal)) partes.push(`Tribunal: ${txt(c.tribunal)}`)
  if (txt(c.vara)) partes.push(`Vara: ${txt(c.vara)}`)
  if (txt(c.instancia)) partes.push(`Instância: ${txt(c.instancia)}`)
  if (txt(c.tipoAcao)) partes.push(`Tipo de ação: ${txt(c.tipoAcao)}`)
  if ((c.valorCausaCents ?? 0) > 0) partes.push(`Valor da causa: ${brl(c.valorCausaCents!)}`)
  if (c.dataDistribuicao) partes.push(`Distribuição: ${dataBr(c.dataDistribuicao)}`)
  return `Dados do processo importados do Astrea (antes ficavam no caso): ${partes.join(" · ")}`
}

function statusProcesso(caso: CasoLegado): NovoProcessoLegado["status"] {
  return casoStatusBucket(caso.status)
}

/**
 * Decide o destino dos campos legados de UM caso.
 * `processos` = processos NÃO excluídos do escritório inteiro que importam para a
 * decisão: os deste caso + qualquer um com o mesmo CNJ (o executor filtra).
 */
export function planejarConversaoLegado(caso: CasoLegado, processos: ProcessoExistente[]): PlanoLegado {
  if (!temDadosLegados(caso)) return { acao: "nada" }
  if (!temMarcaJudicial(caso)) return { acao: "manter" }

  const numero = txt(caso.numeroProcesso)
  const cnjValido = !!numero && validarCnj(numero)

  if (cnjValido) {
    const dig = digits(numero)
    const mesmo = processos.find((p) => digits(p.numeroCnj) === dig)
    if (mesmo && mesmo.casoId !== caso.id) {
      return { acao: "conflito", processoId: mesmo.id, casoIdDoProcesso: mesmo.casoId, numeroCnj: formatarCnj(dig) }
    }
    if (mesmo) {
      const patch: PatchProcessoLegado = {}
      if (!txt(mesmo.tribunal) && txt(caso.tribunal)) patch.tribunal = txt(caso.tribunal)
      if (!txt(mesmo.vara) && txt(caso.vara)) patch.vara = txt(caso.vara)
      if (!txt(mesmo.instancia) && txt(caso.instancia)) patch.instancia = txt(caso.instancia)
      if (!txt(mesmo.classe) && txt(caso.tipoAcao)) patch.classe = txt(caso.tipoAcao)
      if (!mesmo.valorCausaCents && (caso.valorCausaCents ?? 0) > 0) patch.valorCausaCents = caso.valorCausaCents!
      if (!mesmo.dataDistribuicao && caso.dataDistribuicao) patch.dataDistribuicao = caso.dataDistribuicao
      return { acao: "completar", processoId: mesmo.id, patch }
    }
  } else {
    // Sem CNJ válido não há como casar com um processo existente: se o caso já
    // tem processo(s), não arriscamos criar um duplicado — os dados viram nota.
    const doCaso = processos.filter((p) => p.casoId === caso.id)
    if (doCaso.length > 0) return { acao: "registrar", anotacaoCaso: descreverDadosLegados(caso) }
  }

  const derivado = cnjValido ? dadosTribunalCnj(numero!) : { tribunal: null, uf: null }
  return {
    acao: "criar",
    processo: {
      casoId: caso.id,
      numeroCnj: cnjValido ? formatarCnj(digits(numero)) : null,
      tribunal: txt(caso.tribunal) ?? derivado.tribunal,
      uf: derivado.uf,
      vara: txt(caso.vara),
      instancia: txt(caso.instancia),
      classe: txt(caso.tipoAcao),
      valorCausaCents: Math.max(0, caso.valorCausaCents ?? 0),
      dataDistribuicao: caso.dataDistribuicao,
      responsavelUserId: caso.responsavelUserId,
      status: statusProcesso(caso),
    },
    anotacaoProcesso: numero && !cnjValido ? `Número informado no Astrea (fora do padrão CNJ): ${numero}` : null,
  }
}

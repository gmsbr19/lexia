// Tarefas — filtros e ordenação do quadro (puro). Usado pelo cliente (quadro,
// lista, celular) e pela API GET /api/tarefas (mesmos filtros por query string).
// Filtros não ficam salvos entre sessões; a VISÃO (ordenar, direção, agrupar) fica,
// por pessoa (User.tarefasPrefs) — ver lerPreferencias.
import { compareISO } from "@/lib/datas/util"
import { concluidaRecente, faixa, vencida } from "./regras"
import type { TaskRow } from "./types"

export type Escopo = "mine" | "team"
export type FiltroPrazo = "late" | "today" | "week" | "fatal"
export type Ordenacao = "manual" | "due" | "proj" | "owner"
export type Direcao = "asc" | "desc"
export type Agrupamento = "none" | "proj" | "owner" | "group"
export type Visao = "board" | "list" | "flow"

/** Chave de "Sem projeto" na multisseleção de projetos. */
export const SEM_PROJETO = 0

export interface Filtros {
  escopo: Escopo
  projetos: number[] // ids (SEM_PROJETO = sem projeto)
  responsavel: number | null // só vale em "Equipe"
  prazo: FiltroPrazo | null
  ordenar: Ordenacao
  direcao: Direcao // não vale para "manual"
  agrupar: Agrupamento
  visao: Visao
}

export const FILTROS_PADRAO: Filtros = {
  escopo: "team",
  projetos: [],
  responsavel: null,
  prazo: null,
  ordenar: "due",
  direcao: "asc",
  agrupar: "none",
  visao: "board",
}

/** O que fica salvo por pessoa: como ela gosta de ver o quadro. */
export type PrefsQuadro = Pick<Filtros, "ordenar" | "direcao" | "agrupar">

const ORDENACOES: Ordenacao[] = ["manual", "due", "proj", "owner"]
const AGRUPAMENTOS: Agrupamento[] = ["none", "proj", "owner", "group"]

/** JSON salvo (ou qualquer coisa) → preferências válidas; o que não reconhece vira o padrão. */
export function lerPreferencias(raw: unknown): PrefsQuadro {
  let o: Record<string, unknown> = {}
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw)
      if (v && typeof v === "object") o = v as Record<string, unknown>
    } catch {}
  } else if (raw && typeof raw === "object") o = raw as Record<string, unknown>
  return {
    ordenar: ORDENACOES.includes(o.ordenar as Ordenacao) ? (o.ordenar as Ordenacao) : FILTROS_PADRAO.ordenar,
    direcao: o.direcao === "desc" ? "desc" : "asc",
    agrupar: AGRUPAMENTOS.includes(o.agrupar as Agrupamento) ? (o.agrupar as Agrupamento) : FILTROS_PADRAO.agrupar,
  }
}

export const ROTULO_PRAZO: Record<FiltroPrazo, string> = {
  late: "Vencidas",
  today: "Hoje",
  week: "Esta semana",
  fatal: "Prazo fatal",
}

/** Escopo (Minhas/Equipe) + projetos + responsável — base da linha-resumo. */
export function noEscopo(tarefas: TaskRow[], f: Filtros, meId: number | null): TaskRow[] {
  return tarefas.filter((t) => {
    if (f.escopo === "mine" && t.responsavelId !== meId) return false
    if (f.projetos.length && !f.projetos.includes(t.projetoId ?? SEM_PROJETO)) return false
    if (f.escopo === "team" && f.responsavel != null && t.responsavelId !== f.responsavel) return false
    return true
  })
}

export function casaPrazo(t: TaskRow, p: FiltroPrazo | null, hoje: string): boolean {
  if (!p) return true
  if (t.status === "done") return false
  if (p === "late") return vencida(t, hoje)
  if (p === "today") return faixa(t, hoje) === "today"
  if (p === "week") return faixa(t, hoje) === "week"
  return t.prazoFatal
}

/** O que aparece no quadro: escopo + prazo; concluídas só dos últimos 7 dias. */
export function visiveis(tarefas: TaskRow[], f: Filtros, meId: number | null, hoje: string): TaskRow[] {
  return noEscopo(tarefas, f, meId).filter(
    (t) => casaPrazo(t, f.prazo, hoje) && (t.status !== "done" || concluidaRecente(t, hoje)),
  )
}

export interface CtxOrdenacao {
  ordemProjeto: (id: number | null) => number
  nomePessoa: (id: number | null) => string
  /** Posição manual DESTA pessoa; sem posição = vai para o fim, por prazo. */
  ordemManual?: (id: number) => number | undefined
}

/**
 * Ordenação: manual · prazo (padrão) · projeto · responsável, cada uma crescente
 * ou decrescente (manual não tem direção). Concluídas pelo prazo: mais recente
 * primeiro no crescente. "Sem projeto" / "Sem responsável" ficam sempre no fim.
 * Empates: prazo crescente, depois id.
 */
export function ordenar(lista: TaskRow[], por: Ordenacao, ctx: CtxOrdenacao, direcao: Direcao = "asc"): TaskRow[] {
  const { ordemProjeto, nomePessoa, ordemManual } = ctx
  const k = direcao === "desc" ? -1 : 1
  const chave = (t: TaskRow) => (t.status === "done" ? `~${t.concluidaEm ?? ""}` : t.prazo)
  const porPrazo = (a: TaskRow, b: TaskRow) => {
    if (a.status === "done" && b.status === "done") return compareISO(b.concluidaEm ?? "", a.concluidaEm ?? "")
    return compareISO(chave(a), chave(b))
  }
  const desempate = (a: TaskRow, b: TaskRow) => porPrazo(a, b) || a.id - b.id
  const cmp: Record<Ordenacao, (a: TaskRow, b: TaskRow) => number> = {
    manual: (a, b) => {
      const oa = ordemManual?.(a.id)
      const ob = ordemManual?.(b.id)
      if (oa != null && ob != null) return oa - ob || desempate(a, b)
      if (oa != null) return -1
      if (ob != null) return 1
      return desempate(a, b)
    },
    due: (a, b) => k * porPrazo(a, b) || a.id - b.id,
    proj: (a, b) => {
      const pa = ordemProjeto(a.projetoId)
      const pb = ordemProjeto(b.projetoId)
      if ((a.projetoId == null) !== (b.projetoId == null)) return a.projetoId == null ? 1 : -1
      return k * (pa - pb) || desempate(a, b)
    },
    owner: (a, b) => {
      if ((a.responsavelId == null) !== (b.responsavelId == null)) return a.responsavelId == null ? 1 : -1
      const na = a.responsavelId == null ? "" : nomePessoa(a.responsavelId)
      const nb = b.responsavelId == null ? "" : nomePessoa(b.responsavelId)
      return k * na.localeCompare(nb, "pt-BR") || desempate(a, b)
    },
  }
  return [...lista].sort(cmp[por])
}

/**
 * Nova ordem manual de UMA lista (a coluna na tela, na ordem desejada). Reaproveita
 * as posições que esses itens já tinham — então nada muda em relação ao que está
 * fora da lista (outras colunas/raias/itens filtrados) — e dá posições novas, depois
 * de todas as existentes, a quem ainda não tinha.
 */
export function reposicionar(ids: number[], atual: ReadonlyMap<number, number>): { id: number; ordem: number }[] {
  const vagas = ids
    .map((id) => atual.get(id))
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b)
  let max = 0
  for (const v of atual.values()) if (v > max) max = v
  while (vagas.length < ids.length) {
    max += 1024
    vagas.push(max)
  }
  return ids.map((id, i) => ({ id, ordem: vagas[i] }))
}

/** Posição manual logo DEPOIS de `apos` (entre ela e a seguinte) — onde entra a cópia de uma tarefa. */
export function posicaoDepois(apos: number, posicoes: Iterable<number>): number {
  let prox: number | null = null
  for (const v of posicoes) if (v > apos && (prox == null || v < prox)) prox = v
  return prox == null ? apos + 1024 : (apos + prox) / 2
}

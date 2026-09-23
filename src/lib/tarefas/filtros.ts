// Tarefas — filtros e ordenação do quadro (puro). Usado pelo cliente (quadro,
// lista, celular) e pela API GET /api/tarefas (mesmos filtros por query string).
// Nada fica salvo entre sessões: o estado dos filtros vive só na tela.
import { compareISO } from "@/lib/datas/util"
import { concluidaRecente, faixa, vencida } from "./regras"
import type { TaskRow } from "./types"

export type Escopo = "mine" | "team"
export type FiltroPrazo = "late" | "today" | "week" | "fatal"
export type Ordenacao = "due" | "proj" | "owner"
export type Agrupamento = "none" | "proj" | "group"
export type Visao = "board" | "list" | "flow"

/** Chave de "Sem projeto" na multisseleção de projetos. */
export const SEM_PROJETO = 0

export interface Filtros {
  escopo: Escopo
  projetos: number[] // ids (SEM_PROJETO = sem projeto)
  responsavel: number | null // só vale em "Equipe"
  prazo: FiltroPrazo | null
  ordenar: Ordenacao
  agrupar: Agrupamento
  visao: Visao
}

export const FILTROS_PADRAO: Filtros = {
  escopo: "team",
  projetos: [],
  responsavel: null,
  prazo: null,
  ordenar: "due",
  agrupar: "none",
  visao: "board",
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

/** Ordenação: prazo (padrão) · projeto · responsável. Concluídas: mais recente primeiro. */
export function ordenar(
  lista: TaskRow[],
  por: Ordenacao,
  ordemProjeto: (id: number | null) => number,
  nomePessoa: (id: number | null) => string,
): TaskRow[] {
  const chave = (t: TaskRow) => (t.status === "done" ? `~${t.concluidaEm ?? ""}` : t.prazo)
  const porPrazo = (a: TaskRow, b: TaskRow) => {
    if (a.status === "done" && b.status === "done") return compareISO(b.concluidaEm ?? "", a.concluidaEm ?? "")
    return compareISO(chave(a), chave(b)) || a.id - b.id
  }
  const cmp: Record<Ordenacao, (a: TaskRow, b: TaskRow) => number> = {
    due: porPrazo,
    proj: (a, b) => ordemProjeto(a.projetoId) - ordemProjeto(b.projetoId) || porPrazo(a, b),
    owner: (a, b) => {
      const na = a.responsavelId == null ? "￿" : nomePessoa(a.responsavelId)
      const nb = b.responsavelId == null ? "￿" : nomePessoa(b.responsavelId)
      return na.localeCompare(nb, "pt-BR") || porPrazo(a, b)
    },
  }
  return [...lista].sort(cmp[por])
}

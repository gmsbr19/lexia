// Tarefas — layout da visão Fluxo (puro). Uma faixa por grupo; cartões da
// esquerda para a direita NA ORDEM DAS LIGAÇÕES (coluna = maior profundidade no
// grafo do projeto). Não é Gantt: não há eixo de datas.
import { compareISO } from "@/lib/datas/util"
import { indexar, vencida } from "./regras"
import type { TaskRow } from "./types"

export const FLUXO = { CW: 200, CH: 96, GX: 64, GY: 12, HEAD: 40, PAD: 12, LEFT: 16, LGAP: 12 } as const

export const SEM_GRUPO = "Sem grupo"

export interface FaixaFluxo {
  grupo: string
  y: number
  h: number
  feitas: number
  total: number
}
export type TomSeta = "base" | "warn" | "crit"
export interface SetaFluxo {
  de: number
  para: number
  tom: TomSeta
}
export interface LayoutFluxo {
  pos: Map<number, { x: number; y: number }>
  faixas: FaixaFluxo[]
  setas: SetaFluxo[]
  W: number
  H: number
}

/** Profundidade de cada tarefa = 1 + maior profundidade entre as anteriores (0 = sem anteriores). */
export function profundidades(tarefas: Pick<TaskRow, "id" | "anteriores">[]): Map<number, number> {
  const map = indexar(tarefas)
  const prof = new Map<number, number>()
  const visitando = new Set<number>()
  const dfs = (id: number): number => {
    const memo = prof.get(id)
    if (memo != null) return memo
    if (visitando.has(id)) return 0 // defensivo: ciclo nunca deveria existir
    visitando.add(id)
    const antes = (map.get(id)?.anteriores ?? []).filter((a) => map.has(a))
    const d = antes.length ? 1 + Math.max(...antes.map(dfs)) : 0
    visitando.delete(id)
    prof.set(id, d)
    return d
  }
  for (const t of tarefas) dfs(t.id)
  return prof
}

/** Ordem natural dos grupos ("Protocolo 02" antes de "Protocolo 10"); "Sem grupo" por último. */
export function ordemGrupos(grupos: Iterable<string>): string[] {
  return [...new Set(grupos)].sort((a, b) => {
    if (a === SEM_GRUPO) return 1
    if (b === SEM_GRUPO) return -1
    return a.localeCompare(b, "pt-BR", { numeric: true })
  })
}

export function layoutFluxo(tarefas: TaskRow[], hoje: string): LayoutFluxo {
  const { CW, CH, GX, GY, HEAD, PAD, LEFT, LGAP } = FLUXO
  const prof = profundidades(tarefas)
  const grupos = ordemGrupos(tarefas.map((t) => t.grupo || SEM_GRUPO))
  const pos = new Map<number, { x: number; y: number }>()
  const faixas: FaixaFluxo[] = []
  let y = 0
  let maxD = 0
  for (const g of grupos) {
    const lista = tarefas
      .filter((t) => (t.grupo || SEM_GRUPO) === g)
      .sort((a, b) => compareISO(a.prazo, b.prazo) || a.id - b.id)
    const porProf = new Map<number, TaskRow[]>()
    for (const t of lista) {
      const d = prof.get(t.id) ?? 0
      maxD = Math.max(maxD, d)
      const col = porProf.get(d)
      if (col) col.push(t)
      else porProf.set(d, [t])
    }
    const linhas = Math.max(1, ...[...porProf.values()].map((c) => c.length))
    for (const [d, col] of porProf) {
      col.forEach((t, i) => pos.set(t.id, { x: LEFT + d * (CW + GX), y: y + HEAD + i * (CH + GY) }))
    }
    const h = HEAD + linhas * (CH + GY) - GY + PAD
    faixas.push({ grupo: g, y, h, feitas: lista.filter((t) => t.status === "done").length, total: lista.length })
    y += h + LGAP
  }

  const map = indexar(tarefas)
  const setas: SetaFluxo[] = []
  for (const t of tarefas) {
    for (const a of t.anteriores) {
      const ant = map.get(a)
      if (!ant || !pos.has(a) || !pos.has(t.id)) continue
      const tom: TomSeta = vencida(ant, hoje)
        ? "crit"
        : ant.status !== "done" && t.status !== "done" && compareISO(ant.prazo, t.prazo) > 0
          ? "warn"
          : "base"
      setas.push({ de: a, para: t.id, tom })
    }
  }

  return {
    pos,
    faixas,
    setas,
    W: LEFT * 2 + (maxD + 1) * (CW + GX) - GX,
    H: Math.max(0, y - LGAP),
  }
}

/** Celular: por grupo, na ordem das ligações (profundidade) e depois do prazo. */
export function listaFluxo(tarefas: TaskRow[]): { grupo: string; tarefas: TaskRow[] }[] {
  const prof = profundidades(tarefas)
  return ordemGrupos(tarefas.map((t) => t.grupo || SEM_GRUPO)).map((g) => ({
    grupo: g,
    tarefas: tarefas
      .filter((t) => (t.grupo || SEM_GRUPO) === g)
      .sort((a, b) => (prof.get(a.id) ?? 0) - (prof.get(b.id) ?? 0) || compareISO(a.prazo, b.prazo) || a.id - b.id),
  }))
}

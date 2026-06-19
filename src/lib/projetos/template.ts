// Projetos — PURE core (no Prisma, no env): template instantiation deadlines and
// the derived progresso/saúde of a project. Kept Prisma-free so it's deterministic
// and unit-testable; the mutation layer feeds it the DB-loaded PrazoContexto.
import { addDiasISO, compareISO } from "../processos/datas"
import { calcularPrazo, type PrazoContexto } from "../processos/prazo"
import type { SaudeProjeto, TemplateBase } from "./types"

export interface TemplateItemInput {
  titulo: string
  descricao?: string | null
  prio?: number
  responsavelPlaceholder?: string | null
  /** Business-day slack from `base`. 0 ⇒ due on the base day (protraído ao 1º útil). */
  offsetDias: number
  base: TemplateBase
  dor?: string[]
  dod?: string[]
  ordem?: number
}

export interface ItemInstanciado extends TemplateItemInput {
  prazoISO: string
}

/**
 * Resolve each template item's absolute prazo (dias úteis, CPC engine). Items are
 * processed in `ordem`; `base:"anterior"` chains off the previous item's prazo
 * (the project start for the first item), `base:"inicio"` is always off the start.
 */
export function instanciarTemplate(
  itens: TemplateItemInput[],
  opts: { dataInicio: string; ctx: PrazoContexto },
): ItemInstanciado[] {
  const ordenados = [...itens].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
  let prevPrazo = opts.dataInicio
  const out: ItemInstanciado[] = []
  for (const item of ordenados) {
    const base = item.base === "anterior" ? prevPrazo : opts.dataInicio
    const offset = Math.max(0, Math.trunc(item.offsetDias ?? 0))
    // quantidadeDias = offset+1: day 1 is `base` itself, so the result is `offset`
    // business days AFTER base (offset 0 ⇒ base protraído ao próximo dia útil).
    const { dataFatal } = calcularPrazo({ dataInicio: base, quantidadeDias: offset + 1, ctx: opts.ctx })
    out.push({ ...item, prazoISO: dataFatal })
    prevPrazo = dataFatal
  }
  return out
}

// ── derived project health/progress (used by queries + dashboard) ──────────────
export interface TarefaSaudeInput {
  done: boolean
  prazo: string | null
}

/** Percent of tasks done (0 when the project has no tasks). */
export function progressoProjeto(tarefas: { done: boolean }[]): number {
  if (tarefas.length === 0) return 0
  const done = tarefas.filter((t) => t.done).length
  return Math.round((done / tarefas.length) * 100)
}

/** Open tasks whose prazo is in the past. */
export function contarAtrasadas(tarefas: TarefaSaudeInput[], hoje: string): number {
  return tarefas.filter((t) => !t.done && !!t.prazo && compareISO(t.prazo, hoje) < 0).length
}

/**
 * Project health from its open tasks + target prazo (pure, deterministic):
 *  - atrasado: any open task overdue, OR project prazo past with open work;
 *  - em_risco: any open task due within 3 business-agnostic days, OR project prazo
 *    within 7 days with open work;
 *  - else no_prazo. Concluído/arquivado never raise an alert.
 */
export function saudeProjeto(
  proj: { prazo: string | null; status?: string },
  tarefas: TarefaSaudeInput[],
  hoje: string,
): SaudeProjeto {
  if (proj.status === "concluido" || proj.status === "arquivado") return "no_prazo"
  const abertas = tarefas.filter((t) => !t.done)
  const algumaVencida = abertas.some((t) => !!t.prazo && compareISO(t.prazo, hoje) < 0)
  const projVencido = !!proj.prazo && compareISO(proj.prazo, hoje) < 0 && abertas.length > 0
  if (algumaVencida || projVencido) return "atrasado"
  const limiteTarefa = addDiasISO(hoje, 3)
  const limiteProj = addDiasISO(hoje, 7)
  const algumaProxima = abertas.some((t) => !!t.prazo && compareISO(t.prazo, limiteTarefa) <= 0)
  const projProximo = !!proj.prazo && compareISO(proj.prazo, limiteProj) <= 0 && abertas.length > 0
  if (algumaProxima || projProximo) return "em_risco"
  return "no_prazo"
}

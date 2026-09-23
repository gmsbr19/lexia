// Tarefas — REGRAS ÚNICAS do sistema (puro: sem Prisma, sem React, sem relógio
// ambiente — `hoje` é sempre injetado). É a MESMA implementação usada pelo
// servidor (API, LexIA, notificações, painel da Equipe) e pelo cliente (quadro,
// atualização otimista). Qualquer lugar que precise saber se uma tarefa está
// vencida, em risco ou aguardando chama estas funções — nunca reimplementa.
//
// Datas são strings "YYYY-MM-DD" no fuso do escritório (America/Sao_Paulo).
import { parseDataNatural } from "@/lib/datas/nl"
import { addDays, compareISO, weekdayOf } from "@/lib/datas/util"
import type { TaskRow, TaskStatus } from "./types"

export const FUSO_ESCRITORIO = "America/Sao_Paulo"

const fmtSP = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_ESCRITORIO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** "Hoje" no fuso do escritório. */
export function hojeSP(agora: Date = new Date()): string {
  return fmtSP.format(agora)
}

/** Data (no fuso do escritório) de um instante — ex.: `concluidoEm`. */
export function dataSP(d: Date | null | undefined): string | null {
  return d ? fmtSP.format(d) : null
}

/** Nº de dias de `de` até `ate` (negativo se `ate` é anterior). */
export function diasEntre(de: string, ate: string): number {
  const a = Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10))
  const b = Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10))
  return Math.round((b - a) / 86_400_000)
}

/** Dias de hoje até o domingo desta semana (semana = segunda a domingo). */
export function diasAteDomingo(hoje: string): number {
  return (7 - weekdayOf(hoje)) % 7
}

/** Domingo que fecha a semana de `hoje`. */
export function domingoDaSemana(hoje: string): string {
  return addDays(hoje, diasAteDomingo(hoje))
}

/**
 * Prazo padrão de uma tarefa criada sem prazo: a sexta-feira da semana de
 * criação; criada no sábado ou no domingo → a sexta seguinte.
 */
export function prazoPadrao(hoje: string): string {
  const wd = weekdayOf(hoje) // 0=dom … 6=sáb
  if (wd === 6) return addDays(hoje, 6)
  if (wd === 0) return addDays(hoje, 5)
  return addDays(hoje, 5 - wd)
}

/** Próxima sexta (nunca hoje) e próxima segunda (nunca hoje) — atalhos do seletor. */
export function proximaSexta(hoje: string): string {
  const n = (5 - weekdayOf(hoje) + 7) % 7
  return addDays(hoje, n === 0 ? 7 : n)
}
export function proximaSegunda(hoje: string): string {
  const n = (1 - weekdayOf(hoje) + 7) % 7
  return addDays(hoje, n === 0 ? 7 : n)
}

// ── a regra de atraso (única em todo o sistema) ─────────────────────────────
type Base = Pick<TaskRow, "status" | "prazo">

/** Vencida = prazo < hoje E status ≠ concluído. */
export function vencida(t: Base, hoje: string): boolean {
  return t.status !== "done" && compareISO(t.prazo, hoje) < 0
}

export type Faixa = "late" | "today" | "week" | "later"
/** Faixa de prazo: vencidas (<hoje), hoje, esta semana (amanhã até domingo), depois. */
export function faixa(t: Pick<TaskRow, "prazo">, hoje: string): Faixa {
  const c = compareISO(t.prazo, hoje)
  if (c < 0) return "late"
  if (c === 0) return "today"
  if (compareISO(t.prazo, domingoDaSemana(hoje)) <= 0) return "week"
  return "later"
}

/** Concluída nos últimos 7 dias (a coluna Concluído só mostra essas). */
export function concluidaRecente(t: Pick<TaskRow, "status" | "concluidaEm">, hoje: string): boolean {
  if (t.status !== "done") return false
  if (!t.concluidaEm) return false
  return compareISO(t.concluidaEm, addDays(hoje, -7)) >= 0
}

export interface Resumo {
  vencidas: number
  hoje: number
  semana: number
}
/** Linha-resumo do quadro (só tarefas abertas). */
export function resumo(tarefas: Base[], hoje: string): Resumo {
  const r: Resumo = { vencidas: 0, hoje: 0, semana: 0 }
  for (const t of tarefas) {
    if (t.status === "done") continue
    const f = faixa(t, hoje)
    if (f === "late") r.vencidas++
    else if (f === "today") r.hoje++
    else if (f === "week") r.semana++
  }
  return r
}

// ── grafo de ligações ────────────────────────────────────────────────────────
type NoGrafo = Pick<TaskRow, "id" | "anteriores">

export function indexar<T extends { id: number }>(tarefas: T[]): Map<number, T> {
  return new Map(tarefas.map((t) => [t.id, t]))
}

/** Mapa inverso: id → ids das tarefas que só começam depois dela. */
export function mapaSeguintes(tarefas: NoGrafo[]): Map<number, number[]> {
  const m = new Map<number, number[]>()
  for (const t of tarefas) {
    for (const a of t.anteriores) {
      const l = m.get(a)
      if (l) l.push(t.id)
      else m.set(a, [t.id])
    }
  }
  return m
}

/** Anteriores diretas + transitivas. */
export function ancestrais(id: number, map: Map<number, NoGrafo>): Set<number> {
  const acc = new Set<number>()
  const pilha = [...(map.get(id)?.anteriores ?? [])]
  while (pilha.length) {
    const a = pilha.pop()!
    if (acc.has(a) || !map.has(a)) continue
    acc.add(a)
    pilha.push(...(map.get(a)?.anteriores ?? []))
  }
  return acc
}

/** Seguintes diretas + transitivas. */
export function descendentes(id: number, seguintes: Map<number, number[]>): Set<number> {
  const acc = new Set<number>()
  const pilha = [...(seguintes.get(id) ?? [])]
  while (pilha.length) {
    const s = pilha.pop()!
    if (acc.has(s)) continue
    acc.add(s)
    pilha.push(...(seguintes.get(s) ?? []))
  }
  return acc
}

/** A tarefa + toda a cadeia (anteriores e seguintes transitivas) — destaque no hover. */
export function cadeia(id: number, map: Map<number, NoGrafo>, seguintes: Map<number, number[]>): Set<number> {
  return new Set([id, ...ancestrais(id, map), ...descendentes(id, seguintes)])
}

/** Ligar anterior → seguinte criaria ciclo? (ou é a mesma tarefa) */
export function criariaCiclo(anteriorId: number, seguinteId: number, map: Map<number, NoGrafo>): boolean {
  return anteriorId === seguinteId || ancestrais(anteriorId, map).has(seguinteId)
}

type TarefaGrafo = Pick<TaskRow, "id" | "anteriores" | "status" | "prazo" | "titulo" | "grupo" | "responsavelId" | "aguardandoTexto">

/** Anteriores diretas ainda não concluídas. */
export function pendentes<T extends TarefaGrafo>(t: T, map: Map<number, T>): T[] {
  const out: T[] = []
  for (const a of t.anteriores) {
    const p = map.get(a)
    if (p && p.status !== "done") out.push(p)
  }
  return out
}

/** Em risco: tarefa aberta com ALGUMA anterior (direta ou transitiva) vencida. Devolve os motivos. */
export function motivosRisco<T extends TarefaGrafo>(t: T, map: Map<number, T>, hoje: string): T[] {
  if (t.status === "done") return []
  const out: T[] = []
  for (const id of ancestrais(t.id, map as Map<number, NoGrafo>)) {
    const a = map.get(id)
    if (a && vencida(a, hoje)) out.push(a)
  }
  return out.sort((a, b) => compareISO(a.prazo, b.prazo))
}

/** Conflito de prazo: anterior pendente com prazo DEPOIS do prazo desta. */
export function conflitosPrazo<T extends TarefaGrafo>(t: T, map: Map<number, T>): T[] {
  if (t.status === "done") return []
  return pendentes(t, map).filter((p) => compareISO(p.prazo, t.prazo) > 0)
}

/** Rótulo do "Aguardando: …": terceiro, ou "Título (Pessoa)", ou "N passos". */
export function aguardandoRotulo<T extends TarefaGrafo>(
  t: T,
  map: Map<number, T>,
  nomePessoa: (id: number | null) => string,
): string | null {
  if (t.aguardandoTexto) return t.aguardandoTexto
  const pend = pendentes(t, map)
  if (pend.length === 1) return `${pend[0].titulo} (${nomePessoa(pend[0].responsavelId)})`
  if (pend.length > 1) return `${pend.length} passos`
  return null
}

export type Selo =
  | { kind: "late" }
  | { kind: "risk"; motivo: string }
  | { kind: "wait"; label: string }

/** Selo único por prioridade: Vencida > Em risco > Aguardando. */
export function selo<T extends TarefaGrafo>(
  t: T,
  map: Map<number, T>,
  hoje: string,
  nomePessoa: (id: number | null) => string,
): Selo | null {
  if (t.status === "done") return null
  if (vencida(t, hoje)) return { kind: "late" }
  const risco = motivosRisco(t, map, hoje)
  if (risco.length) {
    return {
      kind: "risk",
      motivo: risco.map((r) => `${r.titulo} venceu ${dataCurta(r.prazo)}`).join(" · "),
    }
  }
  if (t.status === "wait") {
    const label = aguardandoRotulo(t, map, nomePessoa)
    if (label) return { kind: "wait", label }
  }
  return null
}

// ── fluxo de status ──────────────────────────────────────────────────────────
/** Mover para "Em andamento" uma tarefa aguardando (anterior pendente ou terceiro) pede confirmação. */
export function precisaConfirmarInicio<T extends TarefaGrafo>(t: T, map: Map<number, T>, destino: TaskStatus): boolean {
  return destino === "doing" && t.status === "wait" && (pendentes(t, map).length > 0 || !!t.aguardandoTexto)
}

/** Mover para "Aguardando" sem anterior pendente e sem texto pede "Aguardando o quê?". */
export function precisaTextoAguardando<T extends TarefaGrafo>(t: T, map: Map<number, T>, destino: TaskStatus): boolean {
  return destino === "wait" && pendentes(t, map).length === 0 && !t.aguardandoTexto
}

/**
 * Ao concluir `id`: seguintes que estavam "aguardando" SEM terceiro e sem OUTRAS
 * anteriores pendentes voltam para "a fazer". `tarefas` é o estado ANTES de concluir.
 */
export function liberadasAoConcluir<T extends TarefaGrafo>(id: number, tarefas: T[]): T[] {
  const depois = tarefas.map((t) => (t.id === id ? { ...t, status: "done" as TaskStatus } : t))
  const map = indexar(depois)
  return tarefas.filter(
    (t) =>
      t.id !== id &&
      t.anteriores.includes(id) &&
      t.status === "wait" &&
      !t.aguardandoTexto &&
      pendentes(map.get(t.id)!, map).length === 0,
  )
}

/** Status da seguinte ao criar a ligação: "a fazer" com anterior aberta vira "aguardando". */
export function statusAoLigar(seguinte: Pick<TaskRow, "status">, anterior: Pick<TaskRow, "status">): TaskStatus {
  return seguinte.status === "todo" && anterior.status !== "done" ? "wait" : seguinte.status
}

/** Status da seguinte ao remover uma ligação (`restantesPendentes` já SEM a removida). */
export function statusAoDesligar(
  seguinte: Pick<TaskRow, "status" | "aguardandoTexto">,
  restantesPendentes: number,
): TaskStatus {
  return seguinte.status === "wait" && !seguinte.aguardandoTexto && restantesPendentes === 0 ? "todo" : seguinte.status
}

export interface Deslocamento {
  delta: number // dias
  moveis: number[] // seguintes (transitivas) abertas sem prazo fatal — deslocadas se "Ajustar"
  fatais: number // seguintes abertas com prazo fatal (nunca mudam)
}
/** Mudança de prazo em cadeia: o que "Ajustar os prazos seguintes?" moveria. */
export function deslocamentoCadeia<T extends TarefaGrafo & Pick<TaskRow, "prazoFatal">>(
  id: number,
  novoPrazo: string,
  tarefas: T[],
): Deslocamento {
  const map = indexar(tarefas)
  const t = map.get(id)
  if (!t) return { delta: 0, moveis: [], fatais: 0 }
  const delta = diasEntre(t.prazo, novoPrazo)
  const abertas = [...descendentes(id, mapaSeguintes(tarefas))]
    .map((d) => map.get(d))
    .filter((d): d is T => !!d && d.status !== "done")
  const moveis = abertas.filter((d) => !d.prazoFatal).map((d) => d.id)
  return { delta, moveis, fatais: abertas.length - moveis.length }
}

/** Cliente efetivo: o do projeto (herdado, somente leitura) ou o próprio da tarefa. */
export function clienteEfetivo(
  t: Pick<TaskRow, "clienteId" | "projetoId">,
  clienteDoProjeto: (projetoId: number) => number | null,
): { id: number; herdado: boolean } | null {
  const doProjeto = t.projetoId != null ? clienteDoProjeto(t.projetoId) : null
  if (doProjeto != null) return { id: doProjeto, herdado: true }
  return t.clienteId != null ? { id: t.clienteId, herdado: false } : null
}

// ── rótulos de data (pt-BR) ──────────────────────────────────────────────────
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const DIA3 = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

/** "25 set" */
export function dataCurta(iso: string): string {
  return `${+iso.slice(8, 10)} ${MES[+iso.slice(5, 7) - 1]}`
}
/** "Quinta, 15 out" */
export function dataLonga(iso: string): string {
  return `${DIA[weekdayOf(iso)]}, ${dataCurta(iso)}`
}
/** "Qui" */
export function diaSemana3(iso: string): string {
  return DIA3[weekdayOf(iso)]
}

/** Prazo relativo: Hoje / Amanhã / Ontem / dia da semana (até domingo) / "25 set". */
export function rotuloPrazo(iso: string, hoje: string): string {
  const n = diasEntre(hoje, iso)
  if (n === 0) return "Hoje"
  if (n === 1) return "Amanhã"
  if (n === -1) return "Ontem"
  if (n > 1 && n <= diasAteDomingo(hoje)) return DIA[weekdayOf(iso)]
  return dataCurta(iso)
}

/** "hoje" / "ontem" / "25 set" — carimbo de comentários e histórico. */
export function rotuloQuando(iso: string, hoje: string): string {
  const n = diasEntre(hoje, iso)
  if (n === 0) return "hoje"
  if (n === -1) return "ontem"
  return dataCurta(iso)
}

/** Primeira parte do grupo ("Protocolo 02 · 1º RI Taubaté" → "Protocolo 02"). */
export function grupoCurto(grupo: string | null): string | null {
  return grupo ? grupo.split(" · ")[0] : null
}

/**
 * Texto livre do seletor de data ("hoje", "amanhã", "sex", "próxima semana",
 * "em 3 dias", "2 semanas", "dia 15", "15/10", "15/10/26"…) → "YYYY-MM-DD", ou
 * null quando não reconhecido. Nunca devolve "sem prazo" (toda tarefa tem prazo).
 */
export function interpretarData(texto: string, hoje: string): string | null {
  const t = texto.trim()
  if (!t) return null
  const semEm = /^\d{1,3}\s+(dias?|semanas?|m[eê]s(es)?)$/i.test(t) ? `em ${t}` : t
  return parseDataNatural(semEm, hoje)?.iso ?? null
}

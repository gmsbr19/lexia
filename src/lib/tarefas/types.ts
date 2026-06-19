// Tarefas — canonical string unions, static taxonomies, and client-safe view
// models (no Prisma imports here). Mirrors src/lib/comercial/types.ts.
//
// A task has TWO distinct dates: `data` (quando fazer / scheduled, optional
// `hora`) and `prazo` (deadline, drives urgency color). `projeto` is a static
// practice-area key (see PROJECTS below — NOT a Caso). The vínculo links to a
// real Caso OR Cliente (mutually exclusive); the responsável is a registered User.

export type TaskStatus = "todo" | "doing" | "review" | "done"
export type TaskPrio = 1 | 2 | 3 | 4
export type ProjetoKey = "inbox" | "trab" | "soc" | "trib" | "civ" | "int"
export type VinculoTipo = "caso" | "cliente"

// ── static taxonomies (ported from the design's tasks-data.jsx) ──────────────
export interface StatusDef {
  id: TaskStatus
  label: string
  color: string
}
export const STATUS: StatusDef[] = [
  { id: "todo", label: "A fazer", color: "#7A8699" },
  { id: "doing", label: "Em andamento", color: "var(--text-muted)" },
  { id: "review", label: "Em revisão", color: "#9A6B2E" },
  { id: "done", label: "Concluída", color: "#1F8A5B" },
]
export const statusMeta = (id: string): StatusDef => STATUS.find((s) => s.id === id) ?? STATUS[0]

export interface PrioDef {
  label: string
  short: string
  color: string
}
export const PRIO: Record<TaskPrio, PrioDef> = {
  1: { label: "Urgente", short: "P1", color: "#C0492F" },
  2: { label: "Alta", short: "P2", color: "#D98A2B" },
  3: { label: "Média", short: "P3", color: "var(--text-muted)" },
  4: { label: "Normal", short: "P4", color: "var(--text-subtle)" },
}

export interface ProjetoDef {
  id: ProjetoKey
  name: string
  color: string
  inbox?: boolean
}
// Practice-area containers (NOT casos — the caso link is the separate vínculo).
export const PROJECTS: ProjetoDef[] = [
  { id: "inbox", name: "Caixa de entrada", color: "#7A8699", inbox: true },
  { id: "trab", name: "Contencioso trabalhista", color: "#C0492F" },
  { id: "soc", name: "Societário & M&A", color: "#1F8A5B" },
  { id: "trib", name: "Tributário", color: "#C0A147" },
  { id: "civ", name: "Cível & contratos", color: "var(--text-muted)" },
  { id: "int", name: "Operação interna", color: "var(--text-subtle)" },
]
export const PROJECT_IDS: ProjetoKey[] = PROJECTS.map((p) => p.id)

export const RECUR_OPTS = [
  "Não repete",
  "Diariamente",
  "Toda terça",
  "Toda semana",
  "A cada 15 dias",
  "Todo dia 15",
  "Mensalmente",
] as const
export const REMINDER_OPTS = [
  "Sem lembrete",
  "15 min antes",
  "30 min antes",
  "1 h antes",
  "1 dia antes",
  "Na data do prazo",
] as const

// DoR / DoD canned suggestions (used by the modal "Gerar" button in Phase A;
// Phase B swaps this for a real Claude call).
export const DOR_GENERIC = [
  "Caso e partes confirmados no sistema",
  "Documentos-base anexados",
  "Prazo legal validado no calendário",
  "Responsável e revisor definidos",
]
export const DOD_GENERIC = [
  "Peça revisada por outro advogado",
  "Protocolo/comprovante anexado",
  "Cliente informado do andamento",
  "Prazo do desdobramento agendado",
]

export const VINCULO_ICON: Record<VinculoTipo, string> = { caso: "briefcase", cliente: "user" }

// ── view models ──────────────────────────────────────────────────────────────
export interface SubItem {
  id: string
  title: string
  done: boolean
}
export interface Criterio {
  text: string
  done: boolean
}

/** An active registered user rendered as an assignable team member. */
export interface TeamMember {
  id: number // User.id
  nome: string // full name
  first: string // first word of nome (for quick-add @match)
  initials: string
  color: string
  role: string // role label ("Admin" | "Sócio" | "Equipe")
}

export interface IdNome {
  id: number
  nome: string
}

/** Resolved vínculo for display (a task links to at most one caso OR cliente). */
export interface VinculoRef {
  tipo: VinculoTipo
  id: number
  nome: string
}

export interface TaskRow {
  id: number
  titulo: string
  status: TaskStatus
  done: boolean
  prio: TaskPrio
  projeto: ProjetoKey
  data: string | null // "YYYY-MM-DD"
  hora: string | null // "HH:MM"
  prazo: string | null // "YYYY-MM-DD"
  notes: string | null
  reminder: string | null
  recur: string | null
  ai: boolean
  subtasks: SubItem[]
  dor: Criterio[]
  dod: Criterio[]
  responsavelId: number | null
  casoId: number | null
  clienteId: number | null
  projetoId: number | null // container de trabalho dinâmico (null = sem projeto / projeto excluído)
  vinculo: VinculoRef | null
  ordem: number
}

export interface TarefasDataset {
  tarefas: TaskRow[]
  socios: TeamMember[]
  casos: IdNome[]
  clientes: IdNome[]
}

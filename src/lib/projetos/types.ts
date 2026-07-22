// Projetos — canonical string unions, static taxonomies, and client-safe view
// models (no Prisma imports here). Mirrors src/lib/tarefas/types.ts.
//
// A Projeto is a dynamic WORK CONTAINER (dono + prazo-alvo + status), grouping
// Tarefas. It replaces the old static `Tarefa.projeto` practice-area string,
// which becomes the `area` TAG here. Progresso/saúde são DERIVADOS (nunca
// persistidos) — ver template.ts. Vínculo (caso OU cliente) é opcional.
import type { Role } from "@/lib/auth/session"
import type { TeamMember, VinculoRef } from "../tarefas/types"

// RBAC (admin passa implícito no assertRole). Criar/editar projeto = sócio +
// advogado; templates (processos do escritório) = só sócio.
export const ROLES_PROJETO_ESCRITA: Role[] = ["socio", "advogado"]
export const ROLES_TEMPLATE: Role[] = ["socio"]

export type ProjetoStatus = "ativo" | "pausado" | "concluido" | "arquivado"
export type SaudeProjeto = "no_prazo" | "em_risco" | "atrasado"
export type TemplateBase = "inicio" | "anterior"

export interface StatusProjetoDef {
  id: ProjetoStatus
  label: string
  color: string
}
// Tom alinhado ao tf-theme: ativo=ok, pausado=neutro, concluido=accent, arquivado=subtle.
export const PROJETO_STATUS: StatusProjetoDef[] = [
  { id: "ativo", label: "Ativo", color: "var(--ok)" },
  { id: "pausado", label: "Pausado", color: "var(--text-muted)" },
  { id: "concluido", label: "Concluído", color: "var(--accent)" },
  { id: "arquivado", label: "Arquivado", color: "var(--text-subtle)" },
]
export const PROJETO_STATUS_IDS: ProjetoStatus[] = PROJETO_STATUS.map((s) => s.id)
export const statusProjetoMeta = (id: string): StatusProjetoDef =>
  PROJETO_STATUS.find((s) => s.id === id) ?? PROJETO_STATUS[0]

export interface SaudeDef {
  id: SaudeProjeto
  label: string
  color: string
}
export const SAUDE: SaudeDef[] = [
  { id: "no_prazo", label: "No prazo", color: "var(--ok)" },
  { id: "em_risco", label: "Em risco", color: "var(--warn)" },
  { id: "atrasado", label: "Atrasado", color: "var(--crit)" },
]
export const saudeMeta = (id: string): SaudeDef => SAUDE.find((s) => s.id === id) ?? SAUDE[0]

// ── view models ──────────────────────────────────────────────────────────────

/** Project list item (rail / dashboard) with derived progresso/saúde. */
export interface ProjetoView {
  id: number
  nome: string
  descricao: string | null
  status: ProjetoStatus
  cor: string | null
  icone: string | null
  area: string | null
  prazo: string | null // "YYYY-MM-DD"
  responsavel: TeamMember | null
  vinculo: VinculoRef | null
  templateOrigemId: number | null
  progresso: number // 0-100 (derivado)
  totalTarefas: number
  concluidas: number
  atrasadas: number
  saude: SaudeProjeto // derivado
  favorito: boolean // ainda não persistido — sempre false por ora (Fase 4)
  ordem: number
}

/** A project + its tasks (the canvas). `tarefas` are the existing TaskRow shape. */
export interface ProjetoDetail extends ProjetoView {
  tarefaIds: number[]
}

/** Seção personalizada de um projeto (coluna do quadro + grupo da lista). */
export interface SecaoView {
  id: number
  projetoId: number
  nome: string
  cor: string | null
  ordem: number
}

/** Dataset powering the Projetos workspace (rail + canvas). */
export interface ProjetosDataset {
  projetos: ProjetoView[]
  secoes: SecaoView[] // chapado (todas as seções de todos os projetos); filtra por projetoId no cliente
  socios: TeamMember[]
  casos: { id: number; nome: string }[]
  clientes: { id: number; nome: string }[]
}

// ── templates ──
export interface TemplateItemView {
  id: number
  titulo: string
  descricao: string | null
  prio: number
  responsavelPlaceholder: string | null
  offsetDiasUteis: number
  base: TemplateBase
  dor: string[]
  dod: string[]
  ordem: number
  secaoOrdem: number | null // índice `ordem` da seção-modelo (null = sem seção)
}
/** Seção-modelo de um template (vira uma ProjetoSecao real na instanciação). */
export interface TemplateSecaoView {
  nome: string
  cor: string | null
  ordem: number
}
export interface TemplateView {
  id: number
  nome: string
  descricao: string | null
  area: string | null
  cor: string | null
  icone: string | null
  ativo: boolean
  usos: number // nº de projetos instanciados a partir deste template
  itens: TemplateItemView[]
  secoes: TemplateSecaoView[]
}

// ── productivity dashboard (visão de equipe) ──
export interface DashKpis {
  projetosAtivos: number
  tarefasAtrasadas: number
  taxaNoPrazoPct: number | null // % das tarefas concluídas (30d) entregues até o prazo
  cycleTimeDias: number | null // média (dias corridos) entre criação e conclusão (30d)
}
export interface DashProjetoSaude {
  id: number
  nome: string
  responsavel: TeamMember | null
  progresso: number
  saude: SaudeProjeto
  atrasadas: number
}
export interface DashCargaMembro {
  membro: TeamMember
  atribuidas: number // tarefas abertas atribuídas
  concluidasSemana: number
  atrasadas: number
}
export interface DashGargalo {
  tarefaId: number
  titulo: string
  status: string
  diasParado: number // proxy: dias desde a última alteração (sem histórico de status)
  responsavel: TeamMember | null
}
/** Distribuição FUTURA da carga: tarefas abertas por dia, por pessoa. */
export interface DashDistribuicaoLinha {
  membro: TeamMember
  counts: number[] // tarefas abertas com prazo em cada dia de `dias` (alinhado por índice)
  depois: number // tarefas abertas com prazo além do horizonte
  semPrazo: number // tarefas abertas sem prazo definido
  total: number // soma de counts + depois (tarefas futuras com prazo)
}
export interface DashDistribuicao {
  dias: string[] // ISO "YYYY-MM-DD", próximos N dias começando hoje
  linhas: DashDistribuicaoLinha[]
}
export interface DashAreaResumo {
  area: string // chave
  projetosAtivos: number
  tarefasAtrasadas: number
  tarefasConcluidas30d: number
}
export interface ProdutividadeDashboard {
  kpis: DashKpis
  projetos: DashProjetoSaude[]
  carga: DashCargaMembro[]
  distribuicao: DashDistribuicao
  gargalos: DashGargalo[]
  porArea: DashAreaResumo[]
}

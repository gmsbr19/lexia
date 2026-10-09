// Tarefas — string unions, taxonomias fixas e view models client-safe (sem
// imports de Prisma). Redesign "Tarefas": um quadro único com todas as tarefas do
// escritório; o "projeto" do quadro (FILTRO) é o CASO do cliente ou um projeto
// INTERNO do escritório; UMA data só (prazo, obrigatório); prazo fatal é um
// marcador sobre o mesmo prazo; ligações "só começa depois de" entre tarefas do
// mesmo projeto. As regras derivadas (vencida, em risco, conflito, aguardando…)
// vivem em ./regras.ts — implementação ÚNICA usada pelo servidor e pelo cliente.
import type { Role } from "@/lib/auth/session"
import type { InformacaoRow } from "@/lib/informacoes/core"

export type TaskStatus = "todo" | "doing" | "wait" | "done"

export interface StatusDef {
  id: TaskStatus
  label: string
}
// Colunas fixas do quadro, nesta ordem.
export const STATUS: StatusDef[] = [
  { id: "todo", label: "A fazer" },
  { id: "doing", label: "Em andamento" },
  { id: "wait", label: "Aguardando" },
  { id: "done", label: "Concluído" },
]
export const STATUS_IDS: TaskStatus[] = STATUS.map((s) => s.id)
export const statusLabel = (id: string): string => STATUS.find((s) => s.id === id)?.label ?? "A fazer"
export const isStatus = (v: unknown): v is TaskStatus => typeof v === "string" && (STATUS_IDS as string[]).includes(v)

// Cores de projeto no quadro (reaproveitadas do app — não são cores novas).
export const CORES_PROJETO = ["#2E7D6B", "#5A4F9A", "#9A6B2E", "#9A2E5A", "#7A8699", "#C0492F"] as const

/** Projeto do quadro: o caso de um cliente ou um projeto interno do escritório. */
export type TipoProjeto = "caso" | "interno"
/** Identidade de um projeto no quadro: `c<id>` = Caso, `p<id>` = Projeto interno. */
export type ChaveProjeto = `c${number}` | `p${number}`

// "Equipe" (visão da equipe, filtro por outras pessoas, painel) só para gestão.
export const ROLES_GESTAO: Role[] = ["socio"] // admin passa implícito
export const ehGestao = (role: string | null | undefined): boolean => role === "admin" || role === "socio"

export interface ChecklistItem {
  id: string
  texto: string
  marcado: boolean
}

/** Membro ativo da equipe (User) — responsável possível de uma tarefa. */
export interface TeamMember {
  id: number // User.id
  nome: string
  first: string // primeiro nome (rótulos curtos: "Leonardo recebeu…")
  initials: string
  color: string
  role: string // rótulo do papel ("Admin" | "Sócio" | "Equipe")
}

export interface IdNome {
  id: number
  nome: string
}

/** Uma tarefa do quadro — só campos-base; os derivados saem de regras.ts. */
export interface TaskRow {
  id: number
  titulo: string
  status: TaskStatus
  prazo: string // "YYYY-MM-DD" (sempre presente)
  prazoFatal: boolean
  projeto: ChaveProjeto | null // null = "Sem projeto" (ou projeto excluído)
  grupo: string | null
  clienteId: number | null // vínculo PRÓPRIO (o efetivo considera o caso)
  responsavelId: number | null
  aguardandoTexto: string | null
  descricao: string | null
  checklist: ChecklistItem[]
  recur: string | null
  anteriores: number[] // ids das tarefas que precisam terminar antes
  concluidaEm: string | null // "YYYY-MM-DD" (fuso do escritório)
  criadaEm: string // ISO datetime
  nComentarios: number
  nAnexos: number
}

/**
 * Projeto como o quadro o enxerga (caso do cliente ou projeto interno). `nomeCurto`
 * e `cor` já vêm RESOLVIDOS pelo servidor (próprios → título / cor da área →
 * paleta), ver projetos-quadro.ts. Interno nunca tem cliente nem área.
 */
export interface ProjetoQuadro {
  chave: ChaveProjeto
  tipo: TipoProjeto
  id: number // Caso.id ou Projeto.id (conforme o tipo)
  nomeCurto: string // etiqueta (resolvida)
  nome: string // título
  cor: string // hex (resolvida)
  clienteId: number | null
  area: string | null // chave de AreaDireito
  responsavelId: number | null
  prazo: string | null // "YYYY-MM-DD"
  descricao: string | null
  arquivado: boolean // caso "Arquivado" / interno com arquivadoEm
  modeloOrigemId: number | null
}

export interface PapelModelo {
  id: string
  rotulo: string
  padraoUsuarioId: number | null
}
export interface PassoModelo {
  chave: string
  titulo: string
  papelId: string | null
  diasAntes: number
  prazoFatal: boolean
  anteriores: string[] // chaves
  checklist: string[]
}
export interface ModeloView {
  id: number
  nome: string
  area: string | null
  palavraGrupo: string
  sufixoGrupo: string
  papeis: PapelModelo[]
  passos: PassoModelo[]
}

/** Carga única que alimenta o módulo (quadro + modelos + equipe). */
export interface TarefasBoard {
  tarefas: TaskRow[]
  projetos: ProjetoQuadro[] // não arquivados + os arquivados citados por alguma tarefa
  /** Casos que ESTA pessoa pode abrir/vincular; null = todos (papéis que veem tudo). Internos são de todos. */
  casosAcessiveis: number[] | null
  pessoas: TeamMember[]
  clientes: IdNome[]
  modelos: ModeloView[]
  /** Informações FIXADAS de clientes, casos e projetos internos ("Saiba antes" nas tarefas). */
  fixadas: InformacaoRow[]
  hoje: string // "YYYY-MM-DD" no fuso do escritório (servidor)
}

// ── detalhe (carregado ao abrir a tarefa) ──
export interface HistoricoRow {
  id: number
  texto: string
  autorId: number | null
  criadoEm: string // ISO datetime
}
export interface AnexoRow {
  id: number
  tipo: "arquivo" | "link"
  nome: string
  url: string | null // link externo ou rota de download do arquivo
  tamanho: number | null
  criadoEm: string
}
export interface TarefaDetalhe {
  historico: HistoricoRow[]
  anexos: AnexoRow[]
}

/** Resposta padrão de toda mutação do módulo: o id da ação p/ "Desfazer". */
export interface ResultadoAcao {
  acaoId: string | null
}

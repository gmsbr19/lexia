// Tarefas — string unions, taxonomias fixas e view models client-safe (sem
// imports de Prisma). Redesign "Tarefas": um quadro único com todas as tarefas do
// escritório; o CASO é o "projeto" do quadro (FILTRO); UMA data só (prazo,
// obrigatório); prazo fatal é um marcador sobre o mesmo prazo; ligações "só começa
// depois de" entre tarefas do mesmo caso. As regras derivadas (vencida, em risco, conflito, aguardando…)
// vivem em ./regras.ts — implementação ÚNICA usada pelo servidor e pelo cliente.
import type { Role } from "@/lib/auth/session"

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

// Cores de caso no quadro (reaproveitadas do app — não são cores novas).
export const CORES_CASO = ["#2E7D6B", "#5A4F9A", "#9A6B2E", "#9A2E5A", "#7A8699", "#C0492F"] as const

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
  casoId: number | null // null = "Sem caso" (ou caso excluído)
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
 * Caso como o quadro o enxerga. `nomeCurto` e `cor` já vêm RESOLVIDOS pelo
 * servidor (próprios do caso → título / cor da área → paleta), ver casos-quadro.ts.
 */
export interface CasoQuadro {
  id: number
  nomeCurto: string // etiqueta (resolvida)
  nome: string // título do caso
  cor: string // hex (resolvida)
  clienteId: number | null
  area: string | null // chave de AreaDireito
  responsavelId: number | null
  prazo: string | null // "YYYY-MM-DD"
  descricao: string | null
  arquivado: boolean // status "Arquivado"
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
  casos: CasoQuadro[] // não arquivados + os arquivados citados por alguma tarefa
  /** Casos que ESTA pessoa pode abrir/vincular; null = todos (papéis que veem tudo). */
  casosAcessiveis: number[] | null
  pessoas: TeamMember[]
  clientes: IdNome[]
  modelos: ModeloView[]
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

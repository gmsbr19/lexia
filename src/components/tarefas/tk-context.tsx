"use client"

// Contexto do módulo Tarefas: a carga (tarefas, projetos, pessoas…), os índices
// derivados, quem está vendo e as AÇÕES (cada uma espelha um endpoint e mostra o
// aviso com "Desfazer"). Montado por TarefasApp.
import { createContext, useContext } from "react"
import type { ChecklistItem, IdNome, ModeloView, ProjetoRow, TaskRow, TaskStatus, TeamMember } from "@/lib/tarefas/types"
import type { GrupoWizard } from "@/lib/projetos/modelo"

export interface NovaTarefaUI {
  titulo: string
  projetoId: number | null
  grupo?: string | null
  responsavelId: number | null
  clienteId: number | null
  prazo: string
  prazoFatal: boolean
}

export interface ProjetoForm {
  nomeCurto: string
  nome: string
  clienteId: number | null
  area: string | null
  responsavelId: number | null
  prazo: string | null
  cor: string
  descricao: string
}

export interface PatchTarefaUI {
  titulo?: string
  descricao?: string | null
  projetoId?: number | null
  grupo?: string | null
  responsavelId?: number | null
  clienteId?: number | null
  prazoFatal?: boolean
  recur?: string | null
}

export interface Aviso {
  msg: string
  sub?: string[]
  acaoId?: string | null
}

export interface Acoes {
  mover: (id: number, status: TaskStatus) => void
  concluir: (id: number) => void
  atualizar: (id: number, patch: PatchTarefaUI) => void
  definirPrazo: (id: number, prazo: string) => void
  ligar: (anteriorId: number, seguinteId: number) => void
  desligar: (anteriorId: number, seguinteId: number) => void
  checklistAdicionar: (id: number, texto: string) => void
  checklistEditar: (id: number, item: ChecklistItem, patch: { texto?: string; marcado?: boolean }) => void
  checklistRemover: (id: number, item: ChecklistItem) => void
  checklistParaTarefa: (id: number, item: ChecklistItem) => void
  excluir: (id: number) => void
  /** Cria uma cópia; `abrir` troca o detalhe aberto pela cópia. */
  duplicar: (id: number, abrir?: boolean) => void
  novaTarefa: () => void
  criar: (n: NovaTarefaUI) => Promise<boolean>
  criarProjeto: (v: ProjetoForm) => Promise<number | null>
  editarProjeto: (id: number, v: Partial<ProjetoForm> & { arquivado?: boolean }, msg?: string) => Promise<boolean>
  excluirProjeto: (id: number) => void
  criarDeModelo: (
    modeloId: number,
    v: ProjetoForm,
    grupos: GrupoWizard[],
    responsaveis: Record<string, number | null>,
  ) => Promise<number | null>
  abrirProjeto: (id: number) => void
  /** Nova ordem manual (de quem está vendo) para uma lista de cartões; liga o "Ordenar: Manual". */
  reordenar: (ids: number[]) => void
  recarregar: () => Promise<void>
  avisar: (a: Aviso) => void
  erro: (e: unknown) => void
}

export interface TkCtxValue {
  tarefas: TaskRow[]
  map: Map<number, TaskRow>
  seguintes: Map<number, number[]>
  projetos: ProjetoRow[]
  projetosAtivos: ProjetoRow[]
  projeto: (id: number | null) => ProjetoRow | null
  pessoas: TeamMember[]
  pessoa: (id: number | null) => TeamMember | null
  nomePessoa: (id: number | null) => string
  clientes: IdNome[]
  cliente: (id: number | null) => IdNome | null
  clienteDoProjeto: (projetoId: number) => number | null
  modelos: ModeloView[]
  hoje: string
  meId: number | null
  gestao: boolean
  podeProjeto: boolean
  podeModelo: boolean
  mobile: boolean
  act: Acoes
  openTask: (id: number | null) => void
  /** Posição manual desta pessoa para a tarefa (sem posição = undefined). */
  ordemManual: (id: number) => number | undefined
  dragging: number | null
  setDragging: (id: number | null) => void
  portal: HTMLElement | null
}

export const TkCtx = createContext<TkCtxValue | null>(null)

export function useTk(): TkCtxValue {
  const v = useContext(TkCtx)
  if (!v) throw new Error("useTk fora do TarefasApp")
  return v
}

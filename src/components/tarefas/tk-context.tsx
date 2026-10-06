"use client"

// Contexto do módulo Tarefas: a carga (tarefas, casos, pessoas…), os índices
// derivados, quem está vendo e as AÇÕES (cada uma espelha um endpoint e mostra o
// aviso com "Desfazer"). O CASO é o "projeto" do quadro. Montado por TarefasApp.
import { createContext, useContext } from "react"
import type { CasoQuadro, ChecklistItem, IdNome, ModeloView, TaskRow, TaskStatus, TeamMember } from "@/lib/tarefas/types"
import type { GrupoWizard } from "@/lib/modelos/modelo"

export interface NovaTarefaUI {
  titulo: string
  casoId: number | null
  grupo?: string | null
  responsavelId: number | null
  clienteId: number | null
  prazo: string
  prazoFatal: boolean
}

/** "Novo caso…" pelo quadro (o cadastro completo do caso fica em /casos). */
export interface CasoQuadroForm {
  nomeCurto: string
  nome: string // título do caso
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
  casoId?: number | null
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
  criarCaso: (v: CasoQuadroForm) => Promise<number | null>
  /** Aplica um modelo a um caso NOVO (`caso`) ou EXISTENTE (`casoId`); devolve o id do caso. */
  usarModelo: (
    modeloId: number,
    alvo: { caso: CasoQuadroForm } | { casoId: number },
    grupos: GrupoWizard[],
    responsaveis: Record<string, number | null>,
  ) => Promise<number | null>
  /** Mostra o quadro filtrado por este caso. */
  abrirCaso: (id: number) => void
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
  casos: CasoQuadro[]
  /** Casos que podem receber tarefas: não arquivados e acessíveis a quem está vendo. */
  casosAtivos: CasoQuadro[]
  /** Casos com alguma tarefa (filtros, raias). */
  casosComTarefas: CasoQuadro[]
  caso: (id: number | null) => CasoQuadro | null
  pessoas: TeamMember[]
  pessoa: (id: number | null) => TeamMember | null
  nomePessoa: (id: number | null) => string
  clientes: IdNome[]
  cliente: (id: number | null) => IdNome | null
  clienteDoCaso: (casoId: number) => number | null
  /** Quem está vendo pode abrir a página deste caso? */
  podeAbrirCaso: (id: number | null) => boolean
  modelos: ModeloView[]
  hoje: string
  meId: number | null
  gestao: boolean
  podeCriarCaso: boolean
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

"use client"

// Contexto do módulo Tarefas: a carga (tarefas, projetos, pessoas…), os índices
// derivados, quem está vendo e as AÇÕES (cada uma espelha um endpoint e mostra o
// aviso com "Desfazer"). O "projeto" do quadro é o caso de um cliente OU um
// projeto interno do escritório (chave `c<id>` / `p<id>`). As informações
// FIXADAS (do cliente, do caso ou do projeto) aparecem nas tarefas deles.
// Montado por TarefasApp.
import { createContext, useContext } from "react"
import type { Ancora, InformacaoRow } from "@/lib/informacoes/core"
import type { TfIconName } from "./tf-icons"
import type { ChaveProjeto, ChecklistItem, IdNome, ModeloView, ProjetoQuadro, TaskRow, TaskStatus, TeamMember } from "@/lib/tarefas/types"
import type { GrupoWizard } from "@/lib/modelos/modelo"

export interface NovaTarefaUI {
  titulo: string
  projeto: ChaveProjeto | null
  grupo?: string | null
  responsavelId: number | null
  clienteId: number | null
  prazo: string
  prazoFatal: boolean
}

/**
 * "Novo projeto" pelo quadro: COM cliente vira um caso do cliente (o cadastro
 * completo fica em /casos); SEM cliente, um projeto interno.
 */
export interface ProjetoForm {
  nomeCurto: string
  nome: string // título do caso / nome do projeto interno
  clienteId: number | null
  area: string | null // só caso
  responsavelId: number | null
  prazo: string | null
  cor: string
  descricao: string
}

/** Editar/arquivar um projeto interno (o caso se edita em /casos). */
export interface PatchProjetoUI {
  nomeCurto?: string
  nome?: string
  responsavelId?: number | null
  prazo?: string | null
  cor?: string | null
  descricao?: string | null
  arquivado?: boolean
}

export interface PatchTarefaUI {
  titulo?: string
  descricao?: string | null
  projeto?: ChaveProjeto | null
  grupo?: string | null
  responsavelId?: number | null
  clienteId?: number | null
  prazoFatal?: boolean
  recur?: string | null
}

/** Janela de informação: fixar uma nova (sobre uma das âncoras) ou editar uma existente. */
export type AbrirInformacao = { ancoras: Ancora[]; texto?: string; origemTarefaId?: number | null } | { info: InformacaoRow }

/** Onde a alteração aconteceu — clicar no aviso leva até lá. */
export type AlvoAviso = { tarefa: number } | { projeto: ChaveProjeto } | { pagina: "projetos" | "modelos" }

export interface Aviso {
  msg: string
  sub?: string[]
  acaoId?: string | null
  /** Ícone do tipo de alteração (padrão: check; erro: alerta). */
  icon?: TfIconName
  tom?: "ok" | "erro"
  alvo?: AlvoAviso
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
  /** Novo projeto: com cliente → caso do cliente; sem cliente → projeto interno. */
  criarProjeto: (v: ProjetoForm) => Promise<ChaveProjeto | null>
  editarProjeto: (id: number, patch: PatchProjetoUI) => Promise<boolean>
  excluirProjeto: (id: number) => Promise<boolean>
  /** Vincula um projeto interno a um cliente: ele vira caso. Devolve o id do caso. */
  converterProjeto: (id: number, clienteId: number) => Promise<number | null>
  /** Aplica um modelo a um projeto NOVO (`novo`) ou EXISTENTE (`projeto`); devolve a chave. */
  usarModelo: (
    modeloId: number,
    alvo: { novo: ProjetoForm } | { projeto: ChaveProjeto },
    grupos: GrupoWizard[],
    responsaveis: Record<string, number | null>,
  ) => Promise<ChaveProjeto | null>
  /** Mostra o quadro filtrado por este projeto. */
  abrirProjeto: (chave: ChaveProjeto) => void
  /** Abre a janela de edição de um projeto interno. */
  editarProjetoInterno: (id: number) => void
  /** Fixa uma informação nova num cliente, caso ou projeto interno. */
  criarInformacao: (v: { ancora: Ancora; conteudo: string; origemTarefaId?: number | null }) => Promise<boolean>
  /** Edita o texto e/ou (des)fixa. */
  editarInformacao: (info: InformacaoRow, patch: { conteudo?: string; fixado?: boolean }) => Promise<boolean>
  excluirInformacao: (info: InformacaoRow) => void
  abrirInformacao: (v: AbrirInformacao) => void
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
  projetos: ProjetoQuadro[]
  /** Projetos que podem receber tarefas: não arquivados e acessíveis a quem está vendo. */
  projetosAtivos: ProjetoQuadro[]
  /** Projetos com alguma tarefa (filtros, raias). */
  projetosComTarefas: ProjetoQuadro[]
  projeto: (chave: ChaveProjeto | null | undefined) => ProjetoQuadro | null
  pessoas: TeamMember[]
  pessoa: (id: number | null) => TeamMember | null
  nomePessoa: (id: number | null) => string
  clientes: IdNome[]
  cliente: (id: number | null) => IdNome | null
  clienteDoProjeto: (chave: ChaveProjeto) => number | null
  /** Quem está vendo pode abrir este projeto (caso: escopo de acesso; interno: sempre)? */
  podeAbrirProjeto: (chave: ChaveProjeto | null | undefined) => boolean
  /** Informações fixadas da tarefa: as do projeto, depois as do cliente efetivo. */
  fixadasDaTarefa: (t: Pick<TaskRow, "projeto" | "clienteId">) => InformacaoRow[]
  /** Fixadas de algumas âncoras, na ordem dada. */
  fixadasDe: (ancoras: Ancora[]) => InformacaoRow[]
  /** Nome do cliente / caso / projeto de uma âncora. */
  nomeAncora: (a: Ancora) => string
  modelos: ModeloView[]
  hoje: string
  meId: number | null
  gestao: boolean
  podeCriarProjeto: boolean
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

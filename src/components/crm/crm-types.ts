// CRM client types. Backend view-models are imported TYPE-ONLY (fully erased at
// compile → no server/prisma code reaches the client bundle). Workspace/route
// types are defined here.
import type { CasoRow, ContaOption, ContratoRow, IdNome, SocioConta } from "@/lib/finance/types"
import type { ClienteRow } from "@/lib/finance/types"

export type { ClienteDetail, ClienteCasoRow, ClienteTarefaRow } from "@/lib/clientes/types"
export type { ProcessoMini } from "@/lib/processos/types"
export type { CasoDetail, CasoTarefaRow, CasoFinanceiro } from "@/lib/casos/types"
export type { HonorarioDetail, HonorarioRow, ContratoRow, LancamentoRow, CasoRow, SocioConta, ContaOption, IdNome, CasoResponsavelInfo } from "@/lib/finance/types"
export type { AgendaDataset, EventoRow, AgendaTarefaRow, EventoTipo } from "@/lib/agenda/types"
export type { DocumentoRow } from "@/lib/documentos/types"
export type { LexiaConversaRow, LexiaConversaDetail, LexiaMensagemRow, LexiaChatResult } from "@/lib/lexia/types"
export type { SearchResults } from "@/lib/search"
export type { UserRow } from "@/lib/users/types"
export type { EscritorioConfig, ImportacaoInfo, ModulosConfig, NotificacoesConfig } from "@/lib/settings"

export type Role = "admin" | "socio" | "advogado" | "estagiario" | "financeiro" | "staff"

/** Lists fetched once on the server and handed to the client workspace. Detail
 *  panes/modals fetch on demand via the [id] routes. */
export interface CrmDataset {
  clientes: ClienteRow[]
  casos: CasoRow[]
  contratos: ContratoRow[]
  socios: SocioConta[]
  clienteOptions: IdNome[]
  casoOptions: IdNome[]
  contaOptions: ContaOption[]
  role: Role
  userName: string
  userEmail: string
}

// ── workspace (Notion-style tabs + split) ──
export type CrmPage = "clientes" | "cliente" | "casos" | "contratos" | "agenda"
export type ClienteTab = "financeiro" | "tarefas" | "casos" | "contratos" | "eventos" | "documentos" | "cobranca"

export interface CrmRoute {
  page: CrmPage
  clienteId?: number
  clienteTab?: ClienteTab
}
export interface CrmTab {
  id: string
  route: CrmRoute
}
export interface CrmPane {
  id: string
  tabs: CrmTab[]
  activeId: string
}
export interface CrmWorkspace {
  panes: CrmPane[]
  active: number
  split: number
}

/** Sidebar nav item: CRM pages open as workspace tabs; external items are real routes. */
export interface CrmNavDef {
  id: string
  icon: string
  label: string
  badge?: number
  socioPlus?: boolean
  /** When set, sidebar click navigates to this route (leaves the workspace). */
  href?: string
  /** When set, sidebar click opens this CRM page as a tab in the workspace. */
  page?: CrmPage
}

/** Workspace controller — stable object wrapping the ws state setter. */
export interface CrmCtl {
  select: (pi: number, tid: string) => void
  focus: (pi: number) => void
  navInPane: (pi: number, route: CrmRoute, opts?: { newTab?: boolean }) => void
  navCurrent: (route: CrmRoute, opts?: { newTab?: boolean }) => void
  patchTab: (pi: number, tid: string, patch: Partial<CrmRoute>) => void
  duplicate: (pi: number, tid: string) => void
  close: (pi: number, tid: string) => void
  closeOthers: (pi: number, tid: string) => void
  openBeside: (pi: number, tid: string) => void
  moveOther: (pi: number, tid: string) => void
  setSplit: (r: number) => void
}

/** Per-pane navigation helpers passed to page components. */
export interface CrmNav {
  navPage: (page: CrmPage) => void
  openCliente: (id: number) => void
  openClienteTab: (id: number, tab: ClienteTab) => void
  openCaso: (id: number) => void
  openContrato: (id: number) => void
  openProcesso: (id: number) => void
}

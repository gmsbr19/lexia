"use client"

// CRM client API — typed wrappers over apiSend for every detail fetch + mutation
// the workspace, pages and overlays use. GET endpoints return data directly;
// mutation endpoints (runMutation) return { ok, result } → unwrapped to result.
import { apiSend } from "@/lib/client/api"
import type { ConsumoData, ConsumoInterno, ConsumoOrcamento, ConsumoPeriodo } from "@/lib/consumo/types"
import type {
  AgendaDataset,
  CasoDetail,
  ClienteDetail,
  DocumentoRow,
  EscritorioConfig,
  HonorarioDetail,
  ImportacaoInfo,
  LexiaConversaDetail,
  LexiaConversaRow,
  SearchResults,
  UserRow,
} from "./crm-types"

const get = <T>(url: string) => apiSend<T>(url, "GET")
const mut = async <T = unknown>(url: string, method: string, body?: unknown): Promise<T> => {
  const r = await apiSend<{ ok: boolean; result: T }>(url, method, body)
  return r.result
}

// ── detail fetches ──
export const fetchClienteDetail = (id: number) => get<ClienteDetail>(`/api/clientes/${id}`)
export const fetchCasoDetail = (id: number) => get<CasoDetail>(`/api/casos/${id}`)
export const fetchHonorarioDetail = (id: number) => get<HonorarioDetail>(`/api/financeiro/honorarios/${id}`)
export const fetchAgenda = (de: string, ate: string) => get<AgendaDataset>(`/api/agenda?de=${de}&ate=${ate}`)
export const fetchDocumentos = (clienteId: number) => get<DocumentoRow[]>(`/api/documentos?clienteId=${clienteId}`)
export const searchAll = (q: string) => get<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`)

// ── cliente mutations ──
export const createCliente = (body: unknown) => mut(`/api/clientes`, "POST", body)
export const patchCliente = (id: number, body: unknown) => mut(`/api/clientes/${id}`, "PATCH", body)
export const anonimizarCliente = (id: number) => mut(`/api/clientes/${id}/anonimizar`, "POST")

// ── cobrança & anotações ──
export const addAnotacaoCliente = (id: number, body: { conteudo: string; fixado?: boolean }) =>
  mut(`/api/clientes/${id}/anotacoes`, "POST", body)
export const deleteAnotacaoCliente = (clienteId: number, anotacaoId: number) =>
  mut(`/api/clientes/${clienteId}/anotacoes/${anotacaoId}`, "DELETE")
export const setCobranca = (
  id: number,
  body:
    | { acao: "pausar"; motivo: string; dias?: number; ate?: string | null }
    | { acao: "suspender"; motivo: string }
    | { acao: "retomar"; motivo?: string },
) => mut(`/api/clientes/${id}/cobranca`, "POST", body)

// ── caso mutations ──
export const patchCaso = (id: number, body: unknown) => mut(`/api/casos/${id}`, "PATCH", body)
export const setResponsaveis = (id: number, responsaveis: { contaId: number; percentual: number }[]) =>
  mut(`/api/financeiro/casos/${id}/responsaveis`, "PATCH", { responsaveis })

// ── honorário (contrato) mutations ──
export const pagarHonorario = (id: number, contaId: number, dataPagamento?: string | null) =>
  mut(`/api/financeiro/honorarios/${id}/pagar`, "POST", { contaId, dataPagamento: dataPagamento ?? null })
export const desmarcarHonorario = (id: number) => mut(`/api/financeiro/honorarios/${id}/desmarcar`, "POST")
export const patchHonorario = (id: number, body: unknown) => mut(`/api/financeiro/honorarios/${id}`, "PATCH", body)
export const createHonorario = (body: unknown) => mut(`/api/financeiro/honorarios`, "POST", body)

// ── lançamento mutations ──
export const pagarLancamento = (id: number, dataPagamento?: string | null) =>
  mut(`/api/financeiro/lancamentos/${id}/pagar`, "POST", { dataPagamento: dataPagamento ?? null })
export const reabrirLancamento = (id: number) => mut(`/api/financeiro/lancamentos/${id}/reabrir`, "POST")
export const createLancamento = (body: unknown) => mut(`/api/financeiro/lancamentos`, "POST", body)

// ── tarefa mutations ──
export const createTarefa = (body: unknown) => mut(`/api/tarefas`, "POST", body)
export const patchTarefa = (id: number, body: unknown) => mut(`/api/tarefas/${id}`, "PATCH", body)
export const deleteTarefa = (id: number) => mut(`/api/tarefas/${id}`, "DELETE")

// ── evento mutations ──
export const createEvento = (body: unknown) => mut(`/api/eventos`, "POST", body)
export const patchEvento = (id: number, body: unknown) => mut(`/api/eventos/${id}`, "PATCH", body)
export const deleteEvento = (id: number) => mut(`/api/eventos/${id}`, "DELETE")

// ── documento mutations ──
export const createDocumento = (body: unknown) => mut(`/api/documentos`, "POST", body)

// ── LexIA chat ──
export const lexiaConversas = () => get<LexiaConversaRow[]>(`/api/lexia/conversas`)
export const lexiaConversa = (id: number) => get<LexiaConversaDetail>(`/api/lexia/conversas/${id}`)
// Chat itself streams over SSE — see src/components/lexia/useLexiaStream (not apiSend).
export const lexiaNewConversa = (titulo?: string) => mut<{ id: number; titulo: string | null }>(`/api/lexia/conversas`, "POST", { titulo: titulo ?? null })
export const lexiaRenameConversa = (id: number, titulo: string) => mut(`/api/lexia/conversas/${id}`, "PATCH", { titulo })
export const lexiaDeleteConversa = (id: number) => mut(`/api/lexia/conversas/${id}`, "DELETE")

// ── settings / users / audit (admin/socio) ──
export const getEscritorio = () => get<EscritorioConfig>(`/api/settings/escritorio`)
export const putEscritorio = (body: EscritorioConfig) => mut(`/api/settings/escritorio`, "PUT", body)
export const getImportacao = () => get<ImportacaoInfo>(`/api/settings/importacao`)
export const getConsumo = (periodo: ConsumoPeriodo, force = false) =>
  get<ConsumoData>(`/api/consumo?periodo=${periodo}${force ? "&force=1" : ""}`)
export const getConsumoInterno = (periodo: ConsumoPeriodo) =>
  get<ConsumoInterno>(`/api/consumo/interno?periodo=${periodo}`)
export const putOrcamentoConsumo = (body: ConsumoOrcamento) => mut(`/api/consumo/orcamento`, "PUT", body)
/** Resultado da emissão de convite (criação ou reenvio). `conviteLink` é null
 *  quando APP_BASE_URL/AUTH_URL não estão configurados; `emailEnviado` é false
 *  sem SMTP → o admin copia o link manualmente. */
export type ConviteResult = { conviteLink: string | null; emailEnviado: boolean }
export type CreateUserResult = { id: number; email: string; nome: string } & ConviteResult

export const listUsers = () => get<UserRow[]>(`/api/users`)
export const createUser = (body: { email: string; nome: string; role?: string }) =>
  mut<CreateUserResult>(`/api/users`, "POST", body)
export const reenviarConvite = (id: number) => mut<ConviteResult>(`/api/users/${id}/convite`, "POST")
/** Diagnóstico (admin): dispara um e-mail de teste e devolve backend + erro bruto. */
export type EmailTesteResult = { ok: boolean; backend: "graph" | "smtp" | "noop"; to?: string; detalhe?: string }
export const enviarEmailTeste = (to?: string) =>
  apiSend<EmailTesteResult>(`/api/email/teste`, "POST", to ? { to } : {})
export const patchUser = (id: number, body: unknown) => mut(`/api/users/${id}`, "PATCH", body)
export const deleteUser = (id: number) => mut(`/api/users/${id}`, "DELETE")
export const patchMe = (body: unknown) => mut(`/api/users/me`, "PATCH", body)
export type AuditRow = { id: number; ts: string; actorEmail: string; action: string; entity: string | null; entityId: string | null }
export const getAudit = (q?: string) => get<AuditRow[]>(`/api/audit${q ? `?q=${encodeURIComponent(q)}` : ""}`)

// ── áreas do direito (admin) ──
export type AreaComUsoResult = {
  id: number; chave: string; nome: string; cor: string | null; icone: string | null
  ordem: number; ativo: boolean; projetos: number; casos: number; leads: number; campanhas: number
}
export const listAreasComUso = () => get<AreaComUsoResult[]>(`/api/areas/uso`)
export const createAreaAdmin = (body: { nome: string; chave?: string; cor?: string | null; icone?: string | null; ordem?: number }) =>
  mut(`/api/areas`, "POST", body)
export const patchAreaAdmin = (id: number, body: unknown) => mut(`/api/areas/${id}`, "PATCH", body)
export const deleteAreaAdmin = (id: number) => mut(`/api/areas/${id}`, "DELETE")

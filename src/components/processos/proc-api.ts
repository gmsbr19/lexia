"use client"

// Processos (Contencioso) client API — typed wrappers over apiSend for the
// module's mutations + the prazo preview. Mutation routes (runMutation) return
// { ok, result } → unwrapped to result; the preview route returns bare JSON.
import { apiSend } from "@/lib/client/api"
import type { AlertaProcesso, SaudeProcessos } from "@/lib/processos/saude"
import type { ResumoProcesso } from "@/lib/processos/resumo-ai"

const mut = async <T = unknown>(url: string, method: string, body?: unknown): Promise<T> => {
  const r = await apiSend<{ ok: boolean; result: T }>(url, method, body)
  return r.result
}

// ── resumo IA por processo (apoio à decisão; cacheado/regenerável) ──
// Both routes return the bare ResumoProcesso (NOT a runMutation envelope).
export const getResumo = (processoId: number) =>
  apiSend<ResumoProcesso>(`/api/processos/${processoId}/resumo`, "GET")
export const regenerarResumo = (processoId: number) =>
  apiSend<ResumoProcesso>(`/api/processos/${processoId}/resumo`, "POST")

// ── alertas (processos parados / prazos em risco / inconsistências) ──
export const getAlertas = () => apiSend<AlertaProcesso[]>(`/api/processos/alertas`, "GET")

// ── saúde / consistência (read-only) + dispensa de sugestão ──
export const getSaude = () => apiSend<SaudeProcessos>(`/api/processos/saude`, "GET")
export const dispensarSugestao = (chave: string, dias?: number | null) =>
  mut(`/api/sugestoes/dispensar`, "POST", { chave, dias })

// ── prazo preview (read-only compute; NOT a runMutation → bare JSON) ──
export interface PrazoPreviewBody {
  quantidadeDias: number
  diasMargem?: number
  tipoContagem?: string
  jurisdicao?: string | null
  dataInicio?: string
  dataPublicacao?: string
  dataDisponibilizacao?: string
}
export interface PrazoPreviewResult {
  dataInicio: string
  dataFatal: string
  dataInterna: string
  dataPublicacao: string | null
  tipoContagem: string
  diasMargem: number
}
export const previewPrazo = (processoId: number, body: PrazoPreviewBody) =>
  apiSend<PrazoPreviewResult>(`/api/processos/${processoId}/prazos/preview`, "POST", body)

// ── prazo mutations ──
export const createPrazo = (processoId: number, body: unknown) => mut(`/api/processos/${processoId}/prazos`, "POST", body)
export const cumprirPrazo = (id: number, data?: string | null) =>
  mut(`/api/prazos/${id}/cumprir`, "POST", { data: data ?? undefined })
export const reabrirPrazo = (id: number) => mut(`/api/prazos/${id}/reabrir`, "POST")
// prazos propostos pela IA → confirmar (vira pendente) / rejeitar (cancela)
export const confirmarPrazo = (id: number, body?: unknown) => mut(`/api/prazos/${id}/confirmar`, "POST", body ?? {})
export const rejeitarPrazo = (id: number) => mut(`/api/prazos/${id}/rejeitar`, "POST")
export const proporPrazos = () =>
  mut<{ arquivados: number; propostos: number; relevantesSemProposta: number }>(`/api/processos/propor-prazos`, "POST")

// ── publicação triagem (relevante → gera prazo; descartar → cartorário) ──
export interface TriagemBody {
  acao: "relevante" | "descartar"
  prazo?: {
    descricao: string
    tipo?: string | null
    quantidadeDias: number
    diasMargem?: number
    responsavelUserId?: number | null
  }
  criarEvento?: boolean
}
export const triarPublicacao = (id: number, body: TriagemBody) =>
  mut<{ publicacaoId: number; prazoId: number | null }>(`/api/publicacoes/${id}/triagem`, "POST", body)
export const reabrirTriagem = (id: number) => mut(`/api/publicacoes/${id}/reabrir`, "POST")
export const createPublicacao = (body: unknown) => mut(`/api/publicacoes`, "POST", body)

// ── vinculação de publicação (apoio IA + manual) ──
export interface PartePrevistaC {
  nome: string
  papel: string
}
export interface CasoSugeridoC {
  id: number
  titulo: string
  cliente: string | null
  via: string
}
export interface SugestaoVinculoC {
  numeroCnj: string | null
  prefill: { tribunal: string | null; uf: string | null; classe: string | null; partes: PartePrevistaC[] }
  processoExistente: { id: number; numeroCnj: string | null; caso: string | null } | null
  casosSugeridos: CasoSugeridoC[]
  fonte: "ia" | "heuristica"
}
export const sugestaoVinculo = (id: number) =>
  apiSend<SugestaoVinculoC>(`/api/publicacoes/${id}/sugestao-vinculo`, "GET")
export const vincularPublicacao = (id: number, processoId: number) =>
  mut(`/api/publicacoes/${id}/vincular`, "POST", { processoId })
export const createCaso = (body: { titulo: string; tipo?: string }) => mut<{ id: number }>(`/api/casos`, "POST", body)

// ── processo CRUD ──
export const createProcesso = (body: unknown) => mut<{ id: number }>(`/api/processos`, "POST", body)
export const updateProcesso = (id: number, body: unknown) => mut(`/api/processos/${id}`, "PATCH", body)
export const deleteProcesso = (id: number) => mut(`/api/processos/${id}`, "DELETE")
export const createAnotacao = (body: unknown) => mut(`/api/anotacoes`, "POST", body)

// ── delete de prazo / publicação / andamento (soft) ──
export const deletePrazo = (id: number) => mut(`/api/prazos/${id}`, "DELETE")
export const updatePrazo = (id: number, body: unknown) => mut(`/api/prazos/${id}`, "PATCH", body)
export const deletePublicacao = (id: number) => mut(`/api/publicacoes/${id}`, "DELETE")
export const deleteAndamento = (id: number) => mut(`/api/andamentos/${id}`, "DELETE")

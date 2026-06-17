"use client"

// Processos (Contencioso) client API — typed wrappers over apiSend for the
// module's mutations + the prazo preview. Mutation routes (runMutation) return
// { ok, result } → unwrapped to result; the preview route returns bare JSON.
import { apiSend } from "@/lib/client/api"
import type { AlertaProcesso, SaudeProcessos } from "@/lib/processos/saude"
import type { ResumoProcesso } from "@/lib/processos/resumo-ai"
import type { TriagemSugestao } from "@/lib/processos/triagem-ai"
import type { AndamentoRow, MovimentoInboxRow } from "@/lib/processos/types"

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

// ── movimentos capturados (andamentos) — fila de revisão POR PROCESSO ──
export const listMovimentosInbox = () => apiSend<MovimentoInboxRow[]>(`/api/processos/movimentos`, "GET")
export const getMovimentosNovos = (pid: number) => apiSend<AndamentoRow[]>(`/api/processos/${pid}/movimentos`, "GET")
export const sugestaoTriagem = (id: number) => apiSend<TriagemSugestao>(`/api/andamentos/${id}/sugestao-triagem`, "GET")
export const revisarAndamento = (id: number) => mut(`/api/andamentos/${id}/revisar`, "POST")
export const revisarProcessoMovimentos = (pid: number) => mut(`/api/processos/${pid}/movimentos`, "POST")
export const gerarPrazoAndamento = (id: number, body: unknown) => mut(`/api/andamentos/${id}/gerar-prazo`, "POST")

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

// ── captura CNJ (OABs + status + rodada) ──
export interface OabRowC {
  id: number
  numero: string
  uf: string
  advogadoNome: string | null
  ativo: boolean
  createdAt: string
}
export interface ExecucaoCapturaRowC {
  id: number
  fonte: string
  escopo: string
  status: string // 'ok' | 'erro' | 'dry-run'
  iniciadoEm: string
  finalizadoEm: string | null
  janelaDe: string | null
  janelaAte: string | null
  encontrados: number
  criados: number
  ignorados: number
  semVinculo: number
  erro: string | null
}
export interface CapturaFonteStatusC {
  ultima: ExecucaoCapturaRowC | null
  falhasRecentes: ExecucaoCapturaRowC[]
  total: number
}
export interface CapturaStatusResponse {
  comunica: CapturaFonteStatusC
  datajud: CapturaFonteStatusC
  execucoes: ExecucaoCapturaRowC[]
  oabs: OabRowC[]
}
export interface ResumoCapturaC {
  fonte: string
  dryRun: boolean
  escopos: number
  encontrados: number
  criados: number
  ignorados: number
  semVinculo: number
  falhas: number
}
export interface RunCapturaBody {
  fonte?: "comunica" | "datajud" | "ambas"
  dryRun?: boolean
  desde?: string
}

// status/list routes return bare JSON (não passam por runMutation)
export const capturaStatus = () => apiSend<CapturaStatusResponse>(`/api/processos/captura/status`, "GET")
export const listOabs = () => apiSend<OabRowC[]>(`/api/processos/oabs`, "GET")

export const createOab = (body: { numero: string; uf: string; advogadoNome?: string | null; ativo?: boolean }) =>
  mut(`/api/processos/oabs`, "POST", body)
export const updateOab = (id: number, body: { advogadoNome?: string | null; ativo?: boolean }) =>
  mut(`/api/processos/oabs/${id}`, "PATCH", body)
export const deleteOab = (id: number) => mut(`/api/processos/oabs/${id}`, "DELETE")
export const runCaptura = (body: RunCapturaBody) =>
  mut<{ intimacoes?: ResumoCapturaC; andamentos?: ResumoCapturaC }>(`/api/processos/captura/run`, "POST", body)

// Documentos — generated-document metadata shapes. The binary itself stays an
// ephemeral download; `payload` (returned only by the detail query) keeps the
// editor form data so a documento can be re-opened / regenerated.
import type { Role } from "@/lib/auth/session"
import type { PlaceholderDecl } from "@/lib/documents/model/placeholders"

// Lifecycle: rascunho (editing) → finalizado (file generated) → enviado (sent
// for signature) → fechado (signed; honorários launched into the finance ledger).
export const DOCUMENTO_STATUS = ["rascunho", "finalizado", "enviado", "fechado"] as const
export type DocumentoStatus = (typeof DOCUMENTO_STATUS)[number]

export const DOCUMENTO_STATUS_LABEL: Record<DocumentoStatus, string> = {
  rascunho: "Rascunho",
  finalizado: "Finalizado",
  enviado: "Em assinatura",
  fechado: "Fechado",
}

export type DocumentoFormato = "docx" | "pdf"

export interface DocumentoRow {
  id: number
  nome: string
  template: string // generator key, e.g. 'contrato-honorarios'
  formato: DocumentoFormato | null // last generated format (null while rascunho)
  status: DocumentoStatus
  clienteId: number | null
  cliente: string | null
  casoId: number | null
  caso: string | null
  criadoPor: string | null
  criadoEm: string // ISO
  atualizadoEm: string // ISO
}

export interface DocumentoDetail extends DocumentoRow {
  payload: unknown | null // parsed JSON form data of the legacy structured contract
  conteudo: unknown | null // parsed LexDoc JSON (rich-text body of a flexible doc)
  valores: Record<string, string> | null // placeholder values
  templateId: number | null
  timbradoId: number | null
}

// ── flexible templates + letterheads (Fase 1) ─────────────────────────────────

/** Managing templates + letterheads is a sócio/admin task (admin always passes). */
export const ROLES_DOC_GESTAO: Role[] = ["socio"]

export const DOC_CATEGORIAS = [
  "Contrato",
  "Procuração",
  "Proposta",
  "Parecer Jurídico",
  "Outro",
] as const
export type DocCategoria = (typeof DOC_CATEGORIAS)[number]

export interface TemplateRow {
  id: number
  chave: string | null
  nome: string
  categoria: string
  descricao: string | null
  tipoEstruturado: string | null // structured/"smart" template marker
  timbradoId: number | null
  icone: string | null
  destaque: boolean
  ativo: boolean
  usoCount: number
  ordem: number
  placeholderCount: number
  criadoEm: string
  atualizadoEm: string
}

export interface TemplateDetail extends TemplateRow {
  conteudo: unknown | null // LexDoc JSON
  placeholders: PlaceholderDecl[]
}

export interface TimbradoRow {
  id: number
  nome: string
  mimeType: string | null
  margemTop: number
  margemRight: number
  margemBottom: number
  margemLeft: number
  padrao: boolean
  criadoEm: string
}

export interface TimbradoDetail extends TimbradoRow {
  imagem: string // data URL (heavy — only returned in detail)
}

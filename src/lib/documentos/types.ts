// Documentos — generated-document metadata shapes. The binary itself stays an
// ephemeral download; `payload` (returned only by the detail query) keeps the
// editor form data so a documento can be re-opened / regenerated.

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
  payload: unknown | null // parsed JSON form data (ContratoHonorariosData etc.)
}

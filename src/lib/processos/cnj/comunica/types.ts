// Shapes of the Comunica/DJEN response (GET https://comunicaapi.pje.jus.br/api/v1/comunicacao).
// Modeled from a REAL public response captured during recon (2026-06-13). Fields are
// optional/loose because the API is beta and presence varies; only what we consume
// is typed. Note the snake_case on nested fields (numero_oab/uf_oab) vs the camelCase
// query params (numeroOab/ufOab).
export interface ComunicaAdvogado {
  id?: number
  nome?: string
  numero_oab?: string
  uf_oab?: string
}
export interface ComunicaDestinatarioAdvogado {
  advogado?: ComunicaAdvogado | null
}
export interface ComunicaDestinatario {
  nome?: string
  polo?: string // "A" = ativo | "P" = passivo
}
export interface ComunicaItem {
  id?: number // PK numérico estável
  hash?: string // token estável — chave de dedup preferida
  numeroComunicacao?: number
  numero_processo?: string // CNJ sem máscara
  numeroprocessocommascara?: string
  data_disponibilizacao?: string // "YYYY-MM-DD" — DISPARA a contagem de prazo
  siglaTribunal?: string
  nomeOrgao?: string
  tipoComunicacao?: string // ex.: "Intimação"
  tipoDocumento?: string
  meio?: string // "D" (DJEN) | "E" (edital)
  meiocompleto?: string // ex.: "Diário de Justiça Eletrônico Nacional"
  texto?: string // inteiro teor da publicação
  link?: string
  nomeClasse?: string
  destinatarios?: ComunicaDestinatario[]
  destinatarioadvogados?: ComunicaDestinatarioAdvogado[]
}
export interface ComunicaResposta {
  status?: string
  message?: string
  count?: number // total de registros da consulta (satura em 10000 p/ consultas amplas)
  items?: ComunicaItem[]
}

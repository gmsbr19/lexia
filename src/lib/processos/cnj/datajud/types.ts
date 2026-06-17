// Shapes of the DataJud _search response (hits.hits[]._source). Modeled from the
// official wiki example (TRF1). Fields optional — presence varies per tribunal.
// Datas em ISO-Z (UTC).
export interface DataJudCodigoNome {
  codigo?: number
  nome?: string
}
export interface DataJudComplemento {
  codigo?: number
  valor?: number
  nome?: string
  descricao?: string
}
export interface DataJudMovimento {
  codigo?: number
  nome?: string
  dataHora?: string // ISO-Z
  complementosTabelados?: DataJudComplemento[]
}
export interface DataJudOrgao {
  codigo?: number
  nome?: string
  codigoMunicipioIBGE?: number
}
export interface DataJudSource {
  numeroProcesso?: string // 20 dígitos, sem máscara
  classe?: DataJudCodigoNome
  sistema?: DataJudCodigoNome
  formato?: DataJudCodigoNome
  tribunal?: string
  grau?: string
  dataAjuizamento?: string
  dataHoraUltimaAtualizacao?: string
  orgaoJulgador?: DataJudOrgao
  assuntos?: DataJudCodigoNome[]
  movimentos?: DataJudMovimento[]
  id?: string
}
export interface DataJudHit {
  _id?: string
  _source?: DataJudSource
  sort?: unknown[]
}
export interface DataJudResposta {
  hits?: {
    total?: { value?: number }
    hits?: DataJudHit[]
  }
}

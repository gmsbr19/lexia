// Thin client for the DataJud public API. Consulta a capa + movimentos de UM
// processo pelo número CNJ (1 hit). Deriva o índice do tribunal a partir do CNJ.
// SERVER ONLY. DataJud é metadados-only e defasado → alimenta Andamento, NUNCA prazo.
import { indiceDataJud } from "../../cnj-tribunal"
import { DATAJUD, datajudApiKey } from "../config"
import { fetchJsonComRetry } from "../http"
import type { DataJudResposta, DataJudSource } from "./types"

/** Lançado quando a chave pública não está configurada (config global ausente). */
export class DataJudIndisponivel extends Error {
  constructor(message = "DATAJUD_API_KEY não configurada") {
    super(message)
    this.name = "DataJudIndisponivel"
  }
}

const digits = (s: string): string => (s ?? "").replace(/\D/g, "")

/**
 * Consulta o `_source` de um processo pelo CNJ. Retorna null se não encontrado
 * ou se o segmento não tem índice público (STF/CNJ) / CNJ inválido. Lança
 * DataJudIndisponivel se a chave pública estiver ausente.
 */
export async function consultarProcesso(numeroCnj: string): Promise<DataJudSource | null> {
  const apiKey = datajudApiKey()
  if (!apiKey) throw new DataJudIndisponivel()
  const indice = indiceDataJud(numeroCnj)
  if (!indice) return null
  const url = `${DATAJUD.base}${DATAJUD.searchPath(indice)}`
  const body = JSON.stringify({ query: { match: { numeroProcesso: digits(numeroCnj) } }, size: 1 })
  const res = await fetchJsonComRetry<DataJudResposta>(url, {
    method: "POST",
    headers: { Authorization: `APIKey ${apiKey}`, "Content-Type": "application/json" },
    body,
  })
  return res.hits?.hits?.[0]?._source ?? null
}

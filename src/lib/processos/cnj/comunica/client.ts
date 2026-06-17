// Thin client for the Comunica/DJEN consult endpoint (público, sem chave).
// Pagina até `items` vir curto — NÃO confia só em `count`, que satura em 10000 p/
// consultas amplas. `onPagina` permite espaçar páginas (auto-throttle). SERVER ONLY.
import { COMUNICA } from "../config"
import { fetchJsonComRetry } from "../http"
import type { ComunicaItem, ComunicaResposta } from "./types"

export interface ConsultaOab {
  numeroOab: string // dígitos
  ufOab: string // 2 letras
  de: string // "YYYY-MM-DD" — disponibilização início
  ate: string // "YYYY-MM-DD" — disponibilização fim
  siglaTribunal?: string
}

const digits = (s: string): string => (s ?? "").replace(/\D/g, "")

export function montarUrlComunica(c: ConsultaOab, pagina: number): string {
  const p = COMUNICA.params
  const sp = new URLSearchParams()
  sp.set(p.numeroOab, digits(c.numeroOab))
  sp.set(p.ufOab, c.ufOab.toUpperCase())
  sp.set(p.dataInicio, c.de)
  sp.set(p.dataFim, c.ate)
  if (c.siglaTribunal) sp.set(p.siglaTribunal, c.siglaTribunal)
  sp.set(p.itensPorPagina, String(COMUNICA.pageSize))
  sp.set(p.pagina, String(pagina))
  return `${COMUNICA.base}${COMUNICA.path}?${sp.toString()}`
}

/**
 * Consulta TODAS as comunicações de uma OAB na janela, paginando até a última.
 * `onPagina` é chamado antes de cada página > 1 (para espaçar as requisições).
 */
export async function consultarPorOab(c: ConsultaOab, onPagina?: () => Promise<void>): Promise<ComunicaItem[]> {
  const todas: ComunicaItem[] = []
  for (let pagina = 1; pagina <= COMUNICA.maxPaginas; pagina++) {
    if (pagina > 1 && onPagina) await onPagina()
    const res = await fetchJsonComRetry<ComunicaResposta>(montarUrlComunica(c, pagina), { method: "GET" })
    const items = res.items ?? []
    todas.push(...items)
    if (items.length < COMUNICA.pageSize) break // última página
  }
  return todas
}

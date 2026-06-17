// Single source of truth for the CNJ public-API contracts (endpoints, exact param
// names, page sizes, headers). Adjusting a contract should require editing ONLY
// this file — the clients/maps read from here (prompt: "adapter/cliente fino e
// isolado, com endpoints/headers/nomes de params centralizados num único lugar").
// SERVER ONLY (reads env). All facts confirmed against the official docs / a real
// call during recon — see docs/processos-captura-cnj.md.
import { env } from "@/lib/env"

// O Comunica responde 403 a User-Agent de datacenter (WebFetch); um UA de browser
// + Accept: application/json retorna 200.
export const CNJ_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

// ── Comunica / DJEN (intimações por OAB — base de contagem de prazo) ────────────
export const COMUNICA = {
  base: "https://comunicaapi.pje.jus.br",
  path: "/api/v1/comunicacao", // GET, público (sem chave)
  // nomes EXATOS dos parâmetros (confirmados em chamada real em 2026-06-13)
  params: {
    numeroOab: "numeroOab",
    ufOab: "ufOab",
    dataInicio: "dataDisponibilizacaoInicio", // "YYYY-MM-DD"
    dataFim: "dataDisponibilizacaoFim", // "YYYY-MM-DD"
    siglaTribunal: "siglaTribunal",
    numeroProcesso: "numeroProcesso",
    pagina: "pagina", // 1-based
    itensPorPagina: "itensPorPagina",
  },
  pageSize: 1000, // máx aceito (mín 5; default 100)
  maxPaginas: 50, // guarda dura por OAB/janela
  delayEntrePaginasMs: 300, // auto-throttle (sem limite publicado)
} as const

// ── DataJud (capa/andamentos por número CNJ — metadados, NÃO conta prazo) ───────
export const DATAJUD = {
  base: "https://api-publica.datajud.cnj.jus.br",
  // índice por tribunal: `${base}/api_publica_<alias>/_search`
  searchPath: (indice: string): string => `/${indice}/_search`,
  reqPorMinuto: 120, // limite oficial (Termos de uso 3.13)
  delayEntreProcessosMs: 600, // ~100 req/min, abaixo do limite
} as const

/** Chave PÚBLICA do DataJud (env). Null desabilita a captura de andamentos. */
export function datajudApiKey(): string | null {
  return env.DATAJUD_API_KEY ?? null
}

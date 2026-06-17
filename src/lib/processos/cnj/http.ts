// Outbound HTTP helper for the CNJ public APIs: native fetch + per-attempt timeout
// (AbortController) + exponential backoff with jitter on 429/5xx and network
// errors. No new dependency. Logs WITHOUT PII (host/status/attempt only). 4xx
// (except 429) are terminal — no point retrying a client error. SERVER ONLY.
import { log } from "@/lib/log"
import { CNJ_USER_AGENT } from "./config"

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "HttpError"
  }
}

export interface RetryOpts {
  tentativas?: number // total de tentativas (default 4)
  baseMs?: number // backoff base (default 500)
  timeoutMs?: number // timeout por tentativa (default 20000)
  jitter?: () => number // fonte de jitter 0..1 (injetável p/ testes; default 0.5)
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
const hostOf = (url: string): string => {
  try {
    return new URL(url).host
  } catch {
    return "?"
  }
}

/** 4xx (exceto 429) é erro do cliente — não retentar. */
function terminal(status: number): boolean {
  return status >= 400 && status < 500 && status !== 429
}

/**
 * GET/POST JSON com retry. Lança HttpError no 4xx terminal; após esgotar as
 * tentativas em 429/5xx/rede, relança o último erro. O User-Agent de browser e
 * `Accept: application/json` são aplicados por padrão.
 */
export async function fetchJsonComRetry<T = unknown>(url: string, init: RequestInit = {}, opts: RetryOpts = {}): Promise<T> {
  const tentativas = opts.tentativas ?? 4
  const baseMs = opts.baseMs ?? 500
  const timeoutMs = opts.timeoutMs ?? 20_000
  const jitter = opts.jitter ?? ((): number => 0.5)
  const headers = new Headers(init.headers)
  if (!headers.has("user-agent")) headers.set("User-Agent", CNJ_USER_AGENT)
  if (!headers.has("accept")) headers.set("Accept", "application/json")

  let ultimoErro: unknown
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...init, headers, signal: ctrl.signal })
      if (res.ok) return (await res.json()) as T
      if (terminal(res.status)) {
        const corpo = await res.text().catch(() => "")
        throw new HttpError(res.status, `HTTP ${res.status} em ${hostOf(url)}: ${corpo.slice(0, 200)}`)
      }
      ultimoErro = new HttpError(res.status, `HTTP ${res.status} em ${hostOf(url)}`)
      log.warn({ cnj: "http", host: hostOf(url), status: res.status, tentativa }, "retentando")
    } catch (e) {
      if (e instanceof HttpError) throw e // 4xx terminal já decidido acima
      ultimoErro = e
      log.warn(
        { cnj: "http", host: hostOf(url), tentativa, err: e instanceof Error ? e.message : String(e) },
        "falha de rede, retentando",
      )
    } finally {
      clearTimeout(timer)
    }
    if (tentativa < tentativas) {
      const espera = Math.round(baseMs * 2 ** (tentativa - 1) * (0.5 + jitter()))
      await sleep(espera)
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error(`Falha ao consultar ${hostOf(url)}`)
}

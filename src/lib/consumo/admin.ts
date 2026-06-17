// Anthropic Admin Cost API client (GET /v1/organizations/cost_report). SERVER ONLY.
// Needs an Admin API key (sk-ant-admin…) in ANTHROPIC_ADMIN_KEY — a different key
// from the LexIA ANTHROPIC_API_KEY, only available to org admins in the Console.
// Results are cached ~60s (Anthropic recommends polling at most once per minute).
import { UserError } from "@/lib/errors"
import type { CostBucket, CostReportResponse } from "./types"

export const ADMIN_NOT_CONNECTED =
  "O relatório de custo não está conectado — configure ANTHROPIC_ADMIN_KEY (chave Admin sk-ant-admin…) no servidor."

const COST_URL = "https://api.anthropic.com/v1/organizations/cost_report"
const TTL_MS = 60_000
const cache = new Map<string, { at: number; buckets: CostBucket[] }>()

export function adminKeyPresent(): boolean {
  return !!process.env.ANTHROPIC_ADMIN_KEY
}

/** Fetch the daily cost report for a window, following pagination. Grouped by
 * description so token lines carry their model. Throws UserError on auth/HTTP issues. */
export async function fetchCostReport(opts: {
  startingAt: string
  endingAt: string
  force?: boolean
}): Promise<CostBucket[]> {
  const key = process.env.ANTHROPIC_ADMIN_KEY
  if (!key) throw new UserError(ADMIN_NOT_CONNECTED)

  const cacheKey = `${opts.startingAt}|${opts.endingAt}`
  const hit = cache.get(cacheKey)
  if (!opts.force && hit && Date.now() - hit.at < TTL_MS) return hit.buckets

  const buckets: CostBucket[] = []
  let page: string | null = null
  for (let i = 0; i < 50; i++) {
    // Build the query by hand so `group_by[]` stays literal (URLSearchParams encodes the brackets).
    const qs = [
      `starting_at=${encodeURIComponent(opts.startingAt)}`,
      `ending_at=${encodeURIComponent(opts.endingAt)}`,
      `bucket_width=1d`,
      `group_by[]=description`,
      `limit=31`,
      ...(page ? [`page=${encodeURIComponent(page)}`] : []),
    ].join("&")

    const res = await fetch(`${COST_URL}?${qs}`, {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "user-agent": "Lexia/1.0 (financeiro)",
      },
      cache: "no-store",
    })
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new UserError(
          "A chave Admin (ANTHROPIC_ADMIN_KEY) é inválida ou não tem permissão de administrador da organização.",
        )
      }
      if (res.status === 429) {
        throw new UserError("Muitas consultas ao relatório de custo — tente novamente em instantes.")
      }
      throw new UserError(`Não foi possível obter o relatório de custo (HTTP ${res.status}).`)
    }
    const json = (await res.json()) as CostReportResponse
    if (Array.isArray(json.data)) buckets.push(...json.data)
    if (!json.has_more || !json.next_page) break
    page = json.next_page
  }

  cache.set(cacheKey, { at: Date.now(), buckets })
  return buckets
}

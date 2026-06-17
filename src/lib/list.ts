// Shared DB-level pagination/sort helper. The repo had no paginated listings;
// the Processos module introduces this convention. GET list endpoints return the
// bare `Paginated<T>` envelope (NOT the {ok,result} mutation wrapper) and push
// where/orderBy/take/skip into Prisma — never the post-findMany JS filtering
// that `getLancamentos` uses (it doesn't scale and can't paginate). Pure: no
// Prisma/env import, unit-tested in tests/list.test.ts.

export type SortOrder = "asc" | "desc"

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ListQuery {
  page: number
  pageSize: number
  sort: string
  order: SortOrder
  skip: number
  take: number
}

export interface ParseListOpts {
  /** Whitelist of sortable column names (anything else falls back to defaultSort). */
  sortable: readonly string[]
  defaultSort: string
  defaultOrder?: SortOrder
  defaultPageSize?: number
  maxPageSize?: number
}

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>

function readParam(src: ParamSource, key: string): string | undefined {
  if (src instanceof URLSearchParams) return src.get(key) ?? undefined
  const v = src[key]
  return Array.isArray(v) ? v[0] : v
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n)) return Math.min(Math.max(fallback, min), max)
  return Math.min(Math.max(Math.trunc(n), min), max)
}

/**
 * Parse page/pageSize/sort/order from query params with clamps + a sort
 * whitelist. `page` is 1-based; `skip`/`take` are ready for Prisma findMany.
 */
export function parseListQuery(src: ParamSource, opts: ParseListOpts): ListQuery {
  const maxPageSize = opts.maxPageSize ?? 100
  const defaultPageSize = opts.defaultPageSize ?? 20
  const page = clampInt(readParam(src, "page"), 1, 1, Number.MAX_SAFE_INTEGER)
  const pageSize = clampInt(readParam(src, "pageSize"), defaultPageSize, 1, maxPageSize)

  const sortRaw = readParam(src, "sort")
  const sort = sortRaw && opts.sortable.includes(sortRaw) ? sortRaw : opts.defaultSort

  const orderRaw = readParam(src, "order")
  const order: SortOrder = orderRaw === "asc" ? "asc" : orderRaw === "desc" ? "desc" : (opts.defaultOrder ?? "desc")

  return { page, pageSize, sort, order, skip: (page - 1) * pageSize, take: pageSize }
}

/** Wrap a Prisma findMany + count result into the list envelope. */
export function paginated<T>(items: T[], total: number, q: ListQuery): Paginated<T> {
  return { items, total, page: q.page, pageSize: q.pageSize }
}

/** Coerce a query-string value to a positive integer, or undefined. */
export function intParam(v: string | null | undefined): number | undefined {
  if (v == null) return undefined
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

/** Read an optional string query param (empty → undefined). */
export function strParam(v: string | null | undefined): string | undefined {
  if (v == null) return undefined
  const t = v.trim()
  return t ? t : undefined
}

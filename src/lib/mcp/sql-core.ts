// Read-only SQL core for the MCP diagnostic tools. PURE: it talks to an injected
// transaction runner, so it runs against Prisma in production and PGlite in tests.
//
// Safety is enforced by PostgreSQL itself, not by a keyword blacklist: every query
// runs in a transaction whose first statements are `SET TRANSACTION READ ONLY` and
// a short `statement_timeout`, so INSERT/UPDATE/DELETE/DDL are refused by the
// server. The leading-keyword allowlist below is only a cheap extra layer (it
// blocks e.g. COPY … TO PROGRAM, which a read-only transaction would still allow
// to a superuser role) and a clearer error message — it is NOT the safety boundary.

export const MAX_ROWS = 200
export const MAX_CELL_CHARS = 500
export const MAX_SQL_CHARS = 20_000

export const READ_ONLY_PRELUDE = ["SET TRANSACTION READ ONLY", "SET LOCAL statement_timeout = '5s'"] as const

/** Minimal surface of a transaction client (Prisma's tx and the PGlite test adapter both fit). */
export interface SqlTx {
  $executeRawUnsafe(query: string): Promise<unknown>
  $queryRawUnsafe(query: string, ...values: unknown[]): Promise<unknown[]>
}
export type SqlRunner = <T>(fn: (tx: SqlTx) => Promise<T>) => Promise<T>

const ALLOWED_FIRST = new Set(["select", "with", "table", "values", "explain", "show"])
const WRAPPABLE_FIRST = new Set(["select", "with", "table", "values"])

export class SqlRejectedError extends Error {}

/**
 * Tabelas que esta ferramenta NÃO pode ler, por prefixo de nome:
 *  • `Whatsapp*` — conversas sob sigilo profissional, isoladas POR USUÁRIO.
 *    Sem este bloqueio, `sql_consultar` seria um atalho para o WhatsApp dos
 *    colegas, contornando todo o escopo por usuário do módulo.
 *  • `OAuth*` — códigos e tokens do servidor de autorização do MCP.
 *
 * ATENÇÃO, e isto é importante: esta lista NÃO é a fronteira de segurança. Ela
 * é por NOME, e o app conecta no Postgres como superusuário, que tem outros
 * caminhos (`pg_read_file`, por exemplo) que nenhum filtro de texto cobre. A
 * fronteira de verdade é o papel `lexia_ro` em `DATABASE_URL_RO` — ver
 * src/lib/mcp/sql.ts e docs/whatsapp-operacao.md. Esta camada barra o caminho
 * direto e deixa a recusa explícita para quem chama.
 *
 * Esta lista é a ÚNICA fonte da verdade: ./ro.ts a lê para revogar essas mesmas
 * tabelas do papel a cada boot, então acrescentar um prefixo aqui já estende a
 * revogação — sem isso, tabela sensível nova nasceria legível pelo papel (ele
 * tem `ALTER DEFAULT PRIVILEGES … GRANT SELECT`).
 */
export const PREFIXOS_BLOQUEADOS = ["whatsapp", "oauth"] as const

/**
 * Tira comentários e LITERAIS de texto. Os literais têm de sair antes da busca
 * por nome de tabela, senão uma consulta legítima como
 * `… WHERE tipo = 'whatsapp'` (o enum de OportunidadeAtividade usa esse valor)
 * seria recusada.
 */
export function stripLiterals(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:[^']|'')*'/g, " '' ")
}

/** O identificador bloqueado que aparece na consulta, ou null. */
export function blockedTable(sql: string): string | null {
  const texto = stripLiterals(sql)
  for (const prefixo of PREFIXOS_BLOQUEADOS) {
    const re = new RegExp('(^|[^a-z0-9_"])"?(' + prefixo + '[a-z]*)"?', "i")
    const m = re.exec(texto)
    if (m) return m[2]
  }
  return null
}

function firstKeyword(sql: string): string {
  // Skip leading whitespace/comments, then read the first word.
  const stripped = sql.replace(/^(\s+|--[^\n]*\n?|\/\*[\s\S]*?\*\/)+/, "")
  return (stripped.match(/^[a-zA-Z]+/)?.[0] ?? "").toLowerCase()
}

/** Trim, drop trailing `;`, and apply the cheap allowlist. Returns the cleaned SQL. */
export function prepareSql(raw: string): { sql: string; first: string } {
  const sql = raw.trim().replace(/;+\s*$/, "")
  if (!sql) throw new SqlRejectedError("Informe uma consulta SQL.")
  if (sql.length > MAX_SQL_CHARS) throw new SqlRejectedError("Consulta longa demais.")
  const first = firstKeyword(sql)
  if (!ALLOWED_FIRST.has(first)) {
    throw new SqlRejectedError("Só são aceitas consultas de leitura (SELECT, WITH, TABLE, VALUES, EXPLAIN, SHOW).")
  }
  const bloqueada = blockedTable(sql)
  if (bloqueada) {
    throw new SqlRejectedError(
      "A tabela " +
        bloqueada +
        " não pode ser consultada por aqui: conversas de WhatsApp e tokens de acesso são isolados por usuário. Use as ferramentas de WhatsApp, que respondem só sobre o seu próprio.",
    )
  }
  return { sql, first }
}

/** JSON-safe, size-bounded cell. */
export function sanitizeCell(v: unknown): unknown {
  if (v === null || v === undefined) return null
  if (typeof v === "bigint") return v.toString()
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString()
  if (typeof v === "string") return v.length > MAX_CELL_CHARS ? `${v.slice(0, MAX_CELL_CHARS)}… [+${v.length - MAX_CELL_CHARS} caracteres]` : v
  if (typeof v === "number" || typeof v === "boolean") return v
  if (v instanceof Uint8Array) return `<${v.byteLength} bytes>`
  try {
    return sanitizeCell(JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x)))
  } catch {
    return String(v)
  }
}

export type SqlResult = {
  columns: string[]
  rows: unknown[][]
  rowCount: number
  truncated: boolean
}

/** Run one read-only statement. Throws the database's own error for anything it refuses. */
export async function runReadOnlySql(runner: SqlRunner, raw: string): Promise<SqlResult> {
  const { sql, first } = prepareSql(raw)
  // Row cap pushed into the database when the statement is wrappable (newline before
  // `)` so a trailing `-- comment` can't swallow the closing paren).
  const text = WRAPPABLE_FIRST.has(first)
    ? `SELECT * FROM (\n${sql}\n) AS _lexia_q LIMIT ${MAX_ROWS + 1}`
    : sql
  const data = await runner(async (tx) => {
    for (const stmt of READ_ONLY_PRELUDE) await tx.$executeRawUnsafe(stmt)
    return tx.$queryRawUnsafe(text)
  })
  const all = data as Record<string, unknown>[]
  const truncated = all.length > MAX_ROWS
  const slice = truncated ? all.slice(0, MAX_ROWS) : all
  const columns = slice.length ? Object.keys(slice[0]) : []
  const rows = slice.map((r) => columns.map((c) => sanitizeCell(r[c])))
  return { columns, rows, rowCount: slice.length, truncated }
}

// ── schema introspection ─────────────────────────────────────────────────────

export type SchemaTable = { tabela: string; colunas: string[] }

/** Group information_schema.columns rows into compact "col tipo[?]" lists. */
export function groupSchemaRows(
  rows: { table_name: string; column_name: string; data_type: string; is_nullable: string }[],
): SchemaTable[] {
  const map = new Map<string, string[]>()
  for (const r of rows) {
    const list = map.get(r.table_name) ?? []
    list.push(`${r.column_name} ${r.data_type}${r.is_nullable === "YES" ? "?" : ""}`)
    map.set(r.table_name, list)
  }
  return [...map].map(([tabela, colunas]) => ({ tabela, colunas }))
}

// As tabelas bloqueadas (PREFIXOS_BLOQUEADOS) também não aparecem no schema: se
// a ferramenta não as lê, descrevê-las só convidaria a tentar.
export const SCHEMA_QUERY = `SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name NOT LIKE '\\_prisma%'
  AND table_name NOT ILIKE 'whatsapp%'
  AND table_name NOT ILIKE 'oauth%'
ORDER BY table_name, ordinal_position`

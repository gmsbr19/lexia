// MCP-only diagnostic tools: read-only SQL + schema introspection. They are NOT in
// the LexIA registry (the chat assistant never sees them). The read-only guarantee
// comes from PostgreSQL (see sql-core.ts); every query is audited. SERVER ONLY.
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"
import { UserError } from "@/lib/errors"
import { defineTool } from "@/lib/lexia/agent/types"
import { writeAudit } from "@/lib/finance/api"
import { groupSchemaRows, runReadOnlySql, SCHEMA_QUERY, SqlRejectedError, type SqlRunner } from "./sql-core"

// Optional plan-B client: a Postgres role with SELECT only (DATABASE_URL_RO).
const globalForRo = globalThis as unknown as { mcpRoPrisma?: PrismaClient }
function client(): PrismaClient {
  if (!env.DATABASE_URL_RO) return prisma
  globalForRo.mcpRoPrisma ??= new PrismaClient({ datasourceUrl: env.DATABASE_URL_RO, log: ["error"] })
  return globalForRo.mcpRoPrisma
}

const runner: SqlRunner = (fn) => client().$transaction((tx) => fn(tx), { timeout: 15_000, maxWait: 5_000 })

export const sqlTools = [
  defineTool({
    name: "sql_consultar",
    description:
      "Executa UMA consulta SQL SOMENTE LEITURA no banco PostgreSQL do Lexia (SELECT/WITH/TABLE/VALUES/EXPLAIN/SHOW). " +
      "O próprio Postgres recusa qualquer escrita. Limite de 200 linhas e 5 s; células longas são truncadas. " +
      'Identificadores com maiúsculas precisam de aspas duplas (ex.: SELECT "valorCents" FROM "Lancamento"). ' +
      "Use sql_schema antes para conhecer tabelas e colunas. Dinheiro está em centavos inteiros.",
    schema: z.object({ sql: z.string().min(1).max(20_000).describe("A consulta SQL (uma única instrução)") }),
    kind: "readonly",
    async run(ctx, input) {
      let outcome: "ok" | "erro" = "ok"
      try {
        return await runReadOnlySql(runner, input.sql)
      } catch (e) {
        outcome = "erro"
        if (e instanceof SqlRejectedError) throw new UserError(e.message)
        // Database refusals (syntax, read-only violation, timeout) are useful to the caller and carry no secrets.
        const msg = e instanceof Error ? e.message : String(e)
        throw new UserError(`O banco recusou a consulta: ${msg.replace(/^[\s\S]*?(ERROR:|error:)\s*/i, "").slice(0, 400)}`)
      } finally {
        await writeAudit(ctx.user.email, { action: "mcp.sql.consultar", entity: "sql", payload: { sql: input.sql, outcome } }, null)
      }
    },
  }),
  defineTool({
    name: "sql_schema",
    description:
      "Lista as tabelas do banco e suas colunas (nome tipo, '?' = aceita nulo) via information_schema, para conhecer a forma dos dados antes de usar sql_consultar. " +
      "Passe `filtro` (parte do nome da tabela, sem diferenciar maiúsculas) para reduzir a saída.",
    schema: z.object({ filtro: z.string().max(100).optional().describe("Trecho do nome da tabela") }),
    kind: "readonly",
    async run(_ctx, input) {
      const rows = (await client().$queryRawUnsafe(SCHEMA_QUERY)) as Parameters<typeof groupSchemaRows>[0]
      const f = input.filtro?.trim().toLowerCase()
      const tabelas = groupSchemaRows(rows).filter((t) => !f || t.tabela.toLowerCase().includes(f))
      return { total: tabelas.length, tabelas }
    },
  }),
]

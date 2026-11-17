import { PGlite } from "@electric-sql/pglite"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  groupSchemaRows,
  MAX_ROWS,
  prepareSql,
  runReadOnlySql,
  sanitizeCell,
  SCHEMA_QUERY,
  SqlRejectedError,
  type SqlRunner,
} from "@/lib/mcp/sql-core"

let db: PGlite
// Adapter: PGlite transaction → the SqlTx surface Prisma's tx provides.
const runner: SqlRunner = (fn) =>
  db.transaction((t) =>
    fn({
      $executeRawUnsafe: async (q) => t.query(q),
      $queryRawUnsafe: async (q) => (await t.query(q)).rows as unknown[],
    }),
  )

async function count(): Promise<number> {
  const { rows } = await db.query(`select count(*)::int as n from "Lancamento"`)
  return (rows[0] as { n: number }).n
}

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`CREATE TABLE "Lancamento" (id serial primary key, "valorCents" int not null, nota text);
    INSERT INTO "Lancamento" ("valorCents", nota) SELECT g, repeat('x', 900) FROM generate_series(1, 250) g;`)
})
afterAll(async () => db.close())

describe("runReadOnlySql (PostgreSQL enforces read-only)", () => {
  it("runs a SELECT, caps rows and truncates long cells", async () => {
    const r = await runReadOnlySql(runner, `select id, "valorCents", nota from "Lancamento" order by id;`)
    expect(r.rowCount).toBe(MAX_ROWS)
    expect(r.truncated).toBe(true)
    expect(r.columns).toEqual(["id", "valorCents", "nota"])
    expect(String(r.rows[0][2]).length).toBeLessThan(600)
  })

  it("INSERT/UPDATE/DELETE/DDL inside the read-only transaction are refused by the database", async () => {
    // Bypass the keyword allowlist on purpose: prelude + raw statement, to prove it is PostgreSQL that refuses.
    for (const stmt of [
      `UPDATE "Lancamento" SET "valorCents" = 0`,
      `INSERT INTO "Lancamento" ("valorCents") VALUES (1)`,
      `DELETE FROM "Lancamento"`,
      `CREATE TABLE zz (a int)`,
      `DROP TABLE "Lancamento"`,
    ]) {
      await expect(
        runner(async (tx) => {
          await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY")
          await tx.$executeRawUnsafe(stmt)
        }),
        stmt,
      ).rejects.toThrow(/read-only transaction/i)
    }
    expect(await count()).toBe(250)
  })

  it("a data-modifying CTE through the real entry point is refused too", async () => {
    await expect(
      runReadOnlySql(runner, `with d as (delete from "Lancamento" returning 1) select * from d`),
    ).rejects.toThrow(/read-only transaction|data-modifying/i) // the LIMIT wrapper already makes it invalid SQL
    expect(await count()).toBe(250)
  })

  it("the transaction cannot be flipped back to read-write", async () => {
    await expect(runReadOnlySql(runner, `select set_config('transaction_read_only','off',true)`)).rejects.toThrow()
  })

  it("EXPLAIN and SHOW work (unwrapped)", async () => {
    expect((await runReadOnlySql(runner, `explain select 1`)).rowCount).toBeGreaterThan(0)
    expect((await runReadOnlySql(runner, `show transaction_read_only`)).rows[0][0]).toBe("on")
  })

  it("a trailing line comment doesn't break the row-cap wrapper", async () => {
    const r = await runReadOnlySql(runner, `select 1 as a -- comment`)
    expect(r.rows).toEqual([[1]])
  })
})

describe("prepareSql / sanitizeCell / groupSchemaRows", () => {
  it("rejects empty and non-read statements before touching the database", () => {
    expect(() => prepareSql("  ;")).toThrow(SqlRejectedError)
    for (const s of ["update x set a=1", "delete from x", "drop table x", "copy x to program 'id'", "insert into x values (1)", "/* c */ truncate x"]) {
      expect(() => prepareSql(s), s).toThrow(SqlRejectedError)
    }
    expect(prepareSql("-- hi\nSELECT 1;").first).toBe("select")
    expect(prepareSql("with a as (select 1) select * from a").first).toBe("with")
  })
  it("sanitizeCell is JSON-safe", () => {
    expect(sanitizeCell(BigInt(10))).toBe("10")
    expect(sanitizeCell(new Date("2026-01-02T03:04:05Z"))).toBe("2026-01-02T03:04:05.000Z")
    expect(sanitizeCell(new Uint8Array(3))).toBe("<3 bytes>")
    expect(sanitizeCell({ a: BigInt(1) })).toBe('{"a":"1"}')
    expect(sanitizeCell(undefined)).toBeNull()
  })
  it("groups schema rows", () => {
    expect(
      groupSchemaRows([
        { table_name: "A", column_name: "id", data_type: "integer", is_nullable: "NO" },
        { table_name: "A", column_name: "n", data_type: "text", is_nullable: "YES" },
      ]),
    ).toEqual([{ tabela: "A", colunas: ["id integer", "n text?"] }])
  })
})

// As conversas de WhatsApp são isoladas POR USUÁRIO; sem este bloqueio
// `sql_consultar` seria um atalho para o WhatsApp dos colegas. Não é a fronteira
// de segurança (o papel do app é superusuário — ver o comentário em sql-core),
// mas barra o caminho direto e recusa de forma explícita.
describe("tabelas bloqueadas (Whatsapp*/OAuth*)", () => {
  it("recusa ler as tabelas do módulo de WhatsApp e do OAuth", () => {
    for (const s of [
      'select * from "WhatsappMensagem"',
      'SELECT dados FROM "WhatsappMidia"',
      "select * from whatsappchat",
      'select * from public."WhatsappAuth"',
      'with x as (select * from "OAuthToken") select * from x',
      'select * from "Cliente" c join "WhatsappChat" w on w."clienteId" = c.id',
      'table "WhatsappSessao"',
      'select * from "OAuthClient"',
    ]) {
      expect(() => prepareSql(s), s).toThrow(SqlRejectedError)
    }
  })

  it("a mensagem diz o que fazer em vez de só recusar", () => {
    expect(() => prepareSql('select * from "WhatsappChat"')).toThrow(/ferramentas de WhatsApp/)
  })

  it("NÃO recusa um literal de texto 'whatsapp' (o enum de atividade usa esse valor)", () => {
    // Era o falso positivo óbvio: OportunidadeAtividade.tipo pode ser 'whatsapp'.
    expect(prepareSql(`select * from "OportunidadeAtividade" where tipo = 'whatsapp'`).first).toBe("select")
    expect(prepareSql(`select 'oauth' as x`).first).toBe("select")
    expect(prepareSql(`select * from "Lancamento" -- whatsapp`).first).toBe("select")
  })

  it("não recusa tabelas de nome parecido que não são do módulo", () => {
    expect(prepareSql('select * from "Lancamento"').first).toBe("select")
    expect(prepareSql('select * from "Cliente"').first).toBe("select")
  })

  it("o schema introspectado não lista as tabelas bloqueadas", () => {
    expect(SCHEMA_QUERY).toMatch(/NOT ILIKE 'whatsapp%'/)
    expect(SCHEMA_QUERY).toMatch(/NOT ILIKE 'oauth%'/)
  })
})

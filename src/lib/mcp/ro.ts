// MCP — reaplica, a cada boot do servidor, a revogação das tabelas sensíveis no
// papel somente-leitura do `sql_consultar`. SERVER ONLY.
//
// O passo manual (docs/whatsapp-operacao.md §6) cria o papel com
// `ALTER DEFAULT PRIVILEGES … GRANT SELECT`, então TODA tabela nova nasce
// legível por ele — inclusive a próxima tabela sensível que uma migração criar.
// Depender de alguém lembrar de revogar depois de cada deploy é como se perde a
// fronteira; aqui isso acontece sozinho, logo depois do `prisma migrate deploy`
// que o `npm start` roda no boot.
//
// As dependências são INJETADAS (como em ./exec.ts) para o módulo ser testável
// sob o vitest sem arrastar o Prisma, e a decisão pura mora em ./ro-core.ts.
import { log } from "@/lib/log"
import { comandoRevogacao, padroesBloqueados, papelRo } from "./ro-core"
import { PREFIXOS_BLOQUEADOS } from "./sql-core"

export interface RoDb {
  consultar<T>(sql: string, ...params: unknown[]): Promise<T[]>
  executar(sql: string): Promise<unknown>
}

export type ResultadoRevogacao =
  | { acao: "sem-papel"; papel: string }
  | { acao: "papel-inseguro"; papel: string; motivo: "superusuario" | "e-o-app" }
  | { acao: "revogado"; papel: string; tabelas: string[] }

interface PapelRow {
  rolsuper: boolean
  e_o_app: boolean
}

const SQL_PAPEL = "SELECT rolsuper, rolname = current_user AS e_o_app FROM pg_roles WHERE rolname = $1"

/**
 * Tira do `papel` qualquer privilégio nas tabelas cujo nome casa com os
 * prefixos bloqueados. Idempotente: revogar o que já está revogado é no-op, e
 * duas instâncias subindo juntas não brigam.
 *
 * Recusa agir quando o papel é SUPERUSUÁRIO ou é o próprio usuário do app — uma
 * DATABASE_URL_RO apontada por engano para o usuário de escrita faria esta
 * função desarmar o acesso do próprio app.
 */
export async function revogarTabelasSensiveis(
  db: RoDb,
  papel: string,
  prefixos: readonly string[] = PREFIXOS_BLOQUEADOS,
): Promise<ResultadoRevogacao> {
  const dono = await db.consultar<PapelRow>(SQL_PAPEL, papel)
  if (dono.length === 0) return { acao: "sem-papel", papel }
  if (dono[0].rolsuper) return { acao: "papel-inseguro", papel, motivo: "superusuario" }
  if (dono[0].e_o_app) return { acao: "papel-inseguro", papel, motivo: "e-o-app" }

  const padroes = padroesBloqueados(prefixos)
  if (padroes.length === 0) return { acao: "revogado", papel, tabelas: [] }

  const onde = padroes.map((_, i) => "tablename ILIKE $" + (i + 1)).join(" OR ")
  const tabelas = await db.consultar<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (" + onde + ") ORDER BY tablename",
    ...padroes,
  )
  for (const t of tabelas) await db.executar(comandoRevogacao(papel, t.tablename))
  return { acao: "revogado", papel, tabelas: tabelas.map((t) => t.tablename) }
}

/**
 * Dispara a revogação em segundo plano no boot (src/instrumentation.ts), no
 * padrão de ./boot.ts: não atrasa o boot e qualquer falha vira log.
 */
export function agendarRevogacaoRoNoBoot(): void {
  void (async () => {
    const papel = papelRo(process.env.DATABASE_URL_RO)
    try {
      const { prisma } = await import("@/lib/db")
      const db: RoDb = {
        consultar: (sql, ...params) => prisma.$queryRawUnsafe(sql, ...params),
        executar: (sql) => prisma.$executeRawUnsafe(sql),
      }
      const r = await revogarTabelasSensiveis(db, papel)
      if (r.acao === "sem-papel") return // caso comum em dev: o papel nem existe
      if (r.acao === "papel-inseguro") {
        log.warn(
          { papel, motivo: r.motivo },
          "mcp: o papel da DATABASE_URL_RO não serve como fronteira (é superusuário ou é o próprio usuário do app) — o sql_consultar segue lendo o banco inteiro; ver docs/whatsapp-operacao.md §6",
        )
        return
      }
      log.info({ papel, tabelas: r.tabelas.length }, "mcp: tabelas sensíveis revogadas do papel somente-leitura")
    } catch (e) {
      log.error(
        { papel, err: e instanceof Error ? `${e.name}: ${e.message}` : String(e) },
        "mcp: revogação das tabelas sensíveis falhou — o app segue normal, mas confira o papel à mão (docs/whatsapp-operacao.md §6)",
      )
    }
  })()
}

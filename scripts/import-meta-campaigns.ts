/**
 * Import Meta Ads campaigns + ad spend from a Meta "Campanhas" report CSV.
 *
 *   npm run db:import:meta -- "C:/path/to/Campanhas.csv"
 *   # or set META_CAMPAIGNS_CSV in .env and run without an argument:
 *   npm run db:import:meta
 *
 * Idempotent: campaigns upsert by (plataforma, nome); spend upserts by a
 * deterministic id per campaign+period, so re-running the same month converges.
 * Logic lives in src/lib/comercial/import/meta-campaigns.ts (reused by the
 * in-app "Importar Meta" upload route).
 */
import { PrismaClient } from "@prisma/client"
import { existsSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { importMetaCampaignsFromCsv } from "../src/lib/comercial/import/meta-campaigns"
import { formatBRL } from "../src/lib/finance/money"

// tsx does not auto-load .env — do it ourselves (only for keys not already set).
function loadEnv() {
  const envPath = join(process.cwd(), ".env")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val
  }
}
loadEnv()

const prisma = new PrismaClient()

function resolveCsvPath(): string {
  const arg = process.argv[2]
  if (arg && existsSync(arg) && statSync(arg).isFile()) return arg
  const direct = process.env.META_CAMPAIGNS_CSV
  if (direct && existsSync(direct) && statSync(direct).isFile()) return direct
  throw new Error(
    `Meta campaigns CSV not found. Pass a path as an argument or set META_CAMPAIGNS_CSV in .env.\n` +
      `  argument=${arg ?? "(none)"}\n  META_CAMPAIGNS_CSV=${direct ?? "(unset)"}`,
  )
}

async function main() {
  const csvPath = resolveCsvPath()
  console.log(`Importando campanhas Meta de: ${csvPath}`)
  const s = await importMetaCampaignsFromCsv(prisma, csvPath)
  console.log("\n── Import de campanhas Meta concluído ────────")
  console.table({
    "linhas": s.total,
    "campanhas criadas": s.campanhasCriadas,
    "campanhas atualizadas": s.campanhasAtualizadas,
    "gastos registrados": s.gastosRegistrados,
    "total investido": formatBRL(s.totalGastoCents),
    "período": s.periodo ?? "—",
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

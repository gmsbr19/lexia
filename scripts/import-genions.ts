/**
 * Import leads from a Genions CSV export into the local SQLite database.
 *
 *   npm run db:import:genions
 *
 * Reads the CSV path from .env:
 *   GENIONS_CSV=/path/to/leads.csv          (a single CSV file)
 *   GENIONS_BACKUP_DIR=/path/to/folder      (folder containing Leads.csv)
 *
 * Idempotent: re-running converges (upsert by Genions id). The logic lives in
 * src/lib/comercial/import/leads.ts so an "Importar" route can reuse it.
 */
import { PrismaClient } from "@prisma/client"
import { existsSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { importLeadsFromCsv } from "../src/lib/comercial/import/leads"

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
  const direct = process.env.GENIONS_CSV
  if (direct && existsSync(direct) && statSync(direct).isFile()) return direct
  const dir = process.env.GENIONS_BACKUP_DIR
  if (dir && existsSync(dir)) {
    const p = join(dir, "Leads.csv")
    if (existsSync(p)) return p
  }
  throw new Error(
    `Genions CSV not found. Set GENIONS_CSV (file) or GENIONS_BACKUP_DIR (folder with Leads.csv) in .env.\n` +
      `  GENIONS_CSV=${direct ?? "(unset)"}\n  GENIONS_BACKUP_DIR=${dir ?? "(unset)"}`,
  )
}

async function main() {
  const csvPath = resolveCsvPath()
  console.log(`Importando leads de: ${csvPath}`)
  const summary = await importLeadsFromCsv(prisma, csvPath)
  console.log("\n── Import de leads concluído ────────────────")
  console.table({ total: summary.total, novos: summary.novos, atualizados: summary.atualizados, campanhasCriadas: summary.campanhasCriadas })
  console.table(summary.porEtapa)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

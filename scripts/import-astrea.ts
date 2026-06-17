/**
 * Seed the local SQLite database from an Astrea CSV backup.
 *
 *   npm run db:seed        (reads ASTREA_BACKUP_DIR from .env)
 *
 * Idempotent: re-running converges (upsert by Astrea "Código"). Only the
 * financially-relevant CSVs are read; the ~4 MB Históricos/Publicações files
 * are ignored. The actual logic lives in src/lib/finance/import/run.ts so the
 * "Reimportar backup" route can reuse it.
 */
import { PrismaClient } from "@prisma/client"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { importAstrea } from "../src/lib/finance/import/run"

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

async function main() {
  const dir = process.env.ASTREA_BACKUP_DIR
  if (!dir || !existsSync(dir)) {
    throw new Error(
      `ASTREA_BACKUP_DIR is not set or does not exist: ${dir ?? "(unset)"}\n` +
        `Set it in .env to the folder containing the Astrea CSVs.`,
    )
  }
  console.log(`Importando backup de: ${dir}`)
  const summary = await importAstrea(prisma, dir)
  console.log("\n── Import concluído ─────────────────────────")
  console.table(summary)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

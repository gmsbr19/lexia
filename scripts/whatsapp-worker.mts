/**
 * Worker do WhatsApp (Baileys) — processo contínuo, separado do app web.
 *
 *   npm run whatsapp:worker
 *
 * Mantém uma conexão por usuário, restaura as sessões ao subir (sem novo QR),
 * ouve os comandos do app por LISTEN/NOTIFY e grava status/credenciais no
 * Postgres. Instância ÚNICA: toma um pg_advisory_lock e sai se não conseguir.
 *
 * Em produção é um 2º serviço do mesmo projeto (ver DEPLOY.md §6d). Exige
 * WHATSAPP_AUTH_KEY — sem ela se recusa a subir.
 *
 * É `.mts` (ESM) de propósito: o Baileys 7 é ESM-only e não resolve a partir de
 * um módulo CJS, que é o que um `.ts` é neste pacote. Ver src/lib/whatsapp/worker.mts.
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

// tsx não carrega .env — fazemos à mão (mesmo helper dos outros scripts).
function loadEnv() {
  const envPath = join(process.cwd(), ".env")
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (process.env[m[1]] === undefined) process.env[m[1]] = val
  }
}
loadEnv()

// Import DINÂMICO: o grafo do worker alcança src/lib/env.ts, que valida as
// variáveis na avaliação do módulo. Um `import` estático seria içado para antes
// do loadEnv() acima e falharia com ".env ausente".
const { iniciarWorker } = await import("../src/lib/whatsapp/worker.mjs")

try {
  await iniciarWorker()
} catch (e) {
  // Sem este catch, uma falha na subida (banco fora, por exemplo) sai como um
  // dump de "unhandled rejection". O supervisor precisa do código 1; quem lê o
  // log precisa de uma linha.
  console.error("[whatsapp-worker] não foi possível subir:", e instanceof Error && e.message ? e.message : e)
  process.exit(1)
}

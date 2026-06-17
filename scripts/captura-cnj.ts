/**
 * CLI de captura CNJ (carga inicial / backfill / rodada manual). Chama os
 * orquestradores direto (via Prisma) — mesma lógica dos jobs de cron, sem HTTP.
 *
 *   npm run cnj:captura -- --dry                 # só loga o que faria (não grava)
 *   npm run cnj:captura -- --desde=2026-01-01     # backfill de intimações desde a data
 *   npm run cnj:captura -- --andamentos           # roda também o DataJud (precisa da chave)
 *   npm run cnj:captura -- --intimacoes --andamentos
 */
try {
  process.loadEnvFile()
} catch {
  // sem .env — Prisma/env vão falhar com mensagem clara
}

const has = (flag: string): boolean => process.argv.includes(`--${flag}`)
const arg = (name: string): string | undefined => {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`))
  return p ? p.split("=").slice(1).join("=") : undefined
}

async function main(): Promise<void> {
  const { capturarIntimacoes, capturarAndamentos } = await import("../src/lib/processos/cnj/captura")
  const dryRun = has("dry")
  const desde = arg("desde")
  const fazAndamentos = has("andamentos")
  const fazIntimacoes = has("intimacoes") || !fazAndamentos // intimações é o padrão

  if (dryRun) console.log("== DRY-RUN (não grava) ==")
  if (fazIntimacoes) {
    const r = await capturarIntimacoes({ dryRun, desdeISO: desde })
    console.log(
      `intimações: ${r.escopos} OABs · ${r.encontrados} encontradas · ${r.criados} novas · ${r.ignorados} repetidas · ${r.semVinculo} sem processo · ${r.falhas} falhas`,
    )
  }
  if (fazAndamentos) {
    const r = await capturarAndamentos({ dryRun })
    console.log(
      `andamentos: ${r.escopos} tribunais · ${r.encontrados} movimentos · ${r.criados} novos · ${r.ignorados} repetidos · ${r.falhas} falhas`,
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

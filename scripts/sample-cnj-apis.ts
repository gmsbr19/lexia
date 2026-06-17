/**
 * Sampling script (REGRA ZERO #4): faz uma chamada REAL a cada API pública do CNJ e
 * salva o JSON como fixture *.latest.json — para modelar/reconferir o parsing a
 * partir do payload real. READ-ONLY (não grava no banco). NÃO sobrescreve as
 * fixtures *.sample.json usadas pelos testes (essas são commitadas e estáveis).
 *
 *   npm run cnj:sample -- --oab=526952/SP --de=2026-06-01 --ate=2026-06-12
 *   npm run cnj:sample -- --oab=526952/SP --cnj=00008323520184013202   (DataJud precisa de DATAJUD_API_KEY)
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

try {
  process.loadEnvFile()
} catch {
  // sem .env — segue (Comunica é público; DataJud só roda com a chave)
}

function arg(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`--${name}=`))
  return p ? p.split("=").slice(1).join("=") : undefined
}

async function main(): Promise<void> {
  const { consultarPorOab, montarUrlComunica } = await import("../src/lib/processos/cnj/comunica/client")
  const { consultarProcesso } = await import("../src/lib/processos/cnj/datajud/client")
  const { datajudApiKey } = await import("../src/lib/processos/cnj/config")
  const { addDiasISO, hojeISO } = await import("../src/lib/processos/datas")

  const dir = join(process.cwd(), "src/lib/processos/cnj/__fixtures__")
  mkdirSync(dir, { recursive: true })

  // ── Comunica/DJEN (público) ──
  const oab = arg("oab") ?? "526952/SP"
  const [numeroOab, ufOab] = oab.split("/")
  const ate = arg("ate") ?? hojeISO()
  const de = arg("de") ?? addDiasISO(ate, -7)
  console.log(`Comunica: OAB ${numeroOab}/${ufOab}, janela ${de}..${ate}`)
  try {
    const items = await consultarPorOab({ numeroOab, ufOab, de, ate })
    const out = {
      _fonte: montarUrlComunica({ numeroOab, ufOab, de, ate }, 1),
      _capturadoEm: hojeISO(),
      count: items.length,
      items: items.slice(0, 5),
    }
    writeFileSync(join(dir, "comunica.latest.json"), JSON.stringify(out, null, 2))
    console.log(`  ✓ ${items.length} comunicações → comunica.latest.json (${Math.min(items.length, 5)} salvas)`)
  } catch (e) {
    console.error("  ✗ Comunica falhou:", e instanceof Error ? e.message : e)
  }

  // ── DataJud (precisa de DATAJUD_API_KEY + um CNJ real) ──
  const cnj = arg("cnj")
  if (!datajudApiKey()) {
    console.log("DataJud: DATAJUD_API_KEY ausente — pulando.")
  } else if (!cnj) {
    console.log("DataJud: informe --cnj=<20 dígitos> para amostrar — pulando.")
  } else {
    console.log(`DataJud: CNJ ${cnj}`)
    try {
      const source = await consultarProcesso(cnj)
      writeFileSync(
        join(dir, "datajud.latest.json"),
        JSON.stringify({ _fonte: `_search numeroProcesso=${cnj}`, _capturadoEm: hojeISO(), hits: { hits: source ? [{ _source: source }] : [] } }, null, 2),
      )
      console.log(source ? `  ✓ ${source.movimentos?.length ?? 0} movimentos → datajud.latest.json` : "  (sem hit para esse CNJ)")
    } catch (e) {
      console.error("  ✗ DataJud falhou:", e instanceof Error ? e.message : e)
    }
  }

  console.log("\n⚠️  Os *.latest.json contêm dados pessoais reais — não commite (já estão no .gitignore).")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Converte os "dados do processo" que o import do Astrea gravou DIRETO no Caso
 * (nº do processo, tribunal, vara, instância, tipo de ação, valor da causa,
 * distribuição) em Processos de verdade, vinculados ao caso — e limpa esses
 * campos do caso. Regras em src/lib/casos/legado-core.ts.
 *
 *   npm run db:converter:casos -- --dry   (só mostra o relatório, não grava)
 *   npm run db:converter:casos            (converte)
 *
 * Idempotente: uma 2ª rodada não acha mais nada para converter. Conflitos (o
 * mesmo CNJ já está num processo de OUTRO caso) NÃO são tocados — aparecem no
 * relatório para decisão manual.
 */
import { PrismaClient } from "@prisma/client"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { converterDadosProcessuaisLegados } from "../src/lib/casos/legado"

// tsx does not auto-load .env — do it ourselves (only for keys not already set).
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

const prisma = new PrismaClient()
const dry = process.argv.includes("--dry")

async function main() {
  const r = await converterDadosProcessuaisLegados(prisma, { dry })
  console.log(dry ? "SIMULAÇÃO (nada foi gravado)\n" : "CONVERSÃO CONCLUÍDA\n")
  console.log(`Casos com dados de processo no próprio caso: ${r.analisados}`)
  console.log(`  → Processos criados:                        ${r.criados}`)
  console.log(`  → Processo já existia (lacunas preenchidas): ${r.completados}`)
  console.log(`  → Guardados como anotação do caso:           ${r.registrados}`)
  console.log(`  → Mantidos (consultivo sem dado judicial):   ${r.mantidos}`)
  if (r.semCnjValido.length) {
    console.log(`\nNúmeros fora do padrão CNJ (processo criado SEM número; o original ficou numa anotação do processo):`)
    for (const s of r.semCnjValido) console.log(`  caso #${s.casoId} "${s.titulo}": ${s.numero}`)
  }
  if (r.conflitos.length) {
    console.log(`\nCONFLITOS — o CNJ já pertence a um processo de OUTRO caso (nada foi alterado nestes):`)
    for (const c of r.conflitos) {
      console.log(`  caso #${c.casoId} "${c.titulo}": ${c.numeroCnj} já está no processo #${c.processoId} (caso #${c.outroCasoId})`)
    }
  }
  if (r.erros.length) {
    console.log(`\nERROS:`)
    for (const e of r.erros) console.log(`  caso #${e.casoId} "${e.titulo}": ${e.erro}`)
    process.exitCode = 1
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

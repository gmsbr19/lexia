/**
 * Semeia as OABs do escritório a monitorar no Comunica/DJEN (idempotente por
 * numero+uf). Edite a lista OABS abaixo, OU passe via argv:
 *
 *   npm run cnj:seed:oabs -- 526952/SP "Igor Aparecido Barbosa Teodoro"
 *
 * (As OABs também podem ser cadastradas na UI: Processos → Captura.)
 */
import { PrismaClient } from "@prisma/client"

try {
  process.loadEnvFile()
} catch {
  // Prisma também tenta carregar .env sozinho
}

const prisma = new PrismaClient()

// Edite aqui as OABs do escritório (ou use o argv acima):
const OABS: { numero: string; uf: string; advogadoNome?: string }[] = [
  // { numero: "123456", uf: "SP", advogadoNome: "Fulano de Tal" },
]

function fromArgv(): { numero: string; uf: string; advogadoNome?: string }[] {
  const m = process.argv[2]?.match(/^(\d+)\/([A-Za-z]{2})$/)
  return m ? [{ numero: m[1], uf: m[2].toUpperCase(), advogadoNome: process.argv[3] }] : []
}

async function main(): Promise<void> {
  const lista = fromArgv().length ? fromArgv() : OABS
  if (!lista.length) {
    console.log('Nenhuma OAB definida. Edite scripts/seed-oabs.ts ou rode: npm run cnj:seed:oabs -- 123456/SP "Nome"')
    return
  }
  let criadas = 0
  let existentes = 0
  for (const o of lista) {
    const numero = o.numero.replace(/\D/g, "")
    const uf = o.uf.toUpperCase()
    const exists = await prisma.oabMonitorada.findUnique({ where: { numero_uf: { numero, uf } } })
    if (exists) {
      existentes++
      continue
    }
    await prisma.oabMonitorada.create({ data: { numero, uf, advogadoNome: o.advogadoNome ?? null, ativo: true } })
    criadas++
  }
  console.log(`+ OABs monitoradas: ${criadas} criadas, ${existentes} já existiam`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

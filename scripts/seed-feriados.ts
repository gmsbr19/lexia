/**
 * Seed the prazo engine's configurable calendar: the recesso forense suspension
 * (CPC art. 220: 20/12–20/1) and a few example estadual/forense holidays. The
 * federal fixed/movable holidays are computed in code (src/lib/processos/feriados)
 * and need NOT be seeded. Idempotent: skips rows that already exist.
 *
 *   npm run db:seed:feriados
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const ANOS = [2024, 2025, 2026, 2027]

function noon(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

async function main() {
  let susCriadas = 0
  let susExistentes = 0
  for (const y of ANOS) {
    const de = noon(`${y}-12-20`)
    const ate = noon(`${y + 1}-01-20`)
    const exists = await prisma.suspensaoPrazo.findFirst({ where: { de, ate } })
    if (exists) {
      susExistentes++
      continue
    }
    await prisma.suspensaoPrazo.create({
      data: { de, ate, descricao: "Recesso forense (CPC art. 220)", jurisdicao: null },
    })
    susCriadas++
  }

  // Example configurable holidays (the office edits these via the API).
  const feriados: { data: string; descricao: string; abrangencia: string; uf: string | null; tribunal: string | null }[] = []
  for (const y of ANOS) {
    feriados.push(
      { data: `${y}-07-09`, descricao: "Revolução Constitucionalista (SP)", abrangencia: "estadual", uf: "SP", tribunal: null },
      { data: `${y}-01-25`, descricao: "Aniversário de São Paulo", abrangencia: "municipal", uf: "SP", tribunal: null },
    )
  }
  let fCriados = 0
  let fExistentes = 0
  for (const f of feriados) {
    const data = noon(f.data)
    const exists = await prisma.feriado.findFirst({
      where: { data, abrangencia: f.abrangencia, uf: f.uf, tribunal: f.tribunal },
    })
    if (exists) {
      fExistentes++
      continue
    }
    await prisma.feriado.create({ data: { data, descricao: f.descricao, abrangencia: f.abrangencia, uf: f.uf, tribunal: f.tribunal } })
    fCriados++
  }

  console.log(`+ suspensões: ${susCriadas} criadas, ${susExistentes} já existiam`)
  console.log(`+ feriados (estadual/municipal): ${fCriados} criados, ${fExistentes} já existiam`)
  console.log("= feriados nacionais (fixos + móveis) são calculados em código — não precisam de seed")
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

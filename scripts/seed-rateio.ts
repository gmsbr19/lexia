/**
 * Initialize each caso's sócio split at 50/50 (Leandro / Leonardo).
 *
 *   npm run db:seed:rateio
 *
 * Idempotent: only seeds casos that have NO responsáveis yet, so re-running
 * never overwrites operator edits. Reimport-safe (the importer never touches
 * CasoResponsavel).
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const socios = await prisma.conta.findMany({
    where: { kind: "socio", ativo: true },
    select: { id: true, titular: true, nome: true },
    orderBy: { ordem: "asc" },
  })
  if (socios.length !== 2) {
    throw new Error(`Esperado exatamente 2 contas de sócio (kind:'socio'); encontrado ${socios.length}. Rode db:seed:socios antes.`)
  }

  const casos = await prisma.caso.findMany({ select: { id: true, _count: { select: { responsaveis: true } } } })
  let created = 0
  let skipped = 0
  for (const caso of casos) {
    if (caso._count.responsaveis > 0) {
      skipped++
      continue
    }
    await prisma.casoResponsavel.createMany({
      data: socios.map((s) => ({ casoId: caso.id, contaId: s.id, percentual: 50 })),
    })
    created++
  }
  console.log(
    `+ rateio 50/50 (${socios.map((s) => s.titular ?? s.nome).join(" / ")}) criado em ${created} casos; ${skipped} já tinham rateio definido`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

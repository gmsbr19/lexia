/**
 * Mark the firm's two partner accounts (Leandro & Leonardo) as `kind: 'socio'`.
 *
 *   npm run db:seed:socios
 *
 * The Astrea backup already ships accounts literally named "Leandro" and
 * "Leonardo" (where every lançamento is booked), so we DON'T create new rows —
 * we promote the existing account (the one carrying the movements) to a sócio
 * account and clean up any empty duplicates. Idempotent and reimport-safe: the
 * importer's Conta upsert never writes `kind`/`titular`/`ordem`.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const SOCIOS: { nome: string; titular: string; ordem: number }[] = [
  { nome: "Leandro", titular: "Leandro", ordem: 0 },
  { nome: "Leonardo", titular: "Leonardo", ordem: 1 },
]

async function main() {
  for (const s of SOCIOS) {
    const matches = await prisma.conta.findMany({
      where: { nome: s.nome },
      include: { _count: { select: { lancamentos: true } } },
    })

    if (matches.length === 0) {
      const row = await prisma.conta.create({
        data: { nome: s.nome, titular: s.titular, ordem: s.ordem, kind: "socio", origem: "manual", astreaId: null },
      })
      console.log(`+ conta sócio criada: ${s.titular} (#${row.id})`)
      continue
    }

    // The real account is the one carrying the movements.
    const primary = matches.sort((a, b) => b._count.lancamentos - a._count.lancamentos)[0]
    await prisma.conta.update({
      where: { id: primary.id },
      data: { kind: "socio", titular: s.titular, ordem: s.ordem },
    })
    console.log(`= conta sócio: ${s.titular} (#${primary.id}, ${primary._count.lancamentos} lançamentos)`)

    // Remove empty same-named duplicates (e.g. a previous mistaken manual seed).
    for (const other of matches) {
      if (other.id !== primary.id && other.origem === "manual" && other._count.lancamentos === 0) {
        await prisma.conta.delete({ where: { id: other.id } })
        console.log(`  - duplicada removida: #${other.id}`)
      }
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

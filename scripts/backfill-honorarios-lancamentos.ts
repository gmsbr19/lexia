/**
 * Fase 1 do "honorário = recebimento": alinha o `Honorario` (dormente) ao ledger.
 * NÃO destrutivo — as linhas `Honorario` continuam (derrubadas na Fase 2). Idempotente.
 *
 *   npm run db:backfill:honorarios
 *
 * Rode UMA vez, após `npm run db:migrate` + `npm run db:generate`.
 * - Honorário COM lancamentoId → carimba o lançamento ligado (subTipo + fee-metadata).
 *   Como esse lançamento já existe no caixa, é só metadado — SEM linha nova, SEM
 *   mudar valor/soma (verificado: 288/288 já eram subTipo='honorario', valores 1:1).
 * - Honorário SEM lancamentoId → **DESCARTADO** por decisão do usuário: NÃO cria
 *   lançamento (esses 13 — 10 parcelas Lucilene, 2 avulsos sem cliente/caso, 1 stub R$0
 *   — ficam de fora das telas; some com eles de vez na Fase 2 ao derrubar a tabela).
 * - Lead.honorarioId → Lead.lancamentoId (só onde o honorário TEM lançamento).
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const honorarios = await prisma.honorario.findMany({ select: { id: true, lancamentoId: true, tipo: true, valorLiquidoCents: true, pagamento: true } })
  let stamped = 0
  let descartados = 0
  let leadsRepointed = 0

  for (const h of honorarios) {
    if (h.lancamentoId != null) {
      await prisma.lancamento.update({
        where: { id: h.lancamentoId },
        data: {
          subTipo: "honorario",
          tipoHonorario: h.tipo ?? "avista",
          valorLiquidoCents: h.valorLiquidoCents,
          metodoPagamento: h.pagamento,
        },
      })
      stamped++
    } else {
      // Sem lançamento → descartado (não projetado no ledger).
      descartados++
    }
  }

  // Repoint leads: Lead.honorarioId → Lead.lancamentoId (só onde o honorário TEM lançamento).
  const leads = await prisma.lead.findMany({
    where: { honorarioId: { not: null }, lancamentoId: null },
    select: { id: true, honorarioId: true },
  })
  for (const l of leads) {
    const hon = l.honorarioId ? await prisma.honorario.findUnique({ where: { id: l.honorarioId }, select: { lancamentoId: true } }) : null
    if (hon?.lancamentoId) {
      await prisma.lead.update({ where: { id: l.id }, data: { lancamentoId: hon.lancamentoId } })
      leadsRepointed++
    }
  }

  console.log(
    `Backfill honorários → lançamentos: ${stamped} carimbados, ${descartados} descartados (sem lançamento), ${leadsRepointed} leads repontados (de ${honorarios.length} honorários).`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

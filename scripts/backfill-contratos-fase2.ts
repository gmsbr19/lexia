/**
 * Fase 2 do "contrato = documento assinado": cria 1 `Contrato` por `Caso` que já
 * tem honorário lançado (fee-lançamento) e ainda não está vinculado a um
 * contrato. Idempotente — casos com `contratoId` já setado são pulados (uma
 * 2ª rodada não acha mais nenhum elegível).
 *
 * Contratos que devem reunir MAIS de um caso (ex.: um condomínio com assessoria
 * mensal + uma ação de obrigação de fazer) nascem como contratos SEPARADOS aqui
 * — a mesclagem é MANUAL depois, pela UI: abrir um dos contratos → "Vincular
 * caso" → escolher o outro caso do mesmo cliente (ele muda de contrato).
 *
 *   npm run db:backfill:contratos
 *
 * Rode UMA vez, após `npm run db:migrate` + `npm run db:generate`.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const FEE = { tipo: "entrada", subTipo: "honorario", isAnomalia: false } as const

async function main() {
  const casos = await prisma.caso.findMany({
    where: { excluidoEm: null, contratoId: null, lancamentos: { some: FEE } },
    select: { id: true, clientePrincipalId: true, dataCriacao: true },
  })

  let criados = 0
  for (const c of casos) {
    const contrato = await prisma.contrato.create({
      data: {
        clienteId: c.clientePrincipalId,
        dataFechamento: c.dataCriacao ?? new Date(),
      },
    })
    await prisma.caso.update({ where: { id: c.id }, data: { contratoId: contrato.id } })
    criados++
  }

  console.log(
    `Backfill contratos (Fase 2): ${criados} contrato(s) criado(s) para ${casos.length} caso(s) com honorário e sem contrato.`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

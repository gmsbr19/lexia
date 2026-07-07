// Backfill do módulo Contratos (Fase 1). Idempotente e LOSSLESS:
//   1) cria 1 Contrato por Caso NÃO-excluído (chave `app-contrato-caso-<casoId>`),
//      copiando titulo/tipo/area/cliente/responsável e dataCriacao→dataFechamento;
//   2) liga Caso.contratoId, Honorario.contratoId e Lead.contratoId ao contrato do
//      caso (mantendo os casoId originais — additivo, nada é sobrescrito);
//   3) copia CasoResponsavel → ContratoResponsavel 1:1 (rateio por contrato).
// NÃO altera Lançamentos (a fonte da verdade financeira). Rode após `db:migrate`
// + `db:generate`. Reexecutar é seguro (upsert por chave + updateMany só onde nulo),
// e NÃO reverte vínculos já ajustados à mão (ex.: um caso re-apontado numa fase 2).
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const casos = await prisma.caso.findMany({
    where: { excluidoEm: null },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      area: true,
      clientePrincipalId: true,
      responsavelUserId: true,
      dataCriacao: true,
      responsaveis: { select: { contaId: true, percentual: true } },
    },
  })

  let honVinc = 0
  let leadVinc = 0
  let ratVinc = 0
  for (const c of casos) {
    const chave = `app-contrato-caso-${c.id}`
    // 1) contrato (idempotente pela chave; update:{} não clobbera edições manuais)
    const contrato = await prisma.contrato.upsert({
      where: { chave },
      create: {
        chave,
        titulo: c.titulo,
        tipo: c.tipo,
        area: c.area,
        status: "ativo",
        dataFechamento: c.dataCriacao,
        clienteId: c.clientePrincipalId,
        responsavelUserId: c.responsavelUserId,
      },
      update: {},
    })

    // 2) liga caso/honorários/leads ao contrato — SÓ onde ainda está nulo
    await prisma.caso.updateMany({ where: { id: c.id, contratoId: null }, data: { contratoId: contrato.id } })
    const h = await prisma.honorario.updateMany({ where: { casoId: c.id, contratoId: null }, data: { contratoId: contrato.id } })
    honVinc += h.count
    const l = await prisma.lead.updateMany({ where: { casoId: c.id, contratoId: null }, data: { contratoId: contrato.id } })
    leadVinc += l.count

    // 3) rateio: CasoResponsavel → ContratoResponsavel (idempotente)
    for (const r of c.responsaveis) {
      await prisma.contratoResponsavel.upsert({
        where: { contratoId_contaId: { contratoId: contrato.id, contaId: r.contaId } },
        create: { contratoId: contrato.id, contaId: r.contaId, percentual: r.percentual },
        update: { percentual: r.percentual },
      })
      ratVinc++
    }
  }

  console.log(
    `Contratos: ${casos.length} casos processados (1 contrato por caso). ` +
      `Honorários vinculados: ${honVinc}. Leads: ${leadVinc}. Rateios copiados: ${ratVinc}.`,
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

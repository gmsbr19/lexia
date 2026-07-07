// Diagnóstico (SOMENTE LEITURA) da Fase 1 do módulo Contratos. Roda contra o
// DATABASE_URL atual e NÃO grava nada. Confirma que o backfill foi LOSSLESS e que
// os números da página /contratos são idênticos aos de antes:
//   1) todo caso não-excluído tem exatamente 1 contrato (1:1 pós-Fase 1);
//   2) Σ honorários por contrato == Σ honorários por caso (nada perdido/duplicado);
//   3) nenhum honorário de caso vivo ficou sem contrato;
//   4) ContratoResponsavel espelha CasoResponsavel (rateio copiado 1:1).
// Uso: npx tsx scripts/diagnostico-contratos.ts   (após db:migrate + db:generate + db:backfill:contratos)
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
const ok = (b: boolean) => (b ? "✅ OK" : "❌ FALHA")

async function main() {
  const casosVivos = await prisma.caso.count({ where: { excluidoEm: null } })
  const contratos = await prisma.contrato.count({ where: { excluidoEm: null } })
  const casosSemContrato = await prisma.caso.count({ where: { excluidoEm: null, contratoId: null } })

  const honPorCaso = (await prisma.honorario.aggregate({ _sum: { valorCents: true }, where: { caso: { excluidoEm: null } } }))._sum.valorCents ?? 0
  const honPorContrato = (await prisma.honorario.aggregate({ _sum: { valorCents: true }, where: { contrato: { excluidoEm: null } } }))._sum.valorCents ?? 0
  const honCasoSemContrato = await prisma.honorario.count({ where: { caso: { excluidoEm: null }, contratoId: null } })

  const casoResp = await prisma.casoResponsavel.count({ where: { caso: { excluidoEm: null } } })
  const contratoResp = await prisma.contratoResponsavel.count({ where: { contrato: { excluidoEm: null } } })

  // nº de casos vivos por contrato (pós-Fase 1 deveria ser sempre 1)
  const comCasos = await prisma.contrato.findMany({
    where: { excluidoEm: null },
    select: { id: true, titulo: true, casos: { where: { excluidoEm: null }, select: { id: true } } },
  })
  const naoUnitarios = comCasos.filter((c) => c.casos.length !== 1)

  console.log("── Diagnóstico Contratos (Fase 1) ─────────────────────────────")
  console.log(`Casos vivos: ${casosVivos} · Contratos vivos: ${contratos}`)
  console.log(`${ok(casosSemContrato === 0)}  todo caso vivo tem contrato (sem contrato: ${casosSemContrato})`)
  console.log(`${ok(contratos === casosVivos)}  1 contrato por caso (esperado ${casosVivos}, achei ${contratos})`)
  console.log(`${ok(naoUnitarios.length === 0)}  todo contrato tem exatamente 1 caso vivo (exceções: ${naoUnitarios.length})`)
  console.log(`${ok(honPorCaso === honPorContrato)}  Σ honorários por caso (${brl(honPorCaso)}) == por contrato (${brl(honPorContrato)})`)
  console.log(`${ok(honCasoSemContrato === 0)}  honorários de caso vivo sem contrato: ${honCasoSemContrato}`)
  console.log(`${ok(contratoResp === casoResp)}  rateio copiado (CasoResponsavel ${casoResp} → ContratoResponsavel ${contratoResp})`)

  if (naoUnitarios.length) {
    console.log("\nContratos com nº de casos != 1 (esperado só na Fase 2+):")
    for (const c of naoUnitarios.slice(0, 20)) console.log(`  #${c.id} "${c.titulo}" → ${c.casos.length} casos`)
  }

  const todosOk = casosSemContrato === 0 && contratos === casosVivos && naoUnitarios.length === 0 && honPorCaso === honPorContrato && honCasoSemContrato === 0 && contratoResp === casoResp
  console.log(`\n${todosOk ? "✅ Backfill íntegro — números idênticos aos de antes." : "❌ Há divergências acima — investigar antes de seguir."}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

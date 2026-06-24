// Limpeza dos modelos embutidos do módulo Documentos.
// O editor estruturado (e os 6 modelos hardcoded do antigo registry) foi
// aposentado: agora só existe o editor rich-text e os modelos são enviados pelo
// próprio usuário. Este script soft-deleta os modelos embutidos que foram
// semeados a partir do registry — eles são exatamente os que têm `chave != null`
// (modelos criados pelo usuário nascem com `chave = null`). Idempotente.
// Rode com o `next dev` PARADO (lock do Prisma no Windows).
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const res = await prisma.documentoTemplate.updateMany({
    where: { chave: { not: null }, excluidoEm: null },
    data: { excluidoEm: new Date() },
  })
  console.log(`Documentos: ${res.count} modelo(s) embutido(s) removido(s) (soft-delete).`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

/**
 * Seed the auto-managed "Marketing" expense categoria used by the Comercial
 * module (every ad-spend Lancamento is filed under it). Idempotent.
 *
 *   npm run db:seed:comercial
 *
 * Not strictly required — `registrarGasto` ensures the categoria lazily — but
 * running this makes it show up in Financeiro › Custos before any spend exists.
 */
import { PrismaClient } from "@prisma/client"
import { MARKETING_CATEGORIA_ASTREA_ID } from "../src/lib/comercial/types"

const prisma = new PrismaClient()

async function main() {
  const cat = await prisma.categoria.upsert({
    where: { astreaId: MARKETING_CATEGORIA_ASTREA_ID },
    create: { astreaId: MARKETING_CATEGORIA_ASTREA_ID, nome: "Marketing", cor: "#C0A147", ativo: true },
    update: {},
  })
  console.log(`Categoria "Marketing" pronta (id ${cat.id}).`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

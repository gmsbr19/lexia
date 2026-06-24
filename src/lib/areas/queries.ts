// Áreas do Direito — read layer. SERVER ONLY.
import { prisma } from "@/lib/db"
import type { AreaComUso, AreaView } from "./types"

/** Todas as áreas ativas, ordenadas. */
export async function getAreas(): Promise<AreaView[]> {
  return prisma.areaDireito.findMany({
    where: { excluidoEm: null },
    orderBy: [{ ordem: "asc" }, { nome: "asc" }],
    select: { id: true, chave: true, nome: true, cor: true, icone: true, ordem: true, ativo: true },
  })
}

/** Áreas com contagens de uso (para o painel admin). */
export async function getAreasComUso(): Promise<AreaComUso[]> {
  const areas = await getAreas()
  const counts = await Promise.all(
    areas.map(async (a) => {
      const [projetos, casos, leads, campanhas] = await Promise.all([
        prisma.projeto.count({ where: { area: a.chave, excluidoEm: null } }),
        prisma.caso.count({ where: { area: a.chave, excluidoEm: null } }),
        prisma.lead.count({ where: { area: a.chave } }),
        prisma.campanha.count({ where: { area: a.chave } }),
      ])
      return { ...a, projetos, casos, leads, campanhas }
    }),
  )
  return counts
}

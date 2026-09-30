import { notFound } from "next/navigation"
import { getCrmDataset } from "@/lib/crm/dataset"
import { CasoDetailRoute } from "@/components/crm/CrmRoutes"
import { CASO_TABS, type CasoTab } from "@/lib/casos/status"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Página do caso. Os dados vêm de GET /api/casos/[id] (escopo por papel checado
// lá — um advogado só abre os casos que enxerga). Independe do módulo Processos.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const casoId = Number(id)
  if (!Number.isInteger(casoId) || casoId <= 0) notFound()
  const sp = await searchParams
  const tabParam = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab
  const initialTab = (CASO_TABS as readonly string[]).includes(tabParam ?? "") ? (tabParam as CasoTab) : "honorarios"
  const dataset = await getCrmDataset()
  // key: navegar de um caso para outro remonta a página (estado limpo por caso)
  return <CasoDetailRoute key={casoId} dataset={dataset} casoId={casoId} initialTab={initialTab} />
}

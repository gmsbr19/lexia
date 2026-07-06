import { getCrmDataset } from "@/lib/crm/dataset"
import { ClienteDetailRoute } from "@/components/crm/CrmRoutes"
import type { ClienteTab } from "@/components/crm/crm-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TABS = ["financeiro", "cobranca", "tarefas", "casos", "contratos", "eventos", "documentos"]

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const sp = await searchParams
  const dataset = await getCrmDataset()
  const tabParam = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab
  const initialTab = (tabParam && TABS.includes(tabParam) ? tabParam : "financeiro") as ClienteTab
  return <ClienteDetailRoute dataset={dataset} clienteId={Number(id)} initialTab={initialTab} />
}

import { getCrmDataset } from "@/lib/crm/dataset"
import { AgendaRoute } from "@/components/crm/CrmRoutes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function Page() {
  const dataset = await getCrmDataset()
  return <AgendaRoute dataset={dataset} />
}

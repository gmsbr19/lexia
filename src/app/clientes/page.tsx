import { getCrmDataset } from "@/lib/crm/dataset"
import { ClientesRoute } from "@/components/crm/CrmRoutes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const dataset = await getCrmDataset()
  return <ClientesRoute dataset={dataset} newCliente={sp.new === "cliente"} />
}

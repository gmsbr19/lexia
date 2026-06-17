import { getCrmDataset } from "@/lib/crm/dataset"
import { ContratosRoute } from "@/components/crm/CrmRoutes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const num = (v: string | string[] | undefined): number | undefined => {
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const dataset = await getCrmDataset()
  return <ContratosRoute dataset={dataset} openContrato={num(sp.contrato)} />
}

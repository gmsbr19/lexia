import "@/components/comercial/cm-theme.css"
import { getComercialDataset } from "@/lib/comercial/queries"
import { ComercialApp } from "@/components/comercial/ComercialApp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Server component: one fetch of the raw Comercial dataset (campaigns + leads +
// ad-spend); the client app does period scoping + metric computation.
export default async function Page() {
  const dataset = await getComercialDataset()
  return <ComercialApp dataset={dataset} />
}

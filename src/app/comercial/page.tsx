import "@/components/comercial/cm-theme.css"
import { auth } from "@/lib/auth"
import type { Role } from "@/lib/auth/session"
import { verFinanceiro } from "@/lib/users/types"
import { getComercialDataset } from "@/lib/comercial/queries"
import { ComercialApp } from "@/components/comercial/ComercialApp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Server component: one fetch of the raw Comercial dataset (campaigns + leads +
// ad-spend); the client app does period scoping + metric computation.
export default async function Page() {
  const [session, dataset] = await Promise.all([auth(), getComercialDataset()])
  const verFin = verFinanceiro((session?.user?.role as Role) ?? "socio")
  return <ComercialApp dataset={dataset} verFin={verFin} />
}

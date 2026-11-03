import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth/session"
import { getCrmDataset } from "@/lib/crm/dataset"
import { listCasosPagina } from "@/lib/casos/queries"
import { verFinanceiro } from "@/lib/users/types"
import { CasosRoute } from "@/components/crm/CrmRoutes"
import { PODE_CRIAR_CASO } from "@/lib/casos/status"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Casos — item próprio do menu. A matéria do cliente (honorários, contrato,
// rateio) NÃO depende do módulo Processos: esta rota funciona com ele desligado.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  // deep-links antigos (?caso=<id>) → página do caso
  const caso = Number(Array.isArray(sp.caso) ? sp.caso[0] : sp.caso)
  if (Number.isInteger(caso) && caso > 0) redirect(`/casos/${caso}`)
  const user = await requireUser()
  const verFin = verFinanceiro(user.role)
  const [dataset, casos] = await Promise.all([getCrmDataset(), listCasosPagina(user, verFin)])
  return (
    <CasosRoute
      dataset={dataset}
      casos={casos}
      verFin={verFin}
      podeCriar={PODE_CRIAR_CASO.includes(user.role)}
      novo={sp.novo === "1"}
    />
  )
}

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import type { Role } from "@/lib/auth/session"
import { verFinanceiro } from "@/lib/users/types"
import { getPlanoAcao } from "@/lib/finance/briefing"
import { PlanoAcaoPage } from "@/components/inicio/plano/PlanoAcaoPage"

export const dynamic = "force-dynamic"

export default async function Page() {
  // Plano de ação é 100% financeiro (cobrança/receita) — bloqueado para a "Equipe".
  const session = await auth()
  if (!verFinanceiro((session?.user?.role as Role) ?? "socio")) redirect("/")
  const plano = await getPlanoAcao()
  const label = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date())
  return <PlanoAcaoPage plano={plano} briefingDataLabel={label} />
}

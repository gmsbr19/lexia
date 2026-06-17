import { getPlanoAcao } from "@/lib/finance/briefing"
import { PlanoAcaoPage } from "@/components/inicio/plano/PlanoAcaoPage"

export const dynamic = "force-dynamic"

export default async function Page() {
  const plano = await getPlanoAcao()
  const label = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date())
  return <PlanoAcaoPage plano={plano} briefingDataLabel={label} />
}

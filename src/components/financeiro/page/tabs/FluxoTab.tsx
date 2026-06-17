import { getFluxoResumo } from "@/lib/finance/queries"
import { FluxoCaixa } from "../../interativo/FluxoCaixa"

export async function FluxoTab() {
  const resumo = await getFluxoResumo()
  return <FluxoCaixa resumo={resumo} />
}

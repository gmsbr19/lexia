import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import type { Role } from "@/lib/auth/session"
import { verFinanceiro } from "@/lib/users/types"
import { getRelatorioFinanceiro } from "@/lib/finance/relatorio"
import { normalizeFaixa } from "@/lib/finance/relatorio-periodo"
import { RelatorioDoc } from "@/components/financeiro/relatorio/RelatorioDoc"
import { PrintBar } from "./PrintBar"
import "./print.css"

// Versão para impressão do relatório financeiro: o MESMO <RelatorioDoc> da aba,
// renderizado sem o shell do app (UnifiedShell trata esta rota como "bare"),
// numa folha que o @media print de print.css transforma em A4. `?print=0`
// abre sem disparar o diálogo de impressão (útil para conferir o layout).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!verFinanceiro((session?.user?.role as Role) ?? "socio")) redirect("/")
  const params = await searchParams
  const faixa = normalizeFaixa(params.de, params.ate)
  const rel = await getRelatorioFinanceiro(faixa)
  const auto = (Array.isArray(params.print) ? params.print[0] : params.print) !== "0"

  return (
    <div className="rel-print-root">
      <PrintBar titulo={`Relatório financeiro · ${rel.titulo}`} auto={auto} />
      <div className="rel-print-sheet">
        <RelatorioDoc rel={rel} />
      </div>
    </div>
  )
}

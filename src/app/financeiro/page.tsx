import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import type { Role } from "@/lib/auth/session"
import { verFinanceiro } from "@/lib/users/types"
import { FinanceiroPage } from "@/components/financeiro/page/FinanceiroPage"

// searchParams opts this route into dynamic rendering (fresh DB reads). The
// design tabs read tab/mes/periodo + lançamento filters (dir/stat/cat/q/aging).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Financeiro é restrito a Sócio/Admin/Financeiro — "Equipe" é redirecionada.
  const session = await auth()
  if (!verFinanceiro((session?.user?.role as Role) ?? "socio")) redirect("/")
  const params = await searchParams
  return <FinanceiroPage params={params} />
}

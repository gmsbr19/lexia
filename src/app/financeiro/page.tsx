import { FinanceiroPage } from "@/components/financeiro/page/FinanceiroPage"

// searchParams opts this route into dynamic rendering (fresh DB reads). The
// design tabs read tab/mes/periodo + lançamento filters (dir/stat/cat/q/aging).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  return <FinanceiroPage params={params} />
}

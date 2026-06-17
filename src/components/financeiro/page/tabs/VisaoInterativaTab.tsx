import { getLancamentos } from "@/lib/finance/queries"
import { periodScope } from "@/lib/finance/periodo"
import type { Periodo } from "@/lib/finance/types"
import { VisaoGeral } from "../../interativo/VisaoGeral"

export async function VisaoInterativaTab({ mes, periodo }: { mes: string; periodo: Periodo }) {
  const [items, allItems] = await Promise.all([getLancamentos(mes, periodo), getLancamentos()])
  return <VisaoGeral items={items} allItems={allItems} scope={periodScope(mes, periodo)} mes={mes} />
}

import { redirect } from "next/navigation"
import { getProcessosDataset } from "@/lib/processos/dataset"
import { getCrmDataset } from "@/lib/crm/dataset"
import { getModulosConfig, processosHabilitado } from "@/lib/settings"
import { ProcessosApp } from "@/components/processos/ProcessosApp"
import type { ProcView } from "@/components/processos/proc-types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VIEWS: ProcView[] = ["painel", "processos", "prazos", "andamentos", "captura", "saude"]

const num = (v: string | string[] | undefined): number | undefined => {
  const n = Number(Array.isArray(v) ? v[0] : v)
  return Number.isInteger(n) && n > 0 ? n : undefined
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Casos & Processos pode ser temporariamente desativado (Configurações → Módulos).
  if (!processosHabilitado(await getModulosConfig())) redirect("/")
  const sp = await searchParams
  const caso = num(sp.caso)
  const raw = Array.isArray(sp.view) ? sp.view[0] : sp.view
  const view: ProcView = (VIEWS as string[]).includes(raw ?? "")
    ? (raw as ProcView)
    : caso
      ? "processos"
      : "painel"
  const [dataset, crm] = await Promise.all([getProcessosDataset(), getCrmDataset()])
  return <ProcessosApp dataset={dataset} crm={crm} initialView={view} openCaso={caso} />
}

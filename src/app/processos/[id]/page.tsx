import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth/session"
import { hojeISO } from "@/lib/processos/datas"
import { getProcessoDetail } from "@/lib/processos/queries"
import { getUsuariosAtivos } from "@/lib/users/queries"
import { ProcFichaRoute } from "@/components/processos/ProcFichaRoute"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pid = Number(id)
  if (!Number.isInteger(pid) || pid <= 0) notFound()

  const user = await requireUser()
  const [detail, responsaveis] = await Promise.all([getProcessoDetail(pid, user), getUsuariosAtivos()])
  if (!detail) notFound()

  return <ProcFichaRoute detail={detail} responsaveis={responsaveis} hoje={hojeISO()} />
}

import { registrarAcertoSocios } from "@/lib/finance/mutations"
import { runMutation } from "@/lib/finance/api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  return runMutation(() => registrarAcertoSocios(), {
    action: "acerto-socios.registrar",
    entity: "Transferencia",
    roles: ["socio"],
  })
}

// POST /api/processos/captura/run — gatilho manual da captura (botões "Rodar
// agora" / "Pré-visualizar"). Body: { fonte?: 'comunica'|'datajud'|'ambas',
// dryRun?: boolean, desde?: 'YYYY-MM-DD' }. action contém "import" → bucket import (5/min).
import { readJson, runMutation } from "@/lib/finance/api"
import { runCaptura } from "@/lib/processos/cnj/captura"
import { capturaRunSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  return runMutation(() => runCaptura(parseBody(capturaRunSchema, body)), {
    action: "processo.captura.import",
    entity: "ExecucaoCaptura",
    payload: body,
    roles: ["socio", "advogado"],
  })
}

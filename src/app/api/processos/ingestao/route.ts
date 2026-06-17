// POST /api/processos/ingestao — the MANUAL adapter of the ingestion port.
// Accepts a batch of external andamentos/publicações (the same shape a tribunal
// scraper would produce) and links/creates them idempotently (by externalId).
import { readJson, runMutation } from "@/lib/finance/api"
import { ingerir } from "@/lib/processos/ingestao"
import { ingestaoSchema } from "@/lib/processos/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await readJson(req)
  // action contains "import" → throttled to the 5/min import bucket.
  return runMutation(() => ingerir(parseBody(ingestaoSchema, body)), {
    action: "processo.ingestao.import",
    entity: "Andamento",
    roles: ["socio", "advogado"],
  })
}

import { NextResponse } from "next/server"
import { guardRequest, sessionEmail } from "@/lib/auth/session"
import { readJson, runMutation } from "@/lib/finance/api"
import { getTarefasDataset } from "@/lib/tarefas/queries"
import { createTarefa } from "@/lib/tarefas/mutations"
import { tarefaCreateSchema } from "@/lib/tarefas/schemas"
import { parseBody } from "@/lib/validation"
import { withRequestOrigin, resolveRequestOrigin } from "@/lib/request-origin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const denied = await guardRequest()
  if (denied) return denied

  return NextResponse.json(await getTarefasDataset())
}

export async function POST(req: Request) {
  const body = await readJson(req)
  const actor = (await sessionEmail()) ?? undefined
  return withRequestOrigin(resolveRequestOrigin(req), () =>
    runMutation(() => createTarefa(parseBody(tarefaCreateSchema, body), actor), {
      action: "tarefa.criar",
      entity: "Tarefa",
      payload: body,
    }),
  )
}

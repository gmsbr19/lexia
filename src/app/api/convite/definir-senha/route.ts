// Endpoint PÚBLICO (convidado sem sessão) — define a senha pelo token do convite.
// Excluído do gate em src/proxy.ts. Não usa runMutation (não há sessão); faz o
// próprio rate-limit por IP e devolve mensagens PT-BR genéricas.
import { NextResponse } from "next/server"
import { UserError } from "@/lib/errors"
import { readJson } from "@/lib/finance/api"
import { log } from "@/lib/log"
import { rateLimit } from "@/lib/rate-limit"
import { definirSenhaPorToken } from "@/lib/users/convite"
import { definirSenhaSchema } from "@/lib/users/schemas"
import { parseBody } from "@/lib/validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon"
  if (!rateLimit(`convite-definir:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas — aguarde um instante" }, { status: 429 })
  }
  const body = await readJson(req)
  try {
    const { token, senha, nome } = parseBody(definirSenhaSchema, body)
    await definirSenhaPorToken(token, { senha, nome })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: 400 })
    log.error({ err: e instanceof Error ? e.message : String(e) }, "definir-senha por convite falhou")
    return NextResponse.json({ error: "Erro ao processar a requisição" }, { status: 500 })
  }
}

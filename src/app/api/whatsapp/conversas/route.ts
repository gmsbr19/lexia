// GET /api/whatsapp/conversas — as conversas DO USUÁRIO LOGADO. Leitura, então
// não passa por runMutation nem gera auditoria.
//
// `?busca=` filtra por nome, telefone ou nome do contato vinculado;
// `?monitoradas=1` mostra só as que estão sendo gravadas. Não existe parâmetro
// de usuário: o userId sai da sessão, e é isso que garante que ninguém leia a
// lista de conversas de outra pessoa.
import { NextResponse } from "next/server"
import { AuthError, guardRequest } from "@/lib/auth/session"
import { moduloDesligado, userIdDaSessao } from "@/lib/whatsapp/acesso"
import { listarConversas } from "@/lib/whatsapp/conversas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const off = moduloDesligado()
  if (off) return off
  const denied = await guardRequest()
  if (denied) return denied
  try {
    const userId = await userIdDaSessao()
    const url = new URL(req.url)
    // { conversas, sugeridas } — a contagem de sugeridas é global, não só das
    // linhas devolvidas (é o número da faixa "monitorar essas N").
    const lista = await listarConversas(userId, {
      busca: url.searchParams.get("busca"),
      apenasMonitoradas: url.searchParams.get("monitoradas") === "1",
    })
    return NextResponse.json(lista)
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    throw e
  }
}

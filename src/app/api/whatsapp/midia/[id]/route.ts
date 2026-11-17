// GET /api/whatsapp/midia/[id]?t=<token> — baixa o arquivo de UMA mensagem.
//
// DOIS caminhos de autenticação, e nenhum deles aceita um userId de fora:
//  • token assinado (`?t=`): é o que a página usa e o que a fase 4 entregará ao
//    Claude, que não tem cookie do Lexia. O token carrega o par
//    (mensagemId, userId) ASSINADO, então não há como pedir a mídia de outra
//    pessoa trocando o número da URL;
//  • sessão: um link aberto à mão por quem está logado continua funcionando,
//    resolvendo o usuário pela sessão.
// Em ambos, o dono é conferido de novo no banco (a consulta filtra por userId):
// a assinatura diz QUEM pediu, o banco diz de quem é o arquivo.
import { NextResponse } from "next/server"
import { AuthError } from "@/lib/auth/session"
import { moduloDesligado, userIdDaSessao } from "@/lib/whatsapp/acesso"
import { lerMidia } from "@/lib/whatsapp/conversas"
import { derivarChaveMidia, verificarMidia } from "@/lib/whatsapp/midia-link"
import { chaveAuth } from "@/lib/whatsapp/sessoes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const naoEncontrado = () => NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 })

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const off = moduloDesligado()
  if (off) return off
  const chave = chaveAuth()
  if (!chave) return naoEncontrado()

  const { id } = await ctx.params
  const mensagemId = Number(id)
  if (!Number.isInteger(mensagemId) || mensagemId <= 0) return naoEncontrado()

  const token = new URL(req.url).searchParams.get("t")
  let userId: number | null = null
  const alvo = verificarMidia(token, derivarChaveMidia(chave), Date.now())
  if (alvo) {
    // O token é de UMA mensagem: um token válido não abre outra.
    if (alvo.mensagemId !== mensagemId) return naoEncontrado()
    userId = alvo.userId
  } else {
    try {
      userId = await userIdDaSessao()
    } catch (e) {
      if (e instanceof AuthError) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
      throw e
    }
  }

  const midia = await lerMidia(userId, mensagemId)
  if (!midia) return naoEncontrado()

  return new NextResponse(new Uint8Array(midia.bytes), {
    headers: {
      "Content-Type": midia.mime,
      "Content-Length": String(midia.bytes.length),
      // `inline` para imagem/PDF abrirem na própria aba; o nome é saneado em
      // nomeDeArquivo (nada de caminho nem de aspas que quebrem o cabeçalho).
      "Content-Disposition": 'inline; filename="' + midia.nome.replace(/["\r\n]/g, "") + '"',
      // Conteúdo sob sigilo profissional: nunca em cache compartilhado, e o
      // link assinado é curto de propósito.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

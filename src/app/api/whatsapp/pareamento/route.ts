// POST /api/whatsapp/pareamento — caminho alternativo ao QR: o usuário digita o
// próprio número e o worker pede ao WhatsApp um código de 8 caracteres para ele
// digitar no celular. É o caminho prático quando o Lexia está aberto NO próprio
// celular (não há como fotografar o QR da própria tela).
//
// O número é só o do aparelho que vai ser pareado — a sessão continua sendo a do
// usuário logado. O telefone NÃO identifica ninguém aqui: não há como pedir o
// pareamento da sessão de outra pessoa.
import { runMutation } from "@/lib/finance/api"
import { readJson } from "@/lib/finance/api"
import { UserError } from "@/lib/errors"
import { parseBody } from "@/lib/validation"
import { moduloDesligado, userIdDaSessao } from "@/lib/whatsapp/acesso"
import { numeroParaPareamento } from "@/lib/whatsapp/core"
import { pareamentoSchema } from "@/lib/whatsapp/schemas"
import { publicarComando } from "@/lib/whatsapp/sessoes"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const off = moduloDesligado()
  if (off) return off
  const body = await readJson(req)
  return runMutation(
    async () => {
      const { numero: bruto } = parseBody(pareamentoSchema, body)
      const numero = numeroParaPareamento(bruto)
      if (!numero) throw new UserError("Número inválido — informe com DDD, por exemplo (11) 99999-8888")
      const userId = await userIdDaSessao()
      await publicarComando({ tipo: "pareamento", userId, numero })
      return { userId }
    },
    // O payload da auditoria NÃO leva o número (é dado pessoal e a linha já
    // identifica quem pediu; o telefone conectado fica em WhatsappSessao).
    { action: "whatsapp.pareamento", entity: "WhatsappSessao" },
  )
}

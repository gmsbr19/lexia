// POST /api/whatsapp/conversas/sugeridas — liga o monitoramento de todas as
// conversas sugeridas de uma vez (contato vinculado a cliente com caso ativo).
//
// Existe como rota própria porque a decisão é do SERVIDOR sobre o conjunto
// inteiro: a página mostra no máximo algumas centenas de linhas, e mandar a
// lista de ids daqui deixaria o cliente escolher o que gravar.
//
// O userId sai da sessão, como no resto do módulo — não há como pedir para
// ligar as conversas de outra pessoa.
import { runMutation } from "@/lib/finance/api"
import { moduloDesligado, userIdDaSessao } from "@/lib/whatsapp/acesso"
import { monitorarSugeridas } from "@/lib/whatsapp/conversas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  const off = moduloDesligado()
  if (off) return off
  return runMutation(
    async () => monitorarSugeridas(await userIdDaSessao()),
    // Auditoria sem conteúdo: quantas conversas passaram a ser gravadas, nunca
    // quais contatos ou o que foi dito nelas.
    { action: "whatsapp.conversas.monitorar-sugeridas", entity: "WhatsappChat" },
  )
}

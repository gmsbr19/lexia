// /whatsapp/conversas — escolha de quais conversas o Lexia grava, e o vínculo
// delas com os contatos. Do USUÁRIO LOGADO (auth pelo proxy + shell); a lista
// inicial é lida no servidor para a página já abrir pintada.
import { redirect } from "next/navigation"
import { AuthError } from "@/lib/auth/session"
import { ConversasApp } from "@/components/whatsapp/ConversasApp"
import { userIdDaSessao } from "@/lib/whatsapp/acesso"
import { listarConversas, type ListaConversas } from "@/lib/whatsapp/conversas"
import { getSessaoView, whatsappHabilitado } from "@/lib/whatsapp/sessoes"
import { SESSAO_VAZIA, type SessaoView } from "@/lib/whatsapp/tipos"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function Page() {
  // Módulo não configurado: a página de conexão é quem explica o que falta.
  if (!whatsappHabilitado()) redirect("/whatsapp/conectar")
  let lista: ListaConversas = { conversas: [], sugeridas: 0, naFila: 0 }
  let sessao: SessaoView = SESSAO_VAZIA
  try {
    const userId = await userIdDaSessao()
    ;[lista, sessao] = await Promise.all([listarConversas(userId), getSessaoView(userId)])
  } catch (e) {
    if (!(e instanceof AuthError)) throw e // sem sessão o proxy já teria redirecionado
  }
  return (
    <ConversasApp
      inicial={lista.conversas}
      sugeridasIniciais={lista.sugeridas}
      naFilaInicial={lista.naFila}
      sessao={sessao}
    />
  )
}

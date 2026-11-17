// WhatsApp fase 3 — leitura e escrita das conversas, do lado do APP WEB.
// SERVER ONLY.
//
// ISOLAMENTO: nenhuma função daqui aceita um userId vindo da requisição (quem
// chama resolve a sessão primeiro, via ./acesso), e TODA consulta filtra por ele
// — inclusive as que recebem um chatId. Um chatId de outro usuário devolve
// "não encontrada", nunca "sem permissão": dizer "sem permissão" já revelaria
// que a conversa existe.
import { prisma } from "@/lib/db"
import { UserError } from "@/lib/errors"
import { contemNormalizado } from "@/lib/text"
import { formatarTelefone, truncarTexto, type TipoMensagem } from "./mensagens-core"
import { assinarMidia, caminhoMidia, derivarChaveMidia } from "./midia-link"
import { chaveAuth, publicarComando } from "./sessoes"

/** Teto de conversas devolvidas para a página (a lista é navegada por busca). */
const MAX_CONVERSAS = 300
/** Quantas conversas são examinadas na busca antes de cortar. */
const MAX_VARRIDAS = 2_000
/** Mensagens no painel de leitura da página. */
export const MAX_MENSAGENS_PAGINA = 200

export type VinculoChat = "sugerido" | "confirmado" | "manual"

export type ConversaView = {
  id: number
  nome: string | null
  telefone: string | null
  telefoneFmt: string | null
  grupo: boolean
  monitorar: boolean
  monitoradoEm: string | null
  clienteId: number | null
  clienteNome: string | null
  vinculo: VinculoChat | null
  ultimaMensagemEm: string | null
  /** Quantas mensagens desta conversa estão gravadas. */
  gravadas: number
}

export type MensagemView = {
  id: number
  deMim: boolean
  autorNome: string | null
  tipo: TipoMensagem
  texto: string | null
  enviadaEm: string
  tratadaEm: string | null
  midia: { nome: string | null; mime: string | null; tamanho: number | null; url: string | null } | null
}

const SELECT_CHAT = {
  id: true,
  jid: true,
  nome: true,
  telefone: true,
  grupo: true,
  monitorar: true,
  monitoradoEm: true,
  clienteId: true,
  vinculo: true,
  ultimaMensagemEm: true,
  cliente: { select: { nome: true } },
  _count: { select: { mensagens: true } },
} as const

type ChatRow = {
  id: number
  jid: string
  nome: string | null
  telefone: string | null
  grupo: boolean
  monitorar: boolean
  monitoradoEm: Date | null
  clienteId: number | null
  vinculo: string | null
  ultimaMensagemEm: Date | null
  cliente: { nome: string } | null
  _count: { mensagens: number }
}

function paraView(c: ChatRow): ConversaView {
  return {
    id: c.id,
    // Sem nome salvo, o número formatado serve de rótulo; sem os dois (LID), o
    // jid cru é o que há — melhor que uma linha anônima.
    nome: c.nome ?? formatarTelefone(c.telefone) ?? c.jid.split("@")[0],
    telefone: c.telefone,
    telefoneFmt: formatarTelefone(c.telefone),
    grupo: c.grupo,
    monitorar: c.monitorar,
    monitoradoEm: c.monitoradoEm?.toISOString() ?? null,
    clienteId: c.clienteId,
    clienteNome: c.cliente?.nome ?? null,
    vinculo: (c.vinculo as VinculoChat | null) ?? null,
    ultimaMensagemEm: c.ultimaMensagemEm?.toISOString() ?? null,
    gravadas: c._count.mensagens,
  }
}

/**
 * Conversas do usuário, da mais recente para a mais antiga. A busca é feita em
 * memória sobre as conversas mais recentes porque é ACENTO-INSENSÍVEL (como o
 * resto do app, via contemNormalizado) — um `contains` do Postgres acharia
 * "Joao" mas não "João".
 */
export async function listarConversas(
  userId: number,
  opts: { busca?: string | null; apenasMonitoradas?: boolean } = {},
): Promise<ConversaView[]> {
  const busca = (opts.busca ?? "").trim()
  const rows = await prisma.whatsappChat.findMany({
    where: { userId, ...(opts.apenasMonitoradas ? { monitorar: true } : {}) },
    select: SELECT_CHAT,
    orderBy: [{ ultimaMensagemEm: { sort: "desc", nulls: "last" } }, { id: "desc" }],
    take: busca ? MAX_VARRIDAS : MAX_CONVERSAS,
  })
  const views = rows.map(paraView)
  if (!busca) return views
  const digitos = busca.replace(/\D/g, "")
  return views
    .filter(
      (c) =>
        contemNormalizado(busca, c.nome, c.clienteNome) ||
        (!!digitos && !!c.telefone && c.telefone.includes(digitos)),
    )
    .slice(0, MAX_CONVERSAS)
}

/** A conversa, conferindo o dono. Lança "não encontrada" para qualquer outra. */
async function minhaConversa(userId: number, chatId: number) {
  const chat = await prisma.whatsappChat.findFirst({ where: { id: chatId, userId }, select: SELECT_CHAT })
  if (!chat) throw new UserError("Conversa não encontrada")
  return chat
}

export type LeituraConversa = { conversa: ConversaView; mensagens: MensagemView[] }

/**
 * Painel de leitura da página: as últimas mensagens gravadas, em ordem
 * cronológica. Os BYTES da mídia nunca entram aqui — só o metadado e um link
 * assinado, para uma lista de 200 mensagens não virar megabytes de base64.
 */
export async function lerConversa(
  userId: number,
  chatId: number,
  limite = MAX_MENSAGENS_PAGINA,
): Promise<LeituraConversa> {
  const chat = await minhaConversa(userId, chatId)
  const rows = await prisma.whatsappMensagem.findMany({
    where: { userId, chatId },
    select: {
      id: true,
      deMim: true,
      autorNome: true,
      tipo: true,
      texto: true,
      midiaMime: true,
      midiaNome: true,
      midiaTamanho: true,
      enviadaEm: true,
      tratadaEm: true,
      midia: { select: { tamanho: true } },
    },
    orderBy: { enviadaEm: "desc" },
    take: Math.min(Math.max(limite, 1), MAX_MENSAGENS_PAGINA),
  })
  const chave = chaveAuth()
  const agora = Date.now()
  const mensagens: MensagemView[] = rows.reverse().map((m) => ({
    id: m.id,
    deMim: m.deMim,
    autorNome: m.autorNome,
    tipo: m.tipo as TipoMensagem,
    texto: truncarTexto(m.texto),
    enviadaEm: m.enviadaEm.toISOString(),
    tratadaEm: m.tratadaEm?.toISOString() ?? null,
    midia: m.midiaMime || m.midiaNome || m.midiaTamanho
      ? {
          nome: m.midiaNome,
          mime: m.midiaMime,
          tamanho: m.midia?.tamanho ?? m.midiaTamanho,
          // Link só quando os bytes existem de fato (acima do teto, ou já
          // limpos pela retenção, fica o metadado sem download).
          url: m.midia && chave ? caminhoMidia(m.id, assinarMidia({ mensagemId: m.id, userId }, derivarChaveMidia(chave), agora)) : null,
        }
      : null,
  }))
  return { conversa: paraView(chat), mensagens }
}

/**
 * Liga/desliga a gravação desta conversa. Avisa o worker na hora (`recarregar`)
 * para a próxima mensagem já cair na regra nova, em vez de esperar o TTL.
 *
 * Mensagens anteriores a ligar o monitoramento NÃO existem e não podem ser
 * recuperadas: o Baileys não oferece busca de histórico sob demanda. `monitoradoEm`
 * registra o momento para a página poder dizer isso.
 */
export async function definirMonitoramento(userId: number, chatId: number, monitorar: boolean): Promise<ConversaView> {
  await minhaConversa(userId, chatId)
  await prisma.whatsappChat.update({
    where: { id: chatId },
    data: { monitorar, monitoradoEm: monitorar ? new Date() : null },
  })
  await publicarComando({ tipo: "recarregar", userId })
  return paraView(await minhaConversa(userId, chatId))
}

/**
 * Vincula (ou desvincula) a conversa a um contato. Escolha do usuário vira
 * `manual`; confirmar a sugestão do worker vira `confirmado` — e nenhum dos
 * dois é sobrescrito depois pelo vínculo automático.
 */
export async function vincularCliente(
  userId: number,
  chatId: number,
  clienteId: number | null,
): Promise<ConversaView> {
  const chat = await minhaConversa(userId, chatId)
  if (clienteId != null) {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } })
    if (!cliente) throw new UserError("Contato não encontrado")
  }
  const vinculo = clienteId == null ? null : clienteId === chat.clienteId ? "confirmado" : "manual"
  await prisma.whatsappChat.update({ where: { id: chatId }, data: { clienteId, vinculo } })
  return paraView(await minhaConversa(userId, chatId))
}

/**
 * Apaga o que já foi gravado desta conversa (a mídia vai junto, pelo cascade).
 * É o que a página oferece ao desmarcar "Monitorar" — minimização é regra do
 * módulo, e deixar para trás conversa que o usuário decidiu não guardar
 * contrariaria justamente o motivo de a marcação existir.
 */
export async function apagarMensagens(userId: number, chatId: number): Promise<number> {
  await minhaConversa(userId, chatId)
  const r = await prisma.whatsappMensagem.deleteMany({ where: { userId, chatId } })
  return r.count
}

/** Os bytes de uma mídia, conferindo o dono. Usado pela rota de download. */
export async function lerMidia(
  userId: number,
  mensagemId: number,
): Promise<{ bytes: Buffer; mime: string; nome: string } | null> {
  const m = await prisma.whatsappMensagem.findFirst({
    where: { id: mensagemId, userId },
    select: { midiaMime: true, midiaNome: true, midia: { select: { dados: true } } },
  })
  if (!m?.midia) return null
  return {
    bytes: Buffer.from(m.midia.dados, "base64"),
    mime: m.midiaMime ?? "application/octet-stream",
    nome: m.midiaNome ?? "arquivo",
  }
}

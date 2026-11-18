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
import { clientesComCasoAtivo, sugereMonitorar } from "./core"
import { formatarTelefone, truncarTexto, type TipoMensagem } from "./mensagens-core"
import { assinarMidia, caminhoMidia, derivarChaveMidia } from "./midia-link"
import { chaveAuth, getSessaoView, publicarComando } from "./sessoes"

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
  /**
   * Candidata a ser monitorada: contato vinculado a um cliente com caso ATIVO,
   * e ainda não gravando. É só uma SUGESTÃO — quem liga é o usuário.
   */
  sugerida: boolean
  /**
   * Dá para pedir as mensagens anteriores: existe âncora (alguma mensagem desta
   * conversa já passou pelo worker). Sem ela o WhatsApp não tem de onde contar
   * para trás.
   */
  podeHistorico: boolean
  /** A mensagem mais antiga que o Lexia já viu nesta conversa. */
  historicoDesde: string | null
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
  ancoraChave: true,
  ancoraEm: true,
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
  ancoraChave: string | null
  ancoraEm: Date | null
  cliente: { nome: string } | null
  _count: { mensagens: number }
}

function paraView(c: ChatRow, sugerida = false): ConversaView {
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
    sugerida,
    podeHistorico: !!c.ancoraChave && !!c.ancoraEm,
    historicoDesde: c.ancoraEm?.toISOString() ?? null,
  }
}

/**
 * Os ids das conversas que a página vai sugerir monitorar. Duas consultas
 * leves: os chats vinculados e ainda desligados, e os casos desses clientes.
 * O filtro de status é feito em TS de propósito (ver `clientesComCasoAtivo`).
 */
async function chatsSugeridos(userId: number): Promise<Set<number>> {
  const candidatos = await prisma.whatsappChat.findMany({
    where: { userId, monitorar: false, grupo: false, clienteId: { not: null } },
    select: { id: true, grupo: true, monitorar: true, clienteId: true },
  })
  if (candidatos.length === 0) return new Set()
  const clienteIds = [...new Set(candidatos.map((c) => c.clienteId!))]
  const casos = await prisma.caso.findMany({
    where: { clientePrincipalId: { in: clienteIds }, excluidoEm: null },
    select: { clientePrincipalId: true, status: true },
  })
  const ativos = clientesComCasoAtivo(casos)
  return new Set(candidatos.filter((c) => sugereMonitorar(c, ativos)).map((c) => c.id))
}

/** A mesma decisão para UMA conversa (depois de ligar/desligar ou vincular). */
async function ehSugerida(c: ChatRow): Promise<boolean> {
  if (c.grupo || c.monitorar || c.clienteId == null) return false
  const casos = await prisma.caso.findMany({
    where: { clientePrincipalId: c.clienteId, excluidoEm: null },
    select: { clientePrincipalId: true, status: true },
  })
  return sugereMonitorar(c, clientesComCasoAtivo(casos))
}

/**
 * Conversas do usuário, da mais recente para a mais antiga. A busca é feita em
 * memória sobre as conversas mais recentes porque é ACENTO-INSENSÍVEL (como o
 * resto do app, via contemNormalizado) — um `contains` do Postgres acharia
 * "Joao" mas não "João".
 */
export type ListaConversas = {
  conversas: ConversaView[]
  /**
   * Quantas conversas entram na sugestão NO TOTAL — não só entre as linhas
   * devolvidas. É o número da faixa da página, então contar só o que coube na
   * tela (ou o que sobrou do filtro "só monitoradas") mentiria.
   */
  sugeridas: number
}

export async function listarConversas(
  userId: number,
  opts: { busca?: string | null; apenasMonitoradas?: boolean } = {},
): Promise<ListaConversas> {
  const busca = (opts.busca ?? "").trim()
  const rows = await prisma.whatsappChat.findMany({
    where: { userId, ...(opts.apenasMonitoradas ? { monitorar: true } : {}) },
    select: SELECT_CHAT,
    orderBy: [{ ultimaMensagemEm: { sort: "desc", nulls: "last" } }, { id: "desc" }],
    take: busca ? MAX_VARRIDAS : MAX_CONVERSAS,
  })
  const sugeridas = await chatsSugeridos(userId)
  const views = rows.map((c) => paraView(c, sugeridas.has(c.id)))
  if (!busca) return { conversas: views, sugeridas: sugeridas.size }
  const digitos = busca.replace(/\D/g, "")
  const achadas = views
    .filter(
      (c) =>
        contemNormalizado(busca, c.nome, c.clienteNome) ||
        (!!digitos && !!c.telefone && c.telefone.includes(digitos)),
    )
    .slice(0, MAX_CONVERSAS)
  return { conversas: achadas, sugeridas: sugeridas.size }
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
 * Mensagens anteriores a ligar o monitoramento NÃO foram gravadas, e hoje não
 * há como recuperá-las: `monitoradoEm` registra o momento para a página poder
 * dizer isso. (CORREÇÃO de um comentário anterior: o Baileys 7 TEM busca de
 * histórico sob demanda — `sock.fetchMessageHistory(count, chaveMaisAntiga,
 * timestamp)` —, mas ela exige uma mensagem-âncora daquela conversa, e nós não
 * guardamos nenhuma das conversas não monitoradas. Trazer histórico é trabalho
 * de verdade, não um parâmetro esquecido.)
 */
export async function definirMonitoramento(userId: number, chatId: number, monitorar: boolean): Promise<ConversaView> {
  await minhaConversa(userId, chatId)
  await prisma.whatsappChat.update({
    where: { id: chatId },
    data: { monitorar, monitoradoEm: monitorar ? new Date() : null },
  })
  await publicarComando({ tipo: "recarregar", userId })
  const atual = await minhaConversa(userId, chatId)
  return paraView(atual, await ehSugerida(atual))
}

/**
 * Liga o monitoramento de TODAS as conversas sugeridas de uma vez — o botão da
 * faixa da página. É a mesma decisão de `chatsSugeridos`, aplicada no servidor
 * sobre o conjunto inteiro (não só sobre as linhas que a página mostra).
 *
 * Como mexe na coluna que o worker consulta por mensagem, avisa ele para soltar
 * o cache de chats (o TTL de 60 s é só a rede de segurança).
 */
export async function monitorarSugeridas(userId: number): Promise<{ ligadas: number }> {
  const ids = [...(await chatsSugeridos(userId))]
  if (ids.length === 0) return { ligadas: 0 }
  const r = await prisma.whatsappChat.updateMany({
    where: { id: { in: ids }, userId },
    data: { monitorar: true, monitoradoEm: new Date() },
  })
  await publicarComando({ tipo: "recarregar", userId })
  return { ligadas: r.count }
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
  const atual = await minhaConversa(userId, chatId)
  return paraView(atual, await ehSugerida(atual))
}

/**
 * Pede ao WhatsApp as mensagens ANTERIORES às que já temos nesta conversa.
 *
 * Quem fala com o WhatsApp é o worker (o app web não tem socket), então aqui a
 * função só valida e publica o comando; a resposta chega depois, pela ingestão
 * normal, e aparece quando a página recarregar. Não há o que esperar de volta.
 *
 * As três recusas são deliberadas: sem conversa marcada o pedido seria feito e
 * o resultado descartado (a ingestão só grava conversa monitorada); sem âncora
 * o WhatsApp não tem de onde contar para trás; e com o worker fora do ar o
 * NOTIFY se perderia em silêncio, o que pareceria um botão quebrado.
 */
export async function pedirHistorico(userId: number, chatId: number): Promise<{ pedido: true }> {
  const chat = await minhaConversa(userId, chatId)
  if (!chat.monitorar) {
    throw new UserError("Marque esta conversa para ser gravada antes de buscar o histórico.")
  }
  if (!chat.ancoraChave || !chat.ancoraEm) {
    throw new UserError(
      "Ainda não dá para buscar: nenhuma mensagem desta conversa passou pelo Lexia. Assim que chegar uma mensagem nova, o botão funciona.",
    )
  }
  const sessao = await getSessaoView(userId)
  if (sessao.status !== "conectado") throw new UserError("Conecte o WhatsApp para buscar o histórico.")
  if (!sessao.workerOnline) {
    throw new UserError("O serviço de conexão não está respondendo agora — tente de novo em instantes.")
  }
  await publicarComando({ tipo: "historico", userId, chatId })
  return { pedido: true }
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

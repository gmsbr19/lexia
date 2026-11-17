// WhatsApp fase 3 — a INGESTÃO, do lado do banco. SERVER ONLY.
//
// Deliberadamente em `.ts` e não `.mts`: aqui não entra nada do Baileys (que é
// ESM-only com WASM e só pode ser tocado pelo worker). O worker decifra e baixa;
// este módulo decide o que vai para o banco. A divisão também deixa a ingestão
// testável e reaproveitável pelo app web (a limpeza por retenção, por exemplo).
//
// REGRA CENTRAL: metadado de TODAS as conversas é mantido (é o que deixa o
// usuário escolher na página), mas MENSAGEM só é gravada quando o chat está
// `monitorar = true`. Minimização não é opcional num módulo que guarda
// comunicação sob sigilo profissional.
import { prisma } from "@/lib/db"
import { log } from "@/lib/log"
import { normalizarTelefone } from "./core"
import {
  MENSAGEM_RETENCAO_MESES,
  MIDIA_MAX_BYTES,
  MIDIA_RETENCAO_DIAS,
  escolherVinculo,
  variantesTelefone,
  type TipoMensagem,
} from "./mensagens-core"

// ── Índice de telefones dos clientes ────────────────────────────────────────
// POR QUE em memória e não em SQL: `Cliente.telefones` é texto livre, e a
// normalização correta (DDI, zero à esquerda, tamanhos válidos) já existe
// testada em ./core `normalizarTelefone`. Reescrevê-la em regexp_replace criaria
// uma segunda fonte da verdade que logo divergiria. A base tem ~750 contatos:
// carregar e indexar custa alguns milissegundos, então o índice é reconstruído
// a cada TTL em vez de mantido sincronizado (nada a invalidar quando o cadastro
// muda, nenhuma tabela derivada a ficar velha).

const INDICE_TTL_MS = 5 * 60 * 1000
/** Separadores com que as pessoas juntam dois telefones no mesmo campo. */
const SEPARADORES = /[;,/|\n]+/

type Indice = { em: number; mapa: Map<string, number[]> }
let indice: Indice | null = null

export function limparIndiceTelefones(): void {
  indice = null
}

/** telefone normalizado (com as variantes do nono dígito) → ids de cliente. */
export async function indiceTelefones(agora = Date.now()): Promise<Map<string, number[]>> {
  if (indice && agora - indice.em < INDICE_TTL_MS) return indice.mapa
  const rows = await prisma.cliente.findMany({
    where: { telefones: { not: null } },
    select: { id: true, telefones: true },
  })
  const mapa = new Map<string, number[]>()
  for (const r of rows) {
    for (const parte of (r.telefones ?? "").split(SEPARADORES)) {
      const normalizado = normalizarTelefone(parte)
      if (!normalizado) continue
      for (const v of variantesTelefone(normalizado)) {
        const lista = mapa.get(v)
        if (lista) {
          if (!lista.includes(r.id)) lista.push(r.id)
        } else {
          mapa.set(v, [r.id])
        }
      }
    }
  }
  indice = { em: agora, mapa }
  return mapa
}

/**
 * Cliente sugerido para um telefone. Grupo e LID nunca chegam aqui (vêm sem
 * telefone). Match ambíguo não vincula — ver escolherVinculo.
 */
export async function sugerirCliente(telefone: string | null): Promise<number | null> {
  if (!telefone) return null
  const mapa = await indiceTelefones()
  const candidatos: number[] = []
  for (const v of variantesTelefone(telefone)) candidatos.push(...(mapa.get(v) ?? []))
  return escolherVinculo(candidatos)
}

// ── Conversas ───────────────────────────────────────────────────────────────

export type ChatCache = { id: number; monitorar: boolean }

/** Metadado de uma conversa, como o worker o conhece. */
export type ChatEntrada = {
  jid: string
  nome?: string | null
  telefone?: string | null
  grupo: boolean
  ultimaMensagemEm?: Date | null
}

/**
 * Cria/atualiza o metadado da conversa e devolve o que o worker precisa saber.
 * `criar: false` apenas ATUALIZA o que já existe (é o caso dos contatos: a
 * agenda do aparelho não é a lista de conversas) e devolve null se não existir.
 *
 * Cuidados: o nome só é SOBRESCRITO quando chega um valor novo (o WhatsApp
 * manda updates parciais, e um `undefined` não pode apagar o nome que já
 * tínhamos); `ultimaMensagemEm` nunca ANDA PARA TRÁS (a sincronização entrega
 * mensagens antigas depois das novas, o que embaralharia a ordem da lista); e
 * `monitorar` jamais é tocado aqui — essa coluna é do usuário, não do worker.
 */
export async function salvarChat(
  userId: number,
  entrada: ChatEntrada,
  opts: { criar?: boolean } = {},
): Promise<ChatCache | null> {
  const existente = await prisma.whatsappChat.findUnique({
    where: { userId_jid: { userId, jid: entrada.jid } },
    select: { id: true, monitorar: true, nome: true, telefone: true, clienteId: true, ultimaMensagemEm: true },
  })

  if (!existente) {
    if (opts.criar === false) return null
    // Conversa nova: é o momento de sugerir o cliente pelo telefone.
    const clienteId = entrada.grupo ? null : await sugerirCliente(entrada.telefone ?? null)
    try {
      return await prisma.whatsappChat.create({
        data: {
          userId,
          jid: entrada.jid,
          nome: entrada.nome ?? null,
          telefone: entrada.telefone ?? null,
          grupo: entrada.grupo,
          clienteId,
          vinculo: clienteId ? "sugerido" : null,
          ultimaMensagemEm: entrada.ultimaMensagemEm ?? null,
        },
        select: { id: true, monitorar: true },
      })
    } catch (e) {
      // A ingestão é serializada por sessão, então isto não deveria acontecer —
      // mas a unicidade (userId, jid) é a fonte da verdade, e perder uma
      // mensagem por uma corrida inesperada seria pior que uma consulta extra.
      if (!ehDuplicada(e)) throw e
      const agora = await prisma.whatsappChat.findUnique({
        where: { userId_jid: { userId, jid: entrada.jid } },
        select: { id: true, monitorar: true },
      })
      return agora
    }
  }

  const patch: {
    nome?: string
    telefone?: string
    ultimaMensagemEm?: Date
    clienteId?: number
    vinculo?: string
  } = {}
  if (entrada.nome && entrada.nome !== existente.nome) patch.nome = entrada.nome
  if (entrada.telefone && entrada.telefone !== existente.telefone) patch.telefone = entrada.telefone
  const nova = entrada.ultimaMensagemEm
  if (nova && (!existente.ultimaMensagemEm || nova > existente.ultimaMensagemEm)) patch.ultimaMensagemEm = nova
  // Telefone descoberto depois (contato que só se apresentou por LID): dá para
  // sugerir o cliente agora. Só quando ainda não há vínculo nenhum — uma
  // escolha do usuário nunca é sobrescrita pelo worker.
  if (patch.telefone && !existente.clienteId && !entrada.grupo) {
    const clienteId = await sugerirCliente(patch.telefone)
    if (clienteId) {
      patch.clienteId = clienteId
      patch.vinculo = "sugerido"
    }
  }
  if (Object.keys(patch).length) {
    await prisma.whatsappChat.update({ where: { id: existente.id }, data: patch })
  }
  return { id: existente.id, monitorar: existente.monitorar }
}

/** Quais conversas deste usuário estão monitoradas (o worker cacheia isto). */
export async function carregarChats(userId: number): Promise<Map<string, ChatCache>> {
  const rows = await prisma.whatsappChat.findMany({
    where: { userId },
    select: { id: true, jid: true, monitorar: true },
  })
  return new Map(rows.map((r) => [r.jid, { id: r.id, monitorar: r.monitorar }]))
}

// ── Mensagens ───────────────────────────────────────────────────────────────

export type MensagemEntrada = {
  chatId: number
  msgId: string
  deMim: boolean
  autorJid: string | null
  autorNome: string | null
  tipo: TipoMensagem
  texto: string | null
  midiaMime: string | null
  midiaNome: string | null
  midiaTamanho: number | null
  enviadaEm: Date
}

/**
 * Grava a mensagem. Devolve o id, ou `null` quando ela já estava gravada — a
 * unicidade `(chatId, msgId)` é a defesa contra o mesmo evento chegando duas
 * vezes (o WhatsApp reenvia, e `messages.upsert` e `messaging-history.set`
 * entregam o mesmo conteúdo por caminhos diferentes).
 */
export async function gravarMensagem(userId: number, m: MensagemEntrada): Promise<number | null> {
  try {
    const criada = await prisma.whatsappMensagem.create({
      data: {
        userId,
        chatId: m.chatId,
        msgId: m.msgId,
        deMim: m.deMim,
        autorJid: m.autorJid,
        autorNome: m.autorNome,
        tipo: m.tipo,
        texto: m.texto,
        midiaMime: m.midiaMime,
        midiaNome: m.midiaNome,
        midiaTamanho: m.midiaTamanho,
        enviadaEm: m.enviadaEm,
      },
      select: { id: true },
    })
    return criada.id
  } catch (e) {
    if (ehDuplicada(e)) return null
    throw e
  }
}

function ehDuplicada(e: unknown): boolean {
  return !!e && typeof e === "object" && (e as { code?: string }).code === "P2002"
}

/**
 * Guarda os BYTES da mídia na caixa de entrada. Acima do teto não guarda nada e
 * devolve false: o metadado (tipo/nome/tamanho) já está na mensagem, então o
 * usuário vê que existe um arquivo grande sem o banco virar repositório de
 * mídia.
 */
export async function salvarMidia(userId: number, mensagemId: number, bytes: Buffer): Promise<boolean> {
  if (!bytes.length || bytes.length > MIDIA_MAX_BYTES) return false
  await prisma.whatsappMidia.upsert({
    where: { mensagemId },
    update: { dados: bytes.toString("base64"), tamanho: bytes.length },
    create: { mensagemId, userId, dados: bytes.toString("base64"), tamanho: bytes.length },
  })
  return true
}

// ── Retenção ────────────────────────────────────────────────────────────────

/**
 * Faxina periódica (o worker chama uma vez por dia). Duas regras:
 *  • bytes de mídia não reclamados viram pó depois de MIDIA_RETENCAO_DIAS — é
 *    caixa de entrada, não arquivo; o metadado da mensagem permanece;
 *  • mensagens inteiras caem depois de MENSAGEM_RETENCAO_MESES (a mídia vai com
 *    elas pelo cascade).
 */
export async function faxinaRetencao(agora = new Date()): Promise<{ midias: number; mensagens: number }> {
  const limiteMidia = new Date(agora.getTime() - MIDIA_RETENCAO_DIAS * 86_400_000)
  const limiteMensagem = new Date(agora)
  limiteMensagem.setMonth(limiteMensagem.getMonth() - MENSAGEM_RETENCAO_MESES)

  const midias = await prisma.whatsappMidia.deleteMany({ where: { criadoEm: { lt: limiteMidia } } })
  const mensagens = await prisma.whatsappMensagem.deleteMany({ where: { enviadaEm: { lt: limiteMensagem } } })
  if (midias.count || mensagens.count) {
    log.info({ midias: midias.count, mensagens: mensagens.count }, "whatsapp: faxina de retenção")
  }
  return { midias: midias.count, mensagens: mensagens.count }
}

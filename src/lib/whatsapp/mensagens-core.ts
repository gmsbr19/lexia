// WhatsApp fase 3 — decisões PURAS da ingestão: o que é uma mensagem, que tipo
// ela tem, qual é o texto, se há mídia para baixar, e com que cliente a conversa
// casa. Nada de prisma, baileys, env ou relógio ambiente (quem chama passa a
// data), como em ./core.ts.
//
// POR QUE não importar os tipos do Baileys aqui: este arquivo é alcançado pelo
// bundle do Next (a página e as rotas usam os mesmos rótulos e truncamentos), e
// o Baileys 7 é ESM-only com WASM — puxá-lo para o app web quebra a resolução
// (ver worker.mts). Então a forma da mensagem é descrita ESTRUTURALMENTE: o
// worker passa o objeto do Baileys, que satisfaz estes tipos sem conversão.

/** Os tipos que `WhatsappMensagem.tipo` aceita. */
export const TIPOS = ["texto", "imagem", "audio", "video", "documento", "outro"] as const
export type TipoMensagem = (typeof TIPOS)[number]

/** Teto por arquivo guardado na caixa de entrada (igual ao de TarefaAnexo).
 *  Acima disso grava-se só o metadado: o banco não é arquivo de mídia. */
export const MIDIA_MAX_BYTES = 10 * 1024 * 1024

/** Bytes de mídia não reclamados são apagados depois disso (metadado fica). */
export const MIDIA_RETENCAO_DIAS = 30

/** Retenção das mensagens gravadas (sugestão do brief). */
export const MENSAGEM_RETENCAO_MESES = 24

/** Teto de texto na saída das ferramentas MCP e da página. */
export const TEXTO_MAX = 4_000

// ── Forma estrutural de uma mensagem ────────────────────────────────────────

/** `Long` do protobuf, número ou string decimal — o Baileys devolve os três. */
export type NumeroWa = number | string | { low?: number; high?: number; unsigned?: boolean } | null | undefined

export type ConteudoWa = Record<string, unknown> | null | undefined

export type ChaveWa = {
  remoteJid?: string | null
  fromMe?: boolean | null
  id?: string | null
  participant?: string | null
} | null

export type MensagemWa = {
  key?: ChaveWa
  message?: ConteudoWa
  messageTimestamp?: NumeroWa
  pushName?: string | null
  /** Mensagem de sistema (entrou no grupo, mudou o assunto…): não é conteúdo. */
  messageStubType?: number | null
}

/** Onde a mídia está no conteúdo, para o worker saber que há o que baixar. */
export type MidiaWa = {
  /** Chave do conteúdo: "imageMessage", "documentMessage"… */
  chave: string
  mime: string | null
  nome: string | null
  /** `fileLength` declarado na mensagem — conhecido mesmo sem baixar nada. */
  tamanho: number | null
}

export type Classificada = {
  tipo: TipoMensagem
  texto: string | null
  midia: MidiaWa | null
}

/** Converte Long/string/número do protobuf em número, ou null. */
export function paraNumero(v: NumeroWa): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "string") {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  if (v && typeof v === "object" && typeof v.low === "number") {
    const high = typeof v.high === "number" ? v.high : 0
    // Long de 64 bits em duas metades de 32. Tamanho de arquivo e timestamp
    // cabem com folga no inteiro seguro do JS.
    const n = high * 2 ** 32 + (v.low >>> 0)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** `messageTimestamp` (segundos) → Date. Sem timestamp usável, cai em `agora`. */
export function dataDaMensagem(ts: NumeroWa, agora: Date): Date {
  const n = paraNumero(ts)
  if (!n || n <= 0) return agora
  // Segundos (padrão do WhatsApp); tolera milissegundos por segurança.
  const ms = n > 1e12 ? n : n * 1000
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? agora : d
}

// Envelopes que apenas embrulham o conteúdo de verdade.
const ENVELOPES = [
  "ephemeralMessage",
  "viewOnceMessage",
  "viewOnceMessageV2",
  "viewOnceMessageV2Extension",
  "documentWithCaptionMessage",
  "deviceSentMessage",
] as const

/** Descasca os envelopes até o conteúdo real (limite de voltas por segurança). */
export function desembrulhar(conteudo: ConteudoWa): Record<string, unknown> | null {
  let atual: Record<string, unknown> | null = conteudo && typeof conteudo === "object" ? conteudo : null
  for (let i = 0; atual && i < 6; i++) {
    const chave = ENVELOPES.find((e) => atual && atual[e])
    if (!chave) return atual
    const dentro = (atual[chave] as { message?: unknown } | undefined)?.message
    if (!dentro || typeof dentro !== "object") return atual
    atual = dentro as Record<string, unknown>
  }
  return atual
}

// Conteúdos que NUNCA são gravados: reação, recibo/edição de protocolo, chave de
// grupo, atualização de enquete e os metadados que acompanham qualquer mensagem.
const IGNORAR = new Set([
  "reactionMessage",
  "protocolMessage",
  "senderKeyDistributionMessage",
  "messageContextInfo",
  "pollUpdateMessage",
  "pollCreationMessageV3",
  "keepInChatMessage",
  "stickerSyncRmrMessage",
  "encReactionMessage",
])

const MIDIAS: Record<string, TipoMensagem> = {
  imageMessage: "imagem",
  videoMessage: "video",
  audioMessage: "audio",
  documentMessage: "documento",
  // Figurinha é mídia, mas não é foto de documento: entra como "outro" para não
  // poluir a triagem de imagens.
  stickerMessage: "outro",
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null
  const s = v.trim()
  return s ? s : null
}

/**
 * Classifica uma mensagem. Devolve `null` quando ela deve ser IGNORADA (reação,
 * protocolo, mensagem de sistema, ou conteúdo vazio) — nunca um registro vazio,
 * porque uma linha sem texto nem mídia só atrapalharia a triagem.
 */
export function classificarMensagem(msg: MensagemWa): Classificada | null {
  const conteudo = desembrulhar(msg?.message)
  if (!conteudo) return null
  const chaves = Object.keys(conteudo).filter((k) => conteudo[k] != null)
  if (!chaves.length) return null
  // Só metadado/protocolo: nada a gravar.
  if (chaves.every((k) => IGNORAR.has(k))) return null
  if (chaves.some((k) => k === "reactionMessage" || k === "protocolMessage")) return null

  // Mídia primeiro: a legenda dela é o texto.
  for (const chave of Object.keys(MIDIAS)) {
    const m = conteudo[chave] as Record<string, unknown> | undefined
    if (!m) continue
    return {
      tipo: MIDIAS[chave],
      texto: str(m.caption),
      midia: {
        chave,
        mime: str(m.mimetype),
        nome: str(m.fileName) ?? str(m.title),
        tamanho: paraNumero(m.fileLength as NumeroWa),
      },
    }
  }

  // Texto, nas três formas em que ele chega.
  const texto =
    str(conteudo.conversation) ??
    str((conteudo.extendedTextMessage as { text?: unknown } | undefined)?.text) ??
    str((conteudo.buttonsResponseMessage as { selectedDisplayText?: unknown } | undefined)?.selectedDisplayText) ??
    str((conteudo.templateButtonReplyMessage as { selectedDisplayText?: unknown } | undefined)?.selectedDisplayText) ??
    str((conteudo.listResponseMessage as { title?: unknown } | undefined)?.title)
  if (texto) return { tipo: "texto", texto, midia: null }

  // Conteúdos sem texto nem arquivo, mas que o usuário precisa ver que existem.
  const contato = conteudo.contactMessage as { displayName?: unknown } | undefined
  if (contato) return { tipo: "outro", texto: "[contato] " + (str(contato.displayName) ?? "sem nome"), midia: null }
  if (conteudo.contactsArrayMessage) return { tipo: "outro", texto: "[contatos]", midia: null }
  const local = (conteudo.locationMessage ?? conteudo.liveLocationMessage) as { name?: unknown } | undefined
  if (local) return { tipo: "outro", texto: "[localização] " + (str(local.name) ?? ""), midia: null }
  const enquete = conteudo.pollCreationMessage as { name?: unknown } | undefined
  if (enquete) return { tipo: "outro", texto: "[enquete] " + (str(enquete.name) ?? ""), midia: null }

  return null
}

/** Quem escreveu, em grupo (`participant`); em conversa 1:1 é o próprio chat. */
export function autorDaMensagem(key: ChaveWa): string | null {
  return str(key?.participant)
}

/** `true` quando a mensagem é do próprio usuário (saiu do aparelho dele). */
export function ehMinha(key: ChaveWa): boolean {
  return key?.fromMe === true
}

// ── Nome de arquivo ──────────────────────────────────────────────────────────

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/amr": "amr",
  "audio/wav": "wav",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
}

/** Extensão a partir do mime (sem o ponto). `bin` quando não dá para saber. */
export function extensaoDeMime(mime: string | null | undefined): string {
  const limpo = (mime ?? "").split(";")[0]?.trim().toLowerCase() ?? ""
  if (EXT[limpo]) return EXT[limpo]
  const sub = limpo.split("/")[1]
  if (sub && /^[a-z0-9]{1,8}$/.test(sub)) return sub
  return "bin"
}

/**
 * Nome com que o arquivo é oferecido para download. Usa o nome original quando
 * existe (documentos trazem), senão monta um a partir do tipo e do id — e em
 * qualquer caso SANEIA: nada de caminho, nem de caractere que o navegador ou o
 * sistema de arquivos leiam como separador.
 */
export function nomeDeArquivo(args: {
  nome?: string | null
  mime?: string | null
  tipo: TipoMensagem
  msgId: string
}): string {
  const base = sanearNome(args.nome ?? "")
  if (base && /\.[a-z0-9]{1,8}$/i.test(base)) return base
  const id = sanearNome(args.msgId).slice(0, 24) || "arquivo"
  const ext = extensaoDeMime(args.mime)
  return (base || args.tipo + "-" + id) + "." + ext
}

function sanearNome(raw: string): string {
  return raw
    .replace(/[\\/]/g, "-") // nunca um caminho
    .replace(/[\u0000-\u001f\u007f"'`<>:|?*]/g, "") // controle e separadores do Windows
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
}

/** Corta texto longo avisando que cortou (saída do MCP e da página). */
export function truncarTexto(texto: string | null | undefined, max = TEXTO_MAX): string | null {
  if (texto == null) return null
  if (texto.length <= max) return texto
  return texto.slice(0, max) + "… [truncado: " + (texto.length - max) + " caracteres a mais]"
}

// ── Telefone → cliente ───────────────────────────────────────────────────────

/**
 * As formas pelas quais o MESMO celular brasileiro pode aparecer: com e sem o
 * nono dígito. O WhatsApp entrega muitos jids antigos sem o 9
 * (`551187654321`), enquanto o cadastro tem o número novo — e vice-versa.
 *
 * Só mexe em DDI 55: o nono dígito é regra brasileira, e inventar variante de
 * número estrangeiro geraria vínculo errado. Celular é o que começa com 6-9
 * depois do DDD; fixo (2-5) nunca ganha o 9.
 */
export function variantesTelefone(normalizado: string | null | undefined): string[] {
  const n = (normalizado ?? "").replace(/\D/g, "")
  if (!n) return []
  if (!n.startsWith("55")) return [n]
  const resto = n.slice(2)
  const ddd = resto.slice(0, 2)
  const numero = resto.slice(2)
  const fora = [n]
  if (numero.length === 9 && numero.startsWith("9")) {
    fora.push("55" + ddd + numero.slice(1))
  } else if (numero.length === 8 && /^[6-9]/.test(numero)) {
    fora.push("55" + ddd + "9" + numero)
  }
  return [...new Set(fora)]
}

/**
 * Qual cliente a conversa sugere. Match ÚNICO vincula; zero ou mais de um não
 * vincula nada — dois clientes com o mesmo telefone é ambiguidade real, e
 * escolher um deles colocaria conversa de cliente sob o nome de outro.
 */
export function escolherVinculo(candidatos: readonly number[]): number | null {
  const unicos = [...new Set(candidatos.filter((id) => Number.isInteger(id) && id > 0))]
  return unicos.length === 1 ? unicos[0] : null
}

/** Nome mostrado para a conversa, com os fallbacks na ordem certa. */
export function nomeDeChat(args: {
  nome?: string | null
  pushName?: string | null
  telefone?: string | null
  jid: string
}): string | null {
  return str(args.nome) ?? str(args.pushName) ?? (args.telefone ? formatarTelefone(args.telefone) : null)
}

/** `5519998887777` → `+55 19 99888-7777` (só para a tela). */
export function formatarTelefone(numero: string | null | undefined): string | null {
  const n = (numero ?? "").replace(/\D/g, "")
  if (n.length < 12 || n.length > 13 || !n.startsWith("55")) return n || null
  const ddd = n.slice(2, 4)
  const resto = n.slice(4)
  const corte = resto.length === 9 ? 5 : 4
  return "+55 " + ddd + " " + resto.slice(0, corte) + "-" + resto.slice(corte)
}

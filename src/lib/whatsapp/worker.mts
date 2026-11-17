// WhatsApp — o WORKER. Um processo Node contínuo, FORA do app web, que mantém
// uma conexão Baileys por usuário. Entrada: `npm run whatsapp:worker`
// (scripts/whatsapp-worker.mts). SERVER ONLY.
//
// POR QUE é um processo separado: cada sessão é um WebSocket permanente com o
// WhatsApp. Isso não cabe num app request-driven (o Next encerra o trabalho
// quando a resposta sai) nem em serverless.
//
// POR QUE este arquivo é `.mts` e não `.ts`: o Baileys 7 é ESM-only e carrega
// WASM (`whatsapp-rust-bridge`), cujo package.json só declara a condição
// `import`. Importado de um módulo CJS — que é o que um `.ts` é neste pacote —
// a resolução falha com ERR_PACKAGE_PATH_NOT_EXPORTED (medido). Então todo
// arquivo que toca o Baileys é `.mts`; o resto do módulo fica em `.ts` normal e
// é compartilhado com o app web.
//
// INSTÂNCIA ÚNICA: duas conexões da mesma sessão se derrubam mutuamente, então o
// worker toma um `pg_advisory_lock` ao subir e SAI se não conseguir.
import makeWASocket, {
  Browsers,
  BufferJSON,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  initAuthCreds,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  proto,
  type AuthenticationCreds,
  type Chat,
  type Contact,
  type SignalDataSet,
  type SignalDataTypeMap,
  type SignalKeyStore,
  type WAMessage,
  type WASocket,
} from "@whiskeysockets/baileys"
import { Client } from "pg"
import pino from "pino"
import { prisma } from "../db"
import { decidirFechamento, decidirRetomada, ehDifusao, ehGrupo, ehLid, jidParaNumero, lerComando, normalizarTelefone, truncarErro } from "./core"
import { cifrar, contextoAuth, decifrar, lerChaveAuth } from "./cripto"
import {
  carregarChats,
  faxinaRetencao,
  gravarMensagem,
  limparIndiceTelefones,
  salvarChat,
  salvarMidia,
  type ChatCache,
  type ChatEntrada,
} from "./ingestao"
import {
  MIDIA_MAX_BYTES,
  autorDaMensagem,
  classificarMensagem,
  dataDaMensagem,
  ehMinha,
  nomeDeArquivo,
  paraNumero,
  type MensagemWa,
} from "./mensagens-core"
import {
  apagarAuth,
  baterPontoWorker,
  mudarStatus,
  publicarEvento,
  registrarErro,
  salvarSessao,
  sessoesParaRestaurar,
  usuarioAtivo,
} from "./sessoes"
import { CANAL_COMANDO, CHATS_CACHE_TTL_MS, LOCK_WORKER, WORKER_HEARTBEAT_MS, type WhatsappComando } from "./tipos"

// Logger do Baileys: `warn`, e NUNCA conteúdo de mensagem (o módulo guarda
// comunicação sob sigilo profissional — log não é lugar para isso).
const waLogger = pino({ level: process.env.WHATSAPP_LOG_LEVEL ?? "warn", base: undefined })
/** Log do próprio worker (contagens e ids, nunca texto de mensagem). */
const log = pino({ level: process.env.LOG_LEVEL ?? "info", base: undefined }).child({ mod: "whatsapp-worker" })

let chaveCripto: Buffer

/** Versão do WA Web, buscada uma vez por processo (sem rede, o default serve). */
let versaoCache: Promise<[number, number, number] | undefined> | null = null
function versaoWa(): Promise<[number, number, number] | undefined> {
  versaoCache ??= fetchLatestBaileysVersion()
    .then((r) => r.version)
    .catch(() => undefined)
  return versaoCache
}

// ── Auth state no Postgres ───────────────────────────────────────────────────
// Mesmo contrato do `useMultiFileAuthState` do upstream (creds + keys.get/set,
// serializados com BufferJSON), trocando arquivos por linhas CIFRADAS.

type AuthPg = { creds: AuthenticationCreds; keys: SignalKeyStore; saveCreds: () => Promise<void> }

// NOTA: chama-se `authStatePostgres` e não `usePostgresAuthState` (o nome do
// equivalente no upstream) porque o prefixo `use` faz a regra
// react-hooks/rules-of-hooks do eslint tratá-la como um hook de React.
async function authStatePostgres(userId: number): Promise<AuthPg> {
  const ler = async (chave: string): Promise<unknown | null> => {
    const row = await prisma.whatsappAuth.findUnique({
      where: { userId_chave: { userId, chave } },
      select: { valor: true },
    })
    if (!row) return null
    try {
      return JSON.parse(decifrar(row.valor, chaveCripto, contextoAuth(userId, chave)), BufferJSON.reviver)
    } catch (e) {
      // Chave de cifragem trocada, linha adulterada ou movida de lugar: trata
      // como ausente. Consequência explícita — a sessão pede QR de novo, em vez
      // de o Baileys receber chave corrompida e falhar de forma obscura.
      log.warn({ userId, chave, err: truncarErro(e) }, "auth state ilegível — será tratado como ausente")
      return null
    }
  }

  const lerVarios = async (chaves: string[]): Promise<Map<string, unknown>> => {
    const rows = await prisma.whatsappAuth.findMany({
      where: { userId, chave: { in: chaves } },
      select: { chave: true, valor: true },
    })
    const out = new Map<string, unknown>()
    for (const r of rows) {
      try {
        out.set(r.chave, JSON.parse(decifrar(r.valor, chaveCripto, contextoAuth(userId, r.chave)), BufferJSON.reviver))
      } catch {
        /* ilegível → ausente (ver acima) */
      }
    }
    return out
  }

  const gravar = async (chave: string, valor: unknown): Promise<void> => {
    const blob = cifrar(JSON.stringify(valor, BufferJSON.replacer), chaveCripto, contextoAuth(userId, chave))
    await prisma.whatsappAuth.upsert({
      where: { userId_chave: { userId, chave } },
      update: { valor: blob },
      create: { userId, chave, valor: blob },
    })
  }

  const remover = async (chave: string): Promise<void> => {
    await prisma.whatsappAuth.deleteMany({ where: { userId, chave } })
  }

  const creds = ((await ler("creds")) as AuthenticationCreds | null) ?? initAuthCreds()

  const keys: SignalKeyStore = {
    get: async <T extends keyof SignalDataTypeMap>(tipo: T, ids: string[]) => {
      const chaves = ids.map((id) => tipo + "-" + id)
      const lidos = await lerVarios(chaves)
      const data: { [id: string]: SignalDataTypeMap[T] } = {}
      for (const id of ids) {
        let valor = lidos.get(tipo + "-" + id)
        if (tipo === "app-state-sync-key" && valor) {
          valor = proto.Message.AppStateSyncKeyData.fromObject(valor as Record<string, unknown>)
        }
        if (valor !== undefined && valor !== null) data[id] = valor as SignalDataTypeMap[T]
      }
      return data
    },
    set: async (data: SignalDataSet) => {
      const tarefas: Promise<void>[] = []
      for (const categoria in data) {
        const bloco = data[categoria as keyof SignalDataSet] as Record<string, unknown> | undefined
        if (!bloco) continue
        for (const id in bloco) {
          const valor = bloco[id]
          const chave = categoria + "-" + id
          tarefas.push(valor ? gravar(chave, valor) : remover(chave))
        }
      }
      await Promise.all(tarefas)
    },
  }

  return { creds, keys, saveCreds: () => gravar("creds", creds) }
}

// ── Uma sessão (um usuário) ──────────────────────────────────────────────────

class Sessao {
  readonly userId: number
  private sock: WASocket | null = null
  private tentativa = 0
  /** true enquanto um desconectar/deslogar deliberado está em curso. */
  private encerrando = false
  private timerReconexao: ReturnType<typeof setTimeout> | null = null
  /** Último QR emitido, para reemitir quando a página abre no meio da espera. */
  private ultimoQr: string | null = null
  /** Número a parear, quando o usuário escolheu o caminho do código. */
  private pareamentoPendente: string | null = null
  /** true depois de pedir o código: para de publicar QR, que não serve mais. */
  private modoPareamento = false
  /** As creds VIVAS do socket atual. Lidas na hora (e não copiadas para um
   *  booleano na abertura) porque `registered` vira true DURANTE o pareamento:
   *  um retrato tirado na abertura diria "nunca pareada" justamente no close do
   *  515, que é o passo que conclui a leitura do QR. */
  private creds: AuthenticationCreds | null = null
  /** Fila das gravações de creds. O reinício do 515 precisa ESPERAR por ela:
   *  reabrir o socket com a credencial pela metade faz o WhatsApp responder 401
   *  e a sessão ser jogada fora no meio do pareamento. */
  private gravacao: Promise<void> = Promise.resolve()
  private abrindo = false
  /** Cache jid → {id, monitorar}. Sem ele, cada mensagem recebida custaria uma
   *  consulta só para descobrir se o chat é monitorado. Invalidado pelo comando
   *  `recarregar` (quando o usuário mexe no interruptor) e por TTL. */
  private chats: Map<string, ChatCache> | null = null
  private chatsEm = 0
  /** Toda a ingestão é SERIALIZADA nesta fila. Dois eventos sobre o mesmo jid
   *  novo chegando juntos veriam ambos "não existe" e um bateria na unicidade;
   *  e uma sessão de WhatsApp não tem volume que justifique concorrência. */
  private fila: Promise<void> = Promise.resolve()

  constructor(userId: number) {
    this.userId = userId
  }

  private get registrada(): boolean {
    return !!this.creds?.registered
  }

  /** Reemite o que a página precisa ver agora (sem reabrir a conexão). */
  reemitir(): void {
    if (this.ultimoQr && !this.modoPareamento) {
      void publicarEvento({ tipo: "qr", userId: this.userId, qr: this.ultimoQr })
    }
  }

  get aberta(): boolean {
    return !!this.sock
  }

  async iniciar(pareamento?: string): Promise<void> {
    if (pareamento) this.pareamentoPendente = pareamento
    if (this.abrindo) return
    if (this.sock) {
      // Já há socket: se o usuário pediu pareamento agora, derruba e reabre (o
      // código só pode ser pedido numa conexão ainda não registrada).
      if (!pareamento) {
        this.reemitir()
        return
      }
      await this.fecharSocket()
    }
    if (!(await usuarioAtivo(this.userId))) {
      log.warn({ userId: this.userId }, "usuário desativado — conexão recusada")
      await mudarStatus(this.userId, "deslogado", { numero: null, conectadoEm: null, pareamento: null })
      await apagarAuth(this.userId)
      return
    }
    this.abrindo = true
    this.encerrando = false
    this.cancelarReconexao()
    try {
      await this.abrir()
    } catch (e) {
      log.error({ userId: this.userId, err: truncarErro(e) }, "falha ao abrir a sessão")
      await registrarErro(this.userId, e)
      // Conta a tentativa: sem isso, uma falha persistente (banco fora, por
      // exemplo) reabriria de segundo em segundo, sem backoff nenhum.
      this.tentativa++
      this.agendarReconexao()
    } finally {
      this.abrindo = false
    }
  }

  private async abrir(): Promise<void> {
    // Nunca reabre por cima de uma gravação de creds em curso (ver `gravacao`).
    await this.gravacao
    const { creds, keys, saveCreds } = await authStatePostgres(this.userId)
    this.creds = creds
    const versao = await versaoWa()

    const sock = makeWASocket({
      auth: { creds, keys: makeCacheableSignalKeyStore(keys, waLogger) },
      logger: waLogger,
      version: versao,
      // Nome que aparece em WhatsApp › Aparelhos conectados.
      browser: Browsers.ubuntu("Lexia"),
      // CRÍTICO: com `true` o celular do advogado PARA de receber notificações
      // (o WhatsApp passa a considerar este cliente o ativo).
      markOnlineOnConnect: false,
      // Não puxa o histórico inteiro (volume + a v1 só grava o que for marcado).
      // `shouldSyncHistoryMessage` NÃO é sobrescrito de propósito: devolver
      // false para tudo faz o Baileys 7 avisar, em letras maiúsculas, que isso
      // impede o acesso aos mapeamentos iniciais de LID e causa erro de sessão
      // — e o LID é exatamente do que a fase 3 depende. Com syncFullHistory
      // false o aparelho só manda o conjunto recente, e a fase 2 ignora tudo.
      syncFullHistory: false,
      // Status/stories e newsletters nem são decifrados.
      shouldIgnoreJid: (jid) => jid === "status@broadcast" || jid.endsWith("@newsletter"),
      // Somente leitura: nada é enviado, então não há mensagem para reenviar.
      getMessage: async () => undefined,
    })
    this.sock = sock

    sock.ev.on("creds.update", () => {
      // Enfileirado, não disparado e esquecido: a reabertura do 515 espera por
      // esta promessa, senão leria do banco uma credencial incompleta.
      this.gravacao = this.gravacao
        .then(() => saveCreds())
        .catch((e) => log.error({ userId: this.userId, err: truncarErro(e) }, "falha ao salvar creds"))
    })

    // Os handlers só valem para o socket ATUAL. Um socket que acabou de ser
    // substituído (reabertura, troca para pareamento) ainda emite o próprio
    // `close`; sem esta guarda, esse evento tardio seria lido como queda e
    // agendaria uma reconexão por cima da conexão nova.
    sock.ev.on("connection.update", (u) => {
      if (this.sock !== sock) return
      void this.aoAtualizar(u).catch((e) =>
        log.error({ userId: this.userId, err: truncarErro(e) }, "falha ao tratar connection.update"),
      )
    })

    // ── Ingestão (fase 3) ──────────────────────────────────────────────────
    // `readMessages` NUNCA é chamado em lugar nenhum: o contato não pode receber
    // confirmação de leitura por causa do Lexia. Ler aqui não marca nada lá.
    //
    // Os quatro primeiros eventos são METADADO de conversa — mantido para TODAS
    // as conversas, porque é o que deixa o usuário escolher na página. Só
    // `messages.upsert`/`messaging-history.set` gravam conteúdo, e só de chat
    // monitorado.
    sock.ev.on("chats.upsert", (chats) => this.enfileirar(sock, () => this.aoChats(chats)))
    sock.ev.on("chats.update", (chats) => this.enfileirar(sock, () => this.aoChats(chats)))
    sock.ev.on("contacts.upsert", (cs) => this.enfileirar(sock, () => this.aoContatos(cs)))
    sock.ev.on("contacts.update", (cs) => this.enfileirar(sock, () => this.aoContatos(cs)))
    sock.ev.on("messaging-history.set", (h) =>
      this.enfileirar(sock, async () => {
        await this.aoChats(h.chats ?? [])
        await this.aoContatos(h.contacts ?? [])
        await this.aoMensagens(h.messages ?? [])
      }),
    )
    sock.ev.on("messages.upsert", (u) => this.enfileirar(sock, () => this.aoMensagens(u.messages ?? [])))
  }

  // ── Ingestão ───────────────────────────────────────────────────────────────

  /** Põe um trabalho de ingestão na fila do socket ATUAL (nunca de um antigo). */
  private enfileirar(sock: WASocket, fn: () => Promise<void>): void {
    if (this.sock !== sock) return
    this.fila = this.fila
      .then(() => (this.sock === sock ? fn() : undefined))
      .catch((e) => log.error({ userId: this.userId, err: truncarErro(e) }, "falha na ingestão"))
  }

  /**
   * Identidade da conversa. Duas normalizações que evitam DUAS linhas para a
   * mesma pessoa: tira o `:device` do jid e resolve LID → número pelo
   * mapeamento do Baileys. É para isto que o `shouldSyncHistoryMessage` não foi
   * sobrescrito — sem os mapeamentos iniciais, o mesmo contato apareceria uma
   * vez como `@lid` e outra como `@s.whatsapp.net`.
   */
  private async identidade(jidCru: string): Promise<string> {
    const jid = jidNormalizedUser(jidCru) || jidCru
    if (!ehLid(jid)) return jid
    try {
      const pn = await this.sock?.signalRepository?.lidMapping?.getPNForLID(jid)
      if (pn) return jidNormalizedUser(pn) || jid
    } catch {
      /* sem mapeamento: a conversa fica sem telefone e o usuário vincula à mão */
    }
    return jid
  }

  /**
   * O jid, quando é de conversa que vale guardar; `null` para status, lista de
   * transmissão, canal, bot e valor ausente. Devolve o jid (em vez de um
   * booleano) para o chamador ficar com o tipo estreitado sem repetir checagem.
   */
  private aproveitavel(jid: string | null | undefined): string | null {
    if (!jid || jid === "status@broadcast" || ehDifusao(jid)) return null
    return jid
  }

  private async chatsDoUsuario(): Promise<Map<string, ChatCache>> {
    if (!this.chats || Date.now() - this.chatsEm > CHATS_CACHE_TTL_MS) {
      this.chats = await carregarChats(this.userId)
      this.chatsEm = Date.now()
    }
    return this.chats
  }

  /** O usuário mexeu no interruptor de alguma conversa: o cache morreu. */
  recarregar(): void {
    this.chats = null
    this.chatsEm = 0
  }

  /** Grava o metadado e mantém o cache em dia. `criar: false` só ATUALIZA. */
  private async registrarChat(entrada: ChatEntrada, criar: boolean): Promise<ChatCache | null> {
    const cache = await salvarChat(this.userId, entrada, { criar })
    if (cache) (await this.chatsDoUsuario()).set(entrada.jid, cache)
    return cache
  }

  private async aoChats(chats: Partial<Chat>[]): Promise<void> {
    for (const c of chats) {
      const jidCru = this.aproveitavel(c.id)
      if (!jidCru) continue
      const jid = this.aproveitavel(await this.identidade(jidCru))
      if (!jid) continue
      const ts = paraNumero(c.conversationTimestamp as never)
      await this.registrarChat(
        {
          jid,
          nome: typeof c.name === "string" ? c.name : null,
          telefone: normalizarTelefone(jidParaNumero(jid)),
          grupo: ehGrupo(jid),
          ultimaMensagemEm: ts ? new Date(ts * 1000) : null,
        },
        true,
      )
    }
  }

  /**
   * Contatos são a AGENDA inteira do aparelho, não as conversas — então aqui só
   * se ATUALIZA o que já existe. Criar uma linha por contato encheria a página
   * de gente que nunca trocou uma mensagem com o escritório.
   */
  private async aoContatos(contatos: Partial<Contact>[]): Promise<void> {
    for (const c of contatos) {
      const jidCru = this.aproveitavel(c.id)
      if (!jidCru) continue
      const jid = this.aproveitavel(await this.identidade(jidCru))
      if (!jid || ehGrupo(jid)) continue
      const telefone =
        normalizarTelefone(c.phoneNumber ? (jidParaNumero(c.phoneNumber) ?? c.phoneNumber) : null) ??
        normalizarTelefone(jidParaNumero(jid))
      await this.registrarChat(
        { jid, nome: c.name ?? c.notify ?? c.verifiedName ?? null, telefone, grupo: false },
        false,
      )
    }
  }

  private async aoMensagens(msgs: WAMessage[]): Promise<void> {
    for (const msg of msgs) {
      const jidCru = this.aproveitavel(msg.key?.remoteJid)
      if (!jidCru) continue
      const jid = this.aproveitavel(await this.identidade(jidCru))
      if (!jid) continue

      const classificada = classificarMensagem(msg as MensagemWa)
      const grupo = ehGrupo(jid)
      const minha = ehMinha(msg.key ?? null)
      const quando = dataDaMensagem(msg.messageTimestamp as never, new Date())

      // Metadado da conversa SEMPRE, mesmo de mensagem ignorada: a conversa
      // existe e acabou de subir na lista. O pushName só serve de nome em
      // conversa 1:1 que não é minha — em grupo ele é de quem escreveu.
      const cache = await this.registrarChat(
        {
          jid,
          nome: !grupo && !minha ? (msg.pushName ?? null) : null,
          telefone: normalizarTelefone(jidParaNumero(jid)),
          grupo,
          ultimaMensagemEm: quando,
        },
        true,
      )

      if (!classificada || !cache?.monitorar) continue

      const msgId = typeof msg.key?.id === "string" ? msg.key.id : null
      if (!msgId) continue

      const mensagemId = await gravarMensagem(this.userId, {
        chatId: cache.id,
        msgId,
        deMim: minha,
        autorJid: grupo ? autorDaMensagem(msg.key ?? null) : null,
        autorNome: grupo ? (msg.pushName ?? null) : null,
        tipo: classificada.tipo,
        texto: classificada.texto,
        midiaMime: classificada.midia?.mime ?? null,
        midiaNome: classificada.midia
          ? nomeDeArquivo({
              nome: classificada.midia.nome,
              mime: classificada.midia.mime,
              tipo: classificada.tipo,
              msgId,
            })
          : null,
        midiaTamanho: classificada.midia?.tamanho ?? null,
        enviadaEm: quando,
      })
      // null = já estava gravada (reenvio, ou o mesmo conteúdo chegando pelo
      // histórico E pelo notify): não baixa a mídia de novo.
      if (!mensagemId) continue

      if (classificada.midia) await this.baixarMidia(msg, mensagemId, classificada.midia.tamanho)
    }
  }

  /**
   * Baixa e guarda os bytes. O arquivo no CDN do WhatsApp é CIFRADO com chaves
   * que vivem na própria mensagem, e a URL expira — então é agora ou nunca:
   * ninguém (nem o Claude depois, pelo MCP) consegue baixar isto mais tarde.
   * Por isso a falha é só logada: a mensagem já está gravada com o metadado.
   */
  private async baixarMidia(msg: WAMessage, mensagemId: number, tamanho: number | null): Promise<void> {
    if (tamanho && tamanho > MIDIA_MAX_BYTES) {
      log.info({ userId: this.userId, mensagemId, tamanho }, "mídia acima do teto — só o metadado foi guardado")
      return
    }
    const sock = this.sock
    if (!sock) return
    try {
      const bytes = await downloadMediaMessage(
        msg,
        "buffer",
        {},
        { logger: waLogger, reuploadRequest: sock.updateMediaMessage },
      )
      if (!(await salvarMidia(this.userId, mensagemId, bytes))) {
        log.info({ userId: this.userId, mensagemId, bytes: bytes.length }, "mídia não guardada (acima do teto)")
      }
    } catch (e) {
      log.warn({ userId: this.userId, mensagemId, err: truncarErro(e) }, "falha ao baixar mídia")
    }
  }

  private async aoAtualizar(u: {
    connection?: string
    qr?: string
    lastDisconnect?: { error?: unknown; date: Date }
  }): Promise<void> {
    if (u.qr) await this.aoReceberQr(u.qr)

    if (u.connection === "open") {
      this.tentativa = 0
      this.ultimoQr = null
      this.modoPareamento = false
      this.pareamentoPendente = null
      const numero = jidParaNumero(this.sock?.user?.id)
      await salvarSessao(this.userId, {
        status: "conectado",
        numero,
        conectadoEm: new Date(),
        ultimoErro: null,
        pareamento: null,
      })
      await publicarEvento({ tipo: "conectado", userId: this.userId, numero })
      log.info({ userId: this.userId }, "sessão conectada")
      return
    }

    if (u.connection === "close") {
      if (this.encerrando) return // desconexão que NÓS pedimos
      const erro = u.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined
      const codigo = erro?.output?.statusCode
      const d = decidirFechamento(codigo, this.tentativa)
      await this.fecharSocket()
      this.cancelarReconexao()
      if (d.acao === "deslogar") {
        log.warn({ userId: this.userId, codigo }, "sessão deslogada pelo WhatsApp — credenciais apagadas")
        await apagarAuth(this.userId)
        await salvarSessao(this.userId, {
          status: "deslogado",
          numero: null,
          conectadoEm: null,
          pareamento: null,
          ultimoErro: d.motivo,
        })
        await publicarEvento({ tipo: "deslogado", userId: this.userId })
        sessoes.delete(this.userId)
        return
      }
      if (d.acao === "parar") {
        log.warn({ userId: this.userId, codigo }, "outra instância assumiu a sessão — parando")
        await salvarSessao(this.userId, { status: "erro", ultimoErro: d.motivo, pareamento: null })
        await publicarEvento({ tipo: "erro", userId: this.userId, mensagem: d.motivo })
        sessoes.delete(this.userId)
        return
      }
      const retomada = decidirRetomada(codigo, this.registrada)
      if (retomada === "expirou") {
        log.warn({ userId: this.userId, codigo }, "código expirou sem ser lido — sessão encerrada")
        await salvarSessao(this.userId, {
          status: "desconectado",
          pareamento: null,
          ultimoErro: "O tempo para ler o código terminou — clique em Conectar para gerar outro",
        })
        await publicarEvento({ tipo: "status", userId: this.userId, status: "desconectado" })
        sessoes.delete(this.userId)
        return
      }
      if (retomada === "reinicio") {
        // Pareamento concluindo: a tela NÃO pode piscar "Com problema" aqui.
        // Reabre na hora — `abrir()` espera a gravação das creds novas.
        log.info({ userId: this.userId }, "reinício pedido pelo WhatsApp — reabrindo a sessão")
        await salvarSessao(this.userId, { status: "aguardando_qr", ultimoErro: null })
        this.agendarReconexao(0)
        return
      }
      this.tentativa++
      await salvarSessao(this.userId, { status: "erro", ultimoErro: d.motivo })
      await publicarEvento({ tipo: "erro", userId: this.userId, mensagem: d.motivo })
      this.agendarReconexao(d.esperaMs)
    }
  }

  private async aoReceberQr(qr: string): Promise<void> {
    // O primeiro QR é também o sinal de que o socket está pronto para pedir o
    // código de pareamento (a conexão existe e ainda não está registrada).
    if (this.pareamentoPendente && !this.modoPareamento) {
      const numero = this.pareamentoPendente
      this.modoPareamento = true
      try {
        const codigo = await this.sock!.requestPairingCode(numero)
        await salvarSessao(this.userId, { status: "aguardando_qr", pareamento: codigo, ultimoErro: null })
        await publicarEvento({ tipo: "pareamento", userId: this.userId, codigo })
        log.info({ userId: this.userId }, "código de pareamento emitido")
      } catch (e) {
        this.modoPareamento = false
        this.pareamentoPendente = null
        log.warn({ userId: this.userId, err: truncarErro(e) }, "falha ao pedir código de pareamento")
        await registrarErro(this.userId, "Não foi possível gerar o código de pareamento — tente o QR")
      }
      return
    }
    if (this.modoPareamento) return // o código já está na tela; QR só confundiria
    this.ultimoQr = qr
    await salvarSessao(this.userId, { status: "aguardando_qr", pareamento: null, ultimoErro: null })
    await publicarEvento({ tipo: "qr", userId: this.userId, qr })
  }

  /** "Desconectar" do usuário: logout de verdade + credenciais apagadas. */
  async desconectar(): Promise<void> {
    this.encerrando = true
    this.cancelarReconexao()
    const sock = this.sock
    this.sock = null
    if (sock) {
      // `logout` avisa o WhatsApp (o aparelho sai de "Aparelhos conectados").
      await sock.logout().catch((e) => log.warn({ userId: this.userId, err: truncarErro(e) }, "logout falhou"))
      await sock.end(undefined).catch(() => {})
    }
    await apagarAuth(this.userId)
    await salvarSessao(this.userId, {
      status: "deslogado",
      numero: null,
      conectadoEm: null,
      pareamento: null,
      ultimoErro: null,
    })
    await publicarEvento({ tipo: "deslogado", userId: this.userId })
    sessoes.delete(this.userId)
    log.info({ userId: this.userId }, "sessão desconectada a pedido do usuário")
  }

  /** Fecha o socket sem tocar em credenciais (queda de rede, reabertura). */
  private async fecharSocket(): Promise<void> {
    const sock = this.sock
    this.sock = null
    if (sock) await sock.end(undefined).catch(() => {})
  }

  /** Desliga para o processo encerrar, deixando o status como "conectado" para
   *  a próxima subida restaurar a sessão sem novo QR. */
  async encerrarParaDesligar(): Promise<void> {
    this.encerrando = true
    this.cancelarReconexao()
    await this.fecharSocket()
  }

  private agendarReconexao(esperaMs?: number): void {
    if (this.timerReconexao || this.encerrando) return
    const espera = esperaMs ?? decidirFechamento(undefined, this.tentativa).esperaMs
    this.timerReconexao = setTimeout(() => {
      this.timerReconexao = null
      void this.iniciar()
    }, espera)
  }

  private cancelarReconexao(): void {
    if (this.timerReconexao) {
      clearTimeout(this.timerReconexao)
      this.timerReconexao = null
    }
  }
}

const sessoes = new Map<number, Sessao>()

function sessaoDe(userId: number): Sessao {
  let s = sessoes.get(userId)
  if (!s) {
    s = new Sessao(userId)
    sessoes.set(userId, s)
  }
  return s
}

async function tratarComando(cmd: WhatsappComando): Promise<void> {
  switch (cmd.tipo) {
    case "iniciar":
      await sessaoDe(cmd.userId).iniciar()
      return
    case "pareamento":
      await sessaoDe(cmd.userId).iniciar(cmd.numero)
      return
    case "recarregar": {
      // Interruptor "Monitorar" mexido na página, ou cadastro de cliente
      // alterado: derruba os caches para a próxima mensagem já ver o estado
      // novo (o índice de telefones é global; o de chats, por sessão).
      limparIndiceTelefones()
      sessoes.get(cmd.userId)?.recarregar()
      return
    }
    case "desconectar": {
      const s = sessoes.get(cmd.userId)
      if (s) {
        await s.desconectar()
        return
      }
      // Sem sessão viva no processo: ainda assim revoga o que está no banco.
      await apagarAuth(cmd.userId)
      await mudarStatus(cmd.userId, "deslogado", { numero: null, conectadoEm: null, pareamento: null })
      return
    }
  }
}

// ── Supervisor do processo ───────────────────────────────────────────────────

/** Tenta o lock de instância única por até ~60 s (um container antigo pode
 *  estar saindo). Sem conseguir, SAI: duas instâncias se derrubariam. */
async function tomarLock(client: Client): Promise<boolean> {
  for (let i = 0; i < 12; i++) {
    const r = await client.query<{ ok: boolean }>("SELECT pg_try_advisory_lock($1) AS ok", [LOCK_WORKER])
    if (r.rows[0]?.ok) return true
    log.warn({ tentativa: i + 1 }, "outra instância do worker detém o lock — aguardando")
    await new Promise((res) => setTimeout(res, 5_000))
  }
  return false
}

export async function iniciarWorker(): Promise<void> {
  // Declarado ANTES dos handlers que o leem: um `end` da conexão durante um dos
  // `await` abaixo cairia em TDZ se a declaração viesse depois.
  let desligando = false
  const chave = lerChaveAuth(process.env.WHATSAPP_AUTH_KEY)
  if (!chave) {
    log.error("WHATSAPP_AUTH_KEY não definida — o worker não sobe (sem ela não há como cifrar o auth state)")
    process.exit(1)
  }
  chaveCripto = chave

  // UMA conexão dedicada faz as duas coisas que precisam de sessão própria: o
  // advisory lock (que só vale enquanto a sessão existe) e o LISTEN.
  const client = new Client({ connectionString: process.env.DATABASE_URL, application_name: "lexia-whatsapp-worker" })
  await client.connect()

  if (!(await tomarLock(client))) {
    log.error("não foi possível obter o lock de instância única — saindo")
    await client.end().catch(() => {})
    process.exit(1)
  }

  // Se esta conexão cair, o lock é LIBERADO e outra instância pode assumir
  // enquanto esta ainda segura os WebSockets. Sair é a única resposta correta
  // (o supervisor — EasyPanel/systemd — sobe de novo e o lock é retomado).
  client.on("error", (e) => {
    log.error({ err: truncarErro(e) }, "conexão de controle caiu — saindo para não duplicar a instância")
    process.exit(1)
  })
  client.on("end", () => {
    if (!desligando) {
      log.error("conexão de controle encerrada — saindo")
      process.exit(1)
    }
  })

  client.on("notification", (msg) => {
    if (msg.channel !== CANAL_COMANDO || !msg.payload) return
    const cmd = lerComando(msg.payload)
    if (!cmd) return
    void tratarComando(cmd).catch((e) =>
      log.error({ userId: cmd.userId, tipo: cmd.tipo, err: truncarErro(e) }, "comando falhou"),
    )
  })
  await client.query("LISTEN " + CANAL_COMANDO)

  // Faxina de retenção pendurada no heartbeat: este é o único processo contínuo
  // do Lexia, então não vale um cron novo só para isto. A primeira roda já na
  // subida (faxinaEm = 0), que é também o caminho pelo qual ela acontece numa
  // instalação que fique dias no ar sem reiniciar.
  let faxinaEm = 0
  const FAXINA_MS = 24 * 60 * 60 * 1000
  const bater = async () => {
    await baterPontoWorker().catch((e) => log.warn({ err: truncarErro(e) }, "heartbeat falhou"))
    if (Date.now() - faxinaEm < FAXINA_MS) return
    faxinaEm = Date.now()
    await faxinaRetencao().catch((e) => log.warn({ err: truncarErro(e) }, "faxina de retenção falhou"))
  }
  await bater()
  const timerHeartbeat = setInterval(() => void bater(), WORKER_HEARTBEAT_MS)

  // Restaura as sessões que estavam de pé: o aceite da fase 2 é reiniciar o
  // worker SEM precisar de novo QR (as credenciais estão no banco).
  const pendentes = await sessoesParaRestaurar()
  log.info({ sessoes: pendentes.length }, "worker no ar — restaurando sessões")
  for (const userId of pendentes) {
    await sessaoDe(userId)
      .iniciar()
      .catch((e) => log.error({ userId, err: truncarErro(e) }, "falha ao restaurar sessão"))
  }

  const desligar = async (sinal: string) => {
    if (desligando) return
    desligando = true
    log.info({ sinal }, "encerrando worker")
    clearInterval(timerHeartbeat)
    await Promise.all([...sessoes.values()].map((s) => s.encerrarParaDesligar().catch(() => {})))
    await client.end().catch(() => {})
    await prisma.$disconnect().catch(() => {})
    process.exit(0)
  }
  process.on("SIGINT", () => void desligar("SIGINT"))
  process.on("SIGTERM", () => void desligar("SIGTERM"))
}

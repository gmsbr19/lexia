// WhatsApp (Baileys) — tipos e nomes de canal compartilhados pelo app web e pelo
// worker. PURO: nenhum import de prisma, baileys ou React, porque este arquivo é
// alcançado pelos dois lados (o worker é ESM, o app é bundle do Next).
//
// Ver docs/whatsapp-baileys.md. Regra central do módulo: tudo é escopado a UM
// usuário — nem sócio nem admin lê a conexão de outro.

/** Estado da conexão de um usuário, como o worker o grava em WhatsappSessao. */
export type WhatsappStatus = "desconectado" | "aguardando_qr" | "conectado" | "erro" | "deslogado"

export const STATUS_VALIDOS: readonly WhatsappStatus[] = [
  "desconectado",
  "aguardando_qr",
  "conectado",
  "erro",
  "deslogado",
] as const

/**
 * Comando do app web → worker (via `pg_notify`). O `userId` SEMPRE vem da sessão
 * do servidor, nunca do corpo da requisição: é o que impede uma pessoa de mandar
 * o worker conectar/desconectar o WhatsApp de outra.
 */
export type WhatsappComando =
  | { tipo: "iniciar"; userId: number }
  /** `numero`: só dígitos com DDI (ver numeroParaPareamento em ./core). */
  | { tipo: "pareamento"; userId: number; numero: string }
  | { tipo: "desconectar"; userId: number }
  /**
   * "Reler as conversas deste usuário no banco." O worker guarda em memória
   * quais chats estão marcados `monitorar` (senão cada mensagem custaria uma
   * consulta), e é isto que invalida esse cache quando o usuário mexe no
   * interruptor da página. Há também um TTL como rede de segurança, para o caso
   * de o NOTIFY se perder com o worker fora do ar.
   */
  | { tipo: "recarregar"; userId: number }
  /**
   * "Peça ao WhatsApp as mensagens anteriores às que já temos nesta conversa."
   * O worker chama `fetchMessageHistory` a partir da âncora guardada no chat; a
   * resposta volta pelo MESMO caminho do histórico do pareamento
   * (`messaging-history.set`), então é a ingestão normal que a grava — e só se
   * a conversa estiver monitorada.
   */
  | { tipo: "historico"; userId: number; chatId: number }

/** Evento do worker → app web (via `pg_notify`), consumido pelo SSE da página. */
export type WhatsappEvento =
  /** String crua do QR; a página desenha a imagem no navegador. NUNCA é persistida. */
  | { tipo: "qr"; userId: number; qr: string }
  | { tipo: "pareamento"; userId: number; codigo: string }
  | { tipo: "conectado"; userId: number; numero: string | null }
  | { tipo: "erro"; userId: number; mensagem: string }
  | { tipo: "deslogado"; userId: number }
  | { tipo: "status"; userId: number; status: WhatsappStatus }

/** O que a página de conexão e a ferramenta MCP whatsapp_status leem. */
export type SessaoView = {
  status: WhatsappStatus
  numero: string | null
  conectadoEm: string | null // ISO
  ultimoErro: string | null
  pareamento: string | null
  /** false quando o worker não dá sinal de vida há mais de WORKER_TTL_MS. */
  workerOnline: boolean
  /** Dias de histórico a gravar no pareamento (já aparado; nunca null). */
  historicoDias: number
}

// Canais do LISTEN/NOTIFY. Nome de canal é identificador do Postgres: minúsculo,
// sem aspas. Escolhido em vez de uma fila/broker porque o banco já existe e o
// app roda numa instância só (ver docs/whatsapp-baileys.md § Worker).
export const CANAL_COMANDO = "lexia_whatsapp_cmd"
export const CANAL_EVENTO = "lexia_whatsapp_evt"

/** Validade do cache de conversas do worker (rede de segurança do `recarregar`). */
export const CHATS_CACHE_TTL_MS = 60_000

/** Chave do AppSetting onde o worker bate o ponto (heartbeat). */
export const CHAVE_WORKER = "whatsapp.worker"
/** Intervalo com que o worker atualiza o heartbeat. */
export const WORKER_HEARTBEAT_MS = 30_000
/** Acima disso o app considera o worker fora do ar (3 batidas perdidas). */
export const WORKER_TTL_MS = 95_000
/** Id do `pg_advisory_lock` que garante UMA instância do worker (7331/7332 = grafo de tarefas). */
export const LOCK_WORKER = 7333

/**
 * Quanto do passado o sync do PAREAMENTO grava, quando o usuário não escolheu.
 * Vive aqui (e não em ./core) porque o core importa deste arquivo — o contrário
 * seria um ciclo. A REGRA (aparar a escolha) é que mora no core.
 */
export const HISTORICO_SYNC_DIAS = 15
/** Faixa oferecida na página e aceita pela rota. */
export const HISTORICO_DIAS_MIN = 1
export const HISTORICO_DIAS_MAX = 365

export const SESSAO_VAZIA: SessaoView = {
  status: "desconectado",
  numero: null,
  conectadoEm: null,
  ultimoErro: null,
  pareamento: null,
  workerOnline: false,
  historicoDias: HISTORICO_SYNC_DIAS,
}

// Anexos da LexIA — abstração de armazenamento dos BYTES. SERVER ONLY.
// O backend é plugável para permitir, no futuro, mover os arquivos para o
// OneDrive do escritório sem mexer no resto do código. Hoje o padrão é `db`
// (base64 na tabela LexiaAnexo); `onedrive` é um esqueleto a implementar.
import { env } from "@/lib/env"
import { UserError } from "@/lib/errors"
import type { AnexoEntrada } from "./validacao"

/** Para onde os bytes foram (ou serão) gravados. Espelha as colunas de LexiaAnexo. */
export interface AnexoArmazenado {
  storage: "db" | "onedrive"
  /** base64 (quando storage = "db") */
  data: string | null
  /** ponteiro externo: itemId/webUrl do Graph (quando storage = "onedrive") */
  ref: string | null
}

/** Forma mínima lida do banco para recuperar os bytes. */
export interface AnexoPersistido {
  storage: string
  data: string | null
  ref: string | null
}

export interface AnexoStore {
  /** Persiste os bytes e devolve como recuperá-los depois. */
  salvar(a: AnexoEntrada): Promise<AnexoArmazenado>
  /** Recupera os bytes em base64 (sem prefixo data-URL). */
  carregar(row: AnexoPersistido): Promise<string>
}

/** Backend padrão: guarda o base64 inline na própria linha de LexiaAnexo. */
const dbStore: AnexoStore = {
  async salvar(a) {
    return { storage: "db", data: a.dataBase64, ref: null }
  },
  async carregar(row) {
    if (row.data == null) throw new UserError("Anexo sem conteúdo armazenado")
    return row.data
  },
}

// ── Esqueleto OneDrive (Microsoft Graph) — a implementar ───────────────────
// Roteiro quando for plugar o OneDrive do escritório:
//   1. Auth client-credentials (app registration no Entra ID): trocar
//      ONEDRIVE_CLIENT_ID/SECRET/TENANT por um token de aplicação
//      (scope https://graph.microsoft.com/.default).
//   2. salvar(): PUT do conteúdo em uma pasta do drive do escritório, ex.:
//      PUT /drives/{ONEDRIVE_DRIVE_ID}/root:/{ONEDRIVE_FOLDER}/{nome}:/content
//      Guardar `id` (e/ou webUrl) do DriveItem como `ref`; data = null.
//   3. carregar(): GET /drives/{driveId}/items/{ref}/content → base64.
// Mantemos a mesma interface AnexoStore para a troca ser transparente.
const oneDriveStore: AnexoStore = {
  async salvar() {
    throw new UserError("Integração com o OneDrive ainda não foi configurada")
  },
  async carregar() {
    throw new UserError("Integração com o OneDrive ainda não foi configurada")
  },
}

/** Seleciona o backend de anexos conforme env.ANEXO_STORAGE (default "db"). */
export function getAnexoStore(): AnexoStore {
  return env.ANEXO_STORAGE === "onedrive" ? oneDriveStore : dbStore
}

// WhatsApp — cifragem do auth state do Baileys (AES-256-GCM). SERVER ONLY.
//
// POR QUE: `WhatsappAuth.valor` guarda as chaves de criptografia da sessão do
// WhatsApp. Quem lê essa linha TEM o WhatsApp da pessoa — um dump do banco, um
// backup, ou a ferramenta `sql_consultar` do MCP bastariam. Então o conteúdo é
// cifrado com uma chave que vive SÓ em variável de ambiente (WHATSAPP_AUTH_KEY),
// nunca no banco: sem o `.env`, o dump é inútil.
//
// GCM (e não CBC) porque é autenticado: alterar um byte do ciphertext faz a
// decifragem FALHAR em vez de devolver lixo que o Baileys interpretaria.
// O `contexto` (userId + chave da linha) entra como AAD, então uma linha não
// pode ser movida de um usuário para outro nem de "creds" para uma signal key —
// a cifra está amarrada ao lugar onde foi gravada.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ALGO = "aes-256-gcm"
const IV_BYTES = 12 // tamanho recomendado para GCM
const TAG_BYTES = 16
const PREFIXO = "g1" // versão do formato; permite trocar o esquema sem adivinhação

/**
 * Converte o valor cru de WHATSAPP_AUTH_KEY em 32 bytes. Aceita hex (64 chars,
 * o que `openssl rand -hex 32` produz) ou base64 (o que `-base64 32` produz).
 * Devolve null quando a var não está definida — é assim que o módulo fica
 * DESLIGADO por omissão (mesmo padrão de LEXIA_MCP_TOKEN). Valor presente mas
 * inválido LANÇA: falhar alto é melhor que gravar credencial com chave fraca.
 */
export function lerChaveAuth(raw: string | null | undefined): Buffer | null {
  const v = (raw ?? "").trim()
  if (!v) return null
  if (/^[0-9a-fA-F]{64}$/.test(v)) return Buffer.from(v, "hex")
  const b64 = Buffer.from(v, "base64")
  if (b64.length === 32) return b64
  throw new Error(
    "WHATSAPP_AUTH_KEY inválida: use 32 bytes em hex (64 caracteres, `openssl rand -hex 32`) ou em base64 (`openssl rand -base64 32`).",
  )
}

/** Cifra `texto` amarrando o resultado a `contexto` (AAD). */
export function cifrar(texto: string, chave: Buffer, contexto: string): string {
  const iv = randomBytes(IV_BYTES)
  const c = createCipheriv(ALGO, chave, iv)
  c.setAAD(Buffer.from(contexto, "utf8"))
  const ct = Buffer.concat([c.update(texto, "utf8"), c.final()])
  const tag = c.getAuthTag()
  return [PREFIXO, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":")
}

/**
 * Decifra o que `cifrar` produziu. LANÇA quando a chave está errada, o valor foi
 * adulterado ou o contexto não bate — nunca devolve conteúdo duvidoso.
 */
export function decifrar(blob: string, chave: Buffer, contexto: string): string {
  const partes = blob.split(":")
  if (partes.length !== 4 || partes[0] !== PREFIXO) throw new Error("Formato de auth state não reconhecido")
  const iv = Buffer.from(partes[1], "base64")
  const tag = Buffer.from(partes[2], "base64")
  const ct = Buffer.from(partes[3], "base64")
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new Error("Auth state corrompido")
  const d = createDecipheriv(ALGO, chave, iv)
  d.setAAD(Buffer.from(contexto, "utf8"))
  d.setAuthTag(tag)
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8")
}

/** Contexto (AAD) de uma linha de WhatsappAuth. */
export function contextoAuth(userId: number, chave: string): string {
  return "whatsapp-auth:" + userId + ":" + chave
}

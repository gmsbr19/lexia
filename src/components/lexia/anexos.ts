// Cliente: lê arquivos escolhidos/arrastados/colados → base64, validando contra
// as MESMAS regras do servidor (src/lib/lexia/anexos/validacao). Devolve os
// anexos aceitos + mensagens de erro PT-BR para a UX.
import {
  MAX_ANEXOS,
  MAX_TOTAL_BYTES,
  bytesDeBase64,
  ehImagem,
  mimePermitido,
  rotuloTamanho,
  validarAnexo,
} from "@/lib/lexia/anexos/validacao"

export interface ClientAnexo {
  nome: string
  mimeType: string
  tamanho: number
  dataBase64: string
}

export interface LeituraResultado {
  anexos: ClientAnexo[] // novos anexos aceitos (para concatenar aos já escolhidos)
  erros: string[]
}

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
}

function inferirMime(file: File): string {
  if (file.type) return file.type === "image/jpg" ? "image/jpeg" : file.type
  const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
  return EXT_MIME[ext] ?? ""
}

function lerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const res = String(reader.result)
      const i = res.indexOf(",")
      resolve(i >= 0 ? res.slice(i + 1) : res) // tira o prefixo data:...;base64,
    }
    reader.onerror = () => reject(new Error("falha ao ler"))
    reader.readAsDataURL(file)
  })
}

/** Lê e valida os arquivos, considerando os que já estão anexados (limites). */
export async function lerArquivos(files: FileList | File[], jaAnexados: ClientAnexo[] = []): Promise<LeituraResultado> {
  const lista = Array.from(files)
  const anexos: ClientAnexo[] = []
  const erros: string[] = []
  let total = jaAnexados.reduce((s, a) => s + a.tamanho, 0)
  let count = jaAnexados.length

  for (const file of lista) {
    if (count >= MAX_ANEXOS) {
      erros.push(`Limite de ${MAX_ANEXOS} anexos por mensagem`)
      break
    }
    const mimeType = inferirMime(file)
    if (!mimePermitido(mimeType)) {
      erros.push(`"${file.name}" não é um formato suportado (use PNG, JPG, WEBP, GIF ou PDF)`)
      continue
    }
    let dataBase64: string
    try {
      dataBase64 = await lerComoBase64(file)
    } catch {
      erros.push(`Não consegui ler "${file.name}"`)
      continue
    }
    const erro = validarAnexo({ nome: file.name, mimeType, dataBase64 })
    if (erro) {
      erros.push(erro)
      continue
    }
    const tamanho = bytesDeBase64(dataBase64)
    if (total + tamanho > MAX_TOTAL_BYTES) {
      erros.push(`Os anexos passam de ${rotuloTamanho(MAX_TOTAL_BYTES)} no total`)
      break
    }
    anexos.push({ nome: file.name, mimeType, tamanho, dataBase64 })
    total += tamanho
    count += 1
  }
  return { anexos, erros }
}

/** Extrai os arquivos de um evento de paste/drop (cobre .files e .items). */
export function arquivosDoClipboard(dt: DataTransfer | null): File[] {
  if (!dt) return []
  if (dt.files && dt.files.length) return Array.from(dt.files)
  const out: File[] = []
  for (const it of Array.from(dt.items || [])) {
    if (it.kind === "file") {
      const f = it.getAsFile()
      if (f) out.push(f)
    }
  }
  return out
}

/** data-URL para preview (só imagens com bytes presentes). */
export function dataUrlImagem(a: { mimeType: string; dataBase64?: string }): string | null {
  if (!a.dataBase64 || !ehImagem(a.mimeType)) return null
  return `data:${a.mimeType};base64,${a.dataBase64}`
}

export { rotuloTamanho, ehImagem, ACCEPT_ATTR } from "@/lib/lexia/anexos/validacao"

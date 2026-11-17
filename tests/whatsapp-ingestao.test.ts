// WhatsApp fase 3 — núcleo puro da ingestão (o que é mensagem, que tipo tem,
// qual é o texto, que arquivo tem) e a assinatura do link de mídia. Nada aqui
// toca banco, rede ou Baileys.
import { describe, expect, it } from "vitest"
import { ehLid, jidParaNumero } from "@/lib/whatsapp/core"
import {
  MIDIA_MAX_BYTES,
  autorDaMensagem,
  classificarMensagem,
  dataDaMensagem,
  desembrulhar,
  ehMinha,
  escolherVinculo,
  extensaoDeMime,
  formatarTelefone,
  nomeDeArquivo,
  nomeDeChat,
  paraNumero,
  truncarTexto,
  variantesTelefone,
} from "@/lib/whatsapp/mensagens-core"
import { MIDIA_LINK_TTL_MS, assinarMidia, caminhoMidia, derivarChaveMidia, verificarMidia } from "@/lib/whatsapp/midia-link"

const AGORA = new Date("2026-11-17T12:00:00Z")

describe("paraNumero / dataDaMensagem", () => {
  it("aceita número, string e Long do protobuf", () => {
    expect(paraNumero(42)).toBe(42)
    expect(paraNumero("1763380800")).toBe(1763380800)
    expect(paraNumero({ low: 1000, high: 0, unsigned: true })).toBe(1000)
    expect(paraNumero(null)).toBeNull()
    expect(paraNumero("abc")).toBeNull()
  })

  it("converte segundos em data e cai no agora quando não há timestamp", () => {
    expect(dataDaMensagem(1794916800, AGORA).toISOString()).toBe("2026-11-17T12:00:00.000Z")
    expect(dataDaMensagem(null, AGORA)).toBe(AGORA)
    expect(dataDaMensagem(0, AGORA)).toBe(AGORA)
  })

  it("tolera timestamp já em milissegundos", () => {
    expect(dataDaMensagem(1794916800000, AGORA).toISOString()).toBe("2026-11-17T12:00:00.000Z")
  })
})

describe("desembrulhar", () => {
  it("descasca efêmera e visualização única", () => {
    const dentro = { conversation: "oi" }
    expect(desembrulhar({ ephemeralMessage: { message: dentro } })).toEqual(dentro)
    expect(desembrulhar({ viewOnceMessageV2: { message: dentro } })).toEqual(dentro)
    expect(desembrulhar({ documentWithCaptionMessage: { message: dentro } })).toEqual(dentro)
  })

  it("descasca envelopes aninhados e devolve null para vazio", () => {
    const d = desembrulhar({ ephemeralMessage: { message: { viewOnceMessage: { message: { conversation: "x" } } } } })
    expect(d).toEqual({ conversation: "x" })
    expect(desembrulhar(null)).toBeNull()
    expect(desembrulhar(undefined)).toBeNull()
  })
})

describe("classificarMensagem", () => {
  it("texto simples e texto estendido", () => {
    expect(classificarMensagem({ message: { conversation: "bom dia" } })).toEqual({
      tipo: "texto",
      texto: "bom dia",
      midia: null,
    })
    expect(classificarMensagem({ message: { extendedTextMessage: { text: "com link" } } })?.texto).toBe("com link")
  })

  it("IGNORA reação, protocolo, mensagem de sistema e conteúdo vazio", () => {
    expect(classificarMensagem({ message: { reactionMessage: { text: "👍" } } })).toBeNull()
    expect(classificarMensagem({ message: { protocolMessage: { type: 0 } } })).toBeNull()
    expect(classificarMensagem({ message: { senderKeyDistributionMessage: {} } })).toBeNull()
    expect(classificarMensagem({ message: { messageContextInfo: {} } })).toBeNull()
    expect(classificarMensagem({ message: {} })).toBeNull()
    expect(classificarMensagem({})).toBeNull()
  })

  it("ignora a reação mesmo quando vem acompanhada de metadado", () => {
    expect(classificarMensagem({ message: { messageContextInfo: {}, reactionMessage: { text: "❤" } } })).toBeNull()
  })

  it("texto em branco não vira mensagem", () => {
    expect(classificarMensagem({ message: { conversation: "   " } })).toBeNull()
  })

  it("imagem com legenda: a legenda é o texto e a mídia vem descrita", () => {
    const c = classificarMensagem({
      message: {
        imageMessage: { caption: "a procuração", mimetype: "image/jpeg", fileLength: { low: 204800, high: 0 } },
      },
    })
    expect(c).toEqual({
      tipo: "imagem",
      texto: "a procuração",
      midia: { chave: "imageMessage", mime: "image/jpeg", nome: null, tamanho: 204800 },
    })
  })

  it("documento traz o nome do arquivo; áudio e vídeo têm o tipo certo", () => {
    const doc = classificarMensagem({
      message: { documentMessage: { fileName: "contrato.pdf", mimetype: "application/pdf", fileLength: "1024" } },
    })
    expect(doc?.tipo).toBe("documento")
    expect(doc?.midia?.nome).toBe("contrato.pdf")
    expect(classificarMensagem({ message: { audioMessage: { mimetype: "audio/ogg", ptt: true } } })?.tipo).toBe("audio")
    expect(classificarMensagem({ message: { videoMessage: { mimetype: "video/mp4" } } })?.tipo).toBe("video")
    // Figurinha é mídia, mas entra como "outro" para não poluir a triagem.
    expect(classificarMensagem({ message: { stickerMessage: { mimetype: "image/webp" } } })?.tipo).toBe("outro")
  })

  it("documento dentro do envelope com legenda também é documento", () => {
    const c = classificarMensagem({
      message: {
        documentWithCaptionMessage: {
          message: { documentMessage: { fileName: "peticao.pdf", mimetype: "application/pdf", caption: "segue" } },
        },
      },
    })
    expect(c?.tipo).toBe("documento")
    expect(c?.texto).toBe("segue")
  })

  it("contato, localização e enquete viram 'outro' com um rótulo legível", () => {
    expect(classificarMensagem({ message: { contactMessage: { displayName: "Dr. Silva" } } })).toEqual({
      tipo: "outro",
      texto: "[contato] Dr. Silva",
      midia: null,
    })
    expect(classificarMensagem({ message: { locationMessage: { name: "Fórum" } } })?.texto).toBe("[localização] Fórum")
    expect(classificarMensagem({ message: { pollCreationMessage: { name: "Qual dia?" } } })?.tipo).toBe("outro")
  })
})

describe("autor e direção", () => {
  it("em grupo o autor é o participant; em 1:1 não há autor", () => {
    expect(autorDaMensagem({ participant: "5511999998888@s.whatsapp.net" })).toBe("5511999998888@s.whatsapp.net")
    expect(autorDaMensagem({ remoteJid: "5511999998888@s.whatsapp.net" })).toBeNull()
    expect(autorDaMensagem(null)).toBeNull()
  })

  it("deMim só é verdade com fromMe explícito", () => {
    expect(ehMinha({ fromMe: true })).toBe(true)
    expect(ehMinha({ fromMe: false })).toBe(false)
    expect(ehMinha({})).toBe(false)
    expect(ehMinha(null)).toBe(false)
  })
})

describe("nome de arquivo", () => {
  it("deriva a extensão do mime e cai em bin quando não dá para saber", () => {
    expect(extensaoDeMime("image/jpeg")).toBe("jpg")
    expect(extensaoDeMime("application/pdf")).toBe("pdf")
    expect(extensaoDeMime("audio/ogg; codecs=opus")).toBe("ogg")
    expect(extensaoDeMime(null)).toBe("bin")
    expect(extensaoDeMime("coisa/esquisita!!")).toBe("bin")
  })

  it("preserva o nome original quando ele já tem extensão", () => {
    expect(nomeDeArquivo({ nome: "contrato.pdf", mime: "application/pdf", tipo: "documento", msgId: "A1" })).toBe(
      "contrato.pdf",
    )
  })

  it("monta um nome quando não há (e nunca devolve um caminho)", () => {
    expect(nomeDeArquivo({ nome: null, mime: "image/jpeg", tipo: "imagem", msgId: "3EB0ABC" })).toBe(
      "imagem-3EB0ABC.jpg",
    )
    // Travessia de diretório e caracteres que o Windows leria como separador.
    const sujo = nomeDeArquivo({ nome: "../../etc/passwd", mime: "text/plain", tipo: "documento", msgId: "X" })
    expect(sujo).not.toContain("/")
    expect(sujo).not.toContain("\\")
    const comAspas = nomeDeArquivo({ nome: 'a"b', mime: "application/pdf", tipo: "documento", msgId: "X" })
    expect(comAspas).not.toContain('"')
  })
})

describe("truncarTexto", () => {
  it("corta avisando quantos caracteres faltaram", () => {
    const t = truncarTexto("x".repeat(4100))
    expect(t?.startsWith("x".repeat(4000))).toBe(true)
    expect(t).toContain("truncado")
    expect(truncarTexto("curto")).toBe("curto")
    expect(truncarTexto(null)).toBeNull()
  })
})

describe("variantesTelefone (o nono dígito)", () => {
  it("celular novo gera a forma antiga, sem o 9", () => {
    expect(variantesTelefone("5511987654321")).toEqual(["5511987654321", "551187654321"])
  })

  it("celular antigo gera a forma nova, com o 9", () => {
    expect(variantesTelefone("551187654321")).toEqual(["551187654321", "5511987654321"])
  })

  it("fixo NÃO ganha o nono dígito", () => {
    // 8 dígitos começando com 3 = fixo; inventar o 9 criaria um celular que não existe.
    expect(variantesTelefone("551133334444")).toEqual(["551133334444"])
  })

  it("número estrangeiro fica como está (o nono dígito é regra brasileira)", () => {
    expect(variantesTelefone("351912345678")).toEqual(["351912345678"])
  })

  it("entrada vazia ou suja não gera variante", () => {
    expect(variantesTelefone(null)).toEqual([])
    expect(variantesTelefone("")).toEqual([])
  })
})

describe("escolherVinculo", () => {
  it("vincula só com match ÚNICO", () => {
    expect(escolherVinculo([7])).toBe(7)
    expect(escolherVinculo([7, 7, 7])).toBe(7) // o mesmo cliente por dois telefones
    expect(escolherVinculo([])).toBeNull()
    // Dois clientes com o mesmo telefone é ambiguidade real: não escolhe nenhum.
    expect(escolherVinculo([7, 9])).toBeNull()
    expect(escolherVinculo([0, -1])).toBeNull()
  })
})

describe("rótulo da conversa", () => {
  it("usa nome salvo, depois pushName, depois o telefone formatado", () => {
    expect(nomeDeChat({ nome: "Maria", pushName: "M", telefone: "5511987654321", jid: "x@s.whatsapp.net" })).toBe("Maria")
    expect(nomeDeChat({ pushName: "Zé", telefone: "5511987654321", jid: "x@s.whatsapp.net" })).toBe("Zé")
    expect(nomeDeChat({ telefone: "5511987654321", jid: "x@s.whatsapp.net" })).toBe("+55 11 98765-4321")
    expect(nomeDeChat({ jid: "123@lid" })).toBeNull()
  })

  it("formata com 8 e com 9 dígitos", () => {
    expect(formatarTelefone("551133334444")).toBe("+55 11 3333-4444")
    expect(formatarTelefone(null)).toBeNull()
  })
})

describe("jid: LID hospedado não é telefone", () => {
  it("@hosted.lid é LID (e não vira número de telefone)", () => {
    expect(ehLid("123456@hosted.lid")).toBe(true)
    expect(jidParaNumero("123456@hosted.lid")).toBeNull()
    expect(jidParaNumero("5511987654321@s.whatsapp.net")).toBe("5511987654321")
  })
})

describe("link assinado da mídia", () => {
  const chaveAuth = Buffer.alloc(32, 7)
  const chave = derivarChaveMidia(chaveAuth)
  const agora = Date.parse("2026-11-17T12:00:00Z")

  it("a chave de assinatura NÃO é a chave de cifragem", () => {
    expect(chave.equals(chaveAuth)).toBe(false)
    expect(chave.length).toBe(32)
  })

  it("ida e volta devolve a mensagem e o usuário", () => {
    const t = assinarMidia({ mensagemId: 42, userId: 3 }, chave, agora)
    expect(verificarMidia(t, chave, agora)).toEqual({ mensagemId: 42, userId: 3 })
  })

  it("expira", () => {
    const t = assinarMidia({ mensagemId: 42, userId: 3 }, chave, agora)
    expect(verificarMidia(t, chave, agora + MIDIA_LINK_TTL_MS - 1000)).not.toBeNull()
    expect(verificarMidia(t, chave, agora + MIDIA_LINK_TTL_MS + 1000)).toBeNull()
  })

  it("recusa token adulterado, de outra chave e malformado", () => {
    const t = assinarMidia({ mensagemId: 42, userId: 3 }, chave, agora)
    // Trocar o id da mensagem no corpo invalida a assinatura.
    const partes = t.split(".")
    const forjado = [partes[0], partes[1], "99", partes[3], partes[4]].join(".")
    expect(verificarMidia(forjado, chave, agora)).toBeNull()
    // Trocar o usuário também.
    const outroUser = [partes[0], "999", partes[2], partes[3], partes[4]].join(".")
    expect(verificarMidia(outroUser, chave, agora)).toBeNull()
    expect(verificarMidia(t, derivarChaveMidia(Buffer.alloc(32, 8)), agora)).toBeNull()
    expect(verificarMidia("", chave, agora)).toBeNull()
    expect(verificarMidia(null, chave, agora)).toBeNull()
    expect(verificarMidia("v1.1.1.1", chave, agora)).toBeNull()
    expect(verificarMidia("v2.1.1." + partes[3] + "." + partes[4], chave, agora)).toBeNull()
    expect(verificarMidia("x".repeat(400), chave, agora)).toBeNull()
  })

  it("o caminho leva o token codificado", () => {
    const t = assinarMidia({ mensagemId: 42, userId: 3 }, chave, agora)
    expect(caminhoMidia(42, t)).toBe("/api/whatsapp/midia/42?t=" + encodeURIComponent(t))
  })
})

describe("teto da mídia", () => {
  it("é 10 MB, o mesmo dos outros anexos do Lexia", () => {
    expect(MIDIA_MAX_BYTES).toBe(10 * 1024 * 1024)
  })
})

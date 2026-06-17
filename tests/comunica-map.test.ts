import { describe, expect, it } from "vitest"
import fixture from "@/lib/processos/cnj/__fixtures__/comunica.sample.json"
import { comunicacaoParaPublicacao } from "@/lib/processos/cnj/comunica/map"
import type { ComunicaItem } from "@/lib/processos/cnj/comunica/types"

const item = (fixture.items as ComunicaItem[])[0]

describe("comunicacaoParaPublicacao (contra fixture real)", () => {
  it("mapeia os campos da comunicação → PublicacaoExterna", () => {
    const pub = comunicacaoParaPublicacao(item, "100000", "SP")
    expect(pub).not.toBeNull()
    expect(pub!.externalId).toBe(item.hash) // dedup pelo hash
    expect(pub!.conteudo).toBe(item.texto)
    expect(pub!.dataDisponibilizacao).toBe("2026-06-09") // disponibilização (2 hops na triagem)
    expect(pub!.dataPublicacao).toBeNull() // DJEN só traz a disponibilização
    expect(pub!.numeroCnj).toBe("00000000020248260000") // só dígitos
    expect(pub!.oab).toBe("100000/SP")
    expect(pub!.diario).toBe("Diário de Justiça Eletrônico Nacional")
  })

  it("ignora comunicação sem teor", () => {
    expect(comunicacaoParaPublicacao({ ...item, texto: "" }, "100000", "SP")).toBeNull()
  })

  it("ignora comunicação sem chave de dedup (hash/id)", () => {
    const semChave: ComunicaItem = { ...item, hash: undefined, id: undefined }
    expect(comunicacaoParaPublicacao(semChave, "100000", "SP")).toBeNull()
  })

  it("usa comunica-<id> quando falta o hash mas há id", () => {
    const pub = comunicacaoParaPublicacao({ ...item, hash: undefined }, "100000", "SP")
    expect(pub!.externalId).toBe(`comunica-${item.id}`)
  })
})

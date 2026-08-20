import { describe, expect, it } from "vitest"
import { avaliarRetratacaoPorEtapa, ehReuniaoRealizada, eventoParaEtapa, type MapaFunil } from "@/lib/captacao/eventos-core"

const MAPA: MapaFunil = {
  etapasQualificado: ["qualificado", "proposta"],
  etapasGanho: ["ganho"],
  reuniao: { tipos: ["reuniao"], resultados: ["positiva"] },
}

describe("eventoParaEtapa", () => {
  it("mapeia uma etapa qualificada para lead_qualificado", () => {
    expect(eventoParaEtapa("qualificado", MAPA)).toBe("lead_qualificado")
    expect(eventoParaEtapa("proposta", MAPA)).toBe("lead_qualificado")
  })

  it("'ganho' é sempre contrato_assinado (terminal fixo)", () => {
    expect(eventoParaEtapa("ganho", MAPA)).toBe("contrato_assinado")
  })

  it("etapa não mapeada (ex.: 'novo', 'contato') → nenhum evento", () => {
    expect(eventoParaEtapa("novo", MAPA)).toBeNull()
    expect(eventoParaEtapa("contato", MAPA)).toBeNull()
  })

  it("etapa REMOVIDA do pipeline (chave órfã no mapeamento) nunca é adivinhada — some, não vira outro evento", () => {
    // simula o admin tendo removido "qualificado" das etapas do pipeline SEM
    // atualizar captacao.funil — a chave ainda está em etapasQualificado, mas
    // deixou de existir como etapa real; eventoParaEtapa só reage à etapa que
    // o chamador de fato passa, então uma etapa desconhecida (não presente no
    // mapa) sempre retorna null — nunca cai em "ganho" por engano.
    expect(eventoParaEtapa("etapa-que-nao-existe-mais", MAPA)).toBeNull()
  })

  it("'perdido' nunca gera evento — não está em etapasQualificado nem etapasGanho", () => {
    expect(eventoParaEtapa("perdido", MAPA)).toBeNull()
  })
})

describe("ehReuniaoRealizada", () => {
  it("tipo e resultado configurados → true", () => {
    expect(ehReuniaoRealizada("reuniao", "positiva", MAPA)).toBe(true)
  })

  it("tipo certo mas resultado não configurado → false", () => {
    expect(ehReuniaoRealizada("reuniao", "sem_resposta", MAPA)).toBe(false)
  })

  it("resultado ausente (null) → false, mesmo com o tipo certo", () => {
    expect(ehReuniaoRealizada("reuniao", null, MAPA)).toBe(false)
  })

  it("tipo fora da lista configurada → false, mesmo com resultado positivo", () => {
    expect(ehReuniaoRealizada("ligacao", "positiva", MAPA)).toBe(false)
  })

  it("configuração customizada (admin ampliou pra 'ligacao' também) é respeitada", () => {
    const mapaCustom: MapaFunil = { ...MAPA, reuniao: { tipos: ["reuniao", "ligacao"], resultados: ["positiva"] } }
    expect(ehReuniaoRealizada("ligacao", "positiva", mapaCustom)).toBe(true)
  })
})

describe("avaliarRetratacaoPorEtapa — RETRACT só quando uma regressão de VERDADE acontece", () => {
  it("ganho → qualificado retrata só contrato_assinado (o lead CONTINUA qualificado)", () => {
    expect(avaliarRetratacaoPorEtapa("ganho", "qualificado", MAPA)).toEqual(["contrato_assinado"])
  })

  it("ganho → novo (etapa não qualificada) retrata os DOIS", () => {
    const r = avaliarRetratacaoPorEtapa("ganho", "novo", MAPA)
    expect(r).toContain("contrato_assinado")
    expect(r).toContain("lead_qualificado")
    expect(r).toHaveLength(2)
  })

  it("proposta → qualificado (ambas qualificadas) NÃO retrata nada — não é uma regressão de verdade", () => {
    expect(avaliarRetratacaoPorEtapa("proposta", "qualificado", MAPA)).toEqual([])
  })

  it("qualificado → proposta (avançar) nunca retrata — só regressão dispara", () => {
    expect(avaliarRetratacaoPorEtapa("qualificado", "proposta", MAPA)).toEqual([])
  })

  it("novo → qualificado (avançar, nunca esteve ganho) não retrata nada", () => {
    expect(avaliarRetratacaoPorEtapa("novo", "qualificado", MAPA)).toEqual([])
  })

  it("qualificado → novo retrata só lead_qualificado (nunca esteve ganho)", () => {
    expect(avaliarRetratacaoPorEtapa("qualificado", "novo", MAPA)).toEqual(["lead_qualificado"])
  })

  it("ganho → perdido também retrata os dois (perder um contrato já assinado é uma correção de dado)", () => {
    const r = avaliarRetratacaoPorEtapa("ganho", "perdido", MAPA)
    expect(r).toContain("contrato_assinado")
    expect(r).toContain("lead_qualificado")
  })

  it("novo → perdido (nunca foi qualificado) não retrata nada", () => {
    expect(avaliarRetratacaoPorEtapa("novo", "perdido", MAPA)).toEqual([])
  })

  it("etapa igual a si mesma nunca retrata", () => {
    expect(avaliarRetratacaoPorEtapa("qualificado", "qualificado", MAPA)).toEqual([])
    expect(avaliarRetratacaoPorEtapa("ganho", "ganho", MAPA)).toEqual([])
  })
})

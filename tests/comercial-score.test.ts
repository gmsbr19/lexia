import { describe, expect, it } from "vitest"
import {
  avaliarRegrasPerda,
  contarToques,
  engajamentoScore,
  ESTADO_META,
  estadoLead,
  fitScore,
  parseSinais,
  prioridadeLead,
  proximoToque,
  urgenciaTemporal,
} from "@/lib/comercial/score"
import { DEFAULT_FOLLOWUP_CONFIG, DEFAULT_SCORING_CONFIG } from "@/lib/settings"

const CFG = DEFAULT_SCORING_CONFIG
const FUP = DEFAULT_FOLLOWUP_CONFIG

describe("fitScore — perfil (0-100)", () => {
  it("soma área principal + origem + os 5 critérios genéricos", () => {
    const cfg = { ...CFG, areaJuridica: { ...CFG.areaJuridica, principais: ["trab"] } }
    const fit = fitScore(
      {
        area: "trab",
        origem: "indicacao",
        potencialFinanceiro: "alto",
        urgenciaNivel: "alta",
        poderDecisao: "decisor",
        jurisdicao: "local",
        viabilidade: "alta",
      },
      cfg,
    )
    // 20 (área principal) + 15 (indicação) + 25 + 15 + 10 + 10 + 5 = 100
    expect(fit).toBe(100)
  })

  it("área secundária e área fora de escopo pontuam diferente", () => {
    const cfg = { ...CFG, areaJuridica: { ...CFG.areaJuridica, principais: ["trab"], secundarias: ["civ"] } }
    const perfilBase = {
      origem: null,
      potencialFinanceiro: null,
      urgenciaNivel: null,
      poderDecisao: null,
      jurisdicao: null,
      viabilidade: null,
    }
    expect(fitScore({ ...perfilBase, area: "civ" }, cfg)).toBe(12) // secundária
    expect(fitScore({ ...perfilBase, area: "outra" }, cfg)).toBe(0) // fora (pontosFora default 0)
  })

  it("campo de perfil ausente (null) soma 0 pontos — não é tratado como pior opção", () => {
    const fit = fitScore(
      { area: null, origem: null, potencialFinanceiro: null, urgenciaNivel: null, poderDecisao: null, jurisdicao: null, viabilidade: null },
      CFG,
    )
    expect(fit).toBe(0)
  })

  it("clampa em 100 mesmo se a config somar mais", () => {
    const cfg = {
      ...CFG,
      areaJuridica: { ...CFG.areaJuridica, principais: ["trab"] },
      criterios: CFG.criterios.map((c) => ({ ...c, opcoes: c.opcoes.map((o) => ({ ...o, pontos: 100 })) })),
    }
    const fit = fitScore(
      { area: "trab", origem: "indicacao", potencialFinanceiro: "alto", urgenciaNivel: "alta", poderDecisao: "decisor", jurisdicao: "local", viabilidade: "alta" },
      cfg,
    )
    expect(fit).toBe(100)
  })

  it("chave de opção desconhecida (config removeu a opção) pontua 0", () => {
    const fit = fitScore(
      { area: null, origem: null, potencialFinanceiro: "chave-removida", urgenciaNivel: null, poderDecisao: null, jurisdicao: null, viabilidade: null },
      CFG,
    )
    expect(fit).toBe(0)
  })
})

describe("engajamentoScore — acumulado por evento (0-100, clamp a cada passo)", () => {
  it("acumula sinais explícitos em ordem cronológica", () => {
    const eng = engajamentoScore(
      [
        { sinais: ["iniciou_contato_inbound"], resultado: null, ocorreuEm: "2026-01-01T10:00:00Z" }, // +15
        { sinais: ["compareceu_reuniao"], resultado: null, ocorreuEm: "2026-01-02T10:00:00Z" }, // +20
      ],
      CFG,
    )
    expect(eng).toBe(35)
  })

  it("resultado classificado mapeia para o sinal reservado correspondente", () => {
    const eng = engajamentoScore([{ sinais: [], resultado: "sem_resposta", ocorreuEm: "2026-01-01T00:00:00Z" }], CFG)
    expect(eng).toBe(0) // clamp: 0 + (-10) → 0
  })

  it("resultado texto-livre legado (fora do enum) é ignorado", () => {
    const eng = engajamentoScore(
      [
        { sinais: ["iniciou_contato_inbound"], resultado: null, ocorreuEm: "2026-01-01T00:00:00Z" },
        { sinais: [], resultado: "ligou e disse que ia pensar", ocorreuEm: "2026-01-02T00:00:00Z" },
      ],
      CFG,
    )
    expect(eng).toBe(15)
  })

  it("clampa em 100 mesmo acumulando muitos sinais positivos", () => {
    const atividades = Array.from({ length: 10 }, (_, i) => ({
      sinais: ["compareceu_reuniao"],
      resultado: null,
      ocorreuEm: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }))
    expect(engajamentoScore(atividades, CFG)).toBe(100)
  })

  it("clampa em 0 (nunca fica negativo) mesmo com muitos sinais negativos", () => {
    const atividades = Array.from({ length: 5 }, (_, i) => ({
      sinais: ["no_show"],
      resultado: null,
      ocorreuEm: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }))
    expect(engajamentoScore(atividades, CFG)).toBe(0)
  })
})

describe("estadoLead — matriz Fit × Engajamento (A/B/C/D)", () => {
  const limiares = { fitQualificado: 60, engajamentoQuente: 50 }
  it("classifica as 4 fronteiras corretamente (>= no limiar, não >)", () => {
    expect(estadoLead(60, 50, limiares)).toBe("A") // Quente: exatamente no limiar
    expect(estadoLead(60, 49, limiares)).toBe("B") // Morno
    expect(estadoLead(59, 50, limiares)).toBe("C") // Frio
    expect(estadoLead(59, 49, limiares)).toBe("D") // Desqualificado
  })
  it("ESTADO_META tem label e tom para os 4 estados", () => {
    expect(ESTADO_META.A.label).toBe("Quente")
    expect(ESTADO_META.D.tom).toBe("neg")
  })
})

describe("urgenciaTemporal — rampa até o horizonte, 100 quando vencido", () => {
  it("null → 0 (sem follow-up definido)", () => {
    expect(urgenciaTemporal(null, "2026-01-10", 7)).toBe(0)
  })
  it("vencido (no passado) → 100", () => {
    expect(urgenciaTemporal("2026-01-01", "2026-01-10", 7)).toBe(100)
  })
  it("rampa linear dentro do horizonte", () => {
    // 7 dias de horizonte; faltam 7 dias → 0%; faltam 0 dias → 100% (tratado como vencido)
    expect(urgenciaTemporal("2026-01-17", "2026-01-10", 7)).toBe(0)
    expect(urgenciaTemporal("2026-01-13", "2026-01-10", 7)).toBeCloseTo(57, 0) // faltam ~3 dias de 7
  })
})

describe("prioridadeLead — média ponderada de fit/engajamento/urgência", () => {
  it("aplica os pesos configurados", () => {
    // 40/30/30 default
    expect(prioridadeLead(100, 0, 0, FUP.prioridade)).toBe(40)
    expect(prioridadeLead(0, 100, 0, FUP.prioridade)).toBe(30)
    expect(prioridadeLead(0, 0, 100, FUP.prioridade)).toBe(30)
    expect(prioridadeLead(100, 100, 100, FUP.prioridade)).toBe(100)
  })
})

describe("proximoToque — sugestão de cadência (data + canais)", () => {
  it("sugere o 1º toque na âncora quando nenhum toque foi feito", () => {
    const t = proximoToque(FUP.cadencia, 0, "2026-01-01T00:00:00.000Z", "2026-01-01")
    expect(t?.numero).toBe(1)
    expect(t?.canais).toEqual(["ligacao", "whatsapp"])
  })
  it("adianta para hoje quando a data calculada já passou", () => {
    const t = proximoToque(FUP.cadencia, 1, "2026-01-01T00:00:00.000Z", "2026-06-01")
    expect(t?.numero).toBe(2)
    expect(new Date(t!.dataISO).toISOString().slice(0, 10)).toBe("2026-06-01")
  })
  it("retorna null quando a cadência já se esgotou", () => {
    const t = proximoToque(FUP.cadencia, FUP.cadencia.length, "2026-01-01T00:00:00.000Z", "2026-01-01")
    expect(t).toBeNull()
  })
})

describe("contarToques — nº de toques feitos (resiliente a lacunas)", () => {
  it("é o maior toqueNumero, não o length", () => {
    expect(contarToques([{ toqueNumero: 1 }, { toqueNumero: 3 }, { toqueNumero: null }])).toBe(3)
  })
  it("0 quando nenhuma atividade tem toqueNumero", () => {
    expect(contarToques([{ toqueNumero: null }])).toBe(0)
  })
})

describe("avaliarRegrasPerda — auto-perdido (sem_resposta consecutivas / fria acumulada)", () => {
  const regras = { semRespostaConsecutivas: 3, friasAcumuladas: 5 }
  it("3 sem_resposta consecutivas dispara perda por sem_resposta", () => {
    const at = ["sem_resposta", "sem_resposta", "sem_resposta"].map((r, i) => ({
      resultado: r,
      ocorreuEm: `2026-01-0${i + 1}`,
    }))
    expect(avaliarRegrasPerda(at, regras)).toEqual({ perder: true, motivo: "sem_resposta" })
  })
  it("uma 'positiva' no meio reseta a sequência de sem_resposta", () => {
    const at = [
      { resultado: "sem_resposta", ocorreuEm: "2026-01-01" },
      { resultado: "sem_resposta", ocorreuEm: "2026-01-02" },
      { resultado: "positiva", ocorreuEm: "2026-01-03" },
      { resultado: "sem_resposta", ocorreuEm: "2026-01-04" },
      { resultado: "sem_resposta", ocorreuEm: "2026-01-05" },
    ]
    expect(avaliarRegrasPerda(at, regras)).toBeNull()
  })
  it("5 'fria' acumuladas (não necessariamente consecutivas) dispara perda por desinteresse", () => {
    const at = [
      { resultado: "fria", ocorreuEm: "2026-01-01" },
      { resultado: "positiva", ocorreuEm: "2026-01-02" },
      { resultado: "fria", ocorreuEm: "2026-01-03" },
      { resultado: "fria", ocorreuEm: "2026-01-04" },
      { resultado: "fria", ocorreuEm: "2026-01-05" },
      { resultado: "fria", ocorreuEm: "2026-01-06" },
    ]
    expect(avaliarRegrasPerda(at, regras)).toEqual({ perder: true, motivo: "desinteresse" })
  })
  it("exatamente no limiar dispara (>=, não >)", () => {
    const at = ["sem_resposta", "sem_resposta"].map((r, i) => ({ resultado: r, ocorreuEm: `2026-01-0${i + 1}` }))
    expect(avaliarRegrasPerda(at, { semRespostaConsecutivas: 2, friasAcumuladas: 5 })).toEqual({
      perder: true,
      motivo: "sem_resposta",
    })
  })
  it("toques sem classificação (resultado null) são ignorados e não quebram nem contam", () => {
    const at = [
      { resultado: "sem_resposta", ocorreuEm: "2026-01-01" },
      { resultado: null, ocorreuEm: "2026-01-02" },
      { resultado: "sem_resposta", ocorreuEm: "2026-01-03" },
      { resultado: "sem_resposta", ocorreuEm: "2026-01-04" },
    ]
    expect(avaliarRegrasPerda(at, regras)).toEqual({ perder: true, motivo: "sem_resposta" })
  })
  it("nenhuma regra atingida → null", () => {
    const at = [{ resultado: "sem_resposta", ocorreuEm: "2026-01-01" }]
    expect(avaliarRegrasPerda(at, regras)).toBeNull()
  })
})

describe("parseSinais — parse seguro do JSON armazenado", () => {
  it("parseia um array de strings válido", () => {
    expect(parseSinais('["a","b"]')).toEqual(["a", "b"])
  })
  it("null/vazio/JSON inválido/não-array viram []", () => {
    expect(parseSinais(null)).toEqual([])
    expect(parseSinais("")).toEqual([])
    expect(parseSinais("{not json")).toEqual([])
    expect(parseSinais('{"a":1}')).toEqual([])
  })
})

describe("defaults — comercial.scoring", () => {
  it("o Fit máximo (todos os critérios no topo) soma 100", () => {
    const cfg = { ...CFG, areaJuridica: { ...CFG.areaJuridica, principais: ["x"] } }
    const fit = fitScore(
      { area: "x", origem: "indicacao", potencialFinanceiro: "alto", urgenciaNivel: "alta", poderDecisao: "decisor", jurisdicao: "local", viabilidade: "alta" },
      cfg,
    )
    expect(fit).toBe(100)
  })
})

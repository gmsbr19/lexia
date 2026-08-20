import { describe, expect, it } from "vitest"
import {
  alertasConfigSchema,
  DEFAULT_ALERTAS_CONFIG,
  DEFAULT_FUNIL_CONFIG,
  DEFAULT_VALORES_CONFIG,
  etapasOrfas,
  funilConfigSchema,
  valoresConfigSchema,
} from "@/lib/captacao/config"

describe("funilConfigSchema + etapasOrfas", () => {
  it("default: nenhuma etapa qualificada, reunião = tipo 'reuniao' + resultado 'positiva'", () => {
    expect(DEFAULT_FUNIL_CONFIG.etapasQualificado).toEqual([])
    expect(DEFAULT_FUNIL_CONFIG.reuniao).toEqual({ tipos: ["reuniao"], resultados: ["positiva"] })
  })

  it("etapasOrfas identifica chaves mapeadas que não existem mais no pipeline — nunca quebra, só avisa", () => {
    const cfg = funilConfigSchema.parse({ etapasQualificado: ["qualificado", "removida-do-pipeline"], reuniao: { tipos: [], resultados: [] } })
    expect(etapasOrfas(cfg, ["novo", "contato", "qualificado", "proposta"])).toEqual(["removida-do-pipeline"])
  })

  it("sem etapas órfãs quando todas as mapeadas ainda existem", () => {
    const cfg = funilConfigSchema.parse({ etapasQualificado: ["qualificado"], reuniao: { tipos: [], resultados: [] } })
    expect(etapasOrfas(cfg, ["novo", "qualificado"])).toEqual([])
  })
})

describe("valoresConfigSchema", () => {
  it("porEvento é parcial — nem todo evento precisa de regra de valor", () => {
    const parsed = valoresConfigSchema.parse({ porEvento: { contrato_assinado: { modo: "real" } } })
    expect(Object.keys(parsed.porEvento)).toEqual(["contrato_assinado"])
  })

  it("default é objeto vazio", () => {
    expect(DEFAULT_VALORES_CONFIG.porEvento).toEqual({})
  })

  it("modo default de uma regra é 'fixo'", () => {
    const parsed = valoresConfigSchema.parse({ porEvento: { lead_qualificado: {} } })
    expect(parsed.porEvento.lead_qualificado?.modo).toBe("fixo")
  })
})

describe("alertasConfigSchema", () => {
  it("default limiar 30%, janela 7 dias", () => {
    expect(DEFAULT_ALERTAS_CONFIG).toEqual({ semCliqueLimiarPct: 30, janelaDias: 7 })
  })

  it("rejeita limiar fora de 1–100", () => {
    expect(alertasConfigSchema.safeParse({ semCliqueLimiarPct: 0 }).success).toBe(false)
    expect(alertasConfigSchema.safeParse({ semCliqueLimiarPct: 101 }).success).toBe(false)
  })
})

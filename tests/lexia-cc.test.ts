import { describe, expect, it } from "vitest"
import { CC_FUNNEL, CC_FUNNEL_LABEL, CC_TONE, ccUrgency, pagamentoPct } from "@/components/lexia/cc/CcKit"
import { LEX_PACE, LEX_TONES, LEX_TONE_ORDER } from "@/lib/lexia/motion-data"

describe("ccUrgency", () => {
  it("sem prazo → neutro", () => {
    expect(ccUrgency(null)).toEqual({ tone: "neutral", label: "Sem prazo" })
    expect(ccUrgency(undefined)).toEqual({ tone: "neutral", label: "Sem prazo" })
  })

  it("vencido → crítico, singular/plural corretos (padrão: dias corridos)", () => {
    expect(ccUrgency(-1)).toEqual({ tone: "crit", label: "Venceu há 1 dia" })
    expect(ccUrgency(-3)).toEqual({ tone: "crit", label: "Venceu há 3 dias" })
  })

  it("vencido em dias ÚTEIS só quando explicitado (motor CPC já computou)", () => {
    expect(ccUrgency(-1, "uteis")).toEqual({ tone: "crit", label: "Venceu há 1 dia útil" })
    expect(ccUrgency(-3, "uteis")).toEqual({ tone: "crit", label: "Venceu há 3 dias úteis" })
  })

  it("vence hoje → crítico", () => {
    expect(ccUrgency(0)).toEqual({ tone: "crit", label: "Vence hoje" })
  })

  it("bandas: crítico ≤2, alerta ≤6, ok caso contrário", () => {
    expect(ccUrgency(2).tone).toBe("crit")
    expect(ccUrgency(3).tone).toBe("warn")
    expect(ccUrgency(6).tone).toBe("warn")
    expect(ccUrgency(7).tone).toBe("ok")
  })

  it("nunca rotula dias corridos como 'úteis' (precisão jurídica)", () => {
    expect(ccUrgency(3).label).not.toContain("útil")
    expect(ccUrgency(3, "uteis").label).toContain("úteis")
  })
})

describe("CC_TONE", () => {
  it("expõe os 5 tons semânticos (4 do app + dourado de IA)", () => {
    expect(Object.keys(CC_TONE).sort()).toEqual(["crit", "gold", "neutral", "ok", "warn"])
    for (const t of Object.values(CC_TONE)) {
      expect(t.fg).toMatch(/^var\(--/)
      expect(t.soft).toMatch(/^var\(--/)
    }
  })
})

describe("pagamentoPct", () => {
  it("calcula % pago arredondado", () => {
    expect(pagamentoPct(10_000, 5_000)).toBe(50)
    expect(pagamentoPct(10_000, 10_000)).toBe(100)
    expect(pagamentoPct(10_000, 0)).toBe(0)
    expect(pagamentoPct(3, 1)).toBe(33) // arredonda 33.33
  })

  it("total zero não gera NaN/Infinity", () => {
    expect(pagamentoPct(0, 0)).toBe(0)
  })
})

describe("CC_FUNNEL", () => {
  it("tem as 5 etapas na ordem da jornada", () => {
    expect(CC_FUNNEL).toEqual(["novo", "contato", "qualificado", "proposta", "ganho"])
  })

  it("todo estágio (incl. perdido) tem rótulo PT-BR", () => {
    for (const s of [...CC_FUNNEL, "perdido" as const]) {
      expect(CC_FUNNEL_LABEL[s].length).toBeGreaterThan(0)
    }
  })
})

describe("motion-data (LEX_TONES/LEX_PACE)", () => {
  it("cobre as 4 personas na mesma ordem de preferencias-core.LexiaPersona", () => {
    expect(LEX_TONE_ORDER).toEqual(["senior", "cordial", "analista", "custom"])
    for (const tone of LEX_TONE_ORDER) {
      expect(LEX_TONES[tone].words.length).toBeGreaterThan(0)
      expect(LEX_TONES[tone].icons.length).toBeGreaterThan(0)
    }
  })

  it("3 ritmos com balanced entre calm e snappy", () => {
    expect(Object.keys(LEX_PACE).sort()).toEqual(["balanced", "calm", "snappy"])
    expect(LEX_PACE.snappy.word).toBeLessThan(LEX_PACE.balanced.word)
    expect(LEX_PACE.balanced.word).toBeLessThan(LEX_PACE.calm.word)
  })
})

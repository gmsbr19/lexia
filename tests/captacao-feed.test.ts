import { describe, expect, it } from "vitest"
import {
  elegivelParaAjuste,
  elegivelParaConversao,
  formatarDataHoraFeed,
  gerarAdjustmentsCsv,
  gerarConversionsCsv,
  JANELA_CONVERSOES_DIAS,
  type LinhaAjuste,
  type LinhaConversao,
} from "@/lib/captacao/feed"

describe("JANELA_CONVERSOES_DIAS", () => {
  it("é 90 — regra do Google, não configurável", () => {
    expect(JANELA_CONVERSOES_DIAS).toBe(90)
  })
})

describe("formatarDataHoraFeed", () => {
  it("converte UTC para o horário de parede de São Paulo (UTC-3) e anexa -03:00", () => {
    // 2026-08-19T13:22:05Z → 10:22:05 em São Paulo
    expect(formatarDataHoraFeed(new Date("2026-08-19T13:22:05.000Z"))).toBe("2026-08-19 10:22:05-03:00")
  })

  it("cruza a virada do dia corretamente (meia-noite UTC → 21h do dia anterior em SP)", () => {
    expect(formatarDataHoraFeed(new Date("2026-08-19T00:30:00.000Z"))).toBe("2026-08-18 21:30:00-03:00")
  })

  it("é independente do fuso do processo Node (usa getUTC* internamente)", () => {
    // mesma instância de Date, mesma saída, não importa o TZ do runner
    const d = new Date("2026-01-01T03:00:00.000Z")
    expect(formatarDataHoraFeed(d)).toBe("2026-01-01 00:00:00-03:00")
  })
})

const AGORA = new Date("2026-08-19T12:00:00.000Z")
const diasAtras = (n: number) => new Date(AGORA.getTime() - n * 86_400_000)

describe("elegivelParaConversao — as 3 regras de exclusão, nada além disso", () => {
  const base: LinhaConversao = { gclid: "g1", tipo: "lead_qualificado", ocorreuEm: diasAtras(1), valorCents: 1000, moeda: "BRL", status: "pendente" }

  it("elegível: tem gclid, dentro da janela, não descartado", () => {
    expect(elegivelParaConversao(base, AGORA)).toBe(true)
  })

  it("exclui sem gclid", () => {
    expect(elegivelParaConversao({ ...base, gclid: null }, AGORA)).toBe(false)
  })

  it("exclui fora da janela de 90 dias", () => {
    expect(elegivelParaConversao({ ...base, ocorreuEm: diasAtras(91) }, AGORA)).toBe(false)
  })

  it("exatamente 90 dias ainda é elegível (fronteira inclusiva)", () => {
    expect(elegivelParaConversao({ ...base, ocorreuEm: diasAtras(90) }, AGORA)).toBe(true)
  })

  it("exclui status='descartado'", () => {
    expect(elegivelParaConversao({ ...base, status: "descartado" }, AGORA)).toBe(false)
  })

  it("NÃO exclui por qualquer outro motivo — status desconhecido/pendente passa", () => {
    expect(elegivelParaConversao({ ...base, status: "pendente" }, AGORA)).toBe(true)
  })
})

describe("gerarConversionsCsv", () => {
  it("primeira linha é o Parameters:TimeZone, segunda é o cabeçalho exato", () => {
    const csv = gerarConversionsCsv([], AGORA)
    const linhas = csv.split("\r\n")
    expect(linhas[0]).toBe("Parameters:TimeZone=America/Sao_Paulo")
    expect(linhas[1]).toBe('"Google Click ID","Conversion Name","Conversion Time","Conversion Value","Conversion Currency"')
  })

  it("o nome da ação vem da constante fixa (NCM Lead Qualificado), não do tipo cru", () => {
    const csv = gerarConversionsCsv([{ gclid: "g1", tipo: "lead_qualificado", ocorreuEm: diasAtras(1), valorCents: 50000, moeda: "BRL", status: "pendente" }], AGORA)
    expect(csv).toContain("NCM Lead Qualificado")
  })

  it("valor em unidade decimal (não centavos) com 2 casas", () => {
    const csv = gerarConversionsCsv([{ gclid: "g1", tipo: "contrato_assinado", ocorreuEm: diasAtras(1), valorCents: 123456, moeda: "BRL", status: "pendente" }], AGORA)
    expect(csv).toContain("1234.56")
  })

  it("reinclui TODAS as linhas da janela a cada geração — não só as 'novas' (não existe esse conceito)", () => {
    const linhas: LinhaConversao[] = [
      { gclid: "g1", tipo: "formulario_enviado", ocorreuEm: diasAtras(80), valorCents: 0, moeda: "BRL", status: "pendente" },
      { gclid: "g2", tipo: "lead_qualificado", ocorreuEm: diasAtras(1), valorCents: 0, moeda: "BRL", status: "pendente" },
    ]
    const csv1 = gerarConversionsCsv(linhas, AGORA)
    const csv2 = gerarConversionsCsv(linhas, AGORA)
    expect(csv1).toBe(csv2) // regenerado do zero, sempre igual dado o mesmo estado
    expect(csv1.split("\r\n")).toHaveLength(4) // TimeZone + header + 2 linhas
  })

  it("neutraliza injeção de fórmula num gclid malicioso", () => {
    const csv = gerarConversionsCsv([{ gclid: "=cmd|'/c calc'!A1", tipo: "lead_qualificado", ocorreuEm: diasAtras(1), valorCents: 0, moeda: "BRL", status: "pendente" }], AGORA)
    expect(csv).toContain("'=cmd")
  })
})

describe("gerarAdjustmentsCsv", () => {
  const ORIGINAL: Omit<LinhaAjuste, "tipoAjuste" | "novoValorCents"> = {
    gclid: "g1",
    tipoAcao: "contrato_assinado",
    ocorreuEmOriginal: diasAtras(10),
    criadoEm: diasAtras(1),
    moeda: "BRL",
    statusEventoOriginal: "pendente",
  }

  it("cabeçalho exato com as 7 colunas", () => {
    const csv = gerarAdjustmentsCsv([], AGORA)
    expect(csv.split("\r\n")[1]).toBe(
      '"Google Click ID","Conversion Name","Conversion Time","Adjustment Type","Adjustment Time","New Conversion Value","New Currency"',
    )
  })

  it("RETRACT: colunas de novo valor ficam vazias (mas quotadas, como o resto da linha)", () => {
    const csv = gerarAdjustmentsCsv([{ ...ORIGINAL, tipoAjuste: "RETRACT", novoValorCents: null }], AGORA)
    const linha = csv.split("\r\n")[2]
    expect(linha.endsWith(',"",""')).toBe(true)
    expect(linha).toContain("RETRACT")
  })

  it("RESTATE: carrega o novo valor (lido, nunca recalculado)", () => {
    const csv = gerarAdjustmentsCsv([{ ...ORIGINAL, tipoAjuste: "RESTATE", novoValorCents: 250000 }], AGORA)
    const linha = csv.split("\r\n")[2]
    expect(linha).toContain("RESTATE")
    expect(linha).toContain("2500.00")
  })

  it("usa o horário ORIGINAL da conversão (Conversion Time), não o do ajuste", () => {
    const csv = gerarAdjustmentsCsv([{ ...ORIGINAL, tipoAjuste: "RETRACT", novoValorCents: null }], AGORA)
    expect(csv).toContain(formatarDataHoraFeed(ORIGINAL.ocorreuEmOriginal))
    expect(csv).toContain(formatarDataHoraFeed(ORIGINAL.criadoEm))
  })

  it("a janela de 90 dias é medida a partir do horário ORIGINAL, não do Adjustment Time", () => {
    const antigo: LinhaAjuste = { ...ORIGINAL, ocorreuEmOriginal: diasAtras(91), criadoEm: diasAtras(1), tipoAjuste: "RETRACT", novoValorCents: null }
    expect(elegivelParaAjuste(antigo, AGORA)).toBe(false)
  })

  it("exclui sem gclid e exclui evento original descartado", () => {
    expect(elegivelParaAjuste({ ...ORIGINAL, gclid: null, tipoAjuste: "RETRACT", novoValorCents: null }, AGORA)).toBe(false)
    expect(elegivelParaAjuste({ ...ORIGINAL, statusEventoOriginal: "descartado", tipoAjuste: "RETRACT", novoValorCents: null }, AGORA)).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import {
  calcularDvCnj,
  formatarCnj,
  montarCnj,
  parseCnj,
  validarCnj,
  validarCnpj,
  validarCpf,
  validarCpfCnpj,
} from "@/lib/processos/validacao"

describe("validarCnj — mod 97 (Res. CNJ 65/2008)", () => {
  it("accepts numbers with a correct check digit", () => {
    // DVs computed by calcularDvCnj (the seed mints CNJs this way).
    expect(validarCnj("1004567-14.2024.8.26.0100")).toBe(true)
    expect(validarCnj("5004321-30.2025.4.03.6100")).toBe(true)
    expect(validarCnj("0010234-89.2024.5.02.0011")).toBe(true)
  })

  it("accepts an unpunctuated 20-digit string", () => {
    expect(validarCnj("10045671420248260100")).toBe(true)
  })

  it("rejects a wrong check digit", () => {
    // The prompt's illustrative number used DV 12; the real DV is 14.
    expect(validarCnj("1004567-12.2024.8.26.0100")).toBe(false)
  })

  it("rejects malformed lengths and non-numeric junk", () => {
    expect(validarCnj("123")).toBe(false)
    expect(validarCnj("")).toBe(false)
    expect(validarCnj("not-a-cnj")).toBe(false)
    expect(validarCnj("100456714.2024.8.26.0100999")).toBe(false)
  })

  it("a tampered digit invalidates an otherwise-valid number", () => {
    const ok = montarCnj("7777777", "2026", "8", "26", "0100")
    expect(validarCnj(ok)).toBe(true)
    const tampered = ok.replace(/^7/, "8")
    expect(validarCnj(tampered)).toBe(false)
  })
})

describe("calcularDvCnj / montarCnj / parseCnj / formatarCnj", () => {
  it("calcularDvCnj reproduces the known DV", () => {
    expect(calcularDvCnj("1004567", "2024", "8", "26", "0100")).toBe("14")
  })

  it("montarCnj produces a formatted, valid number", () => {
    const n = montarCnj("1004567", "2024", "8", "26", "0100")
    expect(n).toBe("1004567-14.2024.8.26.0100")
    expect(validarCnj(n)).toBe(true)
  })

  it("parseCnj splits the segments", () => {
    expect(parseCnj("1004567-14.2024.8.26.0100")).toEqual({
      sequencial: "1004567",
      dv: "14",
      ano: "2024",
      segmento: "8",
      tribunal: "26",
      origem: "0100",
    })
    expect(parseCnj("short")).toBeNull()
  })

  it("formatarCnj masks raw digits and leaves bad input untouched", () => {
    expect(formatarCnj("10045671420248260100")).toBe("1004567-14.2024.8.26.0100")
    expect(formatarCnj("abc")).toBe("abc")
  })
})

describe("validarCpf", () => {
  it("accepts a valid CPF (punctuated or raw)", () => {
    expect(validarCpf("111.444.777-35")).toBe(true)
    expect(validarCpf("11144477735")).toBe(true)
  })
  it("rejects bad check digits, repeated digits and wrong lengths", () => {
    expect(validarCpf("111.444.777-00")).toBe(false)
    expect(validarCpf("111.111.111-11")).toBe(false)
    expect(validarCpf("123")).toBe(false)
    expect(validarCpf("")).toBe(false)
  })
})

describe("validarCnpj", () => {
  it("accepts a valid CNPJ (punctuated or raw)", () => {
    expect(validarCnpj("11.222.333/0001-81")).toBe(true)
    expect(validarCnpj("11222333000181")).toBe(true)
  })
  it("rejects bad check digits, repeated digits and wrong lengths", () => {
    expect(validarCnpj("11.222.333/0001-00")).toBe(false)
    expect(validarCnpj("11.111.111/1111-11")).toBe(false)
    expect(validarCnpj("11222333")).toBe(false)
  })
})

describe("validarCpfCnpj — dispatch by length", () => {
  it("routes 11 digits to CPF and 14 to CNPJ", () => {
    expect(validarCpfCnpj("111.444.777-35")).toBe(true)
    expect(validarCpfCnpj("11.222.333/0001-81")).toBe(true)
    expect(validarCpfCnpj("123")).toBe(false)
  })
})

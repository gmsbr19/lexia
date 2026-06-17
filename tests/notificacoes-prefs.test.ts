import { describe, expect, it } from "vitest"
import { parsePrefs, permiteApp, permiteEmail } from "@/lib/notificacoes/preferencias-core"
import { notifPrefsSchema } from "@/lib/notificacoes/schemas"
import { prioridadeRank } from "@/lib/notificacoes/types"

describe("notifPrefsSchema (PATCH parcial)", () => {
  it("aceita um patch parcial de módulos (o cliente manda só o que mexeu)", () => {
    expect(notifPrefsSchema.safeParse({ app: { tarefas: false } }).success).toBe(true)
    expect(notifPrefsSchema.safeParse({ email: { comercial: true }, emailMinPrioridade: "alta" }).success).toBe(true)
    expect(notifPrefsSchema.safeParse({}).success).toBe(true)
  })
  it("rejeita chave de módulo desconhecida e campo extra", () => {
    expect(notifPrefsSchema.safeParse({ app: { inexistente: true } }).success).toBe(false)
    expect(notifPrefsSchema.safeParse({ foo: 1 }).success).toBe(false)
  })
})

describe("parsePrefs", () => {
  it("tolera null e JSON inválido", () => {
    expect(parsePrefs(null)).toEqual({})
    expect(parsePrefs(undefined)).toEqual({})
    expect(parsePrefs("não é json")).toEqual({})
    expect(parsePrefs('{"navegador":true}')).toEqual({ navegador: true })
  })
})

describe("permiteApp (default LIGADO)", () => {
  it("liga por padrão; só desliga com false explícito", () => {
    expect(permiteApp({}, "comercial")).toBe(true)
    expect(permiteApp({ app: { comercial: false } }, "comercial")).toBe(false)
    expect(permiteApp({ app: { comercial: true } }, "comercial")).toBe(true)
    expect(permiteApp({}, null)).toBe(true)
  })
})

describe("permiteEmail (default DESLIGADO, opt-in + limiar)", () => {
  it("exige opt-in explícito do módulo", () => {
    expect(permiteEmail({}, "tarefas", "normal")).toBe(false)
    expect(permiteEmail({ email: { tarefas: true } }, "tarefas", "normal")).toBe(true)
    expect(permiteEmail({ email: { comercial: true } }, "tarefas", "normal")).toBe(false)
    expect(permiteEmail({ email: { sistema: true } }, null, "normal")).toBe(false)
  })

  it("respeita emailMinPrioridade", () => {
    const p = { email: { processos: true }, emailMinPrioridade: "alta" as const }
    expect(permiteEmail(p, "processos", "normal")).toBe(false)
    expect(permiteEmail(p, "processos", "alta")).toBe(true)
    expect(permiteEmail(p, "processos", "critica")).toBe(true)
  })
})

describe("prioridadeRank", () => {
  it("ordena baixa < normal < alta < critica", () => {
    expect(prioridadeRank("baixa")).toBeLessThan(prioridadeRank("normal"))
    expect(prioridadeRank("normal")).toBeLessThan(prioridadeRank("alta"))
    expect(prioridadeRank("alta")).toBeLessThan(prioridadeRank("critica"))
    expect(prioridadeRank(null)).toBe(prioridadeRank("normal"))
  })
})

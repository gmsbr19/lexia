import { describe, expect, it } from "vitest"
import { parseViewPrefs } from "@/lib/crm/view-prefs-core"

describe("parseViewPrefs", () => {
  it("returns {} for null/undefined/empty", () => {
    expect(parseViewPrefs(null)).toEqual({})
    expect(parseViewPrefs(undefined)).toEqual({})
    expect(parseViewPrefs("")).toEqual({})
  })

  it("returns {} for malformed JSON instead of throwing", () => {
    expect(parseViewPrefs("{not json")).toEqual({})
  })

  it("returns {} for valid JSON that isn't an object", () => {
    expect(parseViewPrefs("42")).toEqual({})
    expect(parseViewPrefs('"a string"')).toEqual({})
    expect(parseViewPrefs("null")).toEqual({})
  })

  it("preserves per-gridId keys as stored", () => {
    const stored = {
      oportunidades: { visibleColumns: null, filters: { combinator: "AND", rules: [] }, sort: { key: "nome", dir: "asc" }, groupBy: "etapa" },
    }
    expect(parseViewPrefs(JSON.stringify(stored))).toEqual(stored)
  })

  it("editing one gridId's view does not require the other to be present", () => {
    const stored = { contatos: { visibleColumns: ["nome"], filters: { combinator: "OR", rules: [] }, sort: null, groupBy: null } }
    const parsed = parseViewPrefs(JSON.stringify(stored))
    expect(parsed.oportunidades).toBeUndefined()
    expect(parsed.contatos).toEqual(stored.contatos)
  })
})

import { describe, expect, it } from "vitest"
import { parseViewPrefs } from "@/lib/crm/view-prefs-core"

const mkState = () => ({
  filters: { type: "group", id: "root", combinator: "E", children: [] },
  sort: [], groupCols: [], collapseDefault: false,
  hidden: [], order: ["nome"], frozen: false, density: "comfortable", mode: "tabela",
})
const mkStore = (activeId = "v-all") => ({
  activeId,
  views: [{ id: "v-all", name: "Todos", icon: "list", isDefault: true, state: mkState() }],
})

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

  it("preserves a valid multi-view store per gridId", () => {
    const stored = { oportunidades: mkStore() }
    expect(parseViewPrefs(JSON.stringify(stored))).toEqual(stored)
  })

  it("editing one gridId's store does not require the other to be present", () => {
    const stored = { contatos: mkStore("c-all") }
    const parsed = parseViewPrefs(JSON.stringify(stored))
    expect(parsed.oportunidades).toBeUndefined()
    expect(parsed.contatos).toEqual(stored.contatos)
  })

  it("discards entries that aren't a valid store (e.g. legacy single-view blobs)", () => {
    const legacy = { oportunidades: { visibleColumns: null, filters: { combinator: "AND", rules: [] }, sort: null, groupBy: "etapa" } }
    expect(parseViewPrefs(JSON.stringify(legacy))).toEqual({})
  })
})

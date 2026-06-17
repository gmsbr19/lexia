import { describe, expect, it } from "vitest"
import { paginated, parseListQuery } from "@/lib/list"

const opts = { sortable: ["nome", "createdAt", "dataFatal"], defaultSort: "createdAt" } as const

describe("parseListQuery", () => {
  it("applies sane defaults when no params are given", () => {
    const q = parseListQuery(new URLSearchParams(), opts)
    expect(q).toEqual({ page: 1, pageSize: 20, sort: "createdAt", order: "desc", skip: 0, take: 20 })
  })

  it("computes skip/take from page + pageSize", () => {
    const q = parseListQuery(new URLSearchParams("page=3&pageSize=25"), opts)
    expect(q.skip).toBe(50)
    expect(q.take).toBe(25)
  })

  it("clamps pageSize to maxPageSize and page to >= 1", () => {
    const q = parseListQuery(new URLSearchParams("page=0&pageSize=9999"), opts)
    expect(q.page).toBe(1)
    expect(q.pageSize).toBe(100) // default max
  })

  it("falls back to defaultSort for a non-whitelisted column", () => {
    expect(parseListQuery(new URLSearchParams("sort=senha"), opts).sort).toBe("createdAt")
    expect(parseListQuery(new URLSearchParams("sort=dataFatal"), opts).sort).toBe("dataFatal")
  })

  it("parses order and defaults invalid values to desc", () => {
    expect(parseListQuery(new URLSearchParams("order=asc"), opts).order).toBe("asc")
    expect(parseListQuery(new URLSearchParams("order=sideways"), opts).order).toBe("desc")
  })

  it("accepts a plain record param source", () => {
    const q = parseListQuery({ page: "2", pageSize: "10", sort: "nome", order: "asc" }, opts)
    expect(q).toEqual({ page: 2, pageSize: 10, sort: "nome", order: "asc", skip: 10, take: 10 })
  })

  it("ignores non-integer page/pageSize", () => {
    const q = parseListQuery(new URLSearchParams("page=abc&pageSize=1.5"), opts)
    expect(q.page).toBe(1)
    expect(q.pageSize).toBe(20)
  })
})

describe("paginated", () => {
  it("wraps items + total into the envelope", () => {
    const q = parseListQuery(new URLSearchParams("page=2&pageSize=5"), opts)
    expect(paginated(["a", "b"], 42, q)).toEqual({ items: ["a", "b"], total: 42, page: 2, pageSize: 5 })
  })
})

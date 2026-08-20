import { describe, expect, it } from "vitest"
import {
  addDays,
  addMonths,
  compareISO,
  dayOfMonth,
  isValidISO,
  isoOf,
  lastDayOfMonth,
  nextWeekday,
  parseISO,
  weekdayOf,
} from "@/lib/datas/util"

describe("addDays", () => {
  it("adds and subtracts days across month/year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01")
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31")
    expect(addDays("2026-07-24", 0)).toBe("2026-07-24")
  })
})

describe("addMonths", () => {
  it("keeps the day-of-month when the target month is long enough", () => {
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15")
  })
  it("clamps to the last day of a shorter target month (Jan 31 -> Feb 28)", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28")
  })
  it("clamps into a leap February correctly (2028 is a leap year)", () => {
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29")
  })
  it("supports negative deltas", () => {
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28")
  })
  it("supports multi-year jumps", () => {
    expect(addMonths("2026-01-15", 14)).toBe("2027-03-15")
  })
})

describe("weekdayOf / dayOfMonth", () => {
  it("returns the JS getDay() convention (0=domingo..6=sábado)", () => {
    expect(weekdayOf("2026-07-19")).toBe(0) // domingo
    expect(weekdayOf("2026-07-20")).toBe(1) // segunda
    expect(weekdayOf("2026-07-25")).toBe(6) // sábado
  })
  it("returns the calendar day", () => {
    expect(dayOfMonth("2026-07-24")).toBe(24)
  })
})

describe("compareISO", () => {
  it("compares chronologically and returns -1/0/1", () => {
    expect(compareISO("2026-01-01", "2026-01-02")).toBe(-1)
    expect(compareISO("2026-01-02", "2026-01-01")).toBe(1)
    expect(compareISO("2026-01-01", "2026-01-01")).toBe(0)
  })
})

describe("isValidISO", () => {
  it("accepts real calendar dates", () => {
    expect(isValidISO("2026-07-24")).toBe(true)
    expect(isValidISO("2028-02-29")).toBe(true) // leap year
  })
  it("rejects calendar-invalid dates", () => {
    expect(isValidISO("2026-02-30")).toBe(false)
    expect(isValidISO("2026-02-29")).toBe(false) // 2026 is not a leap year
    expect(isValidISO("2026-13-01")).toBe(false)
    expect(isValidISO("2026-00-10")).toBe(false)
  })
  it("rejects malformed strings", () => {
    expect(isValidISO("2026/07/24")).toBe(false)
    expect(isValidISO("not-a-date")).toBe(false)
    expect(isValidISO("")).toBe(false)
    expect(isValidISO("2026-7-24")).toBe(false)
  })
})

describe("nextWeekday", () => {
  it("advances to the next occurrence strictly after the given date by default (jumps +7, never +0)", () => {
    // 2026-07-20 is a Monday (weekday 1)
    expect(nextWeekday("2026-07-20", 1)).toBe("2026-07-27")
    expect(nextWeekday("2026-07-20", 3)).toBe("2026-07-22") // next Wednesday
  })
  it("can allow returning the same day when permitirHoje is true", () => {
    expect(nextWeekday("2026-07-20", 1, true)).toBe("2026-07-20")
  })
})

describe("isoOf / parseISO / lastDayOfMonth", () => {
  it("round-trips", () => {
    expect(isoOf(2026, 6, 24)).toBe("2026-07-24") // m0=6 -> julho
    expect(parseISO("2026-07-24").getDate()).toBe(24)
  })
  it("computes the last day of a month", () => {
    expect(lastDayOfMonth(2026, 1)).toBe(28) // fevereiro, não bissexto
    expect(lastDayOfMonth(2028, 1)).toBe(29) // bissexto
    expect(lastDayOfMonth(2026, 0)).toBe(31) // janeiro
  })
})

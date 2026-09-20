import {describe, expect, it} from "vitest"

import {ALL_TENSES, ASPECTS, TENSE_INFO, TIMES, tenseName} from "./tenses"
import type {Tense} from "./tenses"

describe("ALL_TENSES", () => {
  it("TC-2 lists the 12 grid tenses row-major, then past.future", () => {
    const grid: Tense[] = []
    for (const time of TIMES) {
      for (const aspect of ASPECTS) {
        grid.push(`${time}.${aspect}` as Tense)
      }
    }
    expect(ALL_TENSES).toEqual([...grid, "past.future"])
  })
})

describe("tenseName", () => {
  it("TC-2 names past.perfcont Past Perfect Continuous and past.future Future in the Past", () => {
    expect(tenseName("past.perfcont")).toBe("Past Perfect Continuous")
    expect(tenseName("past.future")).toBe("Future in the Past")
  })
})

describe("TENSE_INFO", () => {
  it("TC-2 gives every tense a non-empty formula, gloss and markers", () => {
    for (const tense of ALL_TENSES) {
      const info = TENSE_INFO[tense]
      expect(info.formula.length).toBeGreaterThan(0)
      expect(info.gloss.length).toBeGreaterThan(0)
      expect(info.markers.length).toBeGreaterThan(0)
    }
  })

  it("TC-2 gives past.future the formula would + V", () => {
    expect(TENSE_INFO["past.future"].formula).toBe("would + V")
  })
})

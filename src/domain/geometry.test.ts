import {describe, expect, it} from "vitest"

import {SNAP_PX, canonical, classify, snap} from "./geometry"
import type {ActionKind} from "./geometry"
import {ALL_TENSES} from "./tenses"

const point = (x: number, kind: ActionKind = "once") => ({s: x, e: x, kind})
const range = (s: number, e: number, kind: ActionKind = "once") => ({s, e, kind})

describe("classify", () => {
  it("TC-4 classifies actions around a moment in the past", () => {
    expect(classify(point(-300), -300, 12).tense).toBe("past.simple")
    expect(classify(range(-400, -200), -300, 12).tense).toBe("past.cont")
    expect(classify(range(-400, -200, "habit"), -300, 12).tense).toBe("past.simple")
    expect(classify(point(-450), -300, 12).tense).toBe("past.perf")
    expect(classify(range(-500, -400), -300, 12).tense).toBe("past.perf")
    expect(classify(range(-500, -300), -300, 12).tense).toBe("past.perfcont")
    expect(classify(range(-300, -200), -300, 12).tense).toBe("past.simple")
    const after = classify(point(-150), -300, 12)
    expect(after.tense).toBe("past.future")
    expect(after.aspect).toBe("after")
  })

  it("TC-4 classifies actions around a moment on now", () => {
    expect(classify(point(0), 0, 12).tense).toBe("present.simple")
    expect(classify(range(-100, 100), 0, 12).tense).toBe("present.cont")
    expect(classify(point(-100), 0, 12).tense).toBe("present.perf")
    expect(classify(range(-200, 0), 0, 12).tense).toBe("present.perfcont")
    const after = classify(point(100), 0, 12)
    expect(after.tense).toBe("future.simple")
    expect(after.aspect).toBe("after")
  })

  it("TC-4 classifies actions around a moment in the future", () => {
    expect(classify(point(300), 300, 12).tense).toBe("future.simple")
    const after = classify(point(400), 300, 12)
    expect(after.tense).toBe("future.simple")
    expect(after.aspect).toBe("after")
    expect(classify(point(200), 300, 12).tense).toBe("future.perf")
    expect(classify(range(100, 300), 300, 12).tense).toBe("future.perfcont")
    expect(classify(range(200, 400), 300, 12).tense).toBe("future.cont")
  })

  it("TC-4 treats a moment of 10 as present, not future", () => {
    expect(classify(point(10), 10, 12).tense).toBe("present.simple")
  })

  it("TC-4 classifies an action the same with its ends swapped", () => {
    const forward = classify(range(-400, -200), -300, 12)
    const backward = classify(range(-200, -400), -300, 12)
    expect(backward).toEqual(forward)
  })
})

describe("classify with tol from k", () => {
  it("TC-5 gives present.perf at k = 1 and present.simple at k = 0.5", () => {
    expect(classify(point(-20), 0, SNAP_PX / 1).tense).toBe("present.perf")
    expect(classify(point(-20), 0, SNAP_PX / 0.5).tense).toBe("present.simple")
  })
})

describe("snap", () => {
  it("TC-5 snaps to an anchor within SNAP_PX / k and reports null otherwise", () => {
    expect(snap(-290, [-300, 0], 1)).toEqual({x: -300, at: -300})
    expect(snap(-280, [-300, 0], 1)).toEqual({x: -280, at: null})
    expect(snap(-280, [-300, 0], 0.5)).toEqual({x: -300, at: -300})
  })

  it("TC-5 lets the first listed anchor win when two are in range", () => {
    expect(snap(1, [-5, 5], 1)).toEqual({x: -5, at: -5})
  })
})

describe("canonical", () => {
  it("TC-6 classifies its own canonical picture as its tense, for every tense and kind", () => {
    for (const tense of ALL_TENSES) {
      for (const kind of ["once", "habit"] as const) {
        const placement = canonical(tense, kind)
        expect(classify(placement, placement.moment, 12).tense).toBe(tense)
      }
    }
  })

  it("TC-6 gives present.simple the habit shape and keeps past.cont as once", () => {
    expect(canonical("present.simple", "once").kind).toBe("habit")
    expect(canonical("past.cont", "habit").kind).toBe("once")
  })
})

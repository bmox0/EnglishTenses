import {describe, expect, it} from "vitest"

import {buildChoices} from "./choices"
import {formsOf} from "./forms"
import {ALL_TENSES} from "./tenses"

import type {Person, Verb} from "./forms"
import type {Sentence} from "./sentences"

const cook: Verb = {v1: "cook", s: "cooks", v2: "cooked", v3: "cooked", ing: "cooking"}
const read: Verb = {v1: "read", s: "reads", v2: "read", v3: "read", ing: "reading"}

function seeded(seed: number): () => number {
  let state = seed + 1
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

const sentence = (tense: Sentence["tense"], verb: string, person: Person): Sentence => ({
  id: "s",
  tense,
  en: "___",
  verb,
  person,
  ru: "ru",
  why: "why",
  kind: "once",
  moment: tense.startsWith("present.") ? "now" : "she called",
})

describe("buildChoices", () => {
  it("TC-23 gives 4 distinct options including the expected form, for every tense and both verbs", () => {
    for (const [verb, person] of [
      [cook, "he"],
      [read, "I"],
    ] as const) {
      for (const tense of ALL_TENSES) {
        const expected = formsOf(verb, person)[tense]
        for (let seed = 0; seed < 10; seed++) {
          const options = buildChoices(sentence(tense, verb.v1, person), verb, seeded(seed))
          expect(new Set(options).size).toBe(4)
          expect(options).toContain(expected)
        }
      }
    }
  })

  it("TC-23 gives the same result for the same seed", () => {
    const s = sentence("past.perf", "cook", "he")
    const a = buildChoices(s, cook, seeded(3))
    const b = buildChoices(s, cook, seeded(3))
    expect(a).toEqual(b)
  })

  it("TC-23 varies the right option's position across seeds", () => {
    const s = sentence("past.perf", "cook", "he")
    const expected = formsOf(cook, "he")["past.perf"]
    const positions = new Set<number>()
    for (let seed = 0; seed < 10; seed++) positions.add(buildChoices(s, cook, seeded(seed)).indexOf(expected))
    expect(positions.size).toBeGreaterThan(1)
  })

  it("TC-23 fills with neighbour forms when they give enough distinct options", () => {
    const s = sentence("past.perf", "cook", "he")
    const expected = formsOf(cook, "he")["past.perf"]
    const neighbourForms = new Set(
      ["past.simple", "past.cont", "past.perfcont", "present.perf", "future.perf"].map((t) => formsOf(cook, "he")[t as Sentence["tense"]]),
    )
    const options = buildChoices(s, cook, seeded(1))
    for (const option of options) if (option !== expected) expect(neighbourForms.has(option)).toBe(true)
  })
})

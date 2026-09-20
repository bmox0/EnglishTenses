import {describe, expect, it} from "vitest"

import {checkForm} from "./answer"

import type {Verb} from "./forms"
import type {Sentence} from "./sentences"

const cook: Verb = {v1: "cook", s: "cooks", v2: "cooked", v3: "cooked", ing: "cooking"}
const read: Verb = {v1: "read", s: "reads", v2: "read", v3: "read", ing: "reading"}

const sentence = (overrides: Partial<Sentence>): Sentence => ({
  id: "s",
  tense: "past.perf",
  en: "He ___ dinner.",
  verb: "cook",
  person: "he",
  ru: "ru",
  why: "why",
  kind: "once",
  moment: "she called",
  ...overrides,
})

describe("checkForm", () => {
  const pastPerf = sentence({tense: "past.perf", verb: "cook", person: "he"})

  it("TC-22 accepts had cooked and its case, spacing and contracted variants as right", () => {
    for (const input of ["had cooked", " Had  Cooked ", "she'd cooked", "She had cooked", "’d cooked"]) {
      expect(checkForm(input, pastPerf, cook).verdict).toBe("right")
    }
  })

  it("TC-22 identifies a wrong tense for cooked, has cooked, would cook and 'd cook", () => {
    expect(checkForm("cooked", pastPerf, cook)).toMatchObject({verdict: "tense", identified: {tense: "past.simple"}})
    expect(checkForm("has cooked", pastPerf, cook)).toMatchObject({verdict: "tense", identified: {tense: "present.perf"}})
    expect(checkForm("would cook", pastPerf, cook)).toMatchObject({verdict: "tense", identified: {tense: "past.future"}})
    expect(checkForm("'d cook", pastPerf, cook)).toMatchObject({verdict: "tense", identified: {tense: "past.future"}})
  })

  it("TC-22 treats an empty or blank input as empty", () => {
    expect(checkForm("", pastPerf, cook).verdict).toBe("empty")
    expect(checkForm("   ", pastPerf, cook).verdict).toBe("empty")
  })

  it("TC-22 treats a typo as unknown", () => {
    expect(checkForm("had cookd", pastPerf, cook).verdict).toBe("unknown")
  })

  it("TC-22 flags a right tense typed for the wrong person as agreement", () => {
    const presentPerf = sentence({tense: "present.perf", verb: "cook", person: "he"})
    expect(checkForm("have cooked", presentPerf, cook).verdict).toBe("agreement")
    expect(checkForm("she's cooked", presentPerf, cook).verdict).toBe("right")
    expect(checkForm("'s cooking", presentPerf, cook)).toMatchObject({verdict: "tense", identified: {tense: "present.cont"}})
  })

  it("TC-22 accepts read as its own past simple for I", () => {
    const pastSimple = sentence({tense: "past.simple", verb: "read", person: "I"})
    expect(checkForm("read", pastSimple, read).verdict).toBe("right")
  })

  it("TC-22 accepts she's been cooking for present perfect continuous", () => {
    const presentPerfCont = sentence({tense: "present.perfcont", verb: "cook", person: "he"})
    expect(checkForm("she's been cooking", presentPerfCont, cook).verdict).toBe("right")
  })
})

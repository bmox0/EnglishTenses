import {describe, expect, it} from "vitest"

import type {Verb} from "./forms"
import {parseSentences, validateSentences, withForm} from "./sentences"
import type {Sentence} from "./sentences"

const verbs: ReadonlyMap<string, Verb> = new Map([["leave", {v1: "leave", s: "leaves", v2: "left", v3: "left", ing: "leaving"}]])

const base = {
  id: "past-perf-train",
  tense: "past.perf",
  en: "When we got to the station, the train ___.",
  verb: "leave",
  person: "he",
  ru: "Когда мы добрались до вокзала, поезд уже уехал.",
  why: "Действие завершилось раньше момента в прошлом — Past Perfect.",
  kind: "once",
  moment: "we got there",
}

const line = (overrides: Record<string, unknown> = {}) => JSON.stringify({...base, ...overrides})

describe("validateSentences", () => {
  it("TC-8 accepts a well-formed sentence", () => {
    expect(validateSentences(parseSentences(line()), verbs)).toEqual([])
  })

  it("TC-8 flags a duplicate id", () => {
    const sentences = parseSentences([line(), line()].join("\n"))
    const messages = validateSentences(sentences, verbs)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(/^sentence #2 \(past-perf-train\): /)
  })

  it("TC-8 flags an id that isn't lowercase-and-hyphens", () => {
    const messages = validateSentences(parseSentences(line({id: "Past_Perf"})), verbs)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(/^sentence #1 \(Past_Perf\): /)
  })

  it("TC-8 flags a tense outside ALL_TENSES", () => {
    const messages = validateSentences(parseSentences(line({tense: "past.perfect"})), verbs)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(/^sentence #1 \(past-perf-train\): /)
  })

  it("TC-8 flags an en with no gap", () => {
    const messages = validateSentences(parseSentences(line({en: "When we got to the station, the train left."})), verbs)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(/^sentence #1 \(past-perf-train\): /)
  })

  it("TC-8 flags an en with two gaps", () => {
    const messages = validateSentences(parseSentences(line({en: "When we got to the station, the train ___ ___."})), verbs)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(/^sentence #1 \(past-perf-train\): /)
  })

  it("TC-8 flags a verb that isn't in the verb list", () => {
    const messages = validateSentences(parseSentences(line({verb: "swim"})), verbs)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(/^sentence #1 \(past-perf-train\): /)
  })

  it("TC-8 flags a person outside I, he and they", () => {
    const messages = validateSentences(parseSentences(line({person: "she"})), verbs)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(/^sentence #1 \(past-perf-train\): /)
  })

  it("TC-8 flags an empty ru", () => {
    const messages = validateSentences(parseSentences(line({ru: ""})), verbs)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(/^sentence #1 \(past-perf-train\): /)
  })

  it("TC-8 flags an empty why", () => {
    const messages = validateSentences(parseSentences(line({why: ""})), verbs)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(/^sentence #1 \(past-perf-train\): /)
  })

  it("TC-8 flags an empty moment", () => {
    const messages = validateSentences(parseSentences(line({moment: ""})), verbs)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(/^sentence #1 \(past-perf-train\): /)
  })

  it("TC-8 flags a kind that isn't once or habit", () => {
    const messages = validateSentences(parseSentences(line({kind: "often"})), verbs)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatch(/^sentence #1 \(past-perf-train\): /)
  })

  it("TC-8 requires a present tense's moment to be now", () => {
    const messages = validateSentences(parseSentences(line({tense: "present.perf", en: "By now, she ___.", moment: "she called"})), verbs)
    expect(messages).toEqual(['sentence #1 (past-perf-train): moment must be "now" for a present tense and not "now" otherwise'])
  })

  it("TC-8 requires a non-present tense's moment not to be now", () => {
    const messages = validateSentences(parseSentences(line({moment: "now"})), verbs)
    expect(messages).toEqual(['sentence #1 (past-perf-train): moment must be "now" for a present tense and not "now" otherwise'])
  })

  it("TC-8 names the broken line", () => {
    expect(() => parseSentences([line(), line(), "{oops"].join("\n"), "extra.jsonl")).toThrow("extra.jsonl:3: invalid JSON")
  })
})

describe("withForm", () => {
  it("TC-10 splits the sentence around the gap and fills the form", () => {
    const sentence: Sentence = {
      id: "past-perf-train",
      tense: "past.perf",
      en: "When we got to the station, the train ___.",
      verb: "leave",
      person: "he",
      ru: "Когда мы добрались до вокзала, поезд уже уехал.",
      why: "Действие завершилось раньше момента в прошлом — Past Perfect.",
      kind: "once",
      moment: "we got there",
    }
    const verb: Verb = {v1: "leave", s: "leaves", v2: "left", v3: "left", ing: "leaving"}
    expect(withForm(sentence, verb)).toEqual({
      before: "When we got to the station, the train ",
      form: "had left",
      after: ".",
    })
  })
})

import {describe, expect, it} from "vitest"

import {MAX_PER_TENSE, QUIZ_SIZE, buildQuiz, remember} from "./quiz"
import {ALL_TENSES} from "./tenses"

import type {Sentence} from "./sentences"

function seeded(seed: number): () => number {
  let state = seed + 1
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

function sentenceOf(id: string, tense: Sentence["tense"]): Sentence {
  return {
    id,
    tense,
    en: "___",
    verb: "cook",
    person: "he",
    ru: "ru",
    why: "why",
    kind: "once",
    moment: tense.startsWith("present.") ? "now" : "she called",
  }
}

function bankOf(perTense: number): Sentence[] {
  const bank: Sentence[] = []
  for (const tense of ALL_TENSES) for (let i = 0; i < perTense; i++) bank.push(sentenceOf(`${tense}-${i}`, tense))
  return bank
}

describe("buildQuiz", () => {
  it("TC-24 gives 12 distinct questions with no tense more than twice, and the same seed gives the same quiz", () => {
    const bank = bankOf(2)
    const a = buildQuiz(bank, [], seeded(1))
    expect(a).toHaveLength(QUIZ_SIZE)
    expect(new Set(a.map((q) => q.sentence.id)).size).toBe(QUIZ_SIZE)
    const counts = new Map<string, number>()
    for (const q of a) counts.set(q.sentence.tense, (counts.get(q.sentence.tense) ?? 0) + 1)
    for (const count of counts.values()) expect(count).toBeLessThanOrEqual(MAX_PER_TENSE)

    const b = buildQuiz(bank, [], seeded(1))
    expect(b).toEqual(a)
  })

  it("TC-24 avoids every recent sentence when enough others exist", () => {
    const bank: Sentence[] = []
    for (let i = 0; i < 40; i++) bank.push(sentenceOf(`s${i}`, ALL_TENSES[i % ALL_TENSES.length] as Sentence["tense"]))
    const recent = bank.slice(0, 20).map((s) => s.id)
    const questions = buildQuiz(bank, recent, seeded(2))
    expect(questions.every((q) => !recent.includes(q.sentence.id))).toBe(true)
  })

  it("TC-24 takes the 6 not-recent sentences first, then the 6 oldest recent ones", () => {
    const notRecent: Sentence[] = []
    for (let i = 0; i < 6; i++) notRecent.push(sentenceOf(`fresh${i}`, ALL_TENSES[i] as Sentence["tense"]))
    const recentSentences: Sentence[] = []
    for (let i = 0; i < 10; i++) recentSentences.push(sentenceOf(`old${i}`, ALL_TENSES[(i + 6) % ALL_TENSES.length] as Sentence["tense"]))
    const bank = [...notRecent, ...recentSentences]
    const recent = recentSentences.map((s) => s.id)

    const questions = buildQuiz(bank, recent, seeded(3))
    const ids = questions.map((q) => q.sentence.id)
    expect(ids).toHaveLength(QUIZ_SIZE)
    expect(new Set(ids.filter((id) => id.startsWith("fresh")))).toEqual(new Set(notRecent.map((s) => s.id)))
    expect(ids.filter((id) => id.startsWith("old"))).toEqual(recentSentences.slice(0, 6).map((s) => s.id))
  })

  it("TC-24 fills the past.simple cap first, then goes past it to reach 12", () => {
    const pastSimple: Sentence[] = []
    for (let i = 0; i < 20; i++) pastSimple.push(sentenceOf(`ps${i}`, "past.simple"))
    const others = [sentenceOf("o1", "present.simple"), sentenceOf("o2", "future.simple")]
    const bank = [...pastSimple, ...others]

    const questions = buildQuiz(bank, [], seeded(4))
    expect(questions).toHaveLength(QUIZ_SIZE)
    expect(questions.filter((q) => q.sentence.tense === "past.simple")).toHaveLength(10)
    expect(questions.filter((q) => q.sentence.id === "o1")).toHaveLength(1)
    expect(questions.filter((q) => q.sentence.id === "o2")).toHaveLength(1)
  })

  it("TC-24 gives a shorter quiz for a bank smaller than 12", () => {
    const bank = bankOf(1).slice(0, 5)
    const questions = buildQuiz(bank, [], seeded(5))
    expect(questions).toHaveLength(5)
  })
})

describe("remember", () => {
  it("TC-24 moves the given ids to the end, trimmed to the newest 60", () => {
    expect(remember(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"])

    const long = Array.from({length: 55}, (_, i) => `old${i}`)
    const trimmed = remember(
      long,
      Array.from({length: 10}, (_, i) => `new${i}`),
    )
    expect(trimmed).toHaveLength(60)
    expect(trimmed.slice(-10)).toEqual(Array.from({length: 10}, (_, i) => `new${i}`))
  })
})

import {describe, expect, it} from "vitest"

import {formsOf} from "../domain/forms"
import {SNAP_PX, canonical, classify} from "../domain/geometry"
import {STORAGE_KEY} from "../domain/storage"
import {ALL_TENSES} from "../domain/tenses"
import {createQuiz} from "./quiz"

import type {Verb} from "../domain/forms"
import type {Sentence} from "../domain/sentences"
import type {KeyValueStore} from "../domain/storage"
import type {Tense} from "../domain/tenses"
import type {Quiz} from "./quiz"

/** A one-action scene guaranteed to classify as a different tense than `tense`, for testing a wrong timeline answer. */
function wrongSceneFor(tense: Tense) {
  const other: Tense = tense === "present.cont" ? "past.perf" : "present.cont"
  const placement = canonical(other, "once")
  return {moment: placement.moment, actions: [{id: 1, s: placement.s, e: placement.e, y: -90, kind: placement.kind}]}
}

function seeded(seed: number): () => number {
  let state = seed + 1
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

function memoryStore(): KeyValueStore & {data: Map<string, string>} {
  const data = new Map<string, string>()
  return {data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k)}
}

const cook: Verb = {v1: "cook", s: "cooks", v2: "cooked", v3: "cooked", ing: "cooking"}
const verbs: ReadonlyMap<string, Verb> = new Map([["cook", cook]])

function bankOf(): Sentence[] {
  const bank: Sentence[] = []
  for (const tense of ALL_TENSES) {
    for (const suffix of ["a", "b"]) {
      bank.push({
        id: `${tense}-${suffix}`,
        tense,
        en: "He ___ dinner.",
        verb: "cook",
        person: "he",
        ru: "ru",
        why: "why",
        kind: "once",
        moment: tense.startsWith("present.") ? "now" : "she called",
      })
    }
  }
  return bank
}

function setup(seed = 1) {
  const store = memoryStore()
  const quiz = createQuiz(bankOf(), verbs, store, seeded(seed))
  quiz.start()
  return {quiz, store}
}

/** Advances `quiz` (already started) to the next question of `type`, answering every question in between with a wrong timeline drag or an empty form. */
function skipTo(quiz: Quiz, type: "timeline" | "form"): void {
  while (quiz.current.value && quiz.current.value.type !== type) {
    const question = quiz.current.value
    if (question.type === "timeline") {
      quiz.state.scene = wrongSceneFor(question.sentence.tense)
      quiz.check()
    } else {
      quiz.state.input = ""
      quiz.submit()
    }
    quiz.next()
  }
}

describe("createQuiz", () => {
  it("TC-26 start() gives 12 questions and saves their ids as recent", () => {
    const {quiz, store} = setup()
    expect(quiz.state.questions).toHaveLength(12)
    const saved = JSON.parse(store.data.get(STORAGE_KEY) ?? "null")
    expect(saved.recent).toEqual(quiz.state.questions.map((q) => q.sentence.id))
  })

  it("TC-26 a timeline question starts with a picture whose tense differs from the sentence's", () => {
    const {quiz} = setup(2)
    skipTo(quiz, "timeline")
    const question = quiz.current.value
    if (!question || question.type !== "timeline") throw new Error("no timeline question turned up")
    const action = quiz.state.scene.actions[0]
    if (!action) throw new Error("the timeline question has no action")
    expect(classify(action, quiz.state.scene.moment, SNAP_PX).tense).not.toBe(question.sentence.tense)
  })

  it("TC-26 check() records a moved-to-canonical timeline answer as right, and a second check() changes nothing", () => {
    const {quiz} = setup(2)
    skipTo(quiz, "timeline")
    const question = quiz.current.value
    if (!question || question.type !== "timeline") throw new Error("no timeline question turned up")

    const target = canonical(question.sentence.tense, question.sentence.kind)
    quiz.state.scene = {moment: target.moment, actions: [{id: 1, s: target.s, e: target.e, y: -90, kind: target.kind}]}
    quiz.check()
    const index = quiz.state.index
    expect(quiz.state.results[index]).toMatchObject({ok: true, given: question.sentence.tense, input: null, shown: false})

    quiz.state.scene = {moment: target.moment + 1000, actions: [{id: 1, s: target.s + 1000, e: target.e + 1000, y: -90, kind: target.kind}]}
    quiz.check()
    expect(quiz.state.results[index]).toMatchObject({ok: true, given: question.sentence.tense, input: null, shown: false})
  })

  it("TC-26 records a wrong timeline answer, and showMe() reveals the canonical picture once", () => {
    const {quiz} = setup(2)
    skipTo(quiz, "timeline")
    const question = quiz.current.value
    if (!question || question.type !== "timeline") throw new Error("no timeline question turned up")

    quiz.state.scene = wrongSceneFor(question.sentence.tense)
    quiz.check()
    const index = quiz.state.index
    expect(quiz.state.results[index]?.ok).toBe(false)

    expect(quiz.showMe()).toEqual(canonical(question.sentence.tense, question.sentence.kind))
    expect(quiz.showMe()).toBeNull()
    expect(quiz.state.results[index]).toMatchObject({ok: false, shown: true})
  })

  it("TC-26 submit() with the expected form is right", () => {
    const {quiz} = setup(3)
    skipTo(quiz, "form")
    const question = quiz.current.value
    if (!question || question.type !== "form") throw new Error("no form question turned up")

    quiz.state.input = formsOf(cook, question.sentence.person)[question.sentence.tense]
    quiz.submit()
    expect(quiz.state.results[quiz.state.index]?.ok).toBe(true)
  })

  it("TC-26 choose(i) on another tense's option sets ghost to that tense's canonical picture", () => {
    const {quiz} = setup(3)
    skipTo(quiz, "form")
    const question = quiz.current.value
    if (!question || question.type !== "form") throw new Error("no form question turned up")

    const expected = formsOf(cook, question.sentence.person)[question.sentence.tense]
    const wrongIndex = quiz.state.choices.findIndex((choice) => choice !== expected)
    expect(wrongIndex).toBeGreaterThanOrEqual(0)

    quiz.choose(wrongIndex)
    const given = quiz.state.results[quiz.state.index]?.given
    expect(given).not.toBeNull()
    expect(quiz.state.ghost).toEqual(given ? canonical(given, question.sentence.kind) : null)
  })

  it("TC-26 an agreement mismatch leaves ghost null", () => {
    const {quiz} = setup(5)
    const sentence: Sentence = {
      id: "present-perf-agreement",
      tense: "present.perf",
      en: "He ___ dinner.",
      verb: "cook",
      person: "he",
      ru: "ru",
      why: "why",
      kind: "once",
      moment: "now",
    }
    quiz.state.questions[0] = {sentence, type: "form"}
    quiz.state.index = 0
    quiz.state.results[0] = null

    quiz.state.input = "have cooked"
    quiz.submit()
    expect(quiz.state.results[0]).toMatchObject({ok: false, given: "present.perf"})
    expect(quiz.state.ghost).toBeNull()
  })

  it("TC-26 next() after the last question gives the summary, with 12 results", () => {
    const {quiz} = setup(4)
    for (let i = 0; i < quiz.state.questions.length; i++) {
      const question = quiz.current.value
      if (!question) break
      if (question.type === "timeline") quiz.check()
      else quiz.submit()
      quiz.next()
    }
    expect(quiz.current.value).toBeNull()
    expect(quiz.state.results).toHaveLength(12)
    expect(quiz.state.results.every((r) => r !== null)).toBe(true)
  })

  it("TC-26 reviewMistake(i) shows the correct picture with the given tense as the ghost", () => {
    const {quiz} = setup(4)
    for (let i = 0; i < quiz.state.questions.length; i++) {
      const question = quiz.current.value
      if (!question) break
      if (question.type === "timeline") {
        quiz.state.scene = wrongSceneFor(question.sentence.tense)
        quiz.check()
      } else {
        quiz.state.input = "xyz not a form"
        quiz.submit()
      }
      quiz.next()
    }
    const mistakeIndex = quiz.state.results.findIndex((r) => r && !r.ok)
    expect(mistakeIndex).toBeGreaterThanOrEqual(0)

    quiz.reviewMistake(mistakeIndex)
    const mistakeQuestion = quiz.state.questions[mistakeIndex]
    if (!mistakeQuestion) throw new Error("missing question")
    const correct = canonical(mistakeQuestion.sentence.tense, mistakeQuestion.sentence.kind)
    expect(quiz.state.scene).toEqual({moment: correct.moment, actions: [{id: 1, s: correct.s, e: correct.e, y: -90, kind: correct.kind}]})

    const given = quiz.state.results[mistakeIndex]?.given
    expect(quiz.state.ghost).toEqual(given && given !== mistakeQuestion.sentence.tense ? canonical(given, mistakeQuestion.sentence.kind) : null)
  })

  it("TC-26 picture() returns null before an answer, and the placement once answered", () => {
    const {quiz} = setup(4)
    expect(quiz.picture()).toBeNull()
    const question = quiz.current.value
    if (!question) throw new Error("no first question")
    if (question.type === "timeline") quiz.check()
    else quiz.submit()
    expect(quiz.picture()).not.toBeNull()
  })

  it("TC-26 a second start() shares no sentence with the first quiz", () => {
    const store = memoryStore()
    const quiz = createQuiz(bankOf(), verbs, store, seeded(6))
    quiz.start()
    const first = new Set(quiz.state.questions.map((q) => q.sentence.id))
    quiz.start()
    const second = quiz.state.questions.map((q) => q.sentence.id)
    expect(second.some((id) => first.has(id))).toBe(false)
  })
})

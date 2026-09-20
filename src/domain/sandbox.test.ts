import {describe, expect, it} from "vitest"

import {VERBS} from "./data"
import {formsOf} from "./forms"
import {SNAP_PX, canonical, classify} from "./geometry"
import {chainRu, sandboxSentence} from "./sandbox"
import {GRID_TENSES} from "./tenses"

import type {ActionKind, Classified} from "./geometry"
import type {Person, Verb} from "./forms"
import type {MomentKey, Rich, SandboxChoice, SubjectKey} from "./sandbox"
import type {Tense} from "./tenses"

const cook = VERBS.get("cook")
if (!cook) throw new Error("fixture verb 'cook' is missing from data/verbs.jsonl")
const verb: Verb = cook

const SUBJECTS: {key: SubjectKey; person: Person}[] = [
  {key: "I", person: "I"},
  {key: "you", person: "they"},
  {key: "he", person: "he"},
  {key: "she", person: "he"},
  {key: "we", person: "they"},
  {key: "they", person: "they"},
]

const MOMENT_KEYS: MomentKey[] = ["call", "five", "arrive"]
const KINDS: ActionKind[] = ["once", "habit"]

const classifyCanonical = (tense: Tense): Classified => {
  const placement = canonical(tense, "once")
  return classify(placement, placement.moment, SNAP_PX)
}

// 12 grid tenses, "after" at a present moment, "after" at a future moment, and past.future (which is itself
// "after" at a past moment) — the cross product TC-16 names.
const classifications: Classified[] = [
  ...GRID_TENSES.map((tense) => classifyCanonical(tense)),
  classify({s: 100, e: 100, kind: "once"}, 0, SNAP_PX),
  classify({s: 400, e: 400, kind: "once"}, 300, SNAP_PX),
  classifyCanonical("past.future"),
]

/** The bold segment `sandboxSentence` should carry for a tense: `formsOf`'s form, with `already` spliced in for the two perfects. */
function expectedBold(v: Verb, person: Person, tense: Tense): string {
  const form = formsOf(v, person)[tense]
  if (tense !== "present.perf" && tense !== "past.perf") return form
  const [aux, ...rest] = form.split(" ")
  return [aux, "already", ...rest].join(" ")
}

function boldSegments(rich: Rich): string[] {
  return rich.filter((segment) => segment.bold).map((segment) => segment.text)
}

/** Flattens a Rich value into one string, wrapping its bold segments in `**` for a literal comparison. */
function flatten(rich: Rich): string {
  return rich.map((segment) => (segment.bold ? `**${segment.text}**` : segment.text)).join("")
}

describe("sandboxSentence", () => {
  it("TC-16 bolds exactly the formsOf form (already spliced into the two perfects) for every classification, subject, moment and kind", () => {
    for (const c of classifications) {
      for (const subject of SUBJECTS) {
        for (const moment of MOMENT_KEYS) {
          for (const kind of KINDS) {
            const choice: SandboxChoice = {verb: "cook", subject: subject.key, moment}
            const bolds = boldSegments(sandboxSentence(c, kind, verb, choice))
            expect(bolds).toHaveLength(1)
            expect(bolds[0]).toBe(expectedBold(verb, subject.person, c.tense))
          }
        }
      }
    }
  })

  it("TC-16 gives I, cook, present.cont: Right now I **am cooking** dinner.", () => {
    const c = classifyCanonical("present.cont")
    const choice: SandboxChoice = {verb: "cook", subject: "I", moment: "call"}
    expect(flatten(sandboxSentence(c, "once", verb, choice))).toBe("Right now I **am cooking** dinner.")
  })

  it("TC-16 gives They, five, past.cont: At 5 pm yesterday, they **were cooking** dinner.", () => {
    const c = classifyCanonical("past.cont")
    const choice: SandboxChoice = {verb: "cook", subject: "they", moment: "five"}
    expect(flatten(sandboxSentence(c, "once", verb, choice))).toBe("At 5 pm yesterday, they **were cooking** dinner.")
  })

  it("TC-16 gives He, call, past.future: When she called, he said he **would cook** dinner later.", () => {
    const c = classifyCanonical("past.future")
    const choice: SandboxChoice = {verb: "cook", subject: "he", moment: "call"}
    expect(flatten(sandboxSentence(c, "once", verb, choice))).toBe("When she called, he said he **would cook** dinner later.")
  })

  it("TC-16 gives We, arrive, future.perfcont: By the time we arrive, we **will have been cooking** dinner for two hours.", () => {
    const c = classifyCanonical("future.perfcont")
    const choice: SandboxChoice = {verb: "cook", subject: "we", moment: "arrive"}
    expect(flatten(sandboxSentence(c, "once", verb, choice))).toBe("By the time we arrive, we **will have been cooking** dinner for two hours.")
  })
})

describe("chainRu", () => {
  it("TC-16 reads the past.perf chain with now, в прошлом, уже сделано and Past Perfect bold", () => {
    const c = classifyCanonical("past.perf")
    expect(flatten(chainRu(c, "she called"))).toBe(
      "От меня (**now**) момент «she called» — **в прошлом**. От момента действие: **уже сделано**. → **Past Perfect**",
    )
  })
})

import {SNAP_PX, canonical} from "./geometry"
import {tenseName} from "./tenses"

import type {ActionKind, Classified, Placement, Scene} from "./geometry"
import type {Person, Verb} from "./forms"
import type {Tense, Time} from "./tenses"

/** A run of text segments; a segment with `bold: true` renders as `<b>`. */
export type Rich = {text: string; bold?: boolean}[]

/** The six subjects offered in the sandbox's subject select. */
export type SubjectKey = "I" | "you" | "he" | "she" | "we" | "they"

/** The three reference moments offered in the sandbox's moment select. */
export type MomentKey = "call" | "five" | "arrive"

/** What the sandbox's verb, subject and moment selects are set to. */
export interface SandboxChoice {
  verb: string
  subject: SubjectKey
  moment: MomentKey
}

/** One verb offered in the sandbox's verb select: its object phrase for a single action and for a habit. */
export interface SandboxVerb {
  v: string
  obj: string
  habit: string
}

/** The verbs offered in the sandbox's verb select. */
export const SANDBOX_VERBS: readonly SandboxVerb[] = [
  {v: "cook", obj: "dinner", habit: "dinner"},
  {v: "write", obj: "the report", habit: "reports"},
  {v: "read", obj: "the book", habit: "books"},
  {v: "clean", obj: "the flat", habit: "the flat"},
  {v: "watch", obj: "the film", habit: "films"},
  {v: "fix", obj: "the car", habit: "cars"},
]

/** One subject offered in the sandbox's subject select: its display word and the person it agrees as. */
export interface Subject {
  key: SubjectKey
  word: string
  person: Person
}

/** The subjects offered in the sandbox's subject select. */
export const SUBJECTS: readonly Subject[] = [
  {key: "I", word: "I", person: "I"},
  {key: "you", word: "You", person: "they"},
  {key: "he", word: "He", person: "he"},
  {key: "she", word: "She", person: "he"},
  {key: "we", word: "We", person: "they"},
  {key: "they", word: "They", person: "they"},
]

/** One side (past or future) of a reference moment: its phrasing at the moment, by the moment, and as a bare label. */
export interface MomentSide {
  at: string
  by: string
  label: string
}

/** One reference moment offered in the sandbox's moment select. */
export interface MomentInfo {
  name: string
  past: MomentSide
  future: MomentSide
}

/** The reference moments offered in the sandbox's moment select. */
export const MOMENTS: Record<MomentKey, MomentInfo> = {
  call: {
    name: "she calls / called",
    past: {at: "when she called", by: "by the time she called", label: "she called"},
    future: {at: "when she calls", by: "by the time she calls", label: "she calls"},
  },
  five: {
    name: "5 pm",
    past: {at: "at 5 pm yesterday", by: "by 5 pm yesterday", label: "5 pm yesterday"},
    future: {at: "at 5 pm tomorrow", by: "by 5 pm tomorrow", label: "5 pm tomorrow"},
  },
  arrive: {
    name: "we arrive / arrived",
    past: {at: "when we arrived", by: "by the time we arrived", label: "we arrived"},
    future: {at: "when we arrive", by: "by the time we arrive", label: "we arrive"},
  },
}

/** How a past or future moment reads in the Russian chain. */
export const TIME_RU: Record<"past" | "future", string> = {past: "в прошлом", future: "в будущем"}

/** How an action's relation to the moment reads in the Russian chain. */
export const ASPECT_RU: Record<"simple" | "cont" | "perf" | "perfcont" | "after", string> = {
  simple: "происходит целиком — факт",
  cont: "в процессе",
  perf: "уже сделано",
  perfcont: "длится до него какое-то время",
  after: "ещё впереди",
}

function bold(text: string): Rich[number] {
  return {text, bold: true}
}

function plain(text: string): Rich[number] {
  return {text}
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Splices `already` after the auxiliary, for the two perfect tenses' bold form. */
function withAlready(form: string): string {
  const [aux, ...rest] = form.split(" ")
  return [aux, "already", ...rest].join(" ")
}

/** The sandbox's example sentence for a classified action, bolding the verb phrase. */
export function sandboxSentence(c: Classified, kind: ActionKind, verb: Verb, choice: SandboxChoice): Rich {
  const subject = SUBJECTS.find((s) => s.key === choice.subject) ?? (SUBJECTS[0] as Subject)
  const sandboxVerb = SANDBOX_VERBS.find((v) => v.v === choice.verb) ?? (SANDBOX_VERBS[0] as SandboxVerb)
  const {v1: base, s: s3, v2, v3, ing} = verb
  const third = subject.person === "he"
  const be = subject.person === "I" ? "am" : third ? "is" : "are"
  const was = subject.person === "they" ? "were" : "was"
  const have = third ? "has" : "have"
  const pron = subject.word === "I" ? "I" : subject.word.toLowerCase()
  const obj = kind === "habit" ? sandboxVerb.habit : sandboxVerb.obj
  const two = "for two hours"
  const fip = c.aspect === "after" && c.time === "past"
  const later = c.aspect === "after" && c.time !== "past"

  if (c.time === "present") {
    if (later) return [plain(`${subject.word} `), bold(`will ${base}`), plain(` ${obj} later.`)]
    if (c.aspect === "simple") return [plain(`${subject.word} usually `), bold(third ? s3 : base), plain(` ${sandboxVerb.habit}.`)]
    if (c.aspect === "cont") return [plain(`Right now ${pron} `), bold(`${be} ${ing}`), plain(` ${obj}.`)]
    if (c.aspect === "perf") return [plain(`${subject.word} `), bold(withAlready(`${have} ${v3}`)), plain(` ${obj}.`)]
    return [plain(`${subject.word} `), bold(`${have} been ${ing}`), plain(` ${obj} ${two}.`)]
  }

  const time = c.time as "past" | "future"
  const m = MOMENTS[choice.moment][time]
  const lead = (p: string) => `${cap(p)}, ${pron}`

  if (fip) return [plain(`${lead(MOMENTS[choice.moment].past.at)} said ${pron} `), bold(`would ${base}`), plain(` ${obj} later.`)]

  const past = time === "past"
  if (c.aspect === "simple" || later) return [plain(`${lead(m.at)} `), bold(past ? v2 : `will ${base}`), plain(` ${obj}.`)]
  if (c.aspect === "cont") return [plain(`${lead(m.at)} `), bold(past ? `${was} ${ing}` : `will be ${ing}`), plain(` ${obj}.`)]
  if (c.aspect === "perf") return [plain(`${lead(m.by)} `), bold(past ? withAlready(`had ${v3}`) : `will have ${v3}`), plain(` ${obj}.`)]
  return [plain(`${lead(past ? m.at : m.by)} `), bold(past ? `had been ${ing}` : `will have been ${ing}`), plain(` ${obj} ${two}.`)]
}

/** The sandbox's Russian reasoning chain for a classified action, given the moment's English label. */
export function chainRu(c: Classified, momentLabel: string): Rich {
  const fip = c.aspect === "after" && c.time === "past"
  const later = c.aspect === "after" && c.time !== "past"
  const shape = fip || later ? ASPECT_RU.after : ASPECT_RU[c.aspect as "simple" | "cont" | "perf" | "perfcont"]
  const name = tenseName(c.tense)
  if (c.time === "present") {
    return [plain("Момент — это и есть "), bold("сейчас"), plain(". Действие относительно него: "), bold(shape), plain(". → "), bold(name)]
  }
  return [
    plain("От меня ("),
    bold("now"),
    plain(`) момент «${momentLabel}» — `),
    bold(TIME_RU[c.time as "past" | "future"]),
    plain(". От момента действие: "),
    bold(shape),
    plain(". → "),
    bold(name),
  ]
}

/** The English label of a reference moment, from the side it is on; `"now"` when the picture is on the present. */
export function momentLabelOf(time: Time, moment: MomentKey): string {
  return time === "present" ? "now" : MOMENTS[moment][time].label
}

/** The sandbox's starting scene: the moment in the past, with three actions. */
export function defaultSandboxScene(): Scene {
  return {
    moment: -260,
    actions: [
      {id: 1, s: -260, e: -260, y: -70, kind: "once"},
      {id: 2, s: -400, e: -120, y: -150, kind: "once"},
      {id: 3, s: -480, e: -480, y: -230, kind: "once"},
    ],
  }
}

/** Where a mini-table pick should morph the selected action to: the tense's canonical picture, shifted onto the current moment when it is already on that tense's side. */
export function morphTarget(tense: Tense, moment: number, k: number): Placement {
  const target = canonical(tense, "once")
  const side: Time = moment < 0 ? "past" : "future"
  if (Math.abs(moment) * k > SNAP_PX && (tense.split(".")[0] as Time) === side) {
    const dx = moment - target.moment
    return {...target, moment, s: target.s + dx, e: target.e + dx}
  }
  return target
}

import type {Tense} from "./tenses"

/** The three persons a verb agrees with; `he` stands for any third-person singular subject, `they` for you, we, they and plurals. */
export type Person = "I" | "he" | "they"

/** One verb's five base forms, as stored in `data/verbs.jsonl`. */
export interface Verb {
  v1: string
  s: string
  v2: string
  v3: string
  ing: string
}

const FIELD_PATTERN = /^[a-z]+$/

/** Parses JSONL text into verbs; blank lines are skipped and a malformed line throws with its number. */
export function parseVerbs(source: string, fileName = "verbs.jsonl"): Verb[] {
  return source.split("\n").flatMap((line, index) => {
    if (!line.trim()) return []
    try {
      return [JSON.parse(line) as Verb]
    } catch {
      throw new Error(`${fileName}:${index + 1}: invalid JSON`)
    }
  })
}

/** Returns a human-readable problem for every verb that breaks the data format; empty means valid. */
export function validateVerbs(verbs: Verb[]): string[] {
  const problems: string[] = []
  const seen = new Set<string>()
  verbs.forEach((verb, index) => {
    const where = `verb #${index + 1} (${verb?.v1 ?? "no v1"})`
    const duplicate = typeof verb?.v1 === "string" && seen.has(verb.v1)
    if (duplicate) problems.push(`${where}: duplicate v1`)
    if (typeof verb?.v1 === "string") seen.add(verb.v1)
    for (const key of ["v1", "s", "v2", "v3", "ing"] as const) {
      const value = verb?.[key]
      if (typeof value !== "string" || !FIELD_PATTERN.test(value)) problems.push(`${where}: ${key} must be a lowercase word`)
    }
  })
  return problems
}

/** All 13 forms of a verb for a person. */
export function formsOf(verb: Verb, person: Person): Record<Tense, string> {
  const {v1, s, v2, v3, ing} = verb
  const third = person === "he"
  const be = person === "I" ? "am" : third ? "is" : "are"
  const was = person === "they" ? "were" : "was"
  const have = third ? "has" : "have"
  return {
    "present.simple": third ? s : v1,
    "present.cont": `${be} ${ing}`,
    "present.perf": `${have} ${v3}`,
    "present.perfcont": `${have} been ${ing}`,
    "past.simple": v2,
    "past.cont": `${was} ${ing}`,
    "past.perf": `had ${v3}`,
    "past.perfcont": `had been ${ing}`,
    "future.simple": `will ${v1}`,
    "future.cont": `will be ${ing}`,
    "future.perf": `will have ${v3}`,
    "future.perfcont": `will have been ${ing}`,
    "past.future": `would ${v1}`,
  }
}

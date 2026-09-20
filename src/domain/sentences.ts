import {formsOf} from "./forms"
import {ALL_TENSES} from "./tenses"

import type {ActionKind} from "./geometry"
import type {Person, Verb} from "./forms"
import type {Tense} from "./tenses"

/** The placeholder a sentence's `en` fills with the verb form. */
export const GAP = "___"

/** One sentence from `data/sentences/*.jsonl`: the bank the sandbox and the test both draw on. */
export interface Sentence {
  id: string
  tense: Tense
  en: string
  verb: string
  person: Person
  ru: string
  why: string
  kind: ActionKind
  moment: string
}

/** Parses JSONL text into sentences; blank lines are skipped and a malformed line throws with its number. */
export function parseSentences(source: string, fileName = "sentences.jsonl"): Sentence[] {
  return source.split("\n").flatMap((line, index) => {
    if (!line.trim()) return []
    try {
      return [JSON.parse(line) as Sentence]
    } catch {
      throw new Error(`${fileName}:${index + 1}: invalid JSON`)
    }
  })
}

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Returns a human-readable problem for every sentence that breaks the data format; empty means valid. */
export function validateSentences(sentences: readonly Sentence[], verbs: ReadonlyMap<string, Verb>): string[] {
  const problems: string[] = []
  const seen = new Set<string>()
  sentences.forEach((sentence, index) => {
    const where = `sentence #${index + 1} (${sentence?.id ?? "no id"})`
    const duplicate = typeof sentence?.id === "string" && seen.has(sentence.id)
    if (typeof sentence?.id !== "string" || !sentence.id.trim()) problems.push(`${where}: id must be a non-empty string`)
    else if (duplicate) problems.push(`${where}: duplicate id`)
    else if (!ID_PATTERN.test(sentence.id)) problems.push(`${where}: id must be lowercase words separated by hyphens`)
    if (typeof sentence?.id === "string") seen.add(sentence.id)
    if (!ALL_TENSES.includes(sentence.tense)) problems.push(`${where}: tense must be one of ALL_TENSES`)
    if (typeof sentence.en !== "string" || sentence.en.split(GAP).length - 1 !== 1) problems.push(`${where}: en must contain ${GAP} exactly once`)
    if (typeof sentence.verb !== "string" || !verbs.has(sentence.verb)) problems.push(`${where}: verb must be a known verb`)
    if (sentence.person !== "I" && sentence.person !== "he" && sentence.person !== "they") problems.push(`${where}: person must be I, he or they`)
    for (const key of ["ru", "why", "moment"] as const) {
      if (typeof sentence[key] !== "string" || !sentence[key].trim()) problems.push(`${where}: ${key} must be a non-empty string`)
    }
    if (sentence.kind !== "once" && sentence.kind !== "habit") problems.push(`${where}: kind must be once or habit`)
    const isPresent = typeof sentence.tense === "string" && sentence.tense.startsWith("present.")
    if ((sentence.moment === "now") !== isPresent) problems.push(`${where}: moment must be "now" for a present tense and not "now" otherwise`)
  })
  return problems
}

/** Splits a sentence's `en` around the gap and fills it with the verb's form for the sentence's tense and person. */
export function withForm(sentence: Sentence, verb: Verb): {before: string; form: string; after: string} {
  const parts = sentence.en.split(GAP)
  return {before: parts[0] ?? "", form: formsOf(verb, sentence.person)[sentence.tense], after: parts[1] ?? ""}
}

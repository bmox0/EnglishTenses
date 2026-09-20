import {formsOf} from "./forms"
import {ALL_TENSES} from "./tenses"

import type {Person, Verb} from "./forms"
import type {Sentence} from "./sentences"
import type {Tense} from "./tenses"

/** The tense a typed answer matched, and whether it matched the person it was checked against. */
export interface Identified {
  tense: Tense
  agrees: boolean
}

/** How a typed or picked form compares to a sentence's expected form. */
export type Verdict = "right" | "tense" | "agreement" | "unknown" | "empty"

/** The full result of checking a typed or picked form against a sentence. */
export interface FormCheck {
  verdict: Verdict
  expected: string
  identified: Identified | null
}

const PRONOUNS = new Set(["i", "you", "he", "she", "it", "we", "they"])
const PERSONS_IN_ORDER: readonly Person[] = ["I", "he", "they"]

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z' ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** Every candidate a normalised input could stand for, after contractions, a dropped leading pronoun and stray apostrophes. */
function candidatesOf(normalized: string): string[] {
  if (!normalized) return []
  const base = normalized.replace(/'ll/g, " will").replace(/'ve/g, " have").replace(/'m/g, " am").replace(/'re/g, " are").replace(/\s+/g, " ").trim()

  let variants = [base]
  if (base.includes("'s")) variants = variants.flatMap((v) => [v.replace(/'s/g, " is"), v.replace(/'s/g, " has")])
  if (base.includes("'d")) variants = variants.flatMap((v) => [v.replace(/'d/g, " had"), v.replace(/'d/g, " would")])
  variants = variants.slice(0, 4).map((v) => v.replace(/\s+/g, " ").trim())

  variants = variants.map((v) => {
    const words = v.split(" ")
    const first = words[0]
    return words.length > 1 && first !== undefined && PRONOUNS.has(first) ? words.slice(1).join(" ") : v
  })

  return [...new Set(variants.map((v) => v.replace(/'/g, "")))]
}

/** Matches a typed answer's candidates against a verb's forms: the person it was typed for first, then `I`, `he`, `they`. */
export function identify(input: string, verb: Verb, person: Person): Identified | null {
  const candidates = candidatesOf(normalize(input))
  const own = formsOf(verb, person)
  for (const candidate of candidates) {
    for (const tense of ALL_TENSES) {
      if (own[tense] === candidate) return {tense, agrees: true}
    }
  }
  for (const other of PERSONS_IN_ORDER) {
    const forms = formsOf(verb, other)
    for (const candidate of candidates) {
      for (const tense of ALL_TENSES) {
        if (forms[tense] === candidate) return {tense, agrees: false}
      }
    }
  }
  return null
}

/** Judges a typed or picked form against a sentence's expected form: right, the wrong tense, the right tense but wrong agreement, unrecognised, or empty. */
export function checkForm(input: string, sentence: Sentence, verb: Verb): FormCheck {
  const expected = formsOf(verb, sentence.person)[sentence.tense]
  const normalized = normalize(input)
  if (!normalized) return {verdict: "empty", expected, identified: null}
  if (candidatesOf(normalized).includes(expected)) return {verdict: "right", expected, identified: null}
  const identified = identify(input, verb, sentence.person)
  if (!identified) return {verdict: "unknown", expected, identified: null}
  if (identified.tense === sentence.tense) return {verdict: identified.agrees ? "right" : "agreement", expected, identified}
  return {verdict: "tense", expected, identified}
}

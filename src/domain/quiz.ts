import type {Sentence} from "./sentences"
import type {Tense} from "./tenses"

/** Whether a question asks to draw the picture for a sentence, or to fill in the verb's form. */
export type QuestionType = "timeline" | "form"

/** One question of a quiz: a sentence from the bank and how it is asked. */
export interface Question {
  sentence: Sentence
  type: QuestionType
}

/** How many questions one quiz has. */
export const QUIZ_SIZE = 12

/** How many questions of the same tense one quiz allows. */
export const MAX_PER_TENSE = 2

/** How many sentence ids `remember` keeps. */
export const RECENT_LIMIT = 60

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const a = shuffled[i]
    const b = shuffled[j]
    if (a === undefined || b === undefined) continue
    shuffled[i] = b
    shuffled[j] = a
  }
  return shuffled
}

function take(order: readonly Sentence[], into: Sentence[], seen: Set<string>, cap: ((count: number) => boolean) | null): void {
  const tenseCount = new Map<Tense, number>()
  for (const sentence of order) {
    if (into.length >= QUIZ_SIZE) break
    if (seen.has(sentence.id)) continue
    const count = tenseCount.get(sentence.tense) ?? 0
    if (cap && !cap(count)) continue
    into.push(sentence)
    seen.add(sentence.id)
    tenseCount.set(sentence.tense, count + 1)
  }
}

/** Builds a quiz's questions: shuffled, recent sentences last, at most `MAX_PER_TENSE` per tense while the bank allows it. */
export function buildQuiz(bank: readonly Sentence[], recent: readonly string[], random: () => number): Question[] {
  const recentSet = new Set(recent)
  const notRecent = shuffle(
    bank.filter((s) => !recentSet.has(s.id)),
    random,
  )
  const recentOrdered = recent.map((id) => bank.find((s) => s.id === id)).filter((s): s is Sentence => s !== undefined)
  const ordered = [...notRecent, ...recentOrdered]

  const selected: Sentence[] = []
  const seen = new Set<string>()
  take(ordered, selected, seen, (count) => count < MAX_PER_TENSE)
  if (selected.length < QUIZ_SIZE) take(ordered, selected, seen, null)

  return selected.map((sentence) => ({sentence, type: random() < 0.5 ? "timeline" : "form"}))
}

/** The recent ids to remember after a quiz: the old ones still not shown, then the new ones, trimmed to `RECENT_LIMIT`. */
export function remember(recent: readonly string[], ids: readonly string[]): string[] {
  const idsSet = new Set(ids)
  const kept = recent.filter((id) => !idsSet.has(id))
  return [...kept, ...ids].slice(-RECENT_LIMIT)
}

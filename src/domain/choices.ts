import {formsOf} from "./forms"
import {ALL_TENSES, ASPECTS, TIMES} from "./tenses"

import type {Verb} from "./forms"
import type {Sentence} from "./sentences"
import type {Aspect, GridTense, Tense, Time} from "./tenses"

const PAST_FUTURE_NEIGHBOURS: readonly Tense[] = ["future.simple", "past.simple", "past.cont", "past.perf", "future.cont"]

function neighboursOf(tense: Tense): readonly Tense[] {
  if (tense === "past.future") return PAST_FUTURE_NEIGHBOURS
  const [time, aspect] = tense.split(".") as [Time, Aspect]
  const sameTime = ASPECTS.filter((a) => a !== aspect).map((a) => `${time}.${a}` as GridTense)
  const sameAspect = TIMES.filter((t) => t !== time).map((t) => `${t}.${aspect}` as GridTense)
  const extra: Tense[] = tense === "past.simple" || tense === "future.simple" ? ["past.future"] : []
  return [...sameTime, ...sameAspect, ...extra]
}

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

/** Four options for a form question — the right form and three neighbouring tenses' forms of the same verb, shuffled with `random`. */
export function buildChoices(sentence: Sentence, verb: Verb, random: () => number): string[] {
  const forms = formsOf(verb, sentence.person)
  const expected = forms[sentence.tense]

  const wrong: string[] = []
  const take = (tenses: readonly Tense[]) => {
    for (const tense of tenses) {
      if (wrong.length >= 3) break
      const form = forms[tense]
      if (form !== expected && !wrong.includes(form)) wrong.push(form)
    }
  }
  take(shuffle(neighboursOf(sentence.tense), random))
  if (wrong.length < 3) take(ALL_TENSES)

  return shuffle([expected, ...wrong], random)
}

export type Time = "past" | "present" | "future"
export type Aspect = "simple" | "cont" | "perf" | "perfcont"
export type GridTense = `${Time}.${Aspect}`
export type Tense = GridTense | "past.future"

export const TIMES: readonly Time[] = ["past", "present", "future"]
export const ASPECTS: readonly Aspect[] = ["simple", "cont", "perf", "perfcont"]

export const GRID_TENSES: readonly GridTense[] = TIMES.flatMap((time) => ASPECTS.map((aspect) => `${time}.${aspect}` as GridTense))
export const ALL_TENSES: readonly Tense[] = [...GRID_TENSES, "past.future"]

export interface TenseInfo {
  name: string
  formula: string
  gloss: string
  markers: string
}

export const TIME_INFO: Record<Time, {name: string; look: string; ru: string}> = {
  past: {name: "Past", look: "look from a moment then", ru: "смотрим из момента в прошлом"},
  present: {name: "Present", look: "look from now", ru: "смотрим из «сейчас»"},
  future: {name: "Future", look: "look from a moment later", ru: "смотрим из момента в будущем"},
}

export const ASPECT_INFO: Record<Aspect, {name: string; shape: string; ru: string}> = {
  simple: {name: "Simple", shape: "whole fact", ru: "факт целиком"},
  cont: {name: "Continuous", shape: "in progress at it", ru: "в процессе в этот момент"},
  perf: {name: "Perfect", shape: "done before it", ru: "сделано к этому моменту"},
  perfcont: {name: "Perfect Continuous", shape: "going on up to it", ru: "длится до этого момента"},
}

const GRID_TENSE_TEXT: Record<GridTense, {formula: string; gloss: string; markers: string}> = {
  "present.simple": {formula: "V / V+s", gloss: "Бывает регулярно или это факт вообще.", markers: "usually, often, every day, always"},
  "present.cont": {formula: "am / is / are + V-ing", gloss: "Происходит прямо сейчас, в процессе.", markers: "now, at the moment, Look!, Listen!"},
  "present.perf": {
    formula: "have / has + V3",
    gloss: "Уже случилось к настоящему моменту; важен результат сейчас.",
    markers: "already, just, yet, ever, never, since, for",
  },
  "present.perfcont": {
    formula: "have / has been + V-ing",
    gloss: "Началось раньше и длится до сих пор — важна длительность.",
    markers: "for two hours, since morning, all day, how long",
  },
  "past.simple": {
    formula: "V2",
    gloss: "Случилось в прошлом и закончилось; с «сейчас» не связано.",
    markers: "yesterday, last year, ago, in 2019, when",
  },
  "past.cont": {
    formula: "was / were + V-ing",
    gloss: "В определённый момент в прошлом было в процессе.",
    markers: "at 5 pm yesterday, when…, while…",
  },
  "past.perf": {formula: "had + V3", gloss: "Случилось ещё раньше другого момента в прошлом.", markers: "by then, before, already, by the time"},
  "past.perfcont": {
    formula: "had been + V-ing",
    gloss: "Длилось какое-то время до момента в прошлом.",
    markers: "for an hour, since, before…, by the time",
  },
  "future.simple": {formula: "will + V", gloss: "Случится в будущем: решение, обещание, прогноз.", markers: "tomorrow, next week, I think, I'm sure"},
  "future.cont": {
    formula: "will be + V-ing",
    gloss: "В определённый момент в будущем будет в процессе.",
    markers: "at 9 tomorrow, this time next week",
  },
  "future.perf": {formula: "will have + V3", gloss: "Будет сделано к моменту в будущем.", markers: "by Friday, by the time, by then"},
  "future.perfcont": {
    formula: "will have been + V-ing",
    gloss: "К моменту в будущем будет длиться уже какое-то время.",
    markers: "by June … for a year",
  },
}

/** The catalog of the 13 tenses: the 12 grid tenses (`Time.Aspect`) plus `past.future` (Future in the Past). */
export const TENSE_INFO: Record<Tense, TenseInfo> = {
  ...Object.fromEntries(
    GRID_TENSES.map((tense) => {
      const [time, aspect] = tense.split(".") as [Time, Aspect]
      return [tense, {name: `${TIME_INFO[time].name} ${ASPECT_INFO[aspect].name}`, ...GRID_TENSE_TEXT[tense]}]
    }),
  ),
  "past.future": {
    name: "Future in the Past",
    formula: "would + V",
    gloss: "Смотрим из прошлого на то, что тогда ещё было впереди: «сказал, что придёт» — he said he would come.",
    markers: "said that…, thought that…, knew that…, promised that…",
  },
} as Record<Tense, TenseInfo>

/** The display name of a tense, e.g. `Past Perfect Continuous`. */
export function tenseName(tense: Tense): string {
  return TENSE_INFO[tense].name
}

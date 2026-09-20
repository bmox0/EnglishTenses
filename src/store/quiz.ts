import {computed, inject, reactive} from "vue"

import {checkForm} from "../domain/answer"
import {buildChoices} from "../domain/choices"
import {SNAP_PX, canonical, classify} from "../domain/geometry"
import {buildQuiz, remember} from "../domain/quiz"
import {loadSaved, writeSaved} from "../domain/storage"

import type {Verdict} from "../domain/answer"
import type {Placement, Scene} from "../domain/geometry"
import type {Question} from "../domain/quiz"
import type {Sentence} from "../domain/sentences"
import type {KeyValueStore} from "../domain/storage"
import type {Aspect, Tense, Time} from "../domain/tenses"
import type {Verb} from "../domain/forms"
import type {Camera} from "../timeline/camera"
import type {ComputedRef, InjectionKey} from "vue"

/** How one answered question came out: whether it was right, the tense, time and aspect your drawing read as (timeline), the verdict and what you typed (form), and whether Show me has run. */
export interface QuizResult {
  ok: boolean
  given: Tense | null
  time: Time | null
  aspect: Aspect | "after" | null
  verdict: Verdict | null
  input: string | null
  shown: boolean
}

/** The quiz's reactive state: its questions, where you are in them, the results so far, and the canvas scene the current question or review shows. */
export interface QuizState {
  questions: Question[]
  index: number
  results: (QuizResult | null)[]
  scene: Scene
  camera: Camera | null
  selected: number | null
  ghost: Placement | null
  choices: string[]
  input: string
  review: number | null
}

/** The quiz: its state, the current question, and the ways the panel and the canvas move it forward. */
export interface Quiz {
  state: QuizState
  current: ComputedRef<Question | null>
  start(): void
  check(): void
  submit(): void
  choose(index: number): void
  showMe(): Placement | null
  next(): void
  reviewMistake(index: number): void
  picture(): Placement | null
}

/** The injection key `useQuiz()` reads and `main.ts` provides. */
export const QuizKey: InjectionKey<Quiz> = Symbol("quiz")

const TIMELINE_STARTS: readonly {moment: number; s: number; e: number}[] = [
  {moment: 0, s: 180, e: 180},
  {moment: -260, s: -260, e: -260},
  {moment: 0, s: -140, e: 140},
  {moment: 260, s: 120, e: 120},
]

function oneActionScene(placement: Placement): Scene {
  return {moment: placement.moment, actions: [{id: 1, s: placement.s, e: placement.e, y: -90, kind: placement.kind}]}
}

function emptyScene(): Scene {
  return {moment: 0, actions: []}
}

/** Creates the quiz state: a fresh test's questions, their answers, and the scene the canvas shows for the current one. */
export function createQuiz(
  bank: readonly Sentence[],
  verbs: ReadonlyMap<string, Verb>,
  store: KeyValueStore | null,
  random: () => number = Math.random,
): Quiz {
  const state = reactive<QuizState>({
    questions: [],
    index: 0,
    results: [],
    scene: emptyScene(),
    camera: null,
    selected: null,
    ghost: null,
    choices: [],
    input: "",
    review: null,
  })

  const current = computed<Question | null>(() => state.questions[state.index] ?? null)

  function verbOf(name: string): Verb | null {
    return verbs.get(name) ?? null
  }

  function setupQuestion(): void {
    const question = current.value
    state.ghost = null
    state.camera = null
    if (!question) return
    if (question.type === "timeline") {
      const start =
        TIMELINE_STARTS.find(
          (candidate) => classify({s: candidate.s, e: candidate.e, kind: "once"}, candidate.moment, SNAP_PX).tense !== question.sentence.tense,
        ) ?? TIMELINE_STARTS[0]
      if (start) state.scene = {moment: start.moment, actions: [{id: 1, s: start.s, e: start.e, y: -90, kind: "once"}]}
      state.selected = 1
      state.choices = []
    } else {
      state.scene = emptyScene()
      state.selected = null
      const verb = verbOf(question.sentence.verb)
      state.choices = verb ? buildChoices(question.sentence, verb, random) : []
    }
    state.input = ""
  }

  function start(): void {
    const saved = loadSaved(store)
    state.questions = buildQuiz(bank, saved.recent, random)
    writeSaved(store, {
      version: 1,
      recent: remember(
        saved.recent,
        state.questions.map((q) => q.sentence.id),
      ),
    })
    state.index = 0
    state.results = state.questions.map(() => null)
    state.review = null
    setupQuestion()
  }

  function check(): void {
    const question = current.value
    if (!question || question.type !== "timeline" || state.results[state.index]) return
    const action = state.scene.actions[0]
    if (!action) return
    const tol = SNAP_PX / (state.camera?.k ?? 1)
    const c = classify(action, state.scene.moment, tol)
    state.results[state.index] = {
      ok: c.tense === question.sentence.tense,
      given: c.tense,
      time: c.time,
      aspect: c.aspect,
      verdict: null,
      input: null,
      shown: false,
    }
  }

  function submit(): void {
    const question = current.value
    if (!question || question.type !== "form" || state.results[state.index]) return
    const verb = verbOf(question.sentence.verb)
    if (!verb) return
    const result = checkForm(state.input, question.sentence, verb)
    const given = result.identified?.tense ?? null
    state.results[state.index] = {
      ok: result.verdict === "right",
      given,
      time: null,
      aspect: null,
      verdict: result.verdict,
      input: state.input,
      shown: false,
    }
    state.scene = oneActionScene(canonical(question.sentence.tense, question.sentence.kind))
    state.selected = 1
    state.ghost = result.verdict === "tense" && given ? canonical(given, question.sentence.kind) : null
    state.camera = null
  }

  function choose(index: number): void {
    const choice = state.choices[index]
    if (choice === undefined || state.results[state.index]) return
    state.input = choice
    submit()
  }

  function showMe(): Placement | null {
    const question = current.value
    const result = state.results[state.index]
    if (!question || question.type !== "timeline" || !result || result.ok || result.shown) return null
    result.shown = true
    return canonical(question.sentence.tense, question.sentence.kind)
  }

  function next(): void {
    if (state.index + 1 >= state.questions.length) {
      state.index = state.questions.length
      state.scene = emptyScene()
      state.camera = null
      state.selected = null
      state.ghost = null
      state.review = null
      return
    }
    state.index++
    setupQuestion()
  }

  function reviewMistake(index: number): void {
    const question = state.questions[index]
    const result = state.results[index]
    if (!question || !result) return
    state.review = index
    state.scene = oneActionScene(canonical(question.sentence.tense, question.sentence.kind))
    state.selected = 1
    state.camera = null
    state.ghost = result.given && result.given !== question.sentence.tense ? canonical(result.given, question.sentence.kind) : null
  }

  function picture(): Placement | null {
    const index = state.review ?? state.index
    const question = state.questions[index]
    const result = state.results[index]
    if (!question || !result) return null
    const action = state.scene.actions[0]
    if (!action) return null
    return {moment: state.scene.moment, s: action.s, e: action.e, kind: action.kind}
  }

  return {state, current, start, check, submit, choose, showMe, next, reviewMistake, picture}
}

/** The quiz provided by the app root. */
export function useQuiz(): Quiz {
  const quiz = inject(QuizKey)
  if (!quiz) throw new Error("useQuiz() called outside the app")
  return quiz
}

import type {Aspect, Tense, Time} from "./tenses"

/** Whether an action happens once or is a repeated habit. */
export type ActionKind = "once" | "habit"

/** One draggable action on the timeline: a span from `s` to `e` at row `y`. */
export interface Action {
  id: number
  s: number
  e: number
  y: number
  kind: ActionKind
}

/** The moment and every action placed on it. */
export interface Scene {
  moment: number
  actions: Action[]
}

/** Where a tense's canonical picture places its moment and its one action. */
export interface Placement {
  moment: number
  s: number
  e: number
  kind: ActionKind
}

/** The tense a picture reads as, and the parts of that reading. */
export interface Classified {
  tense: Tense
  time: Time
  aspect: Aspect | "after"
  point: boolean
}

/** The pixel tolerance used to decide whether a point sits on the moment or on now, before dividing by the camera's `k`. */
export const SNAP_PX = 12

/** Turns an action and a moment into the tense its picture reads as, by the prototype's geometry rules. */
export function classify(action: Pick<Action, "s" | "e" | "kind">, moment: number, tol: number): Classified {
  const time: Time = Math.abs(moment) <= tol ? "present" : moment < 0 ? "past" : "future"
  const s = Math.min(action.s, action.e)
  const e = Math.max(action.s, action.e)
  const point = e - s <= tol
  const at = (x: number) => Math.abs(x - moment) <= tol
  let aspect: Aspect | "after"
  if (point) aspect = at(s) ? "simple" : s < moment ? "perf" : "after"
  else if (at(e) && s < moment) aspect = "perfcont"
  else if (e < moment) aspect = "perf"
  else if (s > moment + tol) aspect = "after"
  else if (at(s)) aspect = "simple"
  else aspect = action.kind === "habit" ? "simple" : "cont"
  if (aspect === "after") {
    const tense: Tense = time === "past" ? "past.future" : "future.simple"
    return {tense, time, aspect, point}
  }
  return {tense: `${time}.${aspect}` as Tense, time, aspect, point}
}

/** The usual picture for a tense: where its moment and its one action sit. */
export function canonical(tense: Tense, kind: ActionKind): Placement {
  if (tense === "past.future") return {moment: -300, s: -140, e: -140, kind: "once"}
  const [time, aspect] = tense.split(".") as [Time, Aspect]
  const moment = time === "past" ? -300 : time === "present" ? 0 : 300
  if (aspect === "simple" && (time === "present" || kind === "habit")) {
    return {moment, s: moment - 200, e: moment + 200, kind: "habit"}
  }
  if (aspect === "simple") return {moment, s: moment, e: moment, kind: "once"}
  if (aspect === "cont") return {moment, s: moment - 130, e: moment + 130, kind: "once"}
  if (aspect === "perf") return {moment, s: moment - 160, e: moment - 160, kind: "once"}
  return {moment, s: moment - 220, e: moment, kind: "once"}
}

/** Snaps `x` to the first of `anchors` within `SNAP_PX / k`, or leaves it be. */
export function snap(x: number, anchors: readonly number[], k: number): {x: number; at: number | null} {
  const tol = SNAP_PX / k
  for (const anchor of anchors) {
    if (Math.abs(x - anchor) <= tol) return {x: anchor, at: anchor}
  }
  return {x, at: null}
}

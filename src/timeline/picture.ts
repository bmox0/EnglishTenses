import {arcSVG, arrowHead, esc, wavePath} from "./svg"

import type {Aspect, Time} from "../domain/tenses"

/** The two sizes a tense picture is drawn at: `big` for the Tenses sheet's detail, `mini` for its grid. */
export type PictureStyle = "big" | "mini"

/** The shape a Simple-aspect picture draws as: a single point, or a row of dots for a habit. */
export type PictureShape = "point" | "habit"

/** What one tense picture draws: the moment it looks from, the action's aspect and, optionally, a label for the moment and the action's shape. */
export interface PictureSpec {
  time: Time
  aspect: Aspect
  rLabel?: string
  shape?: PictureShape
  aria?: string
}

interface StyleSpec {
  w: number
  h: number
  axisY: number
  top: number
  sw: number
  r: number
  amp: number
  per: number
  arc: number
  labels: boolean
}

const STYLE: Record<PictureStyle, StyleSpec> = {
  big: {w: 600, h: 140, axisY: 96, top: 24, sw: 3, r: 7, amp: 6, per: 18, arc: 44, labels: true},
  mini: {w: 600, h: 150, axisY: 100, top: 4, sw: 11, r: 21, amp: 20, per: 60, arc: 54, labels: false},
}

const TX: Record<Time, number> = {past: 150, present: 300, future: 450}
const NOW_X = 300

const col = (color: string) => `var(--${color})`

function vline(x: number, y1: number, y2: number, color: string, dashed: boolean, width = 1.5): string {
  return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" style="stroke:${color};stroke-width:${width}${dashed ? ";stroke-dasharray:5 4" : ""}"/>`
}

function textLabel(x: number, y: number, text: string, color: string, anchor = "middle", size = 12, weight = 300): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" style="fill:${color};font-size:${size}px;font-weight:${weight}">${esc(text)}</text>`
}

/** Draws one action's shape at `rx` for the given aspect: the `markSVG` of the prototype's `timeline.js`, trimmed to the shapes a tense picture needs. */
export function markSVG(spec: {time: Time; aspect: Aspect; shape?: PictureShape; rx: number; y: number; S: StyleSpec; color: string}): string {
  const {aspect, shape, rx, y, S, color} = spec
  const sw = S.sw
  const thin = Math.max(1.4, sw * 0.6)
  const point = (x: number) => `<circle cx="${x}" cy="${y}" r="${S.r}" style="fill:${color}"/>`
  const wave = (x1: number, x2: number) =>
    `<path d="${wavePath(x1, x2, y, S.amp, S.per)}" style="fill:none;stroke:${color};stroke-width:${sw};stroke-linejoin:round;stroke-linecap:round"/>`
  const dotted = (x1: number, x2: number) =>
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" style="stroke:${color};stroke-width:${sw};stroke-dasharray:${sw * 0.1} ${sw * 2.4};stroke-linecap:round"/>`
  const tick = (x: number) => `<line x1="${x}" y1="${y - S.amp - 4}" x2="${x}" y2="${y + S.amp + 4}" style="stroke:${color};stroke-width:${sw}"/>`
  let out = ""
  if (aspect === "simple") {
    const effectiveShape = shape ?? (spec.time === "present" ? "habit" : "point")
    if (effectiveShape === "habit") {
      const n = 9
      const lo = rx - 255
      const hi = rx + 255
      for (let i = 0; i < n; i++) out += `<circle cx="${lo + ((hi - lo) * i) / (n - 1)}" cy="${y}" r="${S.r * 0.72}" style="fill:${color}"/>`
    } else {
      out += point(rx)
    }
  } else if (aspect === "cont") {
    out += dotted(rx - 112, rx - 85) + wave(rx - 85, rx + 85) + dotted(rx + 85, rx + 112)
  } else if (aspect === "perf") {
    out += point(rx - 105) + arcSVG(rx - 105, rx, y, S, color, thin)
  } else {
    out += tick(rx - 145) + wave(rx - 145, rx)
  }
  return out
}

/** One tense's picture: the axis, the now line, the moment line (unless the picture looks from now) and the action — the `renderTimeline` of the prototype's `timeline.js`, trimmed to the `big` and `mini` styles, with no zones, ghosts, or ways to build a multi-row story. */
export function pictureMarkup(spec: PictureSpec, style: PictureStyle): string {
  const S = STYLE[style]
  const y = S.axisY
  const W = S.w
  const rx = TX[spec.time]
  let svg = `<svg class="tl" viewBox="0 0 ${W} ${S.h}" role="img" aria-label="${esc(spec.aria ?? "timeline")}">`
  const axisW = S.labels ? 1.5 : S.sw * 0.45
  svg += `<line x1="10" y1="${y}" x2="${W - 12}" y2="${y}" style="stroke:var(--axis);stroke-width:${axisW}"/>`
  svg += arrowHead(W - 6, y, 0, S.labels ? 8 : S.sw * 1.6, "var(--axis)")
  if (S.labels) {
    svg += textLabel(12, y + 28, "past", "var(--muted)", "start", 14)
    svg += textLabel(W - 12, y + 28, "future", "var(--muted)", "end", 14)
  }
  const nowIsR = spec.time === "present"
  svg += vline(
    NOW_X,
    S.top + 8,
    y + 10,
    nowIsR ? col("easy") : "var(--muted)",
    false,
    nowIsR ? (S.labels ? 2 : S.sw * 0.5) : S.labels ? 1.2 : S.sw * 0.35,
  )
  if (S.labels) {
    const nowText = nowIsR && spec.rLabel && spec.rLabel !== "now" ? `now · ${spec.rLabel}` : "now"
    svg += textLabel(NOW_X, S.top, nowText, nowIsR ? col("easy") : "var(--muted)", "middle", 15, 400)
  }
  if (spec.time !== "present") {
    const w = S.labels ? 1.6 : S.sw * 0.5
    svg += vline(rx, S.top + 8, y + 10, col("easy"), true, w)
    if (S.labels) svg += textLabel(rx, S.top, spec.rLabel ?? (spec.time === "past" ? "then" : "later"), col("easy"), "middle", 15, 400)
  }
  svg += markSVG({time: spec.time, aspect: spec.aspect, shape: spec.shape, rx, y, S, color: "var(--ink)"})
  return svg + "</svg>"
}

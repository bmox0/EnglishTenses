import {SNAP_PX, classify} from "../domain/geometry"
import type {Action, Classified, Placement, Scene} from "../domain/geometry"
import {tenseName} from "../domain/tenses"
import type {Camera} from "./camera"
import {arcSVG, arrowHead, esc, wavePath} from "./svg"

/** The colour token an action is drawn in. */
export type Tint = "ink" | "good" | "again"

/** What the canvas lets you do: play with it, answer a question on it, or only look. */
export type CanvasMode = "sandbox" | "task" | "view"

/** The ghost dot under the cursor while a new action is being placed, in world coordinates. */
export interface ScenePreview {
  x: number
  y: number
  snapped: boolean
}

/** Everything the canvas passes to draw one frame. */
export interface SceneMarkupInput {
  scene: Scene
  camera: Camera
  width: number
  height: number
  tintOf: (c: Classified) => Tint
  selected?: number | null
  handles?: boolean
  momentLabel?: string
  draggableMoment?: boolean
  showMoment?: boolean
  hideLabels?: boolean
  formOf?: ((c: Classified) => string) | null
  popOf?: (action: Action) => number
  snapAt?: number | null
  ghost?: Placement | null
  emptyHint?: boolean
  preview?: ScenePreview | null
}

const SHAPE = {sw: 3, r: 7, amp: 6, per: 18, arc: 34}
const HALO = "paint-order:stroke;stroke:var(--desk);stroke-width:6px;stroke-linejoin:round"

interface ActionOptions {
  color: string
  selected?: boolean
  handles?: boolean
  form?: string
  hideLabel?: boolean
  pop?: number
  hit?: boolean
}

function text(x: number, y: number, body: string, color: string, anchor = "middle", size = 12, weight = 300): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" style="fill:${color};font-size:${size}px;font-weight:${weight}">${esc(body)}</text>`
}

function niceStep(k: number): number {
  const steps = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000]
  return steps.find((step) => step * k >= 56) ?? 20000
}

function actionMarkup(action: Omit<Action, "id">, c: Classified, camera: Camera, moment: number, opts: ActionOptions): string {
  const X = (x: number) => x * camera.k + camera.tx
  const Y0 = camera.ty
  const y = action.y * camera.k + camera.ty
  const s = Math.min(action.s, action.e)
  const e = Math.max(action.s, action.e)
  const xs = X(s)
  const xe = X(e)
  const xr = X(moment)
  const col = opts.color
  let out = ""
  out += `<line x1="${xs}" y1="${y + 10}" x2="${xs}" y2="${Y0}" style="stroke:var(--axis);stroke-width:1;stroke-dasharray:2 4"/>`
  if (!c.point) out += `<line x1="${xe}" y1="${y + 10}" x2="${xe}" y2="${Y0}" style="stroke:var(--axis);stroke-width:1;stroke-dasharray:2 4"/>`
  const dot = (x: number, r = SHAPE.r) => `<circle cx="${x}" cy="${y}" r="${r}" style="fill:${col}"/>`
  const bar = (a: number, b: number) => `<line x1="${a}" y1="${y}" x2="${b}" y2="${y}" style="stroke:${col};stroke-width:7;stroke-linecap:round"/>`
  const wave = (a: number, b: number) =>
    `<path d="${wavePath(a, b, y, SHAPE.amp, SHAPE.per)}" style="fill:none;stroke:${col};stroke-width:${SHAPE.sw};stroke-linecap:round;stroke-linejoin:round"/>`
  const dotted = (a: number, b: number) =>
    `<line x1="${a}" y1="${y}" x2="${b}" y2="${y}" style="stroke:${col};stroke-width:3;stroke-dasharray:0.1 7;stroke-linecap:round"/>`
  const dots = (a: number, b: number) => {
    let d = ""
    const n = Math.max(2, Math.round((b - a) / 20))
    for (let i = 0; i <= n; i++) d += dot(a + ((b - a) * i) / n, 5)
    return d
  }
  const body = (a: number, b: number) => (c.point ? dot(a) : action.kind === "habit" ? dots(a, b) : bar(a, b))
  if (c.aspect === "simple") out += body(xs, xe)
  else if (c.aspect === "cont") out += dotted(xs - 18, xs) + wave(xs, xe) + dotted(xe, xe + 18)
  else if (c.aspect === "perf") out += body(xs, xe) + arcSVG(xe, xr, y, SHAPE, col, 1.8)
  else if (c.aspect === "perfcont") {
    out +=
      action.kind === "habit"
        ? dots(xs, xr)
        : `<line x1="${xs}" y1="${y - 10}" x2="${xs}" y2="${y + 10}" style="stroke:${col};stroke-width:3"/>` + wave(xs, xr)
    out += `<path d="M${xs},${y + 16} v5 H${xr} v-5" style="fill:none;stroke:${col};stroke-width:1.2"/>`
  } else {
    out += `<g style="opacity:.75">${body(xs, xe)}</g>`
    const cy = y - 30
    out += `<path d="M${xr},${y} Q${(xr + xs) / 2},${cy} ${xs - 9},${y - 3}" style="fill:none;stroke:${col};stroke-width:1.6;stroke-dasharray:4 4"/>`
    out += arrowHead(xs - 8, y - 2, Math.atan2(y - 2 - cy, xs - 8 - (xr + xs) / 2), 7, col)
  }
  const mid = c.point ? xs : (xs + xe) / 2
  const labelY = y - (c.aspect === "perf" || c.aspect === "after" ? 62 : 38)
  const size = 13 * (1 + 0.35 * (opts.pop ?? 0))
  if (!opts.hideLabel) {
    out += `<text x="${mid}" y="${labelY}" text-anchor="middle" style="fill:${col};font-size:${size.toFixed(1)}px;font-weight:400;${HALO}">${esc(tenseName(c.tense))}</text>`
  }
  if (opts.form)
    out += `<text x="${mid}" y="${labelY + 16}" text-anchor="middle" style="fill:var(--muted);font-size:12px;${HALO}">${esc(opts.form)}</text>`
  return out
}

function hitMarkup(action: Action, c: Classified, camera: Camera, handles: boolean): string {
  const X = (x: number) => x * camera.k + camera.tx
  const y = action.y * camera.k + camera.ty
  const xs = X(Math.min(action.s, action.e))
  const xe = X(Math.max(action.s, action.e))
  const pad = c.point ? 14 : 8
  let out = `<line class="sk-ev" data-hit="ev" data-id="${action.id}" x1="${xs - pad}" y1="${y}" x2="${xe + pad}" y2="${y}" style="stroke:transparent;stroke-width:26;stroke-linecap:round"/>`
  if (!handles) return out
  const handle = (kind: "hs" | "he", x: number) =>
    `<circle class="sk-h" data-hit="${kind}" data-id="${action.id}" cx="${x}" cy="${y}" r="6" style="fill:var(--card);stroke:var(--ink);stroke-width:1.5"/>`
  if (c.point) {
    out += `<line x1="${xs + 9}" y1="${y}" x2="${xs + 22}" y2="${y}" style="stroke:var(--muted);stroke-width:1.2;stroke-dasharray:2 2"/>`
    out += handle("he", xs + 26)
  } else {
    out += handle("hs", xs)
    out += handle("he", xe)
  }
  return out
}

/** The whole canvas as SVG markup: the axis, now, the moment, every action, the ghost and the placing preview. */
export function sceneMarkup(input: SceneMarkupInput): string {
  const {scene, camera} = input
  const W = input.width
  const H = input.height
  const X = (x: number) => x * camera.k + camera.tx
  const Y0 = camera.ty
  const tol = SNAP_PX / camera.k
  const showMoment = input.showMoment !== false
  const xr = X(scene.moment)
  const xn = X(0)
  const onNow = showMoment && Math.abs(xr - xn) <= SNAP_PX
  let out = ""
  if (xn > 0) out += `<rect x="0" y="0" width="${Math.min(W, xn)}" height="${H}" style="fill:var(--hover)"/>`
  const step = niceStep(camera.k)
  const first = Math.floor(-camera.tx / camera.k / step) * step
  for (let x = first; X(x) < W + step * camera.k; x += step) {
    const sx = X(x)
    const big = Math.round(x / step) % 5 === 0
    out += `<line x1="${sx}" y1="${Y0 - (big ? 6 : 3)}" x2="${sx}" y2="${Y0 + (big ? 6 : 3)}" style="stroke:var(--axis);stroke-width:1"/>`
  }
  out += `<line x1="0" y1="${Y0}" x2="${W}" y2="${Y0}" style="stroke:var(--axis);stroke-width:1.5"/>`
  out += arrowHead(W - 4, Y0, 0, 9, "var(--axis)")
  out += text(14, Y0 + 26, "← past", "var(--muted)", "start", 13)
  out += text(W - 14, Y0 + 26, "future →", "var(--muted)", "end", 13)
  if (xn > 60 && xn < W - 60) {
    if (xn - 90 > 14 + 70) out += text(xn - 14, Y0 + 26, "earlier", "var(--muted)", "end")
    if (xn + 90 < W - 14 - 90) out += text(xn + 14, Y0 + 26, "later", "var(--muted)", "start")
  }
  out += `<line x1="${xn}" y1="0" x2="${xn}" y2="${H}" style="stroke:var(--muted);stroke-width:1.4"/>`
  if (!onNow) {
    const nowText = "now · speaking"
    const nw = nowText.length * 8 + 24
    out += `<rect x="${xn - nw / 2}" y="14" width="${nw}" height="24" rx="12" style="fill:var(--card);stroke:var(--line)"/>`
    out += text(xn, 31, nowText, "var(--ink)", "middle", 13, 400)
  }
  if (input.snapAt != null)
    out += `<line x1="${X(input.snapAt)}" y1="0" x2="${X(input.snapAt)}" y2="${H}" style="stroke:var(--easy);stroke-opacity:.2;stroke-width:16"/>`
  if (showMoment) {
    out += `<line x1="${xr}" y1="0" x2="${xr}" y2="${H}" style="stroke:var(--easy);stroke-width:2;stroke-dasharray:6 5"/>`
    out += `<line class="sk-r" data-hit="r" x1="${xr}" y1="0" x2="${xr}" y2="${H}" style="stroke:transparent;stroke-width:22"/>`
    const rText = onNow ? "the moment = now" : `${input.momentLabel || "the moment"}${input.draggableMoment ? " ⇆" : ""}`
    const rw = rText.length * 8 + 26
    out += `<rect class="sk-r" data-hit="r" x="${xr - rw / 2}" y="${onNow ? 14 : 46}" width="${rw}" height="26" rx="13" style="fill:var(--easy)"/>`
    out += `<text class="sk-r" data-hit="r" x="${xr}" y="${onNow ? 32 : 64}" text-anchor="middle" style="fill:var(--card);font-size:13px;font-weight:400">${esc(rText)}</text>`
  }
  for (const action of scene.actions) {
    const c = classify(action, scene.moment, tol)
    out += actionMarkup(action, c, camera, scene.moment, {
      color: `var(--${input.tintOf(c)})`,
      form: input.formOf?.(c),
      hideLabel: input.hideLabels,
      pop: input.popOf?.(action) ?? 0,
    })
    out += hitMarkup(action, c, camera, input.handles === true && input.selected === action.id)
  }
  const ghost = input.ghost
  if (ghost) {
    if (Math.abs(X(ghost.moment) - xr) > SNAP_PX) {
      out += `<line x1="${X(ghost.moment)}" y1="0" x2="${X(ghost.moment)}" y2="${H}" style="stroke:var(--again);stroke-width:2;stroke-dasharray:6 5"/>`
    }
    const c = classify(ghost, ghost.moment, tol)
    out += actionMarkup({s: ghost.s, e: ghost.e, y: -170, kind: ghost.kind}, c, camera, ghost.moment, {
      color: "var(--again)",
      hideLabel: input.hideLabels,
    })
  }
  if (input.emptyHint && scene.actions.length === 0) {
    const inset = W > 900 ? 470 : 0
    const cx = inset + (W - inset) / 2
    out += text(cx, Y0 - 90, "The timeline is empty.", "var(--muted)", "middle", 14)
    out += text(cx, Y0 - 66, "Press “+ Action” (or A) and click where the action happens.", "var(--muted)", "middle", 14)
  }
  const preview = input.preview
  if (preview) {
    const sx = X(preview.x)
    const sy = preview.y * camera.k + camera.ty
    out += `<line x1="${sx}" y1="${sy}" x2="${sx}" y2="${Y0}" style="stroke:var(--easy);stroke-width:1;stroke-dasharray:3 4"/>`
    out += `<circle cx="${sx}" cy="${sy}" r="8" style="fill:var(--easy);opacity:.55"/>`
    if (preview.snapped) out += `<line x1="${sx}" y1="0" x2="${sx}" y2="${H}" style="stroke:var(--easy);stroke-opacity:.2;stroke-width:16"/>`
    const c = classify({s: preview.x, e: preview.x, kind: "once"}, scene.moment, tol)
    out += `<text x="${sx + 14}" y="${sy - 12}" style="fill:var(--easy);font-size:13px;font-weight:400;paint-order:stroke;stroke:var(--desk);stroke-width:6px">${esc(tenseName(c.tense))}</text>`
  }
  return out
}

/** The dotted desk background, as a style object that follows the camera. */
export function gridBackground(camera: Camera): {backgroundSize: string; backgroundPosition: string} {
  let size = 24 * camera.k
  while (size < 16) size *= 2
  while (size > 40) size /= 2
  return {backgroundSize: `${size}px ${size}px`, backgroundPosition: `${camera.tx}px ${camera.ty}px`}
}

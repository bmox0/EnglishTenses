import {SNAP_PX, classify} from "../domain/geometry"
import type {Classified, Placement, Scene} from "../domain/geometry"
import {tenseName} from "../domain/tenses"
import type {Camera} from "./camera"
import {sceneMarkup} from "./render"
import type {Tint} from "./render"

/** Every custom property an exported picture carries with it, so the file does not need the app's stylesheet. */
export const THEME_TOKENS = [
  "desk",
  "pane",
  "card",
  "ink",
  "muted",
  "rule",
  "line",
  "hover",
  "again",
  "hard",
  "good",
  "easy",
  "axis",
  "dot",
  "thumb",
  "thumb-hover",
  "mono",
] as const

/** The box an exported timeline is drawn in: the picture keeps the content clear of these margins. */
const BOX = {width: 1200, side: 90, label: 88, pills: 104, bottom: 60, pad: 320, maxHeight: 900}

const CARD_PAD = 16
const GHOST_Y = -170
const SCALE = 2
const FONT_FAMILY = "Iosevka Charon"
const FALLBACK_MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'
const FETCH_TIMEOUT = 8000

/** The camera an exported timeline is drawn with, and the box it fills. */
export interface ExportFrame {
  camera: Camera
  width: number
  height: number
}

/** What an exported timeline picture needs from the live canvas. */
export interface TimelineExportInput {
  scene: Scene
  tintOf: (c: Classified) => Tint
  selected?: number | null
  momentLabel?: string
  showMoment?: boolean
  hideLabels?: boolean
  formOf?: ((c: Classified) => string) | null
  ghost?: Placement | null
}

/**
 * The camera and the box that hold the whole content — `xs` are the world x of now, the moment and every action end,
 * `ys` the rows the actions sit on — with room above for the tense labels and below for the axis words. Unlike
 * `fitCamera` it reserves no left inset: an exported picture has no floating panel over it.
 */
export function exportFrame(xs: readonly number[], ys: readonly number[], width: number = BOX.width): ExportFrame {
  const all = [0, ...xs]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const top = Math.min(0, ...ys)
  const avail = Math.max(200, width - BOX.side * 2)
  const fitX = avail / (hi - lo + BOX.pad)
  const fitY = (BOX.maxHeight - BOX.label - BOX.bottom) / Math.max(1, -top)
  const k = Math.min(1.6, Math.max(0.2, Math.min(fitX, fitY)))
  const tx = BOX.side + (avail - (hi - lo) * k) / 2 - lo * k
  const ty = Math.round(Math.max(BOX.pills, BOX.label - top * k))
  return {camera: {k, tx, ty}, width, height: ty + BOX.bottom}
}

/** The PNG file name a title lands in someone's notes under, e.g. `Past Continuous` → `past-continuous.png`. */
export function pngName(title: string | null | undefined, fallback = "timeline"): string {
  const slug = (title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${slug || fallback}.png`
}

/** Replaces every `var(--token)` in `markup` with its value from `tokens`, leaving a token the lookup does not carry alone. */
export function resolveVars(markup: string, tokens: Readonly<Record<string, string>>): string {
  return markup.replace(/var\(\s*--([\w-]+)\s*\)/g, (whole: string, name: string) => tokens[name] ?? whole)
}

/** Saves the timeline's content — the axis, now, the moment and every action — as a PNG file cropped to what is drawn. */
export async function saveTimelinePng(input: TimelineExportInput): Promise<void> {
  const scene = input.scene
  const ghost = input.ghost ?? null
  const xs = [0, scene.moment, ...scene.actions.flatMap((action) => [action.s, action.e])]
  const ys = scene.actions.map((action) => action.y)
  if (ghost) {
    xs.push(ghost.moment, ghost.s, ghost.e)
    ys.push(GHOST_Y)
  }
  const frame = exportFrame(xs, ys)
  const tokens = readTokens()
  const body = sceneMarkup({
    scene,
    camera: frame.camera,
    width: frame.width,
    height: frame.height,
    tintOf: input.tintOf,
    selected: null,
    handles: false,
    momentLabel: input.momentLabel,
    draggableMoment: false,
    showMoment: input.showMoment,
    hideLabels: input.hideLabels,
    formOf: input.formOf ?? null,
    ghost,
  })
  const mono = await monoStack([300, 400], textOf(body))
  const style = `${mono.faces}text{font-family:${mono.family};}`
  const svg = svgDocument({width: frame.width, height: frame.height, background: tokens.desk ?? "#ffffff", style, body: resolveVars(body, tokens)})
  await rasterise(svg, frame.width, frame.height, timelineName(input, frame.camera))
}

/** Saves one tense card — a `.detail` block of the Tenses sheet — as a PNG file, with the app's own styles baked in. */
export async function saveCardPng(element: HTMLElement, title: string): Promise<void> {
  const rect = element.getBoundingClientRect()
  const width = Math.ceil(rect.width)
  const height = Math.ceil(rect.height) + 2
  const tokens = readTokens()
  const clone = element.cloneNode(true) as HTMLElement
  for (const hidden of Array.from(clone.querySelectorAll("[data-noexport]"))) hidden.remove()
  clone.style.margin = "0"
  clone.style.width = `${width}px`
  const mono = await monoStack([300, 400, 500], element.textContent ?? "")
  const declarations = THEME_TOKENS.map((name) => `--${name}:${name === "mono" ? mono.family : (tokens[name] ?? "")};`).join("")
  const style = `${mono.faces}${appStyles()}.tx-root{${declarations}font:300 15px/1.5 var(--mono);color:var(--ink);width:${width}px;}`
  const body =
    `<foreignObject x="${CARD_PAD}" y="${CARD_PAD}" width="${width}" height="${height}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" class="tx-root">${new XMLSerializer().serializeToString(clone)}</div>` +
    `</foreignObject>`
  const box = {width: width + CARD_PAD * 2, height: height + CARD_PAD * 2}
  const svg = svgDocument({...box, background: tokens.pane ?? "#ffffff", style, body})
  await rasterise(svg, box.width, box.height, pngName(title, "tense-card"))
}

function timelineName(input: TimelineExportInput, camera: Camera): string {
  if (input.hideLabels) return pngName(null)
  const actions = input.scene.actions
  const action = actions.find((item) => item.id === input.selected) ?? actions[0]
  if (!action) return pngName(null)
  return pngName(tenseName(classify(action, input.scene.moment, SNAP_PX / camera.k).tense))
}

function readTokens(): Record<string, string> {
  const style = getComputedStyle(document.documentElement)
  const tokens: Record<string, string> = {}
  for (const name of THEME_TOKENS) tokens[name] = style.getPropertyValue(`--${name}`).trim()
  return tokens
}

function appStyles(): string {
  let out = ""
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null
    try {
      rules = sheet.cssRules
    } catch {
      rules = null
    }
    if (!rules) continue
    for (const rule of Array.from(rules)) out += rule.cssText
  }
  return out
}

function textOf(markup: string): string {
  return [...markup.matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
    .map((match) => match[1] ?? "")
    .join("")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
}

function svgDocument(spec: {width: number; height: number; background: string; style: string; body: string}): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}">` +
    `<style><![CDATA[${spec.style}]]></style>` +
    `<rect x="0" y="0" width="${spec.width}" height="${spec.height}" fill="${spec.background}"/>` +
    spec.body +
    `</svg>`
  )
}

async function rasterise(svg: string, width: number, height: number, name: string): Promise<void> {
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(width * SCALE)
  canvas.height = Math.round(height * SCALE)
  const context = canvas.getContext("2d")
  if (!context) throw new Error("the canvas has no 2d context")
  context.scale(SCALE, SCALE)
  context.drawImage(image, 0, 0, width, height)
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (!png) throw new Error("the canvas produced no PNG")
  download(png, name)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("the picture could not be drawn"))
    image.src = url
  })
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.rel = "noopener"
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const fontCache = new Map<string, Promise<string>>()

async function monoStack(weights: readonly number[], text: string): Promise<{faces: string; family: string}> {
  const faces = await fontFaces(weights, text)
  return {faces, family: faces ? `"${FONT_FAMILY}", ${FALLBACK_MONO}` : FALLBACK_MONO}
}

function fontFaces(weights: readonly number[], text: string): Promise<string> {
  const chars = [...new Set([...text].filter((char) => char.trim() !== ""))].sort().join("")
  if (!chars) return Promise.resolve("")
  const key = `${weights.join(";")}|${chars}`
  const cached = fontCache.get(key)
  if (cached) return cached
  const task = inlineFont(weights, chars).catch((error: unknown) => {
    console.error("Could not inline the font, falling back to a system monospace", error)
    return ""
  })
  fontCache.set(key, task)
  return task
}

async function inlineFont(weights: readonly number[], chars: string): Promise<string> {
  const family = FONT_FAMILY.replace(/ /g, "+")
  const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weights.join(";")}&text=${encodeURIComponent(chars)}`
  const css = await fetchText(url)
  const faces = await Promise.all(
    [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(async (match) => {
      const block = match[1] ?? ""
      const source = /url\(([^)]+)\)/.exec(block)?.[1]
      if (!source) return ""
      const weight = /font-weight:\s*([^;]+);/.exec(block)?.[1]?.trim() ?? "400"
      const data = await fetchBase64(source)
      return `@font-face{font-family:"${FONT_FAMILY}";font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${data}) format("woff2");}`
    }),
  )
  const out = faces.join("")
  if (!out) throw new Error("the font stylesheet carried no face")
  return out
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {signal: AbortSignal.timeout(FETCH_TIMEOUT)})
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  return response.text()
}

async function fetchBase64(url: string): Promise<string> {
  const response = await fetch(url, {signal: AbortSignal.timeout(FETCH_TIMEOUT)})
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

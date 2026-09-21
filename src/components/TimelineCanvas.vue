<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch, watchEffect} from "vue"

import {SNAP_PX, classify, snap} from "../domain/geometry"
import type {Action, Classified, Placement, Scene} from "../domain/geometry"
import {tenseName} from "../domain/tenses"
import type {Camera} from "../timeline/camera"
import {fitCamera, inView, toWorld, zoomAt} from "../timeline/camera"
import {saveTimelinePng} from "../timeline/export"
import type {CanvasMode, ScenePreview, Tint} from "../timeline/render"
import {gridBackground, sceneMarkup} from "../timeline/render"

const props = withDefaults(
  defineProps<{
    scene: Scene
    camera: Camera | null
    selected: number | null
    mode: CanvasMode
    momentLabel?: string
    showMoment?: boolean
    hideLabels?: boolean
    tintOf?: (c: Classified) => Tint
    formOf?: (c: Classified) => string
    ghost?: Placement | null
    inset?: number
  }>(),
  {momentLabel: "", showMoment: true, hideLabels: false, ghost: null},
)

const emit = defineEmits<{
  "update:scene": [scene: Scene]
  "update:camera": [camera: Camera]
  "update:selected": [id: number | null]
  morph: [target: Classified | null]
}>()

const HINT_BASE = "drag empty space — move · scroll / pinch — zoom"
const HINT_DRAG = " · drag the blue moment and the actions"
const HINT_SANDBOX = " · + Action or A — place a new one · double-click — new action · double-click an action — once ⇄ habit · Delete — remove"

type Drag =
  | {type: "pan"; p0: {x: number; y: number}; tx: number; ty: number; moved: boolean}
  | {type: "pinch"; d0: number; k0: number}
  | {type: "r"; dx: number}
  | {type: "move"; id: number; ox: number; oy: number; len: number}
  | {type: "s" | "e"; id: number}

const svgEl = ref<SVGSVGElement | null>(null)
const width = ref(0)
const height = ref(0)
const placing = ref(false)
const panning = ref(false)
const saving = ref(false)
const hover = ref<{x: number; y: number} | null>(null)
const markup = ref("")

const lastLabel = new Map<number, string>()
const popAt = new Map<number, number>()
const pointers = new Map<number, {x: number; y: number}>()
let drag: Drag | null = null
let snapAt: number | null = null
let popRaf = 0
let animRaf = 0
let morphing = false
let observer: ResizeObserver | null = null

const gridStyle = computed(() => (props.camera ? gridBackground(props.camera) : undefined))
const zoomPercent = computed(() => (props.camera ? `${Math.round(props.camera.k * 100)}%` : ""))
const hint = computed(() => {
  if (props.mode === "view") return HINT_BASE
  return props.mode === "sandbox" ? HINT_BASE + HINT_DRAG + HINT_SANDBOX : HINT_BASE + HINT_DRAG
})

const tint = (c: Classified): Tint => props.tintOf?.(c) ?? "ink"
const interactive = () => props.mode !== "view"

function fitXs(): number[] {
  const xs = [0, props.scene.moment, ...props.scene.actions.flatMap((action) => [action.s, action.e])]
  const ghost = props.ghost
  if (ghost) xs.push(ghost.moment, ghost.s, ghost.e)
  return xs
}

function copies(): Action[] {
  return props.scene.actions.map((action) => ({...action}))
}

function replacing(id: number, next: Action): Action[] {
  return props.scene.actions.map((action) => (action.id === id ? next : {...action}))
}

function nextId(): number {
  return Math.max(0, ...props.scene.actions.map((action) => action.id)) + 1
}

function snapX(x: number, anchors: readonly number[], k: number): number {
  const snapped = snap(x, anchors, k)
  if (snapped.at !== null) snapAt = snapped.at
  return snapped.x
}

function previewPoint(): ScenePreview | null {
  const camera = props.camera
  const point = hover.value
  if (!placing.value || !point || !camera) return null
  const snapped = snap(point.x, [props.scene.moment, 0], camera.k)
  return {x: snapped.x, y: Math.min(-40 / camera.k, point.y), snapped: snapped.at !== null}
}

function draw() {
  const camera = props.camera
  if (!camera || !width.value || !height.value) {
    markup.value = ""
    return
  }
  const now = performance.now()
  const live = new Set<number>()
  for (const action of props.scene.actions) {
    live.add(action.id)
    const label = tenseName(classify(action, props.scene.moment, SNAP_PX / camera.k).tense)
    const before = lastLabel.get(action.id)
    if (before !== undefined && before !== label && !morphing) popAt.set(action.id, now)
    lastLabel.set(action.id, label)
  }
  for (const id of [...lastLabel.keys()]) {
    if (live.has(id)) continue
    lastLabel.delete(id)
    popAt.delete(id)
  }
  const popOf = (action: Action) => {
    const started = popAt.get(action.id)
    return started ? Math.max(0, 1 - (now - started) / 350) : 0
  }
  markup.value = sceneMarkup({
    scene: props.scene,
    camera,
    width: width.value,
    height: height.value,
    tintOf: tint,
    selected: props.selected,
    handles: interactive(),
    momentLabel: props.momentLabel,
    draggableMoment: interactive(),
    showMoment: props.showMoment,
    hideLabels: props.hideLabels,
    formOf: props.formOf,
    popOf,
    snapAt: drag && drag.type !== "pan" ? snapAt : null,
    ghost: props.ghost,
    emptyHint: props.mode === "sandbox" && !placing.value,
    preview: previewPoint(),
  })
  if (!popRaf && props.scene.actions.some((action) => popOf(action) > 0)) {
    popRaf = requestAnimationFrame(() => {
      popRaf = 0
      draw()
    })
  }
}

function setPlacing(on: boolean) {
  placing.value = on
  hover.value = null
}

function clear() {
  emit("update:scene", {moment: props.scene.moment, actions: []})
  emit("update:selected", null)
  setPlacing(false)
}

async function savePng() {
  if (saving.value) return
  saving.value = true
  try {
    await saveTimelinePng({
      scene: props.scene,
      tintOf: tint,
      selected: props.selected,
      momentLabel: props.momentLabel,
      showMoment: props.showMoment,
      hideLabels: props.hideLabels,
      formOf: props.formOf ?? null,
      ghost: props.ghost,
    })
  } catch (error) {
    console.error("Could not save the timeline as a PNG", error)
  } finally {
    saving.value = false
  }
}

function zoomBy(factor: number) {
  const camera = props.camera
  if (!camera) return
  emit("update:camera", zoomAt(camera, {x: width.value / 2, y: height.value / 2}, factor))
}

function pointOf(event: {clientX: number; clientY: number}): {x: number; y: number} {
  const element = svgEl.value
  if (!element) return {x: 0, y: 0}
  const rect = element.getBoundingClientRect()
  return {x: event.clientX - rect.left, y: event.clientY - rect.top}
}

function hitOf(event: Event): SVGElement | HTMLElement | null {
  const target = event.target
  if (!(target instanceof Element)) return null
  const hit = target.closest("[data-hit]")
  return hit instanceof SVGElement || hit instanceof HTMLElement ? hit : null
}

function hitAt(event: MouseEvent): SVGElement | HTMLElement | null {
  const element = document.elementFromPoint(event.clientX, event.clientY)
  const hit = element?.closest("[data-hit]")
  return hit instanceof SVGElement || hit instanceof HTMLElement ? hit : null
}

function placeAt(point: {x: number; y: number}) {
  const camera = props.camera
  if (!camera) return
  const x = snapX(point.x, [props.scene.moment, 0], camera.k)
  const id = nextId()
  emit("update:scene", {moment: props.scene.moment, actions: [...copies(), {id, s: x, e: x, y: Math.min(-40 / camera.k, point.y), kind: "once"}]})
  emit("update:selected", id)
  snapAt = null
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === "mouse" && event.button !== 0) return
  stopAnim()
  const camera = props.camera
  if (!camera) return
  const point = pointOf(event)
  pointers.set(event.pointerId, point)
  try {
    svgEl.value?.setPointerCapture(event.pointerId)
  } catch {}
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    if (a && b) drag = {type: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y), k0: camera.k}
    return
  }
  const hit = hitOf(event)
  const world = toWorld(camera, point)
  if (placing.value && props.mode === "sandbox") {
    placeAt(world)
    pointers.delete(event.pointerId)
    setPlacing(false)
    return
  }
  if (hit && interactive()) {
    const kind = hit.dataset.hit
    if (kind === "r") drag = {type: "r", dx: props.scene.moment - world.x}
    else {
      const id = Number(hit.dataset.id)
      const action = props.scene.actions.find((item) => item.id === id)
      if (!action) return
      emit("update:selected", id)
      if (kind === "ev") drag = {type: "move", id, ox: world.x - action.s, oy: world.y - action.y, len: action.e - action.s}
      else drag = {type: kind === "hs" ? "s" : "e", id}
    }
  } else {
    drag = {type: "pan", p0: point, tx: camera.tx, ty: camera.ty, moved: false}
    panning.value = true
  }
  draw()
}

function onPointerMove(event: PointerEvent) {
  const camera = props.camera
  if (!camera) return
  if (placing.value && !drag) {
    hover.value = toWorld(camera, pointOf(event))
    return
  }
  if (!pointers.has(event.pointerId) || !drag) return
  const point = pointOf(event)
  pointers.set(event.pointerId, point)
  const current = drag
  if (current.type === "pinch") {
    if (pointers.size < 2) return
    const [a, b] = [...pointers.values()]
    if (!a || !b) return
    const mid = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2}
    emit("update:camera", zoomAt(camera, mid, (current.k0 * Math.hypot(a.x - b.x, a.y - b.y)) / current.d0 / camera.k))
    return
  }
  const world = toWorld(camera, point)
  snapAt = null
  if (current.type === "pan") {
    if (Math.hypot(point.x - current.p0.x, point.y - current.p0.y) > 3) current.moved = true
    emit("update:camera", {k: camera.k, tx: current.tx + (point.x - current.p0.x), ty: current.ty + (point.y - current.p0.y)})
    return
  }
  if (current.type === "r") {
    emit("update:scene", {moment: snapX(world.x + current.dx, [0], camera.k), actions: copies()})
    return
  }
  const action = props.scene.actions.find((item) => item.id === current.id)
  if (!action) return
  const anchors = [props.scene.moment, 0]
  if (current.type === "move") {
    const wanted = world.x - current.ox
    const snapped = snapX(wanted, anchors, camera.k)
    const s = snapped !== wanted ? snapped : snapX(wanted + current.len, anchors, camera.k) - current.len
    const next: Action = {...action, s, e: s + current.len, y: Math.min(-28 / camera.k, world.y - current.oy)}
    emit("update:scene", {moment: props.scene.moment, actions: replacing(current.id, next)})
    return
  }
  const x = snapX(world.x, anchors, camera.k)
  const moved: Action = current.type === "s" ? {...action, s: x} : {...action, e: x}
  if (moved.s > moved.e) {
    drag = {type: current.type === "s" ? "e" : "s", id: current.id}
    emit("update:scene", {moment: props.scene.moment, actions: replacing(current.id, {...moved, s: moved.e, e: moved.s})})
    return
  }
  emit("update:scene", {moment: props.scene.moment, actions: replacing(current.id, moved)})
}

function onPointerUp(event: PointerEvent) {
  pointers.delete(event.pointerId)
  if (drag?.type === "pan" && !drag.moved && props.mode === "sandbox") emit("update:selected", null)
  if (pointers.size === 0) {
    drag = null
    snapAt = null
  }
  panning.value = false
  draw()
}

function onPointerLeave() {
  if (!placing.value) return
  hover.value = null
}

function onDblClick(event: MouseEvent) {
  const camera = props.camera
  if (!camera || !interactive()) return
  const hit = hitAt(event)
  const world = toWorld(camera, pointOf(event))
  if (hit?.dataset.hit === "ev") {
    const id = Number(hit.dataset.id)
    const action = props.scene.actions.find((item) => item.id === id)
    if (!action) return
    let next: Action = {...action, kind: "once"}
    if (action.kind !== "habit") {
      const wide = Math.abs(action.e - action.s) * camera.k >= 20
      next = {...action, kind: "habit", s: wide ? action.s : action.s - 90 / camera.k, e: wide ? action.e : action.e + 90 / camera.k}
    }
    emit("update:scene", {moment: props.scene.moment, actions: replacing(id, next)})
    return
  }
  if (!hit && props.mode === "sandbox") {
    const id = nextId()
    emit("update:scene", {
      moment: props.scene.moment,
      actions: [...copies(), {id, s: world.x, e: world.x, y: Math.min(-40 / camera.k, world.y), kind: "once"}],
    })
    emit("update:selected", id)
  }
}

function onWheel(event: WheelEvent) {
  event.preventDefault()
  stopAnim()
  const camera = props.camera
  if (!camera) return
  const point = pointOf(event)
  const trackpad = event.deltaX !== 0 || Math.abs(event.deltaY) < 30
  if (event.ctrlKey || event.metaKey || !trackpad) {
    emit("update:camera", zoomAt(camera, point, Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0025))))
  } else if (event.shiftKey) {
    emit("update:camera", {k: camera.k, tx: camera.tx - event.deltaY, ty: camera.ty})
  } else {
    emit("update:camera", {k: camera.k, tx: camera.tx - event.deltaX, ty: camera.ty - event.deltaY})
  }
}

function typingIn(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === "input" || tag === "textarea" || tag === "select") return true
  return target instanceof HTMLElement && target.isContentEditable
}

function onKeyDown(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return
  if (typingIn(event.target)) return
  const selected = props.selected
  if ((event.key === "Delete" || event.key === "Backspace") && props.mode === "sandbox" && selected !== null) {
    emit("update:scene", {
      moment: props.scene.moment,
      actions: props.scene.actions.filter((action) => action.id !== selected).map((action) => ({...action})),
    })
    emit("update:selected", null)
  } else if (event.key === "Escape" && placing.value) setPlacing(false)
  else if ((event.key === "a" || event.key === "A") && props.mode === "sandbox") setPlacing(!placing.value)
  else if (event.key === "0") fit()
  else if (event.key === "=" || event.key === "+") zoomBy(1.25)
  else if (event.key === "-") zoomBy(0.8)
}

function stopAnim() {
  if (animRaf) cancelAnimationFrame(animRaf)
  animRaf = 0
  if (!morphing) return
  morphing = false
  emit("morph", null)
}

function runAnim(apply: (q: number) => void) {
  const started = performance.now()
  const step = (now: number) => {
    const t = Math.min(1, (now - started) / 550)
    apply(t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
    if (t < 1) {
      animRaf = requestAnimationFrame(step)
      return
    }
    animRaf = 0
    if (!morphing) return
    morphing = false
    emit("morph", null)
  }
  animRaf = requestAnimationFrame(step)
}

/** Slides the selected action, the moment and the camera into `target`, the way the mini table morphs a tense. */
function morphTo(target: Placement, options?: {fit?: boolean}) {
  const camera = props.camera
  if (!camera || !width.value || !height.value) return
  const action = props.scene.actions.find((item) => item.id === props.selected) ?? props.scene.actions[0]
  if (!action) return
  const xs = [target.moment, target.s, target.e]
  const others = props.scene.actions.filter((item) => item.id !== action.id).flatMap((item) => [item.s, item.e])
  const camTarget = options?.fit
    ? fitCamera(xs, width.value, height.value, props.inset)
    : inView(xs, camera, width.value, props.inset)
      ? {...camera}
      : fitCamera([...xs, ...others], width.value, height.value, props.inset)
  const from = {moment: props.scene.moment, s: action.s, e: action.e, k: camera.k, tx: camera.tx, ty: camera.ty}
  stopAnim()
  morphing = true
  emit("morph", classify({s: target.s, e: target.e, kind: target.kind}, target.moment, SNAP_PX / camTarget.k))
  runAnim((q) => {
    const mix = (a: number, b: number) => a + (b - a) * q
    const next: Action = {...action, s: mix(from.s, target.s), e: mix(from.e, target.e), kind: target.kind}
    emit("update:scene", {moment: mix(from.moment, target.moment), actions: replacing(action.id, next)})
    emit("update:camera", {k: mix(from.k, camTarget.k), tx: mix(from.tx, camTarget.tx), ty: mix(from.ty, camTarget.ty)})
  })
}

/** Animates the camera until now, the moment, every action and the ghost are all in view. */
function fit() {
  const camera = props.camera
  if (!camera || !width.value || !height.value) return
  const camTarget = fitCamera(fitXs(), width.value, height.value, props.inset)
  const from = {k: camera.k, tx: camera.tx, ty: camera.ty}
  stopAnim()
  runAnim((q) => {
    const mix = (a: number, b: number) => a + (b - a) * q
    emit("update:camera", {k: mix(from.k, camTarget.k), tx: mix(from.tx, camTarget.tx), ty: mix(from.ty, camTarget.ty)})
  })
}

watchEffect(() => {
  if (props.camera || !width.value || !height.value) return
  emit("update:camera", fitCamera(fitXs(), width.value, height.value, props.inset))
})

watchEffect(draw)

watch(
  () => props.mode,
  (mode) => {
    if (mode !== "sandbox") setPlacing(false)
  },
)

onMounted(() => {
  const element = svgEl.value
  if (!element) return
  const measure = () => {
    const rect = element.getBoundingClientRect()
    width.value = rect.width
    height.value = rect.height
  }
  observer = new ResizeObserver(measure)
  observer.observe(element)
  measure()
  element.addEventListener("wheel", onWheel, {passive: false})
  document.addEventListener("keydown", onKeyDown)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  svgEl.value?.removeEventListener("wheel", onWheel)
  document.removeEventListener("keydown", onKeyDown)
  stopAnim()
  if (popRaf) cancelAnimationFrame(popRaf)
  popRaf = 0
})

defineExpose({morphTo, fit})
</script>

<template>
  <div class="sketch" :class="{placing, panning}" :style="gridStyle">
    <svg
      ref="svgEl"
      class="sk-svg"
      role="img"
      aria-label="Timeline canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerLeave"
      @dblclick="onDblClick"
      v-html="markup"
    ></svg>
    <div v-if="mode === 'sandbox'" class="sk-tools">
      <button type="button" :class="{on: placing}" title="Add an action (A)" @click="setPlacing(!placing)">+ Action</button>
      <button type="button" title="Remove every action" @click="clear">Clear</button>
    </div>
    <div class="zoombar">
      <button type="button" aria-label="Zoom out" @click="zoomBy(0.8)">−</button>
      <span>{{ zoomPercent }}</span>
      <button type="button" aria-label="Zoom in" @click="zoomBy(1.25)">+</button>
      <button type="button" @click="fit">Fit</button>
      <button type="button" :disabled="saving" title="Download the timeline as a PNG" aria-label="Download the timeline as a PNG" @click="savePng">
        PNG
      </button>
    </div>
    <div class="sk-hint">{{ hint }}</div>
  </div>
</template>

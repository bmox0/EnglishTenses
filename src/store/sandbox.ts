import {computed, inject, reactive} from "vue"

import {SNAP_PX, classify} from "../domain/geometry"
import {defaultSandboxScene, morphTarget} from "../domain/sandbox"

import type {Action, Classified, Placement, Scene} from "../domain/geometry"
import type {SandboxChoice} from "../domain/sandbox"
import type {GridTense} from "../domain/tenses"
import type {Camera} from "../timeline/camera"
import type {ComputedRef, InjectionKey} from "vue"

/** The sandbox's reactive state: its scene, camera, selection, current choice and any in-flight morph target. */
export interface SandboxState {
  scene: Scene
  camera: Camera | null
  selected: number | null
  choice: SandboxChoice
  morphing: Classified | null
}

/** The sandbox: its state, the tense the selected action currently reads as, and the ways the panel and the canvas change it. */
export interface Sandbox {
  state: SandboxState
  display: ComputedRef<Classified | null>
  reset(): void
  open(placement: Placement): void
  prepareMorph(tense: GridTense): Placement
}

/** The default verb, subject and moment the sandbox starts with. */
const DEFAULT_CHOICE: SandboxChoice = {verb: "cook", subject: "I", moment: "call"}

/** The injection key `useSandbox()` reads and `main.ts` provides. */
export const SandboxKey: InjectionKey<Sandbox> = Symbol("sandbox")

function nextId(actions: readonly Action[]): number {
  return Math.max(0, ...actions.map((action) => action.id)) + 1
}

/** Creates the sandbox state: the timeline scene, the panel's choice, and the morph the mini table and the canvas share. */
export function createSandbox(): Sandbox {
  const state = reactive<SandboxState>({
    scene: defaultSandboxScene(),
    camera: null,
    selected: 1,
    choice: {...DEFAULT_CHOICE},
    morphing: null,
  })

  const display = computed<Classified | null>(() => {
    if (state.morphing) return state.morphing
    const action = state.scene.actions.find((item) => item.id === state.selected)
    if (!action) return null
    const k = state.camera?.k ?? 1
    return classify(action, state.scene.moment, SNAP_PX / k)
  })

  function reset() {
    state.scene = defaultSandboxScene()
    state.selected = 1
    state.camera = null
    state.morphing = null
  }

  function open(placement: Placement) {
    state.scene = {moment: placement.moment, actions: [{id: 1, s: placement.s, e: placement.e, y: -90, kind: placement.kind}]}
    state.selected = 1
    state.camera = null
  }

  function prepareMorph(tense: GridTense): Placement {
    if (state.selected === null || !state.scene.actions.some((action) => action.id === state.selected)) {
      if (state.scene.actions.length === 0) {
        const id = nextId(state.scene.actions)
        state.scene = {moment: state.scene.moment, actions: [{id, s: 0, e: 0, y: -90, kind: "once"}]}
        state.selected = id
      } else {
        state.selected = state.scene.actions[0]?.id ?? null
      }
    }
    return morphTarget(tense, state.scene.moment, state.camera?.k ?? 1)
  }

  return {state, display, reset, open, prepareMorph}
}

/** The sandbox provided by the app root. */
export function useSandbox(): Sandbox {
  const sandbox = inject(SandboxKey)
  if (!sandbox) throw new Error("useSandbox() called outside the app")
  return sandbox
}

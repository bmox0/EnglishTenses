import {describe, expect, it} from "vitest"

import {SNAP_PX, classify} from "../domain/geometry"
import {defaultSandboxScene} from "../domain/sandbox"
import {createSandbox} from "./sandbox"

import type {Classified} from "../domain/geometry"

describe("createSandbox", () => {
  it("TC-17 starts with the default scene and selected 1", () => {
    const sandbox = createSandbox()
    expect(sandbox.state.scene).toEqual(defaultSandboxScene())
    expect(sandbox.state.selected).toBe(1)
  })
})

describe("display", () => {
  it("TC-17 classifies the selected action at the camera's k, and returns morphing instead once it is set", () => {
    const sandbox = createSandbox()
    const scene = defaultSandboxScene()
    const selectedAction = scene.actions.find((action) => action.id === sandbox.state.selected)
    if (!selectedAction) throw new Error("the default scene has no action matching the initial selection")

    expect(sandbox.display.value).toEqual(classify(selectedAction, scene.moment, SNAP_PX / 1))

    sandbox.state.camera = {k: 2, tx: 0, ty: 0}
    expect(sandbox.display.value).toEqual(classify(selectedAction, scene.moment, SNAP_PX / 2))

    const override: Classified = {tense: "future.perf", time: "future", aspect: "perf", point: true}
    sandbox.state.morphing = override
    expect(sandbox.display.value).toEqual(override)
  })

  it("TC-17 is null when no action is selected", () => {
    const sandbox = createSandbox()
    sandbox.state.selected = null
    expect(sandbox.display.value).toBeNull()
  })
})

describe("prepareMorph", () => {
  it("TC-17 selects the first action when nothing is selected", () => {
    const sandbox = createSandbox()
    sandbox.state.selected = null
    sandbox.prepareMorph("past.perf")
    expect(sandbox.state.selected).toBe(1)
  })

  it("TC-17 adds an action at s 0, e 0, y -90 and selects it when there are no actions", () => {
    const sandbox = createSandbox()
    sandbox.state.scene.actions = []
    sandbox.prepareMorph("past.perf")
    expect(sandbox.state.scene.actions).toHaveLength(1)
    const added = sandbox.state.scene.actions[0]
    expect(added).toMatchObject({s: 0, e: 0, y: -90, kind: "once"})
    expect(sandbox.state.selected).toBe(added?.id)
  })

  it("TC-17 shifts the canonical past.perf target onto the current moment at -260", () => {
    const sandbox = createSandbox()
    expect(sandbox.state.scene.moment).toBe(-260)
    const placement = sandbox.prepareMorph("past.perf")
    expect(placement.moment).toBe(-260)
    expect(placement.s).toBe(-420)
    expect(placement.e).toBe(-420)
  })

  it("TC-17 leaves the canonical past.perf target untouched when the moment is on now", () => {
    const sandbox = createSandbox()
    sandbox.state.scene.moment = 0
    const placement = sandbox.prepareMorph("past.perf")
    expect(placement.moment).toBe(-300)
    expect(placement.s).toBe(-460)
    expect(placement.e).toBe(-460)
  })
})

describe("open", () => {
  it("TC-17 leaves one action at the placement, selects it, clears the camera and keeps the choice", () => {
    const sandbox = createSandbox()
    const before = {...sandbox.state.choice}
    sandbox.state.camera = {k: 1.4, tx: 3, ty: 9}

    sandbox.open({moment: 150, s: 100, e: 220, kind: "once"})

    expect(sandbox.state.scene).toEqual({moment: 150, actions: [{id: 1, s: 100, e: 220, y: -90, kind: "once"}]})
    expect(sandbox.state.selected).toBe(1)
    expect(sandbox.state.camera).toBeNull()
    expect(sandbox.state.choice).toEqual(before)
  })
})

describe("reset", () => {
  it("TC-17 restores the default scene, selects 1, clears the camera and morphing, and keeps the choice", () => {
    const sandbox = createSandbox()
    const before = {...sandbox.state.choice}
    sandbox.open({moment: 150, s: 100, e: 220, kind: "once"})
    sandbox.state.camera = {k: 2, tx: 1, ty: 1}
    sandbox.state.morphing = {tense: "future.perf", time: "future", aspect: "perf", point: true}

    sandbox.reset()

    expect(sandbox.state.scene).toEqual(defaultSandboxScene())
    expect(sandbox.state.selected).toBe(1)
    expect(sandbox.state.camera).toBeNull()
    expect(sandbox.state.morphing).toBeNull()
    expect(sandbox.state.choice).toEqual(before)
  })
})

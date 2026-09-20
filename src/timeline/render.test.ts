import {describe, expect, it} from "vitest"

import {SNAP_PX, classify} from "../domain/geometry"
import type {Action, Placement, Scene} from "../domain/geometry"
import {tenseName} from "../domain/tenses"
import {gridBackground, sceneMarkup} from "./render"

const camera = {k: 1, tx: 500, ty: 400}
const width = 1000
const height = 600
const tintOf = () => "ink" as const

const actions: Action[] = [
  {id: 1, s: 100, e: 100, y: -90, kind: "once"},
  {id: 2, s: -200, e: -50, y: -150, kind: "once"},
  {id: 3, s: 300, e: 300, y: -230, kind: "once"},
]

const nowScene: Scene = {moment: 0, actions}
const pastScene: Scene = {moment: -260, actions}

const tol = SNAP_PX / camera.k

function baseInput(overrides: Record<string, unknown> = {}) {
  return {scene: nowScene, camera, width, height, tintOf, ...overrides}
}

function evTags(markup: string) {
  return markup.match(/<[^>]*data-hit="ev"[^>]*>/g) ?? []
}

describe("sceneMarkup", () => {
  it("TC-12 draws one data-hit=ev element per action, carrying its data-id", () => {
    const markup = sceneMarkup(baseInput())
    const tags = evTags(markup)
    expect(tags).toHaveLength(3)
    const ids = tags.map((tag) => tag.match(/data-id="(\d+)"/)?.[1]).sort()
    expect(ids).toEqual(["1", "2", "3"])
  })

  it("TC-12 removes the tense names when hideLabels is set", () => {
    const shown = sceneMarkup(baseInput())
    const hidden = sceneMarkup(baseInput({hideLabels: true}))
    const labels = actions.map((action) => tenseName(classify(action, nowScene.moment, tol).tense))
    for (const label of labels) {
      expect(shown).toContain(label)
      expect(hidden).not.toContain(label)
    }
  })

  it("TC-12 removes data-hit=r and the moment pill when showMoment is false", () => {
    const shown = sceneMarkup(baseInput())
    const hidden = sceneMarkup(baseInput({showMoment: false}))
    expect(shown).toContain('data-hit="r"')
    expect(hidden).not.toContain('data-hit="r"')
    expect(shown).toContain("the moment = now")
    expect(hidden).not.toContain("the moment = now")
  })

  it("TC-12 reads 'the moment = now' when the moment is on now", () => {
    const markup = sceneMarkup(baseInput())
    expect(markup).toContain("the moment = now")
  })

  it("TC-12 reads momentLabel with an arrow only when the moment is draggable", () => {
    const draggable = sceneMarkup(baseInput({scene: pastScene, momentLabel: "she called", draggableMoment: true}))
    const fixed = sceneMarkup(baseInput({scene: pastScene, momentLabel: "she called", draggableMoment: false}))
    expect(draggable).toContain("she called ⇆")
    expect(fixed).toContain("she called")
    expect(fixed).not.toContain("she called ⇆")
  })

  it("TC-12 draws a ghost action in var(--again) with its own tense label", () => {
    const ghost: Placement = {moment: -480, s: -480, e: -480, kind: "once"}
    const withoutGhost = sceneMarkup(baseInput())
    const withGhost = sceneMarkup(baseInput({ghost}))
    expect(withoutGhost).not.toContain("var(--again)")
    expect(withGhost).toContain("var(--again)")
    const ghostLabel = tenseName(classify(ghost, ghost.moment, tol).tense)
    expect(withGhost).toContain(ghostLabel)
  })

  it("TC-12 escapes HTML in momentLabel", () => {
    const markup = sceneMarkup(baseInput({scene: pastScene, momentLabel: "<b>", draggableMoment: false}))
    expect(markup).toContain("&lt;b&gt;")
    expect(markup).not.toContain("<b>")
  })

  it("draws the handles of the selected action only when handles is set", () => {
    const off = sceneMarkup(baseInput({selected: 2}))
    const on = sceneMarkup(baseInput({selected: 2, handles: true}))
    expect(off).not.toContain('data-hit="hs"')
    expect(on).toContain('data-hit="hs" data-id="2"')
    expect(on).toContain('data-hit="he" data-id="2"')
    expect(on).not.toContain('data-id="1" cx')
  })

  it("draws the empty-state lines only when emptyHint is set and there is no action", () => {
    const empty: Scene = {moment: 0, actions: []}
    expect(sceneMarkup(baseInput({scene: empty}))).not.toContain("The timeline is empty.")
    expect(sceneMarkup(baseInput({scene: empty, emptyHint: true}))).toContain("The timeline is empty.")
    expect(sceneMarkup(baseInput({emptyHint: true}))).not.toContain("The timeline is empty.")
  })

  it("draws the placing preview, and its snap glow only when the point is snapped", () => {
    const none = sceneMarkup(baseInput())
    const loose = sceneMarkup(baseInput({preview: {x: -260, y: -90, snapped: false}}))
    const snapped = sceneMarkup(baseInput({preview: {x: -260, y: -90, snapped: true}}))
    expect(none).not.toContain("opacity:.55")
    expect(loose).toContain("opacity:.55")
    expect(loose).not.toContain("stroke-opacity:.2")
    expect(snapped).toContain("stroke-opacity:.2")
  })

  it("puts the escaped formOf text under each action", () => {
    const markup = sceneMarkup(baseInput({formOf: () => "I <had> cooked"}))
    expect(markup.match(/I &lt;had&gt; cooked/g)).toHaveLength(3)
  })
})

describe("gridBackground", () => {
  it("keeps the dot grid between 16 and 40 pixels and pins it to the camera", () => {
    expect(gridBackground({k: 1.25, tx: 500, ty: 400})).toEqual({backgroundSize: "30px 30px", backgroundPosition: "500px 400px"})
    expect(gridBackground({k: 0.25, tx: 0, ty: 0}).backgroundSize).toBe("24px 24px")
    expect(gridBackground({k: 3, tx: 0, ty: 0}).backgroundSize).toBe("36px 36px")
  })
})

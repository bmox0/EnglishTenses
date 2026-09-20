import {describe, expect, it} from "vitest"

import type {Scene} from "../domain/geometry"
import {THEME_TOKENS, exportFrame, pngName, resolveVars} from "./export"
import {sceneMarkup} from "./render"

const xs = [0, -300, -480, -120]
const ys = [-40, -170, -300]

describe("exportFrame", () => {
  it("fits every x inside the side margins of the 1200px box", () => {
    const {camera, width} = exportFrame(xs, ys)
    expect(width).toBe(1200)
    for (const x of xs) {
      const sx = x * camera.k + camera.tx
      expect(sx).toBeGreaterThanOrEqual(90)
      expect(sx).toBeLessThanOrEqual(width - 90)
    }
  })

  it("centres the content instead of reserving the panel's left inset", () => {
    const {camera, width} = exportFrame(xs, ys)
    const sxs = xs.map((x) => x * camera.k + camera.tx)
    expect(Math.min(...sxs)).toBeCloseTo(width - Math.max(...sxs))
  })

  it("leaves 88px above the topmost action for its tense label and 60px below the axis for the words", () => {
    const {camera, height} = exportFrame(xs, ys)
    expect(Math.min(...ys) * camera.k + camera.ty).toBeGreaterThanOrEqual(88)
    expect(height - camera.ty).toBe(60)
  })

  it("keeps the now and moment pills clear when nothing sits above the axis", () => {
    const {camera, height} = exportFrame([0], [])
    expect(camera.ty).toBe(104)
    expect(height).toBe(164)
  })

  it("clamps k to [0.2, 1.6]", () => {
    expect(exportFrame([0, -100000], [-40]).camera.k).toBeCloseTo(0.2)
    expect(exportFrame([0, 10], [-40]).camera.k).toBeCloseTo(1.6)
  })

  it("shrinks a tall stack of actions so the picture stays under 900px high", () => {
    expect(exportFrame([0, -200], [-40, -2000]).height).toBeLessThanOrEqual(900)
  })
})

describe("pngName", () => {
  it("slugs a tense name", () => {
    expect(pngName("Past Continuous")).toBe("past-continuous.png")
    expect(pngName("Future in the Past")).toBe("future-in-the-past.png")
  })

  it("drops the characters a file name should not carry", () => {
    expect(pngName("Present Perfect · Continuous!")).toBe("present-perfect-continuous.png")
  })

  it("falls back when no title is left", () => {
    expect(pngName(null)).toBe("timeline.png")
    expect(pngName("")).toBe("timeline.png")
    expect(pngName("···")).toBe("timeline.png")
    expect(pngName(null, "card")).toBe("card.png")
  })
})

describe("resolveVars", () => {
  const tokens = {ink: "#1b2233", again: "#c23a4e", desk: "rgb(227, 232, 239)"}

  it("puts the concrete value in place of every var() it knows", () => {
    expect(resolveVars('style="fill:var(--ink);stroke:var(--desk)"', tokens)).toBe('style="fill:#1b2233;stroke:rgb(227, 232, 239)"')
    expect(resolveVars("var(--again) var(--again)", tokens)).toBe("#c23a4e #c23a4e")
  })

  it("leaves a token it does not know alone", () => {
    expect(resolveVars("fill:var(--nope)", tokens)).toBe("fill:var(--nope)")
  })

  it("leaves no var() behind in the markup the canvas produces", () => {
    const scene: Scene = {moment: -300, actions: [{id: 1, s: -460, e: -460, y: -90, kind: "once"}]}
    const frame = exportFrame([0, scene.moment, -460], [-90])
    const markup = sceneMarkup({
      scene,
      camera: frame.camera,
      width: frame.width,
      height: frame.height,
      tintOf: () => "ink",
      momentLabel: "she called",
      formOf: () => "I had cooked",
    })
    const every = Object.fromEntries(THEME_TOKENS.map((name) => [name, "#000000"]))
    expect(markup).toContain("var(--")
    expect(resolveVars(markup, every)).not.toContain("var(--")
  })
})

import {describe, expect, it} from "vitest"

import {EDGE_INSET, fitCamera, inView, leftInset, toWorld, zoomAt} from "./camera"

const xs = [0, -260, -480, -120]
const width = 1400
const height = 800

describe("fitCamera", () => {
  it("TC-11 fits every x inside the inset margins, sets ty from the height, and clamps k to [0.2, 1.6]", () => {
    const camera = fitCamera(xs, width, height)
    for (const x of xs) {
      const sx = x * camera.k + camera.tx
      expect(sx).toBeGreaterThanOrEqual(470 + 20)
      expect(sx).toBeLessThanOrEqual(width - 40)
    }
    expect(camera.ty).toBeCloseTo(height * 0.68)
    expect(camera.k).toBeGreaterThanOrEqual(0.2)
    expect(camera.k).toBeLessThanOrEqual(1.6)
  })

  it("keeps now in view even when no x is near it", () => {
    const camera = fitCamera([-2000, -1800], width, height)
    expect(inView([0], camera, width)).toBe(true)
  })

  it("clamps k to 0.2 for a huge span and to 1.6 for a tiny one", () => {
    expect(fitCamera([0, -100000], width, height).k).toBeCloseTo(0.2)
    expect(fitCamera([0, 10], width, height).k).toBeCloseTo(1.6)
  })

  it("uses the panel's inset by default and the edge inset once the panel is folded", () => {
    expect(fitCamera(xs, width, height)).toEqual(fitCamera(xs, width, height, leftInset(width)))
    const folded = fitCamera(xs, width, height, EDGE_INSET)
    const left = Math.min(...xs.map((x) => x * folded.k + folded.tx))
    expect(left).toBeLessThan(470)
    expect(left).toBeGreaterThanOrEqual(EDGE_INSET + 20)
    expect(folded.k).toBeGreaterThan(fitCamera(xs, width, height).k)
  })
})

describe("leftInset", () => {
  it("TC-11 is 470 above 900px wide and 24 at or below it", () => {
    expect(leftInset(1400)).toBe(470)
    expect(leftInset(800)).toBe(24)
  })

  it("turns over above 900, not at it", () => {
    expect(leftInset(900)).toBe(24)
    expect(leftInset(901)).toBe(470)
  })
})

describe("zoomAt", () => {
  it("TC-11 keeps the world point under the cursor fixed", () => {
    const camera = fitCamera(xs, width, height)
    const cursor = {x: 700, y: 400}
    const before = toWorld(camera, cursor)
    const zoomed = zoomAt(camera, cursor, 1.25)
    const after = toWorld(zoomed, cursor)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it("TC-11 clamps k to [0.12, 6]", () => {
    const camera = fitCamera(xs, width, height)
    const cursor = {x: 700, y: 400}
    expect(zoomAt(camera, cursor, 0.0001).k).toBeCloseTo(0.12)
    expect(zoomAt(camera, cursor, 10000).k).toBeCloseTo(6)
  })

  it("returns a new camera and leaves the given one untouched", () => {
    const camera = {k: 1, tx: 100, ty: 200}
    const zoomed = zoomAt(camera, {x: 100, y: 200}, 2)
    expect(camera).toEqual({k: 1, tx: 100, ty: 200})
    expect(zoomed).toEqual({k: 2, tx: 100, ty: 200})
  })
})

describe("toWorld", () => {
  it("TC-11 inverts the camera", () => {
    const camera = fitCamera(xs, width, height)
    const point = {x: 900, y: 300}
    const world = toWorld(camera, point)
    const back = {x: world.x * camera.k + camera.tx, y: world.y * camera.k + camera.ty}
    expect(back.x).toBeCloseTo(point.x)
    expect(back.y).toBeCloseTo(point.y)
  })
})

describe("inView", () => {
  it("TC-11 is true for the fitted xs and false for an x far to the right", () => {
    const camera = fitCamera(xs, width, height)
    expect(inView(xs, camera, width)).toBe(true)
    expect(inView([100000], camera, width)).toBe(false)
  })

  it("counts the space behind a folded panel as in view", () => {
    const camera = {k: 1, tx: 0, ty: 0}
    expect(inView([100], camera, width)).toBe(false)
    expect(inView([100], camera, width, EDGE_INSET)).toBe(true)
  })
})

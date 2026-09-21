/** Where the world sits on the canvas: a scale and a translation in screen pixels. */
export interface Camera {
  k: number
  tx: number
  ty: number
}

/** The margin a fitted camera keeps from the left edge when no panel is in the way. */
export const EDGE_INSET = 24

/** The space the floating panel takes on the left, which a fitted camera keeps clear. */
export function leftInset(width: number): number {
  return width > 900 ? 470 : EDGE_INSET
}

/** The camera that shows now and every x of `xs` to the right of the panel, `inset` pixels in from the left edge. */
export function fitCamera(xs: readonly number[], width: number, height: number, inset: number = leftInset(width)): Camera {
  const all = [0, ...xs]
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const avail = Math.max(200, width - inset - 40)
  const k = Math.min(1.6, Math.max(0.2, avail / (hi - lo + 320)))
  return {k, tx: inset + (avail - (hi - lo) * k) / 2 - lo * k, ty: height * 0.68}
}

/** Scales the camera by `factor` around `point`, keeping the world under it in place. */
export function zoomAt(camera: Camera, point: {x: number; y: number}, factor: number): Camera {
  const k = Math.min(6, Math.max(0.12, camera.k * factor))
  return {k, tx: point.x - ((point.x - camera.tx) * k) / camera.k, ty: point.y - ((point.y - camera.ty) * k) / camera.k}
}

/** The world point under a screen point. */
export function toWorld(camera: Camera, point: {x: number; y: number}): {x: number; y: number} {
  return {x: (point.x - camera.tx) / camera.k, y: (point.y - camera.ty) / camera.k}
}

/** Whether every x of `xs` lands on the canvas, clear of the panel `inset` pixels wide and of the right edge. */
export function inView(xs: readonly number[], camera: Camera, width: number, inset: number = leftInset(width)): boolean {
  return xs.every((x) => {
    const sx = x * camera.k + camera.tx
    return sx > inset + 20 && sx < width - 40
  })
}

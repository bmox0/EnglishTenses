/** Escapes the characters that would otherwise break out of markup or an attribute. */
export function esc(text: string): string {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** The path of a sine wave from `x1` to `x2` along `y`, with amplitude `amp` and period `per`. */
export function wavePath(x1: number, x2: number, y: number, amp: number, per: number): string {
  let d = `M${x1.toFixed(1)},${y.toFixed(1)}`
  for (let x = x1 + per / 10; x <= x2; x += per / 10) d += ` L${x.toFixed(1)},${(y - amp * Math.sin(((x - x1) / per) * Math.PI * 2)).toFixed(1)}`
  return d
}

/** A filled triangular arrow head at `x`, `y`, pointing along `angle`. */
export function arrowHead(x: number, y: number, angle: number, size: number, color: string): string {
  const a1 = angle + Math.PI * 0.82
  const a2 = angle - Math.PI * 0.82
  const p = (a: number) => `${(x + Math.cos(a) * size).toFixed(1)},${(y + Math.sin(a) * size).toFixed(1)}`
  return `<path d="M${x.toFixed(1)},${y.toFixed(1)} L${p(a1)} L${p(a2)} Z" style="fill:${color}"/>`
}

/** The dashed arc that carries a Perfect action forward to its moment. */
export function arcSVG(x1: number, x2: number, y: number, S: {r: number; sw: number; arc: number}, color: string, sw: number): string {
  const y1 = y - S.r - 3
  const y2 = y - S.sw - 3
  const cx = (x1 + x2) / 2
  const cy = y - S.arc - 10
  const angle = Math.atan2(y2 - cy, x2 - cx)
  return (
    `<path d="M${x1},${y1} Q${cx},${cy} ${x2 - 2},${y2}" style="fill:none;stroke:${color};stroke-width:${sw};stroke-dasharray:${sw * 2} ${sw * 1.6}"/>` +
    arrowHead(x2 - 1, y2 + 1, angle, sw * 3.2, color)
  )
}

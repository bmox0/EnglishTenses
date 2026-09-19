function formsOf(verbKey, subj) {
  const [base, s, v2, v3, ing] = VERBS[verbKey]
  const third = subj === "he"
  const be = subj === "I" ? "am" : third ? "is" : "are"
  const was = subj === "I" || third ? "was" : "were"
  const have = third ? "has" : "have"
  return {
    "present.simple": third ? s : base,
    "present.cont": `${be} ${ing}`,
    "present.perf": `${have} ${v3}`,
    "present.perfcont": `${have} been ${ing}`,
    "past.simple": v2,
    "past.cont": `${was} ${ing}`,
    "past.perf": `had ${v3}`,
    "past.perfcont": `had been ${ing}`,
    "future.simple": `will ${base}`,
    "future.cont": `will be ${ing}`,
    "future.perf": `will have ${v3}`,
    "future.perfcont": `will have been ${ing}`,
  }
}

function norm(text) {
  return (" " + text.toLowerCase().replace(/[’`]/g, "'") + " ")
    .replace(/'ll /g, " will ")
    .replace(/'ve /g, " have ")
    .replace(/'d /g, " had ")
    .replace(/'m /g, " am ")
    .replace(/'re /g, " are ")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function identify(answer, verbKey, subj) {
  const a = norm(answer)
  if (!a) return null
  for (const [key, form] of Object.entries(formsOf(verbKey, subj))) if (form === a) return {tense: key, agree: true}
  for (const other of ["I", "he", "they"]) {
    for (const [key, form] of Object.entries(formsOf(verbKey, other))) if (form === a) return {tense: key, agree: false}
  }
  return null
}

const TX = {past: 150, present: 300, future: 450}

const STYLE = {
  big: {w: 600, h: 140, axisY: 96, top: 24, sw: 3, r: 7, amp: 6, per: 18, arc: 44, labels: true},
  mini: {w: 600, h: 150, axisY: 100, top: 4, sw: 11, r: 21, amp: 20, per: 60, arc: 54, labels: false},
  glyph: {w: 200, h: 60, axisY: 36, top: 4, sw: 5, r: 9, amp: 9, per: 24, arc: 22, labels: false},
}

const col = (c) => `var(--${c})`

function wavePath(x1, x2, y, amp, per) {
  let d = `M${x1.toFixed(1)},${y.toFixed(1)}`
  for (let x = x1 + per / 10; x <= x2; x += per / 10) d += ` L${x.toFixed(1)},${(y - amp * Math.sin(((x - x1) / per) * Math.PI * 2)).toFixed(1)}`
  return d
}

function arrowHead(x, y, angle, size, color) {
  const a1 = angle + Math.PI * 0.82
  const a2 = angle - Math.PI * 0.82
  const p = (a) => `${(x + Math.cos(a) * size).toFixed(1)},${(y + Math.sin(a) * size).toFixed(1)}`
  return `<path d="M${x.toFixed(1)},${y.toFixed(1)} L${p(a1)} L${p(a2)} Z" style="fill:${color}"/>`
}

function arcSVG(x1, x2, y, S, color, sw) {
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

function markSVG(p) {
  const S = p.S
  const k = p.k ?? 1
  const y = p.y
  const c = p.color
  const rx = p.rx
  const sw = S.sw
  const thin = Math.max(1.4, sw * 0.6)
  const point = (x) => `<circle cx="${x}" cy="${y}" r="${S.r}" style="fill:${c}"/>`
  const bar = (x1, x2) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" style="stroke:${c};stroke-width:${sw * 2.2};stroke-linecap:round"/>`
  const wave = (x1, x2) => `<path d="${wavePath(x1, x2, y, S.amp, S.per)}" style="fill:none;stroke:${c};stroke-width:${sw};stroke-linejoin:round;stroke-linecap:round"/>`
  const dotted = (x1, x2) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" style="stroke:${c};stroke-width:${sw};stroke-dasharray:${sw * 0.1} ${sw * 2.4};stroke-linecap:round"/>`
  const tick = (x) => `<line x1="${x}" y1="${y - S.amp - 4}" x2="${x}" y2="${y + S.amp + 4}" style="stroke:${c};stroke-width:${sw}"/>`
  const bracket = (x1, x2, label) => {
    if (!S.labels || !label) return ""
    if (p.durAbove) return `<text x="${(x1 + x2) / 2}" y="${y - S.amp - 8}" text-anchor="middle" style="fill:${c};font-size:13px">${label}</text>`
    const by = y + S.amp + 10
    return (
      `<path d="M${x1},${by} v5 H${x2} v-5" style="fill:none;stroke:${c};stroke-width:1.2"/>` +
      `<text x="${(x1 + x2) / 2}" y="${by + 18}" text-anchor="middle" style="fill:${c};font-size:13px">${label}</text>`
    )
  }
  const lo = p.bounds?.[0] ?? rx - 255 * k
  const hi = p.bounds?.[1] ?? rx + 255 * k
  let out = ""
  if (p.aspect === "simple") {
    const shape = p.shape ?? (p.time === "present" ? "habit" : "point")
    if (shape === "habit") {
      const n = 9
      for (let i = 0; i < n; i++) out += `<circle cx="${lo + ((hi - lo) * i) / (n - 1)}" cy="${y}" r="${S.r * 0.72}" style="fill:${c}"/>`
    } else if (shape === "state") {
      out += dotted(lo - 24 * k, lo) + bar(lo, hi) + dotted(hi, hi + 24 * k)
    } else if (shape === "span") {
      out += bar(rx - 90 * k, rx + 40 * k) + bracket(rx - 90 * k, rx + 40 * k, p.dur)
    } else if (shape === "after") {
      out += point(rx + 48 * k)
    } else {
      out += point(rx)
    }
  } else if (p.aspect === "cont") {
    out += dotted(rx - 112 * k, rx - 85 * k) + wave(rx - 85 * k, rx + 85 * k) + dotted(rx + 85 * k, rx + 112 * k)
  } else if (p.aspect === "perf") {
    if (p.shape === "span") {
      out += bar(rx - 170 * k, rx - 4) + bracket(rx - 170 * k, rx, p.dur)
    } else if (p.shape === "points") {
      out += point(rx - 140 * k) + point(rx - 85 * k) + arcSVG(rx - 140 * k, rx, y, S, c, thin) + arcSVG(rx - 85 * k, rx, y, S, c, thin)
    } else {
      out += point(rx - 105 * k) + arcSVG(rx - 105 * k, rx, y, S, c, thin)
    }
  } else if (p.aspect === "perfcont") {
    out += tick(rx - 145 * k) + wave(rx - 145 * k, rx) + bracket(rx - 145 * k, rx, p.dur)
  }
  if (p.ghost) return `<g style="opacity:.5" stroke-dasharray="4 4">${out}</g>`
  return out
}

function vline(x, y1, y2, color, dashed, width = 1.5) {
  return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" style="stroke:${color};stroke-width:${width}${dashed ? ";stroke-dasharray:5 4" : ""}"/>`
}

function label(x, y, text, color, anchor = "middle", size = 12, weight = 300) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" style="fill:${color};font-size:${size}px;font-weight:${weight}">${text}</text>`
}

function renderTimeline(spec, opts = {}) {
  const S = STYLE[opts.style ?? "big"]
  const y = S.axisY
  const W = S.w
  const nowX = opts.style === "glyph" ? 250 : 300
  const rx = spec.rx ?? (spec.time ? TX[spec.time] : null)
  let svg = `<svg class="tl" viewBox="0 0 ${W} ${S.h}" role="img" aria-label="${spec.aria ?? "timeline"}">`
  if (opts.zones) {
    const z = [
      ["past", 0, 225],
      ["present", 225, 375],
      ["future", 375, 600],
    ]
    for (const [t, a, b] of z) {
      svg += `<rect class="zone" data-act="timeB" data-time="${t}" x="${a}" y="0" width="${b - a}" height="${S.h}" rx="8"${opts.selTime === t ? ' style="fill:var(--hover)"' : ""}/>`
    }
  }
  const axisW = S.labels ? 1.5 : S.sw * 0.45
  svg += `<line x1="10" y1="${y}" x2="${W - 12}" y2="${y}" style="stroke:var(--axis);stroke-width:${axisW}"/>`
  svg += arrowHead(W - 6, y, 0, S.labels ? 8 : S.sw * 1.6, "var(--axis)")
  if (S.labels) {
    svg += label(12, y + 28, "past", "var(--muted)", "start", 14)
    svg += label(W - 12, y + 28, "future", "var(--muted)", "end", 14)
  }
  if (opts.style !== "glyph") {
    const nowIsR = spec.time === "present"
    svg += vline(nowX, S.top + 8, y + 10, nowIsR ? col("easy") : "var(--muted)", false, nowIsR ? (S.labels ? 2 : S.sw * 0.5) : S.labels ? 1.2 : S.sw * 0.35)
    if (S.labels) svg += label(nowX, S.top, nowIsR && spec.rLabel && spec.rLabel !== "now" ? `now · ${spec.rLabel}` : "now", nowIsR ? col("easy") : "var(--muted)", "middle", 15, 400)
  }
  if (rx != null && spec.time !== "present") {
    const w = S.labels ? 1.6 : S.sw * 0.5
    svg += vline(rx, S.top + 8, y + 10, col("easy"), true, w)
    if (S.labels) svg += label(rx, S.top, spec.rLabel ?? (spec.time === "past" ? "then" : "later"), col("easy"), "middle", 15, 400)
  }
  for (const g of spec.ghosts ?? []) {
    const grx = g.rx ?? TX[g.time]
    svg += markSVG({...g, rx: grx, y, S, color: col(g.color ?? "again"), ghost: true})
  }
  if (spec.aspect && rx != null) svg += markSVG({...spec, rx, y, S, color: spec.color ? col(spec.color) : "var(--ink)"})
  return svg + "</svg>"
}

function glyph(aspect, shape) {
  const S = STYLE.glyph
  let svg = `<svg class="tl" viewBox="62 0 136 60" aria-hidden="true">`
  svg += `<line x1="62" y1="${S.axisY}" x2="198" y2="${S.axisY}" style="stroke:var(--axis);stroke-width:2"/>`
  svg += vline(150, 4, 56, col("easy"), true, 3)
  if (aspect) svg += markSVG({aspect, shape, time: "past", rx: 150, y: S.axisY, S, k: 0.5, color: "var(--ink)"})
  return svg + "</svg>"
}

function renderScene(story, rows, opts) {
  const W = 1000
  const S = {...STYLE.big, sw: 3, r: 7, amp: 5, per: 16, arc: 18}
  const top = 34
  const rowH = 42
  const axisY = top + rows.length * rowH + 12
  const H = axisY + 30
  let svg = `<svg class="tl" viewBox="0 0 ${W} ${H}" role="img" aria-label="Story timeline">`
  for (const ref of story.refs) {
    svg += vline(ref.x, top - 10, axisY + 8, col("easy"), true, 1.6)
    svg += label(ref.x, 16, ref.label, col("easy"), "middle", 12, 400)
  }
  svg += vline(story.now, top - 10, axisY + 8, "var(--muted)", false, 1.4)
  svg += label(story.now, 16, "now", "var(--muted)", "middle", 12, 400)
  svg += `<line x1="10" y1="${axisY}" x2="${W - 12}" y2="${axisY}" style="stroke:var(--axis);stroke-width:1.5"/>`
  svg += arrowHead(W - 6, axisY, 0, 8, "var(--axis)")
  svg += label(12, axisY + 24, "past", "var(--muted)", "start", 11)
  svg += label(W - 12, axisY + 24, "future", "var(--muted)", "end", 11)
  rows.forEach((row, i) => {
    const y = top + i * rowH + rowH / 2
    const g = row.gap
    const [t, a] = g.tense.split(".")
    const bg = row.status === "focus" ? "var(--hover)" : "transparent"
    svg += `<rect x="0" y="${y - rowH / 2 + 2}" width="${W}" height="${rowH - 4}" rx="6" style="fill:${bg}" data-row="${i}"/>`
    const badge = row.status === "right" ? col("good") : row.status === "wrong" ? col("again") : row.status === "focus" ? col("easy") : "var(--line)"
    svg += `<circle cx="22" cy="${y}" r="11" style="fill:${badge}"/>`
    svg += label(22, y + 4, String(i + 1), row.status === "idle" ? "var(--ink)" : "var(--card)", "middle", 11, 400)
    const base = {aspect: a, time: t, rx: g.rx, y, S, shape: g.shape, dur: g.dur, durAbove: true, bounds: [70, 975]}
    if (row.ghost) svg += markSVG({...base, ...row.ghost, y, S, color: col("again"), ghost: true, durAbove: true, bounds: [70, 975]})
    if (opts.hideShapes && row.status !== "right" && row.status !== "wrong") {
      svg += `<line x1="${g.rx}" y1="${y - 9}" x2="${g.rx}" y2="${y + 9}" style="stroke:var(--muted);stroke-width:2"/>`
      svg += label(g.rx + 8, y + 4, "?", "var(--muted)", "start", 12, 400)
    } else {
      const color = row.status === "right" ? col("good") : row.status === "wrong" ? col("good") : row.status === "focus" ? col("easy") : "var(--muted)"
      svg += markSVG({...base, color})
    }
  })
  return svg + "</svg>"
}

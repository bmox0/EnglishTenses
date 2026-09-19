const SNAP_PX = 12

function classifyEvent(ev, R, k) {
  const tol = SNAP_PX / k
  const time = Math.abs(R) <= tol ? "present" : R < 0 ? "past" : "future"
  const s = Math.min(ev.s, ev.e)
  const e = Math.max(ev.s, ev.e)
  const point = e - s <= tol
  const at = (x) => Math.abs(x - R) <= tol
  let aspect
  if (point) aspect = at(s) ? "simple" : s < R ? "perf" : "after"
  else if (at(e) && s < R) aspect = "perfcont"
  else if (e < R) aspect = "perf"
  else if (s > R + tol) aspect = "after"
  else if (at(s)) aspect = "simple"
  else aspect = ev.kind === "habit" ? "simple" : "cont"
  if (aspect === "after") {
    if (time === "past") return {tense: null, time, aspect, point, fip: true}
    return {tense: "future.simple", time, aspect, point, later: true}
  }
  return {tense: `${time}.${aspect}`, time, aspect, point}
}

function classLabel(c) {
  if (c.fip) return "Future in the Past"
  return tenseName(c.tense)
}

function classFormula(c) {
  if (c.fip) return "would + V / was going to + V"
  return TENSES[c.tense].formula
}

function classGloss(c) {
  if (c.fip) return "Смотрим из прошлого на то, что тогда ещё было впереди: «сказал, что придёт» — he said he would come."
  if (c.later && c.time === "present") return "Действие позже «сейчас» — это будущее: will + V (или going to)."
  return TENSES[c.tense].gloss
}

function classForm(c, verb, subj) {
  const f = formsOf(verb, subj)
  if (c.fip) return `would ${VERBS[verb][0]}`
  return f[c.tense]
}

function niceStep(k) {
  const steps = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000, 10000]
  return steps.find((s) => s * k >= 56) ?? 20000
}

function skEventSVG(ev, c, cam, R, opts) {
  const X = (x) => x * cam.k + cam.tx
  const Y0 = cam.ty
  const y = ev.y * cam.k + cam.ty
  const s = Math.min(ev.s, ev.e)
  const e = Math.max(ev.s, ev.e)
  const xs = X(s)
  const xe = X(e)
  const xr = X(R)
  const col = opts.color
  const S = {sw: 3, r: 7, amp: 6, per: 18, arc: 34}
  let out = ""
  out += `<line x1="${xs}" y1="${y + 10}" x2="${xs}" y2="${Y0}" style="stroke:var(--axis);stroke-width:1;stroke-dasharray:2 4"/>`
  if (!c.point) out += `<line x1="${xe}" y1="${y + 10}" x2="${xe}" y2="${Y0}" style="stroke:var(--axis);stroke-width:1;stroke-dasharray:2 4"/>`
  const dot = (x, r = S.r) => `<circle cx="${x}" cy="${y}" r="${r}" style="fill:${col}"/>`
  const bar = (a, b) => `<line x1="${a}" y1="${y}" x2="${b}" y2="${y}" style="stroke:${col};stroke-width:7;stroke-linecap:round"/>`
  const wave = (a, b) => `<path d="${wavePath(a, b, y, S.amp, S.per)}" style="fill:none;stroke:${col};stroke-width:${S.sw};stroke-linecap:round;stroke-linejoin:round"/>`
  const dotted = (a, b) => `<line x1="${a}" y1="${y}" x2="${b}" y2="${y}" style="stroke:${col};stroke-width:3;stroke-dasharray:0.1 7;stroke-linecap:round"/>`
  const dots = (a, b) => {
    let d = ""
    const n = Math.max(2, Math.round((b - a) / 20))
    for (let i = 0; i <= n; i++) d += dot(a + ((b - a) * i) / n, 5)
    return d
  }
  const body = (a, b) => (c.point ? dot(a) : ev.kind === "habit" ? dots(a, b) : bar(a, b))
  if (c.aspect === "simple") out += body(xs, xe)
  else if (c.aspect === "cont") out += dotted(xs - 18, xs) + wave(xs, xe) + dotted(xe, xe + 18)
  else if (c.aspect === "perf") out += body(xs, xe) + arcSVG(xe, xr, y, S, col, 1.8)
  else if (c.aspect === "perfcont") {
    out += ev.kind === "habit" ? dots(xs, xr) : `<line x1="${xs}" y1="${y - 10}" x2="${xs}" y2="${y + 10}" style="stroke:${col};stroke-width:3"/>` + wave(xs, xr)
    out += `<path d="M${xs},${y + 16} v5 H${xr} v-5" style="fill:none;stroke:${col};stroke-width:1.2"/>`
  } else {
    out += `<g style="opacity:.75">${body(xs, xe)}</g>`
    const cy = y - 30
    out += `<path d="M${xr},${y} Q${(xr + xs) / 2},${cy} ${xs - 9},${y - 3}" style="fill:none;stroke:${col};stroke-width:1.6;stroke-dasharray:4 4"/>`
    out += arrowHead(xs - 8, y - 2, Math.atan2(y - 2 - cy, xs - 8 - (xr + xs) / 2), 7, col)
  }
  const mid = c.point ? xs : (xs + xe) / 2
  const labelY = y - (c.aspect === "perf" || c.aspect === "after" ? 62 : 38)
  const halo = "paint-order:stroke;stroke:var(--desk);stroke-width:6px;stroke-linejoin:round"
  const size = 13 * (1 + 0.35 * (opts.pop ?? 0))
  if (!opts.hideLabel) out += `<text x="${mid}" y="${labelY}" text-anchor="middle" style="fill:${col};font-size:${size.toFixed(1)}px;font-weight:400;${halo}">${classLabel(c)}</text>`
  if (opts.form) out += `<text x="${mid}" y="${labelY + 16}" text-anchor="middle" style="fill:var(--muted);font-size:12px;${halo}">${opts.form}</text>`
  const pad = c.point ? 14 : 8
  out += `<line class="sk-ev" data-hit="ev" data-id="${ev.id}" x1="${xs - pad}" y1="${y}" x2="${xe + pad}" y2="${y}" style="stroke:transparent;stroke-width:26;stroke-linecap:round"/>`
  if (opts.selected) {
    if (c.point) {
      out += `<line x1="${xs + 9}" y1="${y}" x2="${xs + 22}" y2="${y}" style="stroke:var(--muted);stroke-width:1.2;stroke-dasharray:2 2"/>`
      out += `<circle class="sk-h" data-hit="he" data-id="${ev.id}" cx="${xs + 26}" cy="${y}" r="6" style="fill:var(--card);stroke:var(--ink);stroke-width:1.5"/>`
    } else {
      out += `<circle class="sk-h" data-hit="hs" data-id="${ev.id}" cx="${xs}" cy="${y}" r="6" style="fill:var(--card);stroke:var(--ink);stroke-width:1.5"/>`
      out += `<circle class="sk-h" data-hit="he" data-id="${ev.id}" cx="${xe}" cy="${y}" r="6" style="fill:var(--card);stroke:var(--ink);stroke-width:1.5"/>`
    }
  }
  return out
}

function skSceneSVG(E, W, H, opts) {
  const cam = E.cam
  const X = (x) => x * cam.k + cam.tx
  const Y0 = cam.ty
  const xr = X(E.R)
  const xn = X(0)
  const onNow = Math.abs(xr - xn) <= SNAP_PX
  let out = ""
  if (xn > 0) out += `<rect x="0" y="0" width="${Math.min(W, xn)}" height="${H}" style="fill:var(--hover)"/>`
  const step = niceStep(cam.k)
  const first = Math.floor(-cam.tx / cam.k / step) * step
  for (let x = first; X(x) < W + step * cam.k; x += step) {
    const sx = X(x)
    const big = Math.round(x / step) % 5 === 0
    out += `<line x1="${sx}" y1="${Y0 - (big ? 6 : 3)}" x2="${sx}" y2="${Y0 + (big ? 6 : 3)}" style="stroke:var(--axis);stroke-width:1"/>`
  }
  out += `<line x1="0" y1="${Y0}" x2="${W}" y2="${Y0}" style="stroke:var(--axis);stroke-width:1.5"/>`
  out += arrowHead(W - 4, Y0, 0, 9, "var(--axis)")
  out += label(14, Y0 + 26, "← past", "var(--muted)", "start", 13)
  out += label(W - 14, Y0 + 26, "future →", "var(--muted)", "end", 13)
  if (xn > 60 && xn < W - 60) {
    const past = xn - 90 > 14 + 70
    const fut = xn + 90 < W - 14 - 90
    if (past) out += `<text x="${xn - 14}" y="${Y0 + 26}" text-anchor="end" style="fill:var(--muted);font-size:12px">earlier</text>`
    if (fut) out += `<text x="${xn + 14}" y="${Y0 + 26}" text-anchor="start" style="fill:var(--muted);font-size:12px">later</text>`
  }
  out += `<line x1="${xn}" y1="0" x2="${xn}" y2="${H}" style="stroke:var(--muted);stroke-width:1.4"/>`
  if (!onNow) {
    const nowText = "now · speaking"
    const nw = nowText.length * 8 + 24
    out += `<rect x="${xn - nw / 2}" y="14" width="${nw}" height="24" rx="12" style="fill:var(--card);stroke:var(--line)"/>` + label(xn, 31, nowText, "var(--ink)", "middle", 13, 400)
  }
  if (opts.snapAt != null) out += `<line x1="${X(opts.snapAt)}" y1="0" x2="${X(opts.snapAt)}" y2="${H}" style="stroke:var(--easy);stroke-opacity:.2;stroke-width:16"/>`
  out += `<line x1="${xr}" y1="0" x2="${xr}" y2="${H}" style="stroke:var(--easy);stroke-width:2;stroke-dasharray:6 5"/>`
  out += `<line class="sk-r" data-hit="r" x1="${xr}" y1="0" x2="${xr}" y2="${H}" style="stroke:transparent;stroke-width:22"/>`
  const rText = onNow ? "the moment = now" : `${opts.rName || "the moment"} ⇆`
  const rw = rText.length * 8 + 26
  out += `<rect class="sk-r" data-hit="r" x="${xr - rw / 2}" y="${onNow ? 14 : 46}" width="${rw}" height="26" rx="13" style="fill:var(--easy)"/>`
  out += `<text class="sk-r" data-hit="r" x="${xr}" y="${onNow ? 32 : 64}" text-anchor="middle" style="fill:var(--card);font-size:13px;font-weight:400">${rText}</text>`
  for (const ev of E.events) {
    const c = classifyEvent(ev, E.R, cam.k)
    out += skEventSVG(ev, c, cam, E.R, {
      color: opts.colorOf(ev) ?? "var(--ink)",
      selected: opts.selected === ev.id,
      form: opts.formOf?.(c),
      hideLabel: opts.hideLabels,
      pop: opts.popOf?.(ev) ?? 0,
    })
  }
  return out
}

function skGridBackground(cam) {
  let size = 24 * cam.k
  while (size < 16) size *= 2
  while (size > 40) size /= 2
  return `background-size:${size}px ${size}px;background-position:${cam.tx}px ${cam.ty}px`
}

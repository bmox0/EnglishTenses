Object.assign(VERBS, {
  write: ["write", "writes", "wrote", "written", "writing"],
  read: ["read", "reads", "read", "read", "reading"],
  clean: ["clean", "cleans", "cleaned", "cleaned", "cleaning"],
  fix: ["fix", "fixes", "fixed", "fixed", "fixing"],
})

const SANDBOX_VERBS = [
  {v: "cook", obj: "dinner", habit: "dinner"},
  {v: "write", obj: "the report", habit: "reports"},
  {v: "read", obj: "the book", habit: "books"},
  {v: "clean", obj: "the flat", habit: "the flat"},
  {v: "watch", obj: "the film", habit: "films"},
  {v: "fix", obj: "the car", habit: "cars"},
]

const SUBJECTS = [
  {key: "I", word: "I", form: "I"},
  {key: "you", word: "You", form: "they"},
  {key: "he", word: "He", form: "he"},
  {key: "she", word: "She", form: "he"},
  {key: "we", word: "We", form: "they"},
  {key: "they", word: "They", form: "they"},
]

const MOMENTS = {
  call: {
    name: "she calls / called",
    past: {at: "when she called", by: "by the time she called", label: "she called"},
    future: {at: "when she calls", by: "by the time she calls", label: "she calls"},
  },
  five: {
    name: "5 pm",
    past: {at: "at 5 pm yesterday", by: "by 5 pm yesterday", label: "5 pm yesterday"},
    future: {at: "at 5 pm tomorrow", by: "by 5 pm tomorrow", label: "5 pm tomorrow"},
  },
  arrive: {
    name: "we arrive / arrived",
    past: {at: "when we arrived", by: "by the time we arrived", label: "we arrived"},
    future: {at: "when we arrive", by: "by the time we arrive", label: "we arrive"},
  },
}

const subjectOf = () => SUBJECTS.find((x) => x.key === state.E.subj) ?? SUBJECTS[0]

const TIME_RU = {past: "в прошлом", future: "в будущем"}
const ASPECT_RU = {simple: "происходит целиком — факт", cont: "в процессе", perf: "уже сделано", perfcont: "длится до него какое-то время", after: "ещё впереди"}

function momentLabel(time) {
  return time === "present" ? "now" : MOMENTS[state.E.moment][time].label
}

function sandboxSentence(c, ev) {
  const E = state.E
  const sub = subjectOf()
  const verb = SANDBOX_VERBS.find((x) => x.v === E.verb) ?? SANDBOX_VERBS[0]
  const [base, s3, v2, v3, ing] = VERBS[verb.v]
  const third = sub.form === "he"
  const be = sub.form === "I" ? "am" : third ? "is" : "are"
  const was = sub.form === "they" ? "were" : "was"
  const have = third ? "has" : "have"
  const pron = sub.word === "I" ? "I" : sub.word.toLowerCase()
  const obj = ev.kind === "habit" ? verb.habit : verb.obj
  const two = "for two hours"
  const vp = (t) => `<b>${t}</b>`
  const cap = (t) => t[0].toUpperCase() + t.slice(1)
  if (c.time === "present") {
    if (c.later) return `${sub.word} ${vp(`will ${base}`)} ${obj} later.`
    if (c.aspect === "simple") return `${sub.word} usually ${vp(third ? s3 : base)} ${verb.habit}.`
    if (c.aspect === "cont") return `Right now ${pron} ${vp(`${be} ${ing}`)} ${obj}.`
    if (c.aspect === "perf") return `${sub.word} ${vp(`${have} already ${v3}`)} ${obj}.`
    return `${sub.word} ${vp(`${have} been ${ing}`)} ${obj} ${two}.`
  }
  const m = MOMENTS[E.moment][c.time]
  const lead = (p) => `${cap(p)}, ${pron}`
  if (c.fip) return `${lead(MOMENTS[E.moment].past.at)} said ${pron} ${vp(`would ${base}`)} ${obj} later.`
  const past = c.time === "past"
  if (c.aspect === "simple" || c.later) return `${lead(m.at)} ${vp(past ? v2 : `will ${base}`)} ${obj}.`
  if (c.aspect === "cont") return `${lead(m.at)} ${vp(past ? `${was} ${ing}` : `will be ${ing}`)} ${obj}.`
  if (c.aspect === "perf") return `${lead(m.by)} ${vp(past ? `had already ${v3}` : `will have ${v3}`)} ${obj}.`
  return `${lead(past ? m.at : m.by)} ${vp(past ? `had been ${ing}` : `will have been ${ing}`)} ${obj} ${two}.`
}

function chainRu(c) {
  const shape = c.fip || c.later ? ASPECT_RU.after : ASPECT_RU[c.aspect]
  const name = classLabel(c)
  if (c.time === "present") return `Момент — это и есть <b>сейчас</b>. Действие относительно него: <b>${shape}</b>. → <b>${name}</b>`
  return `От меня (<b>now</b>) момент «${momentLabel(c.time)}» — <b>${TIME_RU[c.time]}</b>. От момента действие: <b>${shape}</b>. → <b>${name}</b>`
}
const SK = {W: 0, H: 0, drag: null, pointers: new Map(), anim: 0, morph: null, snapAt: null, last: {}, pop: {}, popRaf: 0, placing: false, hover: null}

function placeAt(w) {
  const E = state.E
  const x = snapX(w.x, [E.R, 0])
  const id = E.next++
  E.events.push({id, s: x, e: x, y: Math.min(-40 / E.cam.k, w.y), kind: "once"})
  E.sel = id
  SK.snapAt = null
}

function setPlacing(on) {
  SK.placing = on
  SK.hover = null
  document.getElementById("sketch")?.classList.toggle("placing", on)
  const btn = document.querySelector("[data-act='placeE']")
  if (btn) btn.classList.toggle("on", on)
  drawE()
}

function sandboxConfig() {
  return {
    R: -260,
    events: [
      {id: 1, s: -260, e: -260, y: -70, kind: "once"},
      {id: 2, s: -400, e: -120, y: -150, kind: "once"},
      {id: 3, s: -480, e: -480, y: -230, kind: "once"},
    ],
    sel: 1,
    next: 4,
  }
}

state.E = {mode: "sandbox", cam: null, verb: "cook", subj: "I", moment: "call", ...sandboxConfig(), saved: null, task: {i: 0, result: null, done: []}}

function canonical(tense, shape) {
  const [t, a] = tense.split(".")
  const R = t === "past" ? -300 : t === "present" ? 0 : 300
  if (a === "simple" && (t === "present" || shape === "habit")) return {R, s: R - 200, e: R + 200, kind: "habit"}
  if (a === "simple") return {R, s: R, e: R, kind: "once"}
  if (a === "cont") return {R, s: R - 130, e: R + 130, kind: "once"}
  if (a === "perf") return {R, s: R - 160, e: R - 160, kind: "once"}
  return {R, s: R - 220, e: R, kind: "once"}
}

function setupTask() {
  const E = state.E
  const item = ITEMS[E.task.i]
  E.task.result = null
  if (!item) return
  const starts = [
    {R: 0, s: 180, e: 180},
    {R: -260, s: -260, e: -260},
    {R: 0, s: -140, e: 140},
    {R: 260, s: 120, e: 120},
  ]
  const start = starts.find((c) => classifyEvent({...c, kind: "once"}, c.R, 1).tense !== item.tense)
  E.R = start.R
  E.events = [{id: 1, s: start.s, e: start.e, y: -90, kind: "once"}]
  E.sel = 1
  E.next = 2
}

function fitCam(config = state.E) {
  const xs = [0, config.R, ...config.events.flatMap((ev) => [ev.s, ev.e])]
  const lo = Math.min(...xs)
  const hi = Math.max(...xs)
  const left = SK.W > 900 ? 470 : 24
  const avail = Math.max(200, SK.W - left - 40)
  const k = Math.min(1.6, Math.max(0.2, avail / (hi - lo + 320)))
  return {k, tx: left + (avail - (hi - lo) * k) / 2 - lo * k, ty: SK.H * 0.68}
}

function zoomAt(p, factor) {
  const cam = state.E.cam
  const k = Math.min(6, Math.max(0.12, cam.k * factor))
  cam.tx = p.x - ((p.x - cam.tx) * k) / cam.k
  cam.ty = p.y - ((p.y - cam.ty) * k) / cam.k
  cam.k = k
}

function evById(id) {
  return state.E.events.find((ev) => ev.id === id)
}

function snapX(x, anchors) {
  const k = state.E.cam.k
  for (const a of anchors) {
    if (Math.abs(x - a) * k <= SNAP_PX) {
      SK.snapAt = a
      return a
    }
  }
  return x
}

const MX_HEAD = {simple: "Simple", cont: "Cont.", perf: "Perfect", perfcont: "Perf. Cont."}

function matrixHTML(cur) {
  const E = state.E
  const forms = formsOf(E.verb, subjectOf().form)
  let html = `<div class="mx"><span></span>${ASPECTS.map((a) => `<span class="mh">${MX_HEAD[a]}</span>`).join("")}`
  for (const t of TIMES) {
    html += `<span class="mr">${TIME_INFO[t].name}</span>`
    for (const a of ASPECTS) {
      const key = `${t}.${a}`
      html += `<button type="button" class="${cur === key ? "on" : ""}" data-act="morphE" data-tense="${key}" title="${tenseName(key)}">${forms[key]}</button>`
    }
  }
  return html + "</div>"
}

function exampleFor(c) {
  if (c.fip) return "He said he <b>would call</b> me."
  const it = ITEMS.find((i) => i.tense === c.tense)
  if (!it) return ""
  const [before, after] = it.en.split("___")
  return `${esc(before)}<b>${formFor(it)}</b>${esc(after)}`
}

function camFor(target, ev) {
  const E = state.E
  const cam = E.cam
  const left = SK.W > 900 ? 470 : 24
  const inView = [target.R, target.s, target.e].every((x) => {
    const sx = x * cam.k + cam.tx
    return sx > left + 20 && sx < SK.W - 40
  })
  if (inView) return {...cam}
  return fitCam({R: target.R, events: E.events.map((e) => (e === ev ? {s: target.s, e: target.e} : e))})
}

function hudLive() {
  const E = state.E
  if (E.mode === "sandbox") {
    const ev = evById(E.sel)
    if (!ev) return matrixHTML(null) + `<p class="tl-gloss">Click an action to see its tense, or a cell above to build one. To put your own point on the line, press <b>+ Action</b> (or <kbd>A</kbd>) and click the canvas.</p>`
    const c = SK.morph?.id === ev.id ? SK.morph.c : classifyEvent(ev, E.R, E.cam.k)
    const t0 = SK.pop[ev.id]
    const f = t0 ? Math.max(0, 1 - (performance.now() - t0) / 350) : 0
    return `${matrixHTML(c.tense)}<div class="live-name" style="transform:scale(${(1 + 0.12 * f).toFixed(3)});transform-origin:left center">${classLabel(c)}</div>
      <div class="formula">${classFormula(c)}</div>
      <div class="live-form">${sandboxSentence(c, ev)}</div>
      <p class="chain" lang="ru">${chainRu(c)}</p>
      <p class="ex">e.g. ${exampleFor(c)}</p>`
  }
  const item = ITEMS[E.task.i]
  if (!item) return ""
  const r = E.task.result
  if (!r) {
    return `<p class="tl-gloss">Drag the blue moment and the action until the picture says what the sentence says.</p>
      <div class="hint" style="margin-top:10px"><button type="button" class="btn primary" data-act="checkE">Check</button><span><kbd>Enter</kbd> check</span></div>`
  }
  let html = r.ok
    ? `<div class="msg good">Right — ${tenseName(item.tense)} · ${TENSES[item.tense].formula}</div>`
    : `<div class="msg bad">Your picture says <b>${r.label}</b>: <span lang="ru">${r.gloss}</span><br>The sentence is <b>${tenseName(item.tense)}</b>.</div>`
  html += `<p class="why" lang="ru" style="margin:10px 0 0">${item.why}</p><div class="hint" style="margin-top:10px">`
  if (!r.ok && !r.shown) html += `<button type="button" class="btn" data-act="showE">Show me</button>`
  if (r.shown) html += `<span class="tl-gloss">The green picture is ${tenseName(item.tense)}. Try dragging it back to see where it turns into your answer.</span>`
  html += `<button type="button" class="btn primary" data-act="nextE">Next</button><span><kbd>Enter</kbd> next</span></div>`
  return html
}

VIEWS.E = () => {
  const E = state.E
  let body = ""
  if (E.mode === "sandbox") {
    const opts = (list, cur, fmt = (v) => v) => list.map((v) => `<option value="${v}"${v === cur ? " selected" : ""}>${fmt(v)}</option>`).join("")
    body = `<div class="hud-row">
      <label>verb <select data-e="verb">${opts(
        SANDBOX_VERBS.map((x) => x.v),
        E.verb,
        (v) => `${v} ${SANDBOX_VERBS.find((x) => x.v === v).obj}`,
      )}</select></label>
      <label>subject <select data-e="subj">${opts(
        SUBJECTS.map((x) => x.key),
        E.subj,
        (k) => SUBJECTS.find((x) => x.key === k).word,
      )}</select></label>
      <label class="rname">the moment <select data-e="moment">${opts(Object.keys(MOMENTS), E.moment, (k) => MOMENTS[k].name)}</select></label></div>`
  } else {
    const item = ITEMS[E.task.i]
    if (item) {
      const [before, after] = item.en.split("___")
      body = `<div class="meta" style="margin:4px 0 6px"><span>Draw the timeline</span><span>${E.task.i + 1} / ${ITEMS.length}</span></div>
        <p class="hud-sentence">${esc(before)}<span class="vp">${formFor(item)}</span>${esc(after)}</p>
        <div class="ru" lang="ru" style="font-size:15px;margin-top:4px">${esc(item.ru)}</div>`
    } else {
      body = `<p style="margin:10px 0 0">All done: ${E.task.done.filter(Boolean).length} of ${E.task.done.length} right.</p>
        <p><button type="button" class="btn primary" data-act="restartE">Start over</button></p>`
    }
  }
  return `<div class="sketch" id="sketch">
    <svg id="sk-svg" class="sk-svg" role="img" aria-label="Timeline canvas"></svg>
    <div class="hud">
      <div class="hud-tabs">
        <button type="button" data-act="modeE" data-mode="sandbox" class="${E.mode === "sandbox" ? "on" : ""}">Sandbox</button>
        <button type="button" data-act="modeE" data-mode="task" class="${E.mode === "task" ? "on" : ""}">Task</button>
        <span style="flex:1"></span>
        ${E.mode === "sandbox" ? `<button type="button" class="text-btn" data-act="resetE" style="margin-right:12px;font-size:13px">Reset</button>` : ""}
        <button type="button" class="btn-line" data-act="toggleGrid">Tenses</button>
      </div>
      ${body}
      <div id="hud-live"></div>
      <div class="legend2">
        <span><i class="lg-now"></i><b>now</b> — when you are speaking. It never moves.</span>
        <span><i class="lg-r"></i><b>the moment</b> — the time the sentence is about. Drag it.</span>
      </div>
    </div>
    ${
      E.mode === "sandbox"
        ? `<div class="sk-tools">
      <button type="button" data-act="placeE" class="${SK.placing ? "on" : ""}" title="Add an action (A)">+ Action</button>
      <button type="button" data-act="clearE" title="Remove every action">Clear</button>
    </div>`
        : ""
    }
    <div class="zoombar">
      <button type="button" data-act="zoomE" data-f="0.8" aria-label="Zoom out">−</button>
      <span id="sk-zoom"></span>
      <button type="button" data-act="zoomE" data-f="1.25" aria-label="Zoom in">+</button>
      <button type="button" data-act="fitE">Fit</button>
    </div>
    <div class="sk-hint">drag empty space — move · scroll / pinch — zoom · drag the blue moment and the actions${E.mode === "sandbox" ? " · + Action or A — place a new one · double-click — new action · double-click an action — once ⇄ habit · Delete — remove" : ""}</div>
  </div>`
}

function drawE() {
  const E = state.E
  const svg = document.getElementById("sk-svg")
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  SK.W = rect.width
  SK.H = rect.height
  if (!E.cam) E.cam = fitCam()
  const task = E.mode === "task"
  const r = E.task.result
  const now = performance.now()
  for (const ev of E.events) {
    const lbl = classLabel(classifyEvent(ev, E.R, E.cam.k))
    if (SK.last[ev.id] && SK.last[ev.id] !== lbl && !SK.morph) SK.pop[ev.id] = now
    SK.last[ev.id] = lbl
  }
  const popOf = (ev) => {
    const t0 = SK.pop[ev.id]
    return t0 ? Math.max(0, 1 - (now - t0) / 350) : 0
  }
  const item = ITEMS[E.task.i]
  svg.innerHTML = skSceneSVG(E, SK.W, SK.H, {
    popOf,
    snapAt: SK.drag && SK.drag.type !== "pan" ? SK.snapAt : null,
    rName: task ? (item && item.rLabel !== "now" ? item.rLabel : "") : Math.abs(E.R) * E.cam.k > SNAP_PX ? momentLabel(E.R < 0 ? "past" : "future") : "",
    selected: task && r && !r.shown ? null : E.sel,
    colorOf: (ev) => {
      if (!task || !r) return "var(--ink)"
      if (!r.shown) return r.ok ? "var(--good)" : "var(--again)"
      return classifyEvent(ev, E.R, E.cam.k).tense === ITEMS[E.task.i]?.tense ? "var(--good)" : "var(--again)"
    },
    formOf: task ? null : (c) => `${subjectOf().word} ${classForm(c, E.verb, subjectOf().form)}`,
    hideLabels: task && !r,
  })
  if (!task && E.events.length === 0 && !SK.placing) {
    const cx = Math.max(SK.W > 900 ? 470 : 0, 0) + (SK.W - (SK.W > 900 ? 470 : 0)) / 2
    svg.innerHTML += `<text x="${cx}" y="${E.cam.ty - 90}" text-anchor="middle" style="fill:var(--muted);font-size:14px">The timeline is empty.</text>
      <text x="${cx}" y="${E.cam.ty - 66}" text-anchor="middle" style="fill:var(--muted);font-size:14px">Press “+ Action” (or A) and click where the action happens.</text>`
  }
  if (SK.placing && SK.hover) {
    const x = snapX(SK.hover.x, [E.R, 0])
    const snapped = SK.snapAt
    SK.snapAt = null
    const sx = x * E.cam.k + E.cam.tx
    const sy = Math.min(-40 / E.cam.k, SK.hover.y) * E.cam.k + E.cam.ty
    let ghost = `<line x1="${sx}" y1="${sy}" x2="${sx}" y2="${E.cam.ty}" style="stroke:var(--easy);stroke-width:1;stroke-dasharray:3 4"/>`
    ghost += `<circle cx="${sx}" cy="${sy}" r="8" style="fill:var(--easy);opacity:.55"/>`
    if (snapped != null) ghost += `<line x1="${sx}" y1="0" x2="${sx}" y2="${SK.H}" style="stroke:var(--easy);stroke-opacity:.2;stroke-width:16"/>`
    const c = classifyEvent({s: x, e: x, kind: "once"}, E.R, E.cam.k)
    ghost += `<text x="${sx + 14}" y="${sy - 12}" style="fill:var(--easy);font-size:13px;font-weight:400;paint-order:stroke;stroke:var(--desk);stroke-width:6px">${classLabel(c)}</text>`
    svg.innerHTML += ghost
  }
  document.getElementById("sketch").style.cssText = skGridBackground(E.cam)
  const live = document.getElementById("hud-live")
  if (live) live.innerHTML = hudLive()
  const z = document.getElementById("sk-zoom")
  if (z) z.textContent = `${Math.round(E.cam.k * 100)}%`
  if (state.showState) renderState()
  if (!SK.popRaf && E.events.some((ev) => popOf(ev) > 0)) {
    SK.popRaf = requestAnimationFrame(() => {
      SK.popRaf = 0
      drawE()
    })
  }
}

function stopAnim() {
  cancelAnimationFrame(SK.anim)
  SK.morph = null
}

function animateTo(target, camTarget, evId) {
  const E = state.E
  const ev = target ? (evById(evId) ?? E.events[0]) : null
  const from = {R: E.R, s: ev?.s, e: ev?.e, k: E.cam.k, tx: E.cam.tx, ty: E.cam.ty}
  if (ev) ev.kind = target.kind
  const t0 = performance.now()
  stopAnim()
  if (ev) SK.morph = {id: ev.id, c: classifyEvent({s: target.s, e: target.e, kind: target.kind}, target.R, camTarget.k)}
  const step = (now) => {
    const t = Math.min(1, (now - t0) / 550)
    const q = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
    const mix = (a, b) => a + (b - a) * q
    if (ev) {
      E.R = mix(from.R, target.R)
      ev.s = mix(from.s, target.s)
      ev.e = mix(from.e, target.e)
    }
    E.cam = {k: mix(from.k, camTarget.k), tx: mix(from.tx, camTarget.tx), ty: mix(from.ty, camTarget.ty)}
    if (t >= 1) SK.morph = null
    drawE()
    if (t < 1) SK.anim = requestAnimationFrame(step)
  }
  SK.anim = requestAnimationFrame(step)
}

function checkE() {
  const E = state.E
  const item = ITEMS[E.task.i]
  if (!item || E.task.result) return
  const c = classifyEvent(E.events[0], E.R, E.cam.k)
  const ok = c.tense === item.tense
  E.task.result = {ok, label: classLabel(c), gloss: classGloss(c)}
  E.task.done.push(ok)
  record(item.tense, ok)
  drawE()
}

Object.assign(ACTIONS, {
  modeE: (el) => {
    const E = state.E
    const mode = el.dataset.mode
    if (mode === E.mode) return
    if (mode === "task") {
      E.saved = {R: E.R, events: E.events, sel: E.sel, next: E.next}
      E.mode = "task"
      setupTask()
    } else {
      Object.assign(E, E.saved ?? sandboxConfig())
      E.mode = "sandbox"
    }
    E.cam = null
    render()
  },
  resetE: () => {
    Object.assign(state.E, sandboxConfig())
    state.E.cam = null
    drawE()
  },
  zoomE: (el) => {
    zoomAt({x: SK.W / 2, y: SK.H / 2}, Number(el.dataset.f))
    drawE()
  },
  fitE: () => animateTo(null, fitCam()),
  checkE,
  placeE: () => setPlacing(!SK.placing),
  clearE: () => {
    state.E.events = []
    state.E.sel = null
    setPlacing(false)
  },
  morphE: (el) => {
    const E = state.E
    let ev = evById(E.sel) ?? E.events[0]
    if (!ev) {
      ev = {id: E.next++, s: 0, e: 0, y: -90, kind: "once"}
      E.events.push(ev)
    }
    E.sel = ev.id
    const tense = el.dataset.tense
    const target = canonical(tense)
    if (Math.abs(E.R) * E.cam.k > SNAP_PX && tense.split(".")[0] === (E.R < 0 ? "past" : "future")) {
      const dx = E.R - target.R
      target.R = E.R
      target.s += dx
      target.e += dx
    }
    animateTo(target, camFor(target, ev), ev.id)
  },
  showE: () => {
    const item = ITEMS[state.E.task.i]
    const target = canonical(item.tense, item.shape)
    const cfg = {R: target.R, events: [{s: target.s, e: target.e}]}
    state.E.task.result = {...state.E.task.result, shown: true}
    animateTo(target, fitCam(cfg))
  },
  nextE: () => {
    state.E.task.i++
    setupTask()
    state.E.cam = null
    render()
  },
  restartE: () => {
    state.E.task = {i: 0, result: null, done: []}
    setupTask()
    state.E.cam = null
    render()
  },
})

function skPoint(event) {
  const r = document.getElementById("sk-svg").getBoundingClientRect()
  return {x: event.clientX - r.left, y: event.clientY - r.top}
}

function toWorld(p) {
  const cam = state.E.cam
  return {x: (p.x - cam.tx) / cam.k, y: (p.y - cam.ty) / cam.k}
}

function normalize(ev) {
  if (ev.s > ev.e) {
    ;[ev.s, ev.e] = [ev.e, ev.s]
    if (SK.drag?.type === "s") SK.drag.type = "e"
    else if (SK.drag?.type === "e") SK.drag.type = "s"
  }
}

AFTER.E = () => {
  const E = state.E
  const svg = document.getElementById("sk-svg")
  const sketch = document.getElementById("sketch")
  const locked = () => E.mode === "task" && !!E.task.result && !E.task.result.shown
  if (E.mode !== "sandbox") SK.placing = false
  sketch.classList.toggle("placing", SK.placing)
  svg.addEventListener("pointerleave", () => {
    if (!SK.placing) return
    SK.hover = null
    drawE()
  })

  svg.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    stopAnim()
    const p = skPoint(event)
    SK.pointers.set(event.pointerId, p)
    try {
      svg.setPointerCapture(event.pointerId)
    } catch {}
    if (SK.pointers.size === 2) {
      const [a, b] = [...SK.pointers.values()]
      SK.drag = {type: "pinch", d0: Math.hypot(a.x - b.x, a.y - b.y), k0: E.cam.k}
      return
    }
    const hit = event.target.closest?.("[data-hit]")
    const w = toWorld(p)
    if (SK.placing && E.mode === "sandbox") {
      placeAt(w)
      SK.pointers.delete(event.pointerId)
      setPlacing(false)
      return
    }
    if (hit && !locked()) {
      const kind = hit.dataset.hit
      if (kind === "r") SK.drag = {type: "r", dx: E.R - w.x}
      else {
        const id = Number(hit.dataset.id)
        const ev = evById(id)
        E.sel = id
        if (kind === "ev") SK.drag = {type: "move", id, ox: w.x - ev.s, oy: w.y - ev.y, len: ev.e - ev.s}
        else SK.drag = {type: kind === "hs" ? "s" : "e", id}
      }
    } else {
      SK.drag = {type: "pan", p0: p, tx: E.cam.tx, ty: E.cam.ty, moved: false}
      sketch.classList.add("panning")
    }
    drawE()
  })

  svg.addEventListener("pointermove", (event) => {
    if (SK.placing && !SK.drag) {
      SK.hover = toWorld(skPoint(event))
      drawE()
      return
    }
    if (!SK.pointers.has(event.pointerId) || !SK.drag) return
    const p = skPoint(event)
    SK.pointers.set(event.pointerId, p)
    const d = SK.drag
    if (d.type === "pinch") {
      if (SK.pointers.size < 2) return
      const [a, b] = [...SK.pointers.values()]
      const mid = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2}
      zoomAt(mid, (d.k0 * Math.hypot(a.x - b.x, a.y - b.y)) / d.d0 / E.cam.k)
      drawE()
      return
    }
    const w = toWorld(p)
    SK.snapAt = null
    if (d.type === "pan") {
      E.cam.tx = d.tx + (p.x - d.p0.x)
      E.cam.ty = d.ty + (p.y - d.p0.y)
      if (Math.hypot(p.x - d.p0.x, p.y - d.p0.y) > 3) d.moved = true
    } else if (d.type === "r") {
      E.R = snapX(w.x + d.dx, [0])
    } else {
      const ev = evById(d.id)
      const anchors = [E.R, 0]
      if (d.type === "move") {
        let s = w.x - d.ox
        const snapS = snapX(s, anchors)
        if (snapS !== s) s = snapS
        else s = snapX(s + d.len, anchors) - d.len
        ev.s = s
        ev.e = s + d.len
        ev.y = Math.min(-28 / E.cam.k, w.y - d.oy)
      } else {
        ev[d.type] = snapX(w.x, anchors)
        normalize(ev)
      }
    }
    drawE()
  })

  const end = (event) => {
    SK.pointers.delete(event.pointerId)
    if (SK.drag?.type === "pan" && !SK.drag.moved && E.mode === "sandbox") E.sel = null
    if (SK.pointers.size === 0) {
      SK.drag = null
      SK.snapAt = null
    }
    sketch.classList.remove("panning")
    drawE()
  }
  svg.addEventListener("pointerup", end)
  svg.addEventListener("pointercancel", end)

  svg.addEventListener("dblclick", (event) => {
    if (locked()) return
    const hit = event.target.closest?.("[data-hit]")
    const w = toWorld(skPoint(event))
    if (hit?.dataset.hit === "ev") {
      const ev = evById(Number(hit.dataset.id))
      if (ev.kind === "habit") ev.kind = "once"
      else {
        ev.kind = "habit"
        if (Math.abs(ev.e - ev.s) * E.cam.k < 20) {
          ev.s -= 90 / E.cam.k
          ev.e += 90 / E.cam.k
        }
      }
    } else if (!hit && E.mode === "sandbox") {
      const id = E.next++
      E.events.push({id, s: w.x, e: w.x, y: Math.min(-40 / E.cam.k, w.y), kind: "once"})
      E.sel = id
    }
    drawE()
  })

  svg.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault()
      stopAnim()
      const p = skPoint(event)
      const trackpad = event.deltaX !== 0 || Math.abs(event.deltaY) < 30
      if (event.ctrlKey || event.metaKey || !trackpad) zoomAt(p, Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0025)))
      else if (event.shiftKey) E.cam.tx -= event.deltaY
      else {
        E.cam.tx -= event.deltaX
        E.cam.ty -= event.deltaY
      }
      drawE()
    },
    {passive: false},
  )

  document.querySelectorAll("[data-e]").forEach((el) =>
    el.addEventListener(el.tagName === "INPUT" ? "input" : "change", () => {
      E[el.dataset.e] = el.value
      drawE()
    }),
  )

  drawE()
}

KEYS.E = (event, typing) => {
  if (typing || event.target.matches?.("select")) return
  const E = state.E
  if (event.key === "Enter" && E.mode === "task") {
    event.preventDefault()
    if (E.task.result) ACTIONS.nextE()
    else checkE()
  } else if ((event.key === "Delete" || event.key === "Backspace") && E.mode === "sandbox" && E.sel) {
    E.events = E.events.filter((ev) => ev.id !== E.sel)
    E.sel = null
    drawE()
  } else if (event.key === "Escape" && SK.placing) setPlacing(false)
  else if ((event.key === "a" || event.key === "A") && E.mode === "sandbox") setPlacing(!SK.placing)
  else if (event.key === "0") ACTIONS.fitE()
  else if (event.key === "=" || event.key === "+") ACTIONS.zoomE({dataset: {f: "1.25"}})
  else if (event.key === "-") ACTIONS.zoomE({dataset: {f: "0.8"}})
}

window.addEventListener("resize", () => {
  if (state.variant === "E") drawE()
})

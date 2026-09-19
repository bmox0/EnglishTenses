const VARIANTS = [
  {key: "A", name: "Gap + what your answer means"},
  {key: "B", name: "Build the timeline"},
  {key: "C", name: "Story on one line"},
  {key: "D", name: "Minimal pairs"},
  {key: "E", name: "Sketchbook timeline"},
]

const narrow = window.matchMedia("(max-width: 1100px)")

const state = {
  variant: VARIANTS.some((v) => v.key === new URLSearchParams(location.search).get("variant")) ? new URLSearchParams(location.search).get("variant") : "A",
  gridOpen: true,
  sheetOpen: false,
  sel: null,
  showState: false,
  stats: {},
  A: {i: 0, answer: "", result: null, peeked: false, done: []},
  B: {i: 0, time: null, aspect: null, result: null, done: []},
  C: {s: 0, answers: [], focus: 0, checked: null, hideShapes: false, showRu: false},
  D: {i: 0, side: Math.random() < 0.5 ? "a" : "b", chosen: null, done: []},
}

const VIEWS = {}
const ACTIONS = {}
const KEYS = {}
const AFTER = {}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function formFor(item, tense = item.tense) {
  return formsOf(item.verb, item.subj)[tense]
}

function record(tense, ok) {
  const s = (state.stats[tense] ??= {ok: 0, bad: 0})
  if (ok) s.ok++
  else s.bad++
}

function trackHTML(total, done, cur) {
  let html = `<div class="track" role="img" aria-label="${done.length} done of ${total}">`
  for (let i = 0; i < total; i++) html += `<i class="${i < done.length ? (done[i] ? "ok" : "bad") : i === cur ? "cur" : ""}"></i>`
  return html + "</div>"
}

function topHTML(total, done, cur) {
  const label = state.variant === "A" && !narrow.matches ? (state.gridOpen ? "Hide tenses" : "Show tenses") : "Tenses"
  return `<div class="work-top">${trackHTML(total, done, cur)}
    <button type="button" class="btn-line" data-act="toggleGrid">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/></svg>
      ${label}
    </button></div>`
}

function highlight(text, marks = []) {
  let out = esc(text)
  for (const m of marks) out = out.replace(esc(m), `<mark>${esc(m)}</mark>`)
  return out
}

function tlCard(kind, form, tense, spec) {
  const tag = kind === "right" ? "Right" : kind === "wrong" ? "Yours" : kind === "hint" ? "Hint" : ""
  const name = kind === "hint" ? "" : tenseName(tense)
  const gloss = kind === "hint" ? "" : `<div class="tl-gloss" lang="ru">${kind === "wrong" ? "Твой вариант значит: " : ""}${TENSES[tense].gloss}</div>`
  return `<div class="tl-card ${kind}">
    <div class="tl-head">${tag ? `<span class="tag">${tag}</span>` : ""}${form ? `<span class="form">${esc(form)}</span>` : ""}<span class="name">${name}</span></div>
    ${gloss}
    ${renderTimeline(spec)}
  </div>`
}

function cellStats(key) {
  const s = state.stats[key]
  if (!s) return `<span class="bar"></span>`
  const total = Math.max(s.ok + s.bad, 4)
  return `<span class="bar"><i style="width:${(s.ok / total) * 100}%"></i><i class="bad" style="width:${(s.bad / total) * 100}%"></i></span>`
}

const LEGEND = [
  ["event", `<circle cx="15" cy="7" r="4" style="fill:var(--ink)"/>`],
  ["lasting state", `<line x1="4" y1="7" x2="26" y2="7" style="stroke:var(--ink);stroke-width:5;stroke-linecap:round"/>`],
  ["in progress", `<path d="${wavePath(2, 28, 7, 4, 9)}" style="fill:none;stroke:var(--ink);stroke-width:2"/>`],
  ["result carried to the moment", `<path d="M4,11 Q15,-2 26,9" style="fill:none;stroke:var(--ink);stroke-width:1.6;stroke-dasharray:3 2"/>`],
  ["the moment we look from", `<line x1="15" y1="0" x2="15" y2="14" style="stroke:var(--easy);stroke-width:2;stroke-dasharray:3 2"/>`],
]

function detailHTML(key) {
  const [t, a] = key.split(".")
  const info = TENSES[key]
  const examples = ITEMS.filter((it) => it.tense === key).map((it) => it.en.replace("___", `<b>${formFor(it)}</b>`))
  for (const p of PAIRS) for (const side of [p.a, p.b]) if (side.tense === key) examples.push(side.en.replace(/\*(.+?)\*/, "<b>$1</b>"))
  const sample = ITEMS.find((it) => it.tense === key)
  return `<div class="detail">
    <h3>${tenseName(key)}</h3>
    <div class="formula">${info.formula}</div>
    ${renderTimeline({time: t, aspect: a, rLabel: sample?.rLabel, dur: sample?.dur, shape: sample?.shape})}
    <p lang="ru" style="margin:8px 0 0">${info.gloss}</p>
    <p class="markers"><b style="font-weight:400;color:var(--ink)">${TIME_INFO[t].name}</b> — ${TIME_INFO[t].look} · <b style="font-weight:400;color:var(--ink)">${ASPECT_INFO[a].name}</b> — ${ASPECT_INFO[a].shape}</p>
    <p class="markers">Markers: ${info.markers}</p>
    ${examples.length ? `<ul>${examples.map((e) => `<li>${e}</li>`).join("")}</ul>` : ""}
  </div>`
}

function gridHTML(sheet) {
  let html = `<div class="grid-top"><h2>12 tenses = 3 moments × 4 shapes</h2>${sheet ? `<button type="button" class="btn-line" data-act="closeSheet">Close</button>` : ""}</div>`
  html += `<div class="tgrid"><div></div>`
  for (const a of ASPECTS) html += `<div class="ch"><b>${ASPECT_INFO[a].name}</b>${ASPECT_INFO[a].shape}</div>`
  for (const t of TIMES) {
    html += `<div class="rh"><b>${TIME_INFO[t].name}</b>${t === "present" ? "from now" : t === "past" ? "from then" : "from later"}</div>`
    for (const a of ASPECTS) {
      const key = `${t}.${a}`
      html += `<button type="button" class="cell ${state.sel === key ? "sel" : ""}" data-act="cell" data-key="${key}" aria-label="${tenseName(key)}">
        ${renderTimeline({time: t, aspect: a}, {style: "mini"})}
        <span class="f">${TENSES[key].formula}</span>
        ${cellStats(key)}
      </button>`
    }
  }
  html += `</div><div class="legend">${LEGEND.map(([l, s]) => `<span><svg viewBox="0 0 30 14" aria-hidden="true">${s}</svg>${l}</span>`).join("")}</div>`
  html += state.sel ? detailHTML(state.sel) : `<p class="markers" style="color:var(--muted);font-size:13px;margin-top:14px">Row = where you look from. Column = what the action looks like from there. Click a cell for examples.</p>`
  return html
}

function render() {
  const v = state.variant
  if (v === "E") {
    document.getElementById("root").innerHTML = VIEWS.E() + (state.sheetOpen ? `<aside class="ref sheet${state.sheetEnter ? " enter" : ""}" aria-label="Tenses">${gridHTML(true)}</aside>` : "")
    state.sheetEnter = false
    renderBar()
    renderState()
    AFTER.E()
    return
  }
  const docked = v === "A" && state.gridOpen && !narrow.matches
  const sheet = state.sheetOpen && !docked
  document.getElementById("root").innerHTML = `<div class="app ${docked ? "" : "solo"}">
    <section class="work" aria-label="Study"><div class="work-inner ${v === "C" ? "wide" : ""}">${VIEWS[v]()}</div></section>
    ${docked ? `<aside class="ref" aria-label="Tenses">${gridHTML(false)}</aside>` : ""}
    ${sheet ? `<aside class="ref sheet${state.sheetEnter ? " enter" : ""}" aria-label="Tenses">${gridHTML(true)}</aside>` : ""}
  </div>`
  state.sheetEnter = false
  renderBar()
  renderState()
  AFTER[v]?.()
}

function renderBar() {
  const i = VARIANTS.findIndex((x) => x.key === state.variant)
  document.getElementById("bar").innerHTML = `<nav class="switcher" aria-label="Prototype variants">
    <button type="button" data-act="prev" aria-label="Previous variant">‹</button>
    <span class="lbl"><b>${VARIANTS[i].key}</b> — ${VARIANTS[i].name}</span>
    <button type="button" data-act="next" aria-label="Next variant">›</button>
    <span class="sep"></span>
    <button type="button" data-act="theme" title="Theme">◐</button>
    <button type="button" data-act="state" title="Show state">${state.showState ? "hide state" : "state"}</button>
  </nav>`
}

function renderState() {
  const el = document.getElementById("statepanel")
  if (!state.showState) {
    el.hidden = true
    return
  }
  el.hidden = false
  const v = state.variant
  el.textContent = JSON.stringify({variant: v, [v]: state[v], stats: state.stats, sel: state.sel}, null, 2)
}

function go(delta) {
  const i = VARIANTS.findIndex((x) => x.key === state.variant)
  state.variant = VARIANTS[(i + delta + VARIANTS.length) % VARIANTS.length].key
  state.sheetOpen = false
  history.replaceState(null, "", `?variant=${state.variant}`)
  render()
}

Object.assign(ACTIONS, {
  prev: () => go(-1),
  next: () => go(1),
  state: () => {
    state.showState = !state.showState
    renderBar()
    renderState()
  },
  theme: () => {
    const root = document.documentElement
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches
    root.dataset.theme = dark ? "light" : "dark"
  },
  toggleGrid: () => {
    if (state.variant === "A" && !narrow.matches) state.gridOpen = !state.gridOpen
    else {
      state.sheetOpen = !state.sheetOpen
      state.sheetEnter = state.sheetOpen
    }
    render()
  },
  closeSheet: () => {
    state.sheetOpen = false
    render()
  },
  cell: (el) => {
    state.sel = state.sel === el.dataset.key ? null : el.dataset.key
    const ref = document.querySelector(".ref")
    const top = ref?.scrollTop
    render()
    const again = document.querySelector(".ref")
    if (again && top != null) again.scrollTop = top
  },
})

document.addEventListener("click", (event) => {
  const el = event.target.closest("[data-act]")
  if (el && ACTIONS[el.dataset.act]) ACTIONS[el.dataset.act](el, event)
})

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return
  const typing = event.target.matches?.("input, textarea, [contenteditable]")
  if (event.key === "Escape" && state.sheetOpen) {
    state.sheetOpen = false
    render()
    return
  }
  if (!typing && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
    event.preventDefault()
    go(event.key === "ArrowLeft" ? -1 : 1)
    return
  }
  KEYS[state.variant]?.(event, typing)
})

document.addEventListener("input", () => {
  if (state.showState) renderState()
})

narrow.addEventListener("change", render)

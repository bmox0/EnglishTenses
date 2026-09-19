function doneHTML(key, done, total) {
  const right = done.filter(Boolean).length
  return `${topHTML(total, done, -1)}
    <div style="padding:48px 0">
      <h2 style="font:400 34px/1.2 var(--mono);margin:0 0 8px">All done</h2>
      <p style="margin:0;color:var(--muted)">${right} of ${done.length} right.</p>
      <p style="margin-top:28px"><button type="button" class="btn primary" data-act="restart" data-key="${key}">Start over</button></p>
    </div>`
}

ACTIONS.restart = (el) => {
  const k = el.dataset.key
  if (k === "A") state.A = {i: 0, answer: "", result: null, peeked: false, done: []}
  if (k === "B") state.B = {i: 0, time: null, aspect: null, result: null, done: []}
  if (k === "C") state.C = {...state.C, s: 0, answers: [], focus: 0, checked: null, done: []}
  if (k === "D") state.D = {i: 0, side: Math.random() < 0.5 ? "a" : "b", chosen: null, done: []}
  render()
}

function specOf(item, tense = item.tense, extra = {}) {
  const [t, a] = tense.split(".")
  const same = tense === item.tense
  const [it] = item.tense.split(".")
  return {time: t, aspect: a, rLabel: t === it ? item.rLabel : undefined, dur: same ? item.dur : item.dur && a === "perfcont" ? item.dur : undefined, shape: same ? item.shape : undefined, ...extra}
}

VIEWS.A = () => {
  const s = state.A
  const item = ITEMS[s.i]
  if (!item) return doneHTML("A", s.done, ITEMS.length)
  const answer = formFor(item)
  const [before, after] = item.en.split("___")
  const r = s.result
  const marks = r ? item.mark : []
  const input = `<input id="gapA" class="gap-in ${r ? (r.ok ? "right" : "wrong") : ""}" style="--w:${Math.max(answer.length, s.answer.length, 6) + 1}ch" data-minw="${Math.max(answer.length, 6) + 1}" value="${esc(s.answer)}" placeholder="…" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" aria-label="${item.verb} in the right tense"${r ? " readonly" : ""}>`
  let html = topHTML(ITEMS.length, s.done, s.i)
  html += `<div class="meta"><span>Fill the gap</span><span>${s.i + 1} / ${ITEMS.length}</span></div>`
  html += `<p class="sentence">${highlight(before, marks)}${input} <span class="base">(${item.verb})</span>${highlight(after, marks)}</p>`
  html += `<div class="ru" lang="ru">${esc(item.ru)}</div>`
  if (!r) {
    html += `<div class="hint"><span><kbd>Enter</kbd> check</span><span>Leave it empty if you don't know</span>`
    html += s.peeked ? "" : `<button type="button" class="text-btn" data-act="peekA">Show the timeline</button>`
    html += `</div>`
    if (s.peeked) html += `<div class="after">${tlCard("hint", "", item.tense, specOf(item))}<p class="tl-gloss">You peeked, so this one counts as a miss.</p></div>`
    return html
  }
  html += `<div class="after">`
  if (r.ok) html += `<div class="msg good">Correct — ${tenseName(item.tense)}.${s.peeked ? " You peeked, so it counts as a miss." : ""}</div>`
  else html += `<div class="msg bad">${r.empty ? "The answer is" : "Not quite. The answer is"} <b>${answer}</b>.</div>`
  const rightCard = tlCard("right", answer, item.tense, specOf(item, item.tense, {color: "good"}))
  if (r.id && r.id.tense !== item.tense) {
    html += `<div class="duo">${rightCard}${tlCard("wrong", s.answer.trim(), r.id.tense, specOf(item, r.id.tense, {color: "again"}))}</div>`
  } else html += rightCard
  if (r.id && !r.id.agree) {
    html += `<div class="msg">Right tense, but the form doesn't agree with the subject: <b>${answer}</b>, not <s>${esc(s.answer.trim())}</s>.</div>`
  } else if (!r.id && !r.empty) {
    html += `<div class="msg">«${esc(s.answer.trim())}» is not a form of <b>${item.verb}</b> the trainer recognises, so there is no timeline for it.</div>`
  }
  html += `<p class="why" lang="ru">${item.why}</p>`
  html += `<div class="hint"><button type="button" class="btn primary" data-act="nextA">Next</button><span><kbd>Enter</kbd> next</span></div></div>`
  return html
}

AFTER.A = () => {
  const el = document.getElementById("gapA")
  if (!el) return
  el.addEventListener("input", () => {
    state.A.answer = el.value
    el.style.setProperty("--w", `${Math.max(Number(el.dataset.minw), el.value.length + 1)}ch`)
  })
  if (!state.A.result) {
    el.focus({preventScroll: true})
    el.setSelectionRange(el.value.length, el.value.length)
  } else document.querySelector(".after")?.scrollIntoView({block: "nearest", behavior: "smooth"})
}

function checkA() {
  const s = state.A
  const item = ITEMS[s.i]
  const id = identify(s.answer, item.verb, item.subj)
  const ok = !!id && id.tense === item.tense && id.agree
  s.result = {ok, empty: !norm(s.answer), id}
  s.done.push(ok && !s.peeked)
  record(item.tense, ok && !s.peeked)
  render()
}

Object.assign(ACTIONS, {
  peekA: () => {
    state.A.peeked = true
    render()
  },
  nextA: () => {
    const s = state.A
    s.i++
    s.answer = ""
    s.result = null
    s.peeked = false
    render()
  },
})

KEYS.A = (event, typing) => {
  if (event.key !== "Enter") return
  if (state.A.result) {
    event.preventDefault()
    ACTIONS.nextA()
  } else if (typing && event.target.id === "gapA") {
    event.preventDefault()
    checkA()
  }
}

const TIME_KEY = {past: "P", present: "N", future: "F"}

VIEWS.B = () => {
  const s = state.B
  const item = ITEMS[s.i]
  if (!item) return doneHTML("B", s.done, ITEMS.length)
  const form = formFor(item)
  const [before, after] = item.en.split("___")
  const r = s.result
  const marks = r ? item.mark : []
  const built = s.time && s.aspect ? `${s.time}.${s.aspect}` : null
  let html = topHTML(ITEMS.length, s.done, s.i)
  html += `<div class="meta"><span>Build the timeline of the underlined verb</span><span>${s.i + 1} / ${ITEMS.length}</span></div>`
  html += `<p class="sentence sm">${highlight(before, marks)}<span class="vp">${form}</span>${highlight(after, marks)}</p>`
  html += `<div class="ru" lang="ru">${esc(item.ru)}</div>`
  const spec = built
    ? specOf(item, built, {color: r ? (r.ok ? "good" : "again") : undefined, rLabel: r ? specOf(item, built).rLabel : undefined})
    : {time: s.time, aspect: null}
  html += `<div class="builder">${renderTimeline(spec, {zones: !r, selTime: s.time})}`
  html += `<div class="step"><b>1.</b> Where do we look from? Click the line or press <kbd>P</kbd> <kbd>N</kbd> <kbd>F</kbd></div><div class="seg">`
  for (const t of TIMES) {
    html += `<button type="button" data-act="timeB" data-time="${t}" class="${s.time === t ? "on" : ""}"${r ? " disabled" : ""}>${t === "present" ? "Now" : TIME_INFO[t].name}<kbd>${TIME_KEY[t]}</kbd></button>`
  }
  html += `</div><div class="step"><b>2.</b> What does the action look like from that moment?</div><div class="seg tiles">`
  ASPECTS.forEach((a, i) => {
    html += `<button type="button" data-act="aspectB" data-aspect="${a}" class="${s.aspect === a ? "on" : ""}"${r ? " disabled" : ""}>${glyph(a)}<span>${ASPECT_INFO[a].shape}</span><kbd>${i + 1}</kbd></button>`
  })
  html += `</div><div class="built">${built ? `Your timeline = <b>${tenseName(built)}</b> · ${TENSES[built].formula}` : "Pick both, and the timeline will tell you which tense it is."}</div></div>`
  if (!r) {
    html += `<div class="hint"><button type="button" class="btn primary" data-act="checkB"${built ? "" : " disabled"}>Check</button><span><kbd>Enter</kbd> check</span></div>`
    return html
  }
  html += `<div class="after">`
  if (r.ok) {
    html += `<div class="msg good">Correct — <b>${form}</b> is ${tenseName(item.tense)}.</div>`
  } else {
    html += `<div class="msg bad">Not this one. <b>${form}</b> is ${tenseName(item.tense)}:</div>`
    html += tlCard("right", form, item.tense, specOf(item, item.tense, {color: "good"}))
    html += `<div class="msg">Your timeline is the sentence «${esc(before)}<b>${formFor(item, built)}</b>${esc(after)}» — <span lang="ru">${TENSES[built].gloss}</span></div>`
  }
  html += `<p class="why" lang="ru">${item.why}</p>`
  html += `<div class="hint"><button type="button" class="btn primary" data-act="nextB">Next</button><span><kbd>Enter</kbd> next</span></div></div>`
  return html
}

function checkB() {
  const s = state.B
  if (!s.time || !s.aspect || s.result) return
  const item = ITEMS[s.i]
  const ok = `${s.time}.${s.aspect}` === item.tense
  s.result = {ok}
  s.done.push(ok)
  record(item.tense, ok)
  render()
}

Object.assign(ACTIONS, {
  timeB: (el) => {
    if (state.B.result) return
    state.B.time = el.dataset.time
    render()
  },
  aspectB: (el) => {
    if (state.B.result) return
    state.B.aspect = el.dataset.aspect
    render()
  },
  checkB,
  nextB: () => {
    const s = state.B
    s.i++
    s.time = null
    s.aspect = null
    s.result = null
    render()
  },
})

KEYS.B = (event, typing) => {
  if (typing) return
  const k = event.key.toLowerCase()
  const s = state.B
  if (k === "enter") {
    event.preventDefault()
    if (s.result) ACTIONS.nextB()
    else checkB()
    return
  }
  if (s.result) return
  const time = {p: "past", n: "present", f: "future"}[k]
  if (time) {
    s.time = time
    render()
  }
  const aspect = ASPECTS[Number(k) - 1]
  if (aspect) {
    s.aspect = aspect
    render()
  }
}

AFTER.B = () => {
  if (state.B.result) document.querySelector(".after")?.scrollIntoView({block: "nearest", behavior: "smooth"})
}

const gapsOf = (story) => story.parts.filter((p) => typeof p !== "string")

function ghostRx(tense, gap, story) {
  const [ut] = tense.split(".")
  const [gt] = gap.tense.split(".")
  if (ut === gt) return gap.rx
  if (ut === "present") return story.now
  if (ut === "past") return Math.max(180, Math.min(gap.rx, story.now) - 200)
  return Math.min(880, Math.max(gap.rx, story.now) + 160)
}

function rowsC(story) {
  const s = state.C
  return gapsOf(story).map((gap, i) => {
    const res = s.checked?.[i]
    const status = res ? (res.ok ? "right" : "wrong") : s.focus === i ? "focus" : "idle"
    let ghost = null
    if (res && !res.ok && res.id && res.id.tense !== gap.tense) {
      const [t, a] = res.id.tense.split(".")
      ghost = {time: t, aspect: a, rx: ghostRx(res.id.tense, gap, story), shape: undefined, dur: undefined}
    }
    return {gap, status, ghost}
  })
}

VIEWS.C = () => {
  const s = state.C
  s.done ??= []
  const story = STORIES[s.s]
  if (!story) return doneHTML("C", s.done, STORIES.length)
  const gaps = gapsOf(story)
  let html = topHTML(STORIES.length, s.done, s.s)
  html += `<div class="meta"><span>Story ${s.s + 1} of ${STORIES.length}: ${story.title}</span><span>
    <button type="button" class="text-btn" data-act="shapesC">${s.hideShapes ? "Show the shapes" : "Hide the shapes (harder)"}</button> ·
    <button type="button" class="text-btn" data-act="ruC">${s.showRu ? "Hide translation" : "Translation"}</button></span></div>`
  html += `<div class="scene" id="sceneC">${renderScene(story, rowsC(story), {hideShapes: s.hideShapes})}</div>`
  let n = 0
  html += `<p class="story">`
  for (const part of story.parts) {
    if (typeof part === "string") {
      html += esc(part)
      continue
    }
    const i = n++
    const res = s.checked?.[i]
    const cls = res ? (res.ok ? "right" : "wrong") : ""
    const numCls = res ? cls : s.focus === i ? "on" : ""
    const w = formsOf(part.verb, part.subj)[part.tense].length + 1
    html += `<span class="num ${numCls}" data-num="${i}">${i + 1}</span><input id="gapC${i}" class="gap-in ${cls}" data-gap="${i}" style="--w:${Math.max(w, 7, (s.answers[i] ?? "").length + 1)}ch" data-minw="${Math.max(w, 7)}" placeholder="${part.verb}" value="${esc(s.answers[i] ?? "")}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Gap ${i + 1}: ${part.verb}"${res ? " readonly" : ""}>`
  }
  html += `</p>`
  if (s.showRu) html += `<div class="ru" lang="ru">${esc(story.ru)}</div>`
  if (!s.checked) {
    html += `<div class="hint"><button type="button" class="btn primary" data-act="checkC">Check the story</button><span><kbd>Enter</kbd> next gap, then check</span><span>Each gap is a row on the line above</span></div>`
    return html
  }
  const right = s.checked.filter((r) => r.ok).length
  html += `<div class="after"><div class="msg ${right === gaps.length ? "good" : "bad"}">${right} of ${gaps.length} right.${right < gaps.length ? " Red ghosts on the line show what your answers would mean." : ""}</div><div class="fixes">`
  gaps.forEach((gap, i) => {
    const res = s.checked[i]
    const correct = formsOf(gap.verb, gap.subj)[gap.tense]
    if (res.ok) {
      const note = res.id.tense !== gap.tense ? ` <span class="tl-gloss">(also fine; the main answer is ${correct})</span>` : ""
      html += `<div class="fix"><span class="num right">${i + 1}</span><div><span class="ok">${esc(s.answers[i].trim())}</span> · ${tenseName(res.id.tense)}${note}</div></div>`
      return
    }
    const yours = res.id ? ` <span class="tl-gloss" lang="ru">— твой вариант (${tenseName(res.id.tense)}): ${TENSES[res.id.tense].gloss}</span>` : ""
    html += `<div class="fix"><span class="num wrong">${i + 1}</span><div>${s.answers[i]?.trim() ? `<s>${esc(s.answers[i].trim())}</s> → ` : ""}<span class="ok">${correct}</span> · ${tenseName(gap.tense)}${yours}</div></div>`
  })
  html += `</div><div class="hint"><button type="button" class="btn primary" data-act="nextC">Next story</button><span><kbd>Enter</kbd> next</span></div></div>`
  return html
}

function refreshSceneC() {
  const story = STORIES[state.C.s]
  const scene = document.getElementById("sceneC")
  if (!story || !scene) return
  scene.innerHTML = renderScene(story, rowsC(story), {hideShapes: state.C.hideShapes})
  if (!state.C.checked) document.querySelectorAll("[data-num]").forEach((el) => el.classList.toggle("on", Number(el.dataset.num) === state.C.focus))
}

AFTER.C = () => {
  const s = state.C
  const inputs = [...document.querySelectorAll("[data-gap]")]
  for (const el of inputs) {
    const i = Number(el.dataset.gap)
    el.addEventListener("input", () => {
      s.answers[i] = el.value
      el.style.setProperty("--w", `${Math.max(Number(el.dataset.minw), el.value.length + 1)}ch`)
    })
    el.addEventListener("focus", () => {
      if (s.focus === i) return
      s.focus = i
      refreshSceneC()
    })
  }
  document.getElementById("sceneC")?.addEventListener("click", (event) => {
    const row = event.target.closest("[data-row]")
    if (row && !s.checked) document.getElementById(`gapC${row.dataset.row}`)?.focus()
  })
  if (!s.checked) document.getElementById(`gapC${s.focus}`)?.focus({preventScroll: true})
}

function checkC() {
  const s = state.C
  const story = STORIES[s.s]
  s.checked = gapsOf(story).map((gap, i) => {
    const id = identify(s.answers[i] ?? "", gap.verb, gap.subj)
    const ok = !!id && id.agree && (id.tense === gap.tense || !!gap.also?.includes(id.tense))
    record(gap.tense, ok)
    return {ok, id}
  })
  s.done.push(s.checked.every((r) => r.ok))
  render()
}

Object.assign(ACTIONS, {
  checkC,
  nextC: () => {
    const s = state.C
    s.s++
    s.answers = []
    s.focus = 0
    s.checked = null
    render()
  },
  shapesC: () => {
    state.C.hideShapes = !state.C.hideShapes
    render()
  },
  ruC: () => {
    state.C.showRu = !state.C.showRu
    render()
  },
})

KEYS.C = (event, typing) => {
  if (event.key !== "Enter") return
  const s = state.C
  event.preventDefault()
  if (s.checked) {
    ACTIONS.nextC()
    return
  }
  if (!typing) return
  const i = Number(event.target.dataset.gap)
  const next = document.getElementById(`gapC${i + 1}`)
  if (next) next.focus()
  else checkC()
}

const orderD = (i) => (i % 2 ? ["b", "a"] : ["a", "b"])

VIEWS.D = () => {
  const s = state.D
  const pair = PAIRS[s.i]
  if (!pair) return doneHTML("D", s.done, PAIRS.length)
  const target = pair[s.side]
  let html = topHTML(PAIRS.length, s.done, s.i)
  html += `<div class="meta"><span>Which sentence says this?</span><span>
    <button type="button" class="text-btn" data-act="tlD">${s.showTl ? "Hide timelines until I pick" : "Show timelines while picking"}</button> · ${s.i + 1} / ${PAIRS.length}</span></div>`
  html += `<p class="situation" lang="ru">${esc(target.ru)}</p><div class="pairs">`
  orderD(s.i).forEach((k, n) => {
    const side = pair[k]
    const [t, a] = side.tense.split(".")
    const cls = s.chosen ? (k === s.side ? "right" : k === s.chosen ? "wrong" : "") : ""
    const color = s.chosen ? (k === s.side ? "good" : k === s.chosen ? "again" : undefined) : undefined
    const showTl = s.chosen || s.showTl
    html += `<button type="button" class="pair ${cls}" data-act="chooseD" data-side="${k}"${s.chosen ? " disabled" : ""}>
      <span class="k"><kbd>${n + 1}</kbd></span>
      <span class="en">${esc(side.en).replace(/\*(.+?)\*/, "<em>$1</em>")}</span>
      ${showTl ? renderTimeline({time: t, aspect: a, shape: side.shape, dur: side.dur, rLabel: side.rLabel, color}) : ""}
      ${s.chosen ? `<span class="k">${tenseName(side.tense)} · ${TENSES[side.tense].formula}</span><span class="gl" lang="ru">${esc(side.ru)}</span>` : ""}
    </button>`
  })
  html += `</div>`
  if (!s.chosen) {
    html += `<div class="hint"><span><kbd>1</kbd> <kbd>2</kbd> pick</span><span>Only the verb differs. Picture both timelines before you pick.</span></div>`
    return html
  }
  const ok = s.chosen === s.side
  html += `<div class="after"><div class="msg ${ok ? "good" : "bad"}">${ok ? "Right." : "The other one."} Same words, different timelines: compare where the action sits against the blue moment.</div>`
  html += `<div class="hint"><button type="button" class="btn primary" data-act="nextD">Next</button><span><kbd>Enter</kbd> next</span></div></div>`
  return html
}

function chooseD(side) {
  const s = state.D
  if (s.chosen) return
  const pair = PAIRS[s.i]
  s.chosen = side
  const ok = side === s.side
  s.done.push(ok)
  record(pair[s.side].tense, ok)
  render()
}

Object.assign(ACTIONS, {
  chooseD: (el) => chooseD(el.dataset.side),
  tlD: () => {
    state.D.showTl = !state.D.showTl
    render()
  },
  nextD: () => {
    const s = state.D
    s.i++
    s.side = Math.random() < 0.5 ? "a" : "b"
    s.chosen = null
    render()
  },
})

KEYS.D = (event, typing) => {
  if (typing) return
  const s = state.D
  if (event.key === "Enter" && s.chosen) {
    event.preventDefault()
    ACTIONS.nextD()
  } else if ((event.key === "1" || event.key === "2") && !s.chosen && PAIRS[s.i]) {
    chooseD(orderD(s.i)[Number(event.key) - 1])
  }
}

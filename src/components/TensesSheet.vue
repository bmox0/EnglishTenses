<script setup lang="ts">
import {computed, ref} from "vue"

import {SENTENCES, VERBS} from "../domain/data"
import {withForm} from "../domain/sentences"
import {ASPECTS, ASPECT_INFO, TENSE_INFO, TIMES, TIME_INFO, tenseName} from "../domain/tenses"
import {saveCardPng} from "../timeline/export"
import {pictureMarkup} from "../timeline/picture"
import {wavePath} from "../timeline/svg"

import type {Aspect, GridTense, Time} from "../domain/tenses"

const emit = defineEmits<{close: []}>()

const selected = ref<GridTense | null>(null)
const detailEl = ref<HTMLElement | null>(null)
const saving = ref(false)

function gridTense(time: Time, aspect: Aspect): GridTense {
  return `${time}.${aspect}` as GridTense
}

function toggle(time: Time, aspect: Aspect) {
  const tense = gridTense(time, aspect)
  selected.value = selected.value === tense ? null : tense
}

function cellPicture(time: Time, aspect: Aspect): string {
  return pictureMarkup({time, aspect}, "mini")
}

function sideLabel(time: Time): string {
  return time === "present" ? "from now" : time === "past" ? "from then" : "from later"
}

const detail = computed(() => {
  const tense = selected.value
  if (!tense) return null
  const [time, aspect] = tense.split(".") as [Time, Aspect]
  const info = TENSE_INFO[tense]
  const sample = SENTENCES.find((s) => s.tense === tense) ?? null
  const picture = pictureMarkup({time, aspect, rLabel: sample?.moment, shape: sample?.kind === "habit" ? "habit" : undefined}, "big")
  const examples = SENTENCES.filter((s) => s.tense === tense)
    .slice(0, 3)
    .map((s) => {
      const verb = VERBS.get(s.verb)
      return verb ? withForm(s, verb) : null
    })
    .filter((example): example is {before: string; form: string; after: string} => example !== null)
  return {tense, time, aspect, info, picture, examples}
})

async function savePng() {
  const element = detailEl.value
  const tense = selected.value
  if (!element || !tense || saving.value) return
  saving.value = true
  try {
    await saveCardPng(element, tenseName(tense))
  } catch (error) {
    console.error("Could not save the tense card as a PNG", error)
  } finally {
    saving.value = false
  }
}

const LEGEND: {label: string; svg: string}[] = [
  {label: "event", svg: `<circle cx="15" cy="7" r="4" style="fill:var(--ink)"/>`},
  {label: "lasting state", svg: `<line x1="4" y1="7" x2="26" y2="7" style="stroke:var(--ink);stroke-width:5;stroke-linecap:round"/>`},
  {label: "in progress", svg: `<path d="${wavePath(2, 28, 7, 4, 9)}" style="fill:none;stroke:var(--ink);stroke-width:2"/>`},
  {
    label: "result carried to the moment",
    svg: `<path d="M4,11 Q15,-2 26,9" style="fill:none;stroke:var(--ink);stroke-width:1.6;stroke-dasharray:3 2"/>`,
  },
  {label: "the moment we look from", svg: `<line x1="15" y1="0" x2="15" y2="14" style="stroke:var(--easy);stroke-width:2;stroke-dasharray:3 2"/>`},
]
</script>

<template>
  <aside class="ref sheet enter" aria-label="Tenses">
    <div class="grid-top">
      <h2>12 tenses = 3 moments × 4 shapes</h2>
      <button type="button" class="btn-line" @click="emit('close')">Close</button>
    </div>
    <div class="tgrid">
      <div></div>
      <div v-for="aspect in ASPECTS" :key="aspect" class="ch">
        <b>{{ ASPECT_INFO[aspect].name }}</b
        >{{ ASPECT_INFO[aspect].shape }}
      </div>
      <template v-for="time in TIMES" :key="time">
        <div class="rh">
          <b>{{ TIME_INFO[time].name }}</b
          >{{ sideLabel(time) }}
        </div>
        <button
          v-for="aspect in ASPECTS"
          :key="aspect"
          type="button"
          class="cell"
          :class="{sel: selected === gridTense(time, aspect)}"
          :aria-label="tenseName(gridTense(time, aspect))"
          @click="toggle(time, aspect)"
        >
          <span v-html="cellPicture(time, aspect)"></span>
          <span class="f">{{ TENSE_INFO[gridTense(time, aspect)].formula }}</span>
        </button>
      </template>
    </div>
    <div class="legend">
      <span v-for="item in LEGEND" :key="item.label"><svg viewBox="0 0 30 14" aria-hidden="true" v-html="item.svg"></svg>{{ item.label }}</span>
    </div>
    <div v-if="detail" ref="detailEl" class="detail">
      <div class="detail-top">
        <h3>{{ tenseName(detail.tense) }}</h3>
        <button
          type="button"
          class="btn-line"
          data-noexport
          :disabled="saving"
          title="Download this card as a PNG"
          aria-label="Download this card as a PNG"
          @click="savePng"
        >
          PNG
        </button>
      </div>
      <div class="formula">{{ detail.info.formula }}</div>
      <div v-html="detail.picture"></div>
      <p lang="ru" style="margin: 8px 0 0">{{ detail.info.gloss }}</p>
      <p class="markers">
        <b style="font-weight: 400; color: var(--ink)">{{ TIME_INFO[detail.time].name }}</b> — {{ TIME_INFO[detail.time].look }} ·
        <b style="font-weight: 400; color: var(--ink)">{{ ASPECT_INFO[detail.aspect].name }}</b> — {{ ASPECT_INFO[detail.aspect].shape }}
      </p>
      <p class="markers">Markers: {{ detail.info.markers }}</p>
      <ul v-if="detail.examples.length">
        <li v-for="(example, i) in detail.examples" :key="i">
          {{ example.before }}<b>{{ example.form }}</b
          >{{ example.after }}
        </li>
      </ul>
    </div>
    <p v-else class="markers" style="color: var(--muted); font-size: 13px; margin-top: 14px">
      Row = where you look from. Column = what the action looks like from there. Click a cell for examples.
    </p>
  </aside>
</template>

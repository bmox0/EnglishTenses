<script setup lang="ts">
import {computed} from "vue"

import {SENTENCES, VERBS} from "../domain/data"
import {formsOf} from "../domain/forms"
import {MOMENTS, SANDBOX_VERBS, SUBJECTS, chainRu, momentLabelOf, sandboxSentence} from "../domain/sandbox"
import {withForm} from "../domain/sentences"
import {TENSE_INFO, tenseName} from "../domain/tenses"
import {useSandbox} from "../store/sandbox"
import TenseMatrix from "./TenseMatrix.vue"

import type {MomentKey} from "../domain/sandbox"
import type {GridTense} from "../domain/tenses"

const sandbox = useSandbox()
const display = sandbox.display

const emit = defineEmits<{
  morph: [tense: GridTense]
}>()

const momentKeys = Object.keys(MOMENTS) as MomentKey[]

const FALLBACK_VERB = VERBS.get("cook")

const verb = computed(() => VERBS.get(sandbox.state.choice.verb) ?? FALLBACK_VERB)
const subject = computed(() => SUBJECTS.find((s) => s.key === sandbox.state.choice.subject) ?? SUBJECTS[0])
const forms = computed(() => (verb.value && subject.value ? formsOf(verb.value, subject.value.person) : null))

const selectedKind = computed(() => sandbox.state.scene.actions.find((action) => action.id === sandbox.state.selected)?.kind ?? "once")

const sentence = computed(() => {
  const c = display.value
  return c && verb.value ? sandboxSentence(c, selectedKind.value, verb.value, sandbox.state.choice) : []
})

const chain = computed(() => {
  const c = display.value
  return c ? chainRu(c, momentLabelOf(c.time, sandbox.state.choice.moment)) : []
})

const example = computed(() => {
  const c = display.value
  if (!c) return null
  const sentenceForTense = SENTENCES.find((item) => item.tense === c.tense)
  const exampleVerb = sentenceForTense ? VERBS.get(sentenceForTense.verb) : null
  return sentenceForTense && exampleVerb ? withForm(sentenceForTense, exampleVerb) : null
})

function onPick(tense: GridTense) {
  emit("morph", tense)
}
</script>

<template>
  <div class="hud-row">
    <label>
      verb
      <select v-model="sandbox.state.choice.verb">
        <option v-for="v in SANDBOX_VERBS" :key="v.v" :value="v.v">{{ v.v }} {{ v.obj }}</option>
      </select>
    </label>
    <label>
      subject
      <select v-model="sandbox.state.choice.subject">
        <option v-for="s in SUBJECTS" :key="s.key" :value="s.key">{{ s.word }}</option>
      </select>
    </label>
    <label class="rname">
      the moment
      <select v-model="sandbox.state.choice.moment">
        <option v-for="key in momentKeys" :key="key" :value="key">{{ MOMENTS[key].name }}</option>
      </select>
    </label>
  </div>
  <template v-if="display && forms">
    <TenseMatrix :forms="forms" :current="display.tense" @pick="onPick" />
    <div class="live-name" :key="display.tense">{{ tenseName(display.tense) }}</div>
    <div class="formula">{{ TENSE_INFO[display.tense].formula }}</div>
    <p class="live-form">
      <template v-for="(segment, i) in sentence" :key="i">
        <b v-if="segment.bold">{{ segment.text }}</b>
        <template v-else>{{ segment.text }}</template>
      </template>
    </p>
    <p class="chain" lang="ru">
      <template v-for="(segment, i) in chain" :key="i">
        <b v-if="segment.bold">{{ segment.text }}</b>
        <template v-else>{{ segment.text }}</template>
      </template>
    </p>
    <p v-if="example" class="ex">
      e.g. {{ example.before }}<b>{{ example.form }}</b
      >{{ example.after }}
    </p>
  </template>
  <template v-else-if="forms">
    <TenseMatrix :forms="forms" :current="null" @pick="onPick" />
    <p class="tl-gloss">
      Click an action to see its tense, or a cell above to build one. To put your own point on the line, press <b>+ Action</b> (or <kbd>A</kbd>) and
      click the canvas.
    </p>
  </template>
</template>

<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from "vue"

import QuizPanel from "./components/QuizPanel.vue"
import QuizSummary from "./components/QuizSummary.vue"
import SandboxPanel from "./components/SandboxPanel.vue"
import TensesSheet from "./components/TensesSheet.vue"
import TimelineCanvas from "./components/TimelineCanvas.vue"
import {usePanel} from "./composables/usePanel"
import {useTheme} from "./composables/useTheme"
import {VERBS} from "./domain/data"
import {formsOf} from "./domain/forms"
import {SNAP_PX} from "./domain/geometry"
import {SUBJECTS, momentLabelOf} from "./domain/sandbox"
import {useSandbox} from "./store/sandbox"
import {useQuiz} from "./store/quiz"
import {EDGE_INSET} from "./timeline/camera"

import type {Classified} from "./domain/geometry"
import type {GridTense} from "./domain/tenses"
import type {Tint} from "./timeline/render"

const sandbox = useSandbox()
const quiz = useQuiz()
const {isDark, setTheme} = useTheme()
const {collapsed, togglePanel} = usePanel()

const canvas = ref<InstanceType<typeof TimelineCanvas> | null>(null)
const inset = computed(() => (collapsed.value ? EDGE_INSET : undefined))
const sheetOpen = ref(false)
const tab = ref<"sandbox" | "test">("sandbox")

const FALLBACK_VERB = VERBS.get("cook")

const momentLabel = computed(() => {
  const {moment} = sandbox.state.scene
  const k = sandbox.state.camera?.k ?? 1
  if (Math.abs(moment) * k <= SNAP_PX) return ""
  return momentLabelOf(moment < 0 ? "past" : "future", sandbox.state.choice.moment)
})

function formOf(c: Classified): string {
  const subject = SUBJECTS.find((s) => s.key === sandbox.state.choice.subject) ?? SUBJECTS[0]
  const verb = VERBS.get(sandbox.state.choice.verb) ?? FALLBACK_VERB
  if (!subject || !verb) return ""
  return `${subject.word} ${formsOf(verb, subject.person)[c.tense]}`
}

async function onMorph(tense: GridTense) {
  const placement = sandbox.prepareMorph(tense)
  await nextTick()
  canvas.value?.morphTo(placement)
}

const testMode = computed(() => {
  const question = quiz.current.value
  if (!question) return "view"
  if (question.type === "form") return "view"
  const result = quiz.state.results[quiz.state.index]
  return !result || result.shown ? "task" : "view"
})

const testTintOf = computed<((c: Classified) => Tint) | undefined>(() => {
  const question = quiz.current.value
  if (!question) return quiz.state.review !== null ? () => "good" : undefined
  const result = quiz.state.results[quiz.state.index]
  if (!result) return undefined
  if (question.type === "timeline") {
    if (!result.shown) return () => (result.ok ? "good" : "again")
    return (c: Classified) => (c.tense === question.sentence.tense ? "good" : "again")
  }
  return () => "good"
})

const testHideLabels = computed(() => {
  const question = quiz.current.value
  return !!question && question.type === "timeline" && !quiz.state.results[quiz.state.index]
})

const testShowMoment = computed(() => {
  const question = quiz.current.value
  if (!question) return quiz.state.review !== null
  return !(question.type === "form" && !quiz.state.results[quiz.state.index])
})

const testMomentLabel = computed(() => {
  const index = quiz.state.review ?? quiz.state.index
  const sentence = quiz.state.questions[index]?.sentence
  if (!sentence || sentence.moment === "now") return ""
  return sentence.moment
})

function onShowMe() {
  const target = quiz.showMe()
  if (target) canvas.value?.morphTo(target, {fit: true})
}

function onOpenSandbox() {
  const placement = quiz.picture()
  if (placement) sandbox.open(placement)
  tab.value = "sandbox"
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && sheetOpen.value) {
    sheetOpen.value = false
    return
  }
  if (tab.value !== "test" || event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return
  const question = quiz.current.value
  if (!question) return
  const answered = !!quiz.state.results[quiz.state.index]
  if (event.key === "Enter") {
    event.preventDefault()
    if (!answered) {
      if (question.type === "timeline") quiz.check()
      else quiz.submit()
    } else {
      quiz.next()
    }
    return
  }
  if (question.type === "form" && !answered && (event.key === "1" || event.key === "2" || event.key === "3" || event.key === "4")) {
    quiz.choose(Number(event.key) - 1)
  }
}

watch(tab, (value) => {
  if (value === "test" && quiz.state.questions.length === 0) quiz.start()
})

onMounted(() => document.addEventListener("keydown", onKeydown))
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown))
</script>

<template>
  <TimelineCanvas
    v-if="tab === 'sandbox'"
    ref="canvas"
    :key="tab"
    v-model:scene="sandbox.state.scene"
    v-model:camera="sandbox.state.camera"
    v-model:selected="sandbox.state.selected"
    mode="sandbox"
    :moment-label="momentLabel"
    :form-of="formOf"
    :inset="inset"
    @morph="sandbox.state.morphing = $event"
  />
  <TimelineCanvas
    v-else
    ref="canvas"
    :key="tab"
    v-model:scene="quiz.state.scene"
    v-model:camera="quiz.state.camera"
    v-model:selected="quiz.state.selected"
    :mode="testMode"
    :tint-of="testTintOf"
    :hide-labels="testHideLabels"
    :show-moment="testShowMoment"
    :moment-label="testMomentLabel"
    :ghost="quiz.state.ghost"
    :inset="inset"
  />
  <div class="hud" :class="{collapsed}">
    <div class="hud-tabs">
      <button type="button" :class="{on: tab === 'sandbox'}" @click="tab = 'sandbox'">Sandbox</button>
      <button type="button" :class="{on: tab === 'test'}" @click="tab = 'test'">Test</button>
      <span style="flex: 1"></span>
      <button v-if="tab === 'sandbox'" type="button" class="text-btn" style="margin-right: 12px; font-size: 13px" @click="sandbox.reset()">
        Reset
      </button>
      <button type="button" class="btn-line" @click="sheetOpen = true">Tenses</button>
      <button type="button" title="Theme" @click="setTheme(!isDark)">◐</button>
      <button
        type="button"
        :title="collapsed ? 'Show the panel' : 'Hide the panel'"
        :aria-label="collapsed ? 'Show the panel' : 'Hide the panel'"
        :aria-expanded="!collapsed"
        @click="togglePanel"
      >
        {{ collapsed ? "▾" : "▴" }}
      </button>
    </div>
    <div v-show="!collapsed">
      <SandboxPanel v-if="tab === 'sandbox'" @morph="onMorph" />
      <template v-else>
        <QuizPanel @show-me="onShowMe" @open-sandbox="onOpenSandbox" />
        <QuizSummary v-if="!quiz.current.value" />
      </template>
      <div v-if="tab === 'sandbox'" class="legend2">
        <span><i class="lg-now"></i><b>now</b> — when you are speaking. It never moves.</span>
        <span><i class="lg-r"></i><b>the moment</b> — the time the sentence is about. Drag it.</span>
      </div>
    </div>
  </div>
  <TensesSheet v-if="sheetOpen" @close="sheetOpen = false" />
</template>

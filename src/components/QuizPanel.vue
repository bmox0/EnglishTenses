<script setup lang="ts">
import {computed, nextTick, ref, watch} from "vue"

import {VERBS} from "../domain/data"
import {GAP, withForm} from "../domain/sentences"
import {TENSE_INFO, tenseName} from "../domain/tenses"
import {useQuiz} from "../store/quiz"

const AFTER_AT_PRESENT_GLOSS = "Действие позже «сейчас» — это будущее: will + V."

const emit = defineEmits<{"open-sandbox": []; "show-me": []}>()

const quiz = useQuiz()

const question = computed(() => quiz.current.value)
const total = computed(() => quiz.state.questions.length)
const result = computed(() => quiz.state.results[quiz.state.index] ?? null)

const verb = computed(() => (question.value ? (VERBS.get(question.value.sentence.verb) ?? null) : null))

const gapInput = ref<HTMLInputElement | null>(null)

watch(
  () => [quiz.state.index, question.value?.type, !!result.value] as const,
  async () => {
    if (question.value?.type !== "form" || result.value) return
    await nextTick()
    gapInput.value?.focus()
  },
  {immediate: true},
)

const timelineParts = computed(() => {
  const q = question.value
  const v = verb.value
  return q && q.type === "timeline" && v ? withForm(q.sentence, v) : null
})

const formGap = computed(() => {
  const q = question.value
  if (!q || q.type !== "form") return {before: "", after: ""}
  const [before, after] = q.sentence.en.split(GAP)
  return {before: before ?? "", after: after ?? ""}
})

const expectedForm = computed(() => {
  const q = question.value
  const v = verb.value
  return q && v ? withForm(q.sentence, v).form : ""
})

const gapWidth = computed(() => `${Math.max(expectedForm.value.length, quiz.state.input.length, 6) + 1}ch`)

const wrongGloss = computed(() => {
  const r = result.value
  if (!r || !r.given) return ""
  if (r.aspect === "after" && r.time === "present") return AFTER_AT_PRESENT_GLOSS
  return TENSE_INFO[r.given].gloss
})

function trackClass(i: number): string {
  const r = quiz.state.results[i]
  if (r) return r.ok ? "ok" : "bad"
  return i === quiz.state.index ? "cur" : ""
}

function optionClass(choice: string): string {
  const r = result.value
  if (!r) return ""
  if (choice === expectedForm.value) return "right"
  if (choice === r.input) return "wrong"
  return ""
}

function onShowMe() {
  emit("show-me")
}
</script>

<template>
  <template v-if="question">
    <div class="meta">
      <span>{{ question.type === "timeline" ? "Draw the timeline" : "Fill the gap" }}</span>
      <span>{{ quiz.state.index + 1 }} / {{ total }}</span>
    </div>
    <div class="track" role="img" :aria-label="`${quiz.state.index} done of ${total}`">
      <i v-for="i in total" :key="i" :class="trackClass(i - 1)"></i>
    </div>

    <template v-if="question.type === 'timeline' && timelineParts">
      <p class="hud-sentence">
        {{ timelineParts.before }}<span class="vp">{{ timelineParts.form }}</span
        >{{ timelineParts.after }}
      </p>
      <div class="ru" lang="ru">{{ question.sentence.ru }}</div>

      <template v-if="!result">
        <p class="tl-gloss">Drag the blue moment and the action until the picture says what the sentence says.</p>
        <div class="hint">
          <button type="button" class="btn primary" @click="quiz.check()">Check</button>
          <span><kbd>Enter</kbd> check</span>
        </div>
      </template>
      <template v-else>
        <div class="msg" :class="result.ok ? 'good' : 'bad'">
          <template v-if="result.ok"> Right — {{ tenseName(question.sentence.tense) }} · {{ TENSE_INFO[question.sentence.tense].formula }} </template>
          <template v-else-if="result.given">
            Your picture says <b>{{ tenseName(result.given) }}</b
            >: <span lang="ru">{{ wrongGloss }}</span
            ><br />
            The sentence is <b>{{ tenseName(question.sentence.tense) }}</b
            >.
          </template>
        </div>
        <p class="why" lang="ru">{{ question.sentence.why }}</p>
        <div class="hint">
          <button v-if="!result.ok && !result.shown" type="button" class="btn" @click="onShowMe">Show me</button>
          <span v-if="result.shown" class="tl-gloss">
            The green picture is <b>{{ tenseName(question.sentence.tense) }}</b
            >. Try dragging it back to see where it turns into your answer.
          </span>
          <button type="button" class="btn-line" @click="emit('open-sandbox')">Open in sandbox</button>
          <button type="button" class="btn primary" @click="quiz.next()">Next</button>
          <span><kbd>Enter</kbd> next</span>
        </div>
      </template>
    </template>

    <template v-else-if="question.type === 'form'">
      <p class="hud-sentence">
        {{ formGap.before
        }}<input
          ref="gapInput"
          class="gap-in"
          :class="result ? (result.ok ? 'right' : 'wrong') : ''"
          :style="{'--w': gapWidth}"
          :value="quiz.state.input"
          :readonly="!!result"
          placeholder="…"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          :aria-label="`${question.sentence.verb} in the right tense`"
          @input="quiz.state.input = ($event.target as HTMLInputElement).value"
        />
        <span class="base">({{ question.sentence.verb }})</span>{{ formGap.after }}
      </p>
      <div class="ru" lang="ru">{{ question.sentence.ru }}</div>

      <div class="options">
        <button
          v-for="(choice, i) in quiz.state.choices"
          :key="i"
          type="button"
          :class="optionClass(choice)"
          :disabled="!!result"
          @click="quiz.choose(i)"
        >
          <b>{{ i + 1 }}</b> {{ choice }}
        </button>
      </div>

      <template v-if="!result">
        <div class="hint">
          <span><kbd>Enter</kbd> check</span>
          <span><kbd>1</kbd>–<kbd>4</kbd> pick</span>
          <span>leave it empty if you don't know</span>
        </div>
      </template>
      <template v-else>
        <div class="msg" :class="result.ok ? 'good' : 'bad'">
          <template v-if="result.verdict === 'right'">Correct — {{ tenseName(question.sentence.tense) }}.</template>
          <template v-else-if="result.verdict === 'empty'"
            >The answer is <b>{{ expectedForm }}</b
            >.</template
          >
          <template v-else-if="result.verdict === 'tense'"
            >Not quite. The answer is <b>{{ expectedForm }}</b
            >.</template
          >
          <template v-else-if="result.verdict === 'agreement'">
            Right tense, but the form doesn't agree with the subject: <b>{{ expectedForm }}</b
            >, not <s>{{ (result.input ?? "").trim() }}</s
            >.
          </template>
          <template v-else-if="result.verdict === 'unknown'">
            «{{ (result.input ?? "").trim() }}» is not a form of <b>{{ question.sentence.verb }}</b> the trainer recognises, so there is no timeline
            for it.
          </template>
        </div>
        <p class="why" lang="ru">{{ question.sentence.why }}</p>
        <div class="hint">
          <button type="button" class="btn-line" @click="emit('open-sandbox')">Open in sandbox</button>
          <button type="button" class="btn primary" @click="quiz.next()">Next</button>
          <span><kbd>Enter</kbd> next</span>
        </div>
      </template>
    </template>
  </template>
</template>

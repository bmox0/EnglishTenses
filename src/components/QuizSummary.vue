<script setup lang="ts">
import {computed} from "vue"

import {VERBS} from "../domain/data"
import {withForm} from "../domain/sentences"
import {tenseName} from "../domain/tenses"
import {useQuiz} from "../store/quiz"

import type {Question} from "../domain/quiz"
import type {QuizResult} from "../store/quiz"

interface Mistake {
  index: number
  question: Question
  result: QuizResult
}

const quiz = useQuiz()

const total = computed(() => quiz.state.questions.length)
const right = computed(() => quiz.state.results.filter((r) => r?.ok).length)

const mistakes = computed<Mistake[]>(() => {
  const list: Mistake[] = []
  quiz.state.questions.forEach((question, index) => {
    const result = quiz.state.results[index]
    if (result && !result.ok) list.push({index, question, result})
  })
  return list
})

function sentenceOf(mistake: Mistake) {
  const verb = VERBS.get(mistake.question.sentence.verb)
  return verb ? withForm(mistake.question.sentence, verb) : {before: mistake.question.sentence.en, form: "", after: ""}
}

function you(mistake: Mistake): string {
  if (mistake.question.type === "form") return (mistake.result.input ?? "").trim() || "(empty)"
  return mistake.result.given ? tenseName(mistake.result.given) : "?"
}
</script>

<template>
  <p style="margin: 10px 0 0">All done</p>
  <p style="color: var(--muted); margin: 4px 0 0">{{ right }} of {{ total }} right.</p>

  <div v-if="mistakes.length" class="mistakes">
    <button
      v-for="mistake in mistakes"
      :key="mistake.index"
      type="button"
      class="mistake"
      :class="{reviewed: quiz.state.review === mistake.index}"
      @click="quiz.reviewMistake(mistake.index)"
    >
      <span class="sentence"
        >{{ sentenceOf(mistake).before }}<b>{{ sentenceOf(mistake).form }}</b
        >{{ sentenceOf(mistake).after }}</span
      >
      <span class="meta2">you: {{ you(mistake) }} · correct: {{ tenseName(mistake.question.sentence.tense) }}</span>
    </button>
  </div>
  <p v-else style="color: var(--muted)">No mistakes.</p>

  <div class="hint">
    <button type="button" class="btn primary" @click="quiz.start()">New test</button>
  </div>
</template>

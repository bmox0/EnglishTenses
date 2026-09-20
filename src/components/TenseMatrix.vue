<script setup lang="ts">
import {ASPECTS, TIMES, TIME_INFO, tenseName} from "../domain/tenses"

import type {Aspect, GridTense, Tense, Time} from "../domain/tenses"

const props = defineProps<{
  forms: Record<Tense, string>
  current: Tense | null
}>()

const emit = defineEmits<{
  pick: [tense: GridTense]
}>()

const MX_HEAD: Record<Aspect, string> = {simple: "Simple", cont: "Cont.", perf: "Perfect", perfcont: "Perf. Cont."}

function gridTense(time: Time, aspect: Aspect): GridTense {
  return `${time}.${aspect}` as GridTense
}

function pick(time: Time, aspect: Aspect) {
  emit("pick", gridTense(time, aspect))
}
</script>

<template>
  <div class="mx">
    <span></span>
    <span v-for="aspect in ASPECTS" :key="aspect" class="mh">{{ MX_HEAD[aspect] }}</span>
    <template v-for="time in TIMES" :key="time">
      <span class="mr">{{ TIME_INFO[time].name }}</span>
      <button
        v-for="aspect in ASPECTS"
        :key="aspect"
        type="button"
        :class="{on: props.current === gridTense(time, aspect)}"
        :title="tenseName(gridTense(time, aspect))"
        @click="pick(time, aspect)"
      >
        {{ props.forms[gridTense(time, aspect)] }}
      </button>
    </template>
  </div>
</template>

import {createApp} from "vue"

import App from "./App.vue"
import {SENTENCES, VERBS} from "./domain/data"
import {SandboxKey, createSandbox} from "./store/sandbox"
import {QuizKey, createQuiz} from "./store/quiz"

import "./styles.css"

function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

createApp(App)
  .provide(SandboxKey, createSandbox())
  .provide(QuizKey, createQuiz(SENTENCES, VERBS, browserStorage(), Math.random))
  .mount("#app")

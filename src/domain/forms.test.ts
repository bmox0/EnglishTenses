import {describe, expect, it} from "vitest"

import {formsOf} from "./forms"
import type {Verb} from "./forms"

const cook: Verb = {v1: "cook", s: "cooks", v2: "cooked", v3: "cooked", ing: "cooking"}
const write: Verb = {v1: "write", s: "writes", v2: "wrote", v3: "written", ing: "writing"}
const study: Verb = {v1: "study", s: "studies", v2: "studied", v3: "studied", ing: "studying"}
const run: Verb = {v1: "run", s: "runs", v2: "ran", v3: "run", ing: "running"}
const fix: Verb = {v1: "fix", s: "fixes", v2: "fixed", v3: "fixed", ing: "fixing"}

describe("formsOf", () => {
  it("TC-3 gives cook's forms for he", () => {
    const forms = formsOf(cook, "he")
    expect(forms["present.simple"]).toBe("cooks")
    expect(forms["present.cont"]).toBe("is cooking")
    expect(forms["present.perf"]).toBe("has cooked")
    expect(forms["past.cont"]).toBe("was cooking")
    expect(forms["past.perf"]).toBe("had cooked")
    expect(forms["future.perfcont"]).toBe("will have been cooking")
  })

  it("TC-3 gives cook's forms for I", () => {
    const forms = formsOf(cook, "I")
    expect(forms["present.cont"]).toBe("am cooking")
    expect(forms["past.cont"]).toBe("was cooking")
    expect(forms["present.perf"]).toBe("have cooked")
  })

  it("TC-3 gives cook's forms for they", () => {
    const forms = formsOf(cook, "they")
    expect(forms["present.cont"]).toBe("are cooking")
    expect(forms["past.cont"]).toBe("were cooking")
    expect(forms["present.perf"]).toBe("have cooked")
  })

  it("TC-3 gives write's past simple and past perfect for he", () => {
    const forms = formsOf(write, "he")
    expect(forms["past.simple"]).toBe("wrote")
    expect(forms["past.perf"]).toBe("had written")
  })

  it("TC-3 gives study's present simple for he", () => {
    expect(formsOf(study, "he")["present.simple"]).toBe("studies")
  })

  it("TC-3 gives run's past simple for he and present perfect for they", () => {
    expect(formsOf(run, "he")["past.simple"]).toBe("ran")
    expect(formsOf(run, "they")["present.perf"]).toBe("have run")
  })

  it("TC-3 gives fix's present simple for he", () => {
    expect(formsOf(fix, "he")["present.simple"]).toBe("fixes")
  })

  it("TC-3 gives would cook for past.future regardless of person", () => {
    for (const person of ["I", "he", "they"] as const) {
      expect(formsOf(cook, person)["past.future"]).toBe("would cook")
    }
  })
})

import {readdirSync} from "node:fs"
import {describe, expect, it} from "vitest"

import {SENTENCES, VERBS} from "./data"
import {parseVerbs, validateVerbs} from "./forms"
import {validateSentences} from "./sentences"
import {ALL_TENSES} from "./tenses"

describe("verb data", () => {
  it("TC-7 validates: verbs.jsonl", () => {
    expect(validateVerbs([...VERBS.values()])).toEqual([])
  })

  it("TC-7 has at least 29 verbs, including the six sandbox verbs", () => {
    expect(VERBS.size).toBeGreaterThanOrEqual(29)
    for (const v1 of ["cook", "write", "read", "clean", "watch", "fix"]) {
      expect(VERBS.has(v1)).toBe(true)
    }
  })
})

describe("validateVerbs", () => {
  it("TC-7 flags a capitalised v1, a missing ing and a repeated v1", () => {
    const verbs = parseVerbs(
      [
        '{"v1":"Cook","s":"cooks","v2":"cooked","v3":"cooked","ing":"cooking"}',
        '{"v1":"jump","s":"jumps","v2":"jumped","v3":"jumped","ing":""}',
        '{"v1":"cook","s":"cooks","v2":"cooked","v3":"cooked","ing":"cooking"}',
        '{"v1":"cook","s":"cooks","v2":"cooked","v3":"cooked","ing":"cooking"}',
      ].join("\n"),
    )
    const messages = validateVerbs(verbs)
    expect(messages).toHaveLength(3)
    expect(messages[0]).toMatch(/^verb #1 \(Cook\): /)
    expect(messages[1]).toMatch(/^verb #2 \(jump\): /)
    expect(messages[2]).toMatch(/^verb #4 \(cook\): /)
  })
})

describe("sentence data", () => {
  it("TC-9 names files <NN>-<set>.jsonl, so sets load in a stable order", () => {
    const files = readdirSync("data/sentences").filter((f) => f.endsWith(".jsonl"))
    expect(files.filter((f) => !/^\d{2}-[a-z0-9-]+\.jsonl$/.test(f))).toEqual([])
  })

  it("TC-9 loads at least 14 sentences", () => {
    expect(SENTENCES.length).toBeGreaterThanOrEqual(14)
  })

  it("TC-9 is valid: unique ids, required fields, tense-moment agreement", () => {
    expect(validateSentences(SENTENCES, VERBS)).toEqual([])
  })

  it("TC-31 has at least six sentences for every tense", () => {
    const counts = ALL_TENSES.map((tense) => [tense, SENTENCES.filter((sentence) => sentence.tense === tense).length] as const)
    expect(counts.filter(([, count]) => count < 6)).toEqual([])
  })
})

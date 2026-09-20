import {describe, expect, it} from "vitest"

import {STORAGE_KEY, loadSaved, writeSaved} from "./storage"

import type {KeyValueStore} from "./storage"

function memoryStore(): KeyValueStore & {data: Map<string, string>} {
  const data = new Map<string, string>()
  return {data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k)}
}

function throwingStore(): KeyValueStore {
  return {
    getItem: () => {
      throw new Error("nope")
    },
    setItem: () => {
      throw new Error("nope")
    },
    removeItem: () => {
      throw new Error("nope")
    },
  }
}

describe("loadSaved", () => {
  it("TC-25 gives an empty save for null storage, a throwing store, invalid JSON and a future version", () => {
    expect(loadSaved(null)).toEqual({version: 1, recent: []})
    expect(loadSaved(throwingStore())).toEqual({version: 1, recent: []})

    const notJson = memoryStore()
    notJson.data.set(STORAGE_KEY, "not json")
    expect(loadSaved(notJson)).toEqual({version: 1, recent: []})

    const futureVersion = memoryStore()
    futureVersion.data.set(STORAGE_KEY, JSON.stringify({version: 2}))
    expect(loadSaved(futureVersion)).toEqual({version: 1, recent: []})
  })

  it("TC-25 drops non-string entries from recent", () => {
    const store = memoryStore()
    store.data.set(STORAGE_KEY, JSON.stringify({version: 1, recent: ["a", 3, "b"]}))
    expect(loadSaved(store)).toEqual({version: 1, recent: ["a", "b"]})
  })
})

describe("writeSaved", () => {
  it("TC-25 returns false when the store throws", () => {
    expect(writeSaved(throwingStore(), {version: 1, recent: []})).toBe(false)
  })

  it("TC-25 reads back the same value after a normal write", () => {
    const store = memoryStore()
    const saved = {version: 1 as const, recent: ["a", "b"]}
    expect(writeSaved(store, saved)).toBe(true)
    expect(loadSaved(store)).toEqual(saved)
  })
})

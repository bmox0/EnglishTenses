/** The localStorage key the quiz's recent-sentence tracking is kept under. */
export const STORAGE_KEY = "english-tenses:v1"

/** Everything kept in localStorage: the ids of recently shown sentences. */
export interface Saved {
  version: 1
  recent: string[]
}

/** Minimal storage surface, so tests can pass a fake. */
export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">

const EMPTY: Saved = {version: 1, recent: []}

function parseSaved(value: unknown): Saved | null {
  if (typeof value !== "object" || value === null) return null
  const record = value as Record<string, unknown>
  if (record.version !== 1 || !Array.isArray(record.recent)) return null
  return {version: 1, recent: record.recent.filter((item): item is string => typeof item === "string")}
}

/** Loads the save, falling back to an empty one when storage is unavailable or corrupt. */
export function loadSaved(store: KeyValueStore | null): Saved {
  try {
    const raw = store?.getItem(STORAGE_KEY)
    if (!raw) return {...EMPTY}
    return parseSaved(JSON.parse(raw)) ?? {...EMPTY}
  } catch {
    return {...EMPTY}
  }
}

/** Writes the save; returns false when the browser refuses (private mode, quota). */
export function writeSaved(store: KeyValueStore | null, saved: Saved): boolean {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(saved))
    return !!store
  } catch {
    return false
  }
}

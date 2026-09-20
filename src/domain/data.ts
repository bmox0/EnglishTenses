import verbsRaw from "../../data/verbs.jsonl?raw"
import {parseVerbs} from "./forms"
import {parseSentences} from "./sentences"

import type {Verb} from "./forms"
import type {Sentence} from "./sentences"

/** Every verb from `data/verbs.jsonl`, keyed by `v1`. */
export const VERBS: ReadonlyMap<string, Verb> = new Map(parseVerbs(verbsRaw, "verbs.jsonl").map((verb) => [verb.v1, verb]))

const sentenceFiles = import.meta.glob<string>("../../data/sentences/*.jsonl", {query: "?raw", import: "default", eager: true})

/** Every sentence from every `data/sentences/*.jsonl` file, files in name order and lines in file order. */
export const SENTENCES: readonly Sentence[] = Object.keys(sentenceFiles)
  .sort()
  .flatMap((path) => parseSentences(sentenceFiles[path] ?? "", path.replace(/^.*\//, "")))

# English Tenses

A static Vue site for learning English tenses as pictures on a timeline, live at https://bmox0.github.io/EnglishTenses/. What it does and how to use it: `README.md`.

## Commands

```bash
pnpm dev              # dev server
pnpm check            # vue-tsc + all tests; run before every commit
pnpm sentences:check  # validate data/*.jsonl only
pnpm build            # static site in dist/
pnpm format           # prettier --write src README.md CLAUDE.md
```

## Layout

- `src/domain/`: pure TypeScript, no Vue. Tests sit next to the code as `*.test.ts`.
  - `tenses.ts`: the 13-tense catalog — `ALL_TENSES`, `TENSE_INFO`, `tenseName`.
  - `forms.ts`: `Verb`, `parseVerbs`/`validateVerbs`, `formsOf` (a verb's 13 forms for a person).
  - `geometry.ts`: `classify` (the ported geometry rules that read a picture as a tense), `canonical` (a tense's usual picture), `snap`, `SNAP_PX`.
  - `sentences.ts`: `Sentence`, `parseSentences`/`validateSentences`, `withForm` (fills a sentence's gap with the right form).
  - `answer.ts`: `identify`, `checkForm` (judges a typed or picked form, accepting contractions).
  - `choices.ts`: `buildChoices` (4 shuffled options: the right form plus neighbouring-tense forms of the same verb).
  - `quiz.ts`: `buildQuiz`, `remember`, `QUIZ_SIZE`/`MAX_PER_TENSE`/`RECENT_LIMIT`.
  - `sandbox.ts`: the sandbox's own data (`SANDBOX_VERBS`, `SUBJECTS`, `MOMENTS`) and texts (`sandboxSentence`, `chainRu`), plus `defaultSandboxScene`, `morphTarget`.
  - `storage.ts`: `KeyValueStore`, `loadSaved`/`writeSaved`, `STORAGE_KEY`.
  - `data.ts`: `VERBS` and `SENTENCES`, loaded from `data/*.jsonl` with `import.meta.glob`.
- `src/timeline/`: pure view math and markup, no Vue. Tests sit next to `camera.ts` and `render.ts`.
  - `camera.ts`: `fitCamera`, `zoomAt`, `toWorld`, `inView`, `leftInset`.
  - `picture.ts`: `pictureMarkup` — one tense's static picture, style `big` or `mini`.
  - `render.ts`: `sceneMarkup` — the live canvas's whole SVG markup, `gridBackground`.
  - `svg.ts`: shared SVG primitives — `esc`, `wavePath`, `arrowHead`, `arcSVG`.
- `src/store/`: the reactive state built on the domain, each a factory plus an injection key, following EnglishWords' `createStudy`.
  - `sandbox.ts`: `createSandbox()`/`useSandbox()` — the sandbox's scene, camera, selection and choice.
  - `quiz.ts`: `createQuiz()`/`useQuiz()` — a test's questions, results and the canvas scene it shows.
- `src/components/`: `TimelineCanvas` (the draggable canvas; modes `sandbox`/`task`/`view`), `SandboxPanel`, `TenseMatrix` (the 3×4 mini table), `TensesSheet`, `QuizPanel`, `QuizSummary`.
- `src/composables/`: `useTheme` (light/dark, persisted under `english-tenses:dark`).
- `src/styles.css`: every style. Colour tokens live on `:root` and `:root.dark`.
- `data/verbs.jsonl`: the verb bank, five forms per verb.
- `data/sentences/`: the sentence bank, `<NN>-<set>.jsonl` files loaded in name order (currently `01-core.jsonl`).

## Invariants

- The geometry rules (`classify`, `canonical`, `snap`) live only in `src/domain/geometry.ts`, ported from the prototype's `classifyEvent`. A change there needs a test in `geometry.test.ts`.
- localStorage keys: `english-tenses:v1` holds the quiz's recently shown sentence ids (`storage.ts`'s `STORAGE_KEY`), `english-tenses:dark` holds the theme. The origin `bmox0.github.io` is shared with other sites, so every key keeps the `english-tenses:` prefix. A change to the saved shape needs a new `version` and a migration in `loadSaved`.
- The UI is in English; only sentence translations, `why`, glosses and the Russian chain are Russian.
- `TimelineCanvas` never mutates its `scene`, `camera` or `selected` props: every handler builds a fresh value and emits `update:*`; the redraw always comes back through the prop.
- Sentence ids (`data/sentences/*.jsonl`) may change freely — only the recent-ids list in localStorage refers to them, and a stale id there is simply skipped.

## Style

- Prettier: no semicolons, double quotes, width 150, no bracket spacing, trailing commas (`pnpm format`).
- The font is Iosevka Charon at weights 300 (body), 400 and 500. Do not add heavier weights.

## Deploy

A push to `main` runs `.github/workflows/deploy.yml`: typecheck, tests, build, then GitHub Pages.

The repo belongs to the `bmox0` account. The local git config rewrites `git@github.com:` to the `github.com-bmox0` SSH host, so a plain `git push` works. The active `gh` account is a different one, so run `gh` as bmox0 without switching: `GH_TOKEN=$(gh auth token --user bmox0) gh run list -R bmox0/EnglishTenses`.

## Environment

**Build.** `pnpm build`
**Typecheck.** `pnpm typecheck`
**Lint.** none — Prettier only (`pnpm format`)
**Tests.** `pnpm test`
**Single test file.** `pnpm vitest run <path>`
**Dev server.** `pnpm dev`, serves on `http://localhost:5173/`
**E2E.** none
**Runtime.** a desktop Chromium-family browser on the dev server, or `pnpm build && pnpm preview` on `http://localhost:4173/`; run in a foreground tab, background tabs do not fire `requestAnimationFrame`

**bootstrap.** `pnpm install --frozen-lockfile` (there is nothing to install until phase 1 adds `package.json`)
**link.** none

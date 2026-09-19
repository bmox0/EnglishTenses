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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A personal, local code playground for Node, plain HTML and React. It's one Vite project at the root. `npm run dev` opens a three-column UI (file list | Monaco editor | result) over three playground folders. Files are real files on disk:

- `node/`: any `.ts/.js`. It runs in a real Node process, with output streamed to the UI, and re-runs on save. `node/index.ts` is the user's scratch file, so don't rewrite it.
- `pure/`: any `.html` page (with its own CSS/JS), shown in an iframe.
- `react/`: any `.tsx` with a default-exported component, shown in an iframe with Fast Refresh. `react/index.tsx` is the user's React scratch file.

Identifiers, comments and UI strings are often in Portuguese.

## Commands

```bash
npm run dev         # Vite dev server on http://localhost:5555 (strictPort) + lab UI (opens the browser)
npm run node        # node --watch node/index.ts, terminal alternative to the UI
npm test            # vitest (watch); `npx vitest run node/foo.test.ts` for a single file, `-t "name"` for a single test
npm run typecheck   # tsc (noEmit)
npm run format      # prettier --write . (no semicolons, single quotes, trailing commas)
```

There is no linter and no build: the lab only works under the dev server.

## Architecture

- `lab/shared.ts` holds the constants and types used by both the server plugin and the browser UI (sections, `isRunnable`, `RunMessage`, `LAB_HEADER`). Keep it free of Node/DOM imports.
- `lab/plugin.ts` is a Vite plugin (`apply: 'serve'`) that acts as the lab's backend. All routes live under `/__lab`. `isTrustedRequest` returns 403 unless all of these hold: the `x-quick-lab: 1` header, a loopback client, and a same-origin `Origin`/`Sec-Fetch-Site`. Vite's default CORS lets any localhost origin through, so the origin check matters.
  - `files`: lists every file in the three folders. Dotfiles and `node_modules` are excluded.
  - `file?path=`: read (GET) and delete (DELETE).
    - Save (PUT) only writes an existing file (404 otherwise), so a late auto-save can't resurrect a deleted or renamed file.
    - Create (POST) refuses to overwrite (409) and replies `{ path }` with the normalized path.
    - `resolveLabPath` confines paths to `node|pure|react/`.
  - `rename?from=&to=` (POST): moves a file, possibly across folders or sections, and replies `{ path }`. Returns 409 if the destination exists; case-only renames are allowed.
  - `sources`: contents of every code file.
  - `types`: `.d.ts` files of React, Node, `csstype` and `undici-types`, keyed `file:///node_modules/...` and cached. `ts5.x/` typesVersions folders are skipped because they clash with the main files.
  - `run?file=`: spawns `process.execPath <file>` with cwd = repo root and streams NDJSON `RunMessage`s, with backpressure.
    - Closing the request stops the child: SIGTERM, then SIGKILL after 3 s.
    - Children stay in Vite's process group on purpose, so Ctrl+C on the dev server (SIGINT, which Vite doesn't handle) kills them too. Grandchildren a script spawns survive a Stop.
  - Watcher events become custom HMR events: `lab:files` (file added or removed) and `lab:change` (file saved).
  - `transformIndexHtml` inlines `lab/console-bridge.js` as the first script of `pure/` and `lab/frame/` pages. The bridge `postMessage`s console calls and uncaught errors to the parent UI.
  - `hotUpdate` turns JS changes under `pure/` into targeted `full-reload`s of the `pure/*.html` pages. Without it, Vite reloads every open page, the lab UI included.
- `index.html` + `lab/app/` is the UI, in React, deliberately **without** `StrictMode`, because double-mounted effects would run node scripts twice. The open file lives in `location.hash`. `useTarget` in `App.tsx` decides what the result pane shows: the open file if it's runnable, otherwise the last runnable file of that section.
  - `monaco.ts` configures workers (Vite `?worker` imports), compiler options and themes.
  - `workspace.ts` owns the Monaco models: one per file, URI `file:///<path>`. It preloads all code files and types for cross-file IntelliSense, tracks dirty state via `getAlternativeVersionId()`, and pulls in external edits (`syncFromDisk`) unless the buffer is dirty.
    - `save` serializes per file.
    - Before deleting, call `discardChanges`; after renaming, call `forget` on the old path. Otherwise a pending auto-save targets a path that no longer exists.
    - `dirtyFiles()` feeds the sidebar markers and the `beforeunload` guard.
  - `Editor.tsx` keeps a single Monaco instance and swaps models. It handles auto-save (600 ms debounce), ⌘S, flushing on file switch, and the inline rename field. Model swaps run in layout effects and show no model while a file loads; otherwise keystrokes could land in, and be auto-saved to, the previous file.
  - Layout: `App.tsx` sets `--sidebar-width`, `--editor-share` and `--result-share` on `.lab`, and `styles.css` uses them in `grid-template-areas` layouts. Drag handles (`ResizeHandle.tsx`) are grid items that share an area with a pane. Sizes persist through `useStoredState` (localStorage). The `STACKED` media query in `App.tsx` must match the 1000px breakpoint in CSS.
  - `NodeRunner.tsx` batches output per animation frame and keeps only the last 200k characters (a script printing in a loop must not freeze the tab).
- `lab/frame/react.html?file=react/X.tsx` is the iframe host for React sandboxes. It loads the file via `import.meta.glob('/react/**/*.tsx')` and renders it in `StrictMode` + an error boundary. The glob change re-runs the module via HMR, so the React root is kept in `import.meta.hot.data`.
- `vite.config.ts` also holds the Vitest config (`test.include`: `{node,react}/**/*.test.{ts,tsx}`).

## Gotchas

- Node files run via Node's native type stripping (Node ≥ 22.18), with no compile step: type errors don't block execution.
  - `tsconfig.json` uses `moduleResolution: bundler`, so `tsc` accepts extensionless relative imports in `node/` that fail at runtime. Relative imports there must include `.ts`.
  - `erasableSyntaxOnly` forbids `enum`/`namespace`/parameter properties.
- The project type-checks with TypeScript 7 (`tsc`), but Monaco bundles its own TS 5.9 with options mirrored in `lab/app/monaco.ts`. Keep the two in sync when changing compiler options. Both use `moduleDetection: force`.
- The DOM and `@types/node` globals are shared across all folders, both in `tsc` and in the editor.
- `package.json` has `"type": "module"`, so node scripts are ESM (no `require`; top-level `await` works).
- **Never drive the lab UI (Playwright etc.) against the real working tree.** Auto-save writes to disk, and `node/index.ts` holds the user's live work. Run UI automation against a copy of the repo (rsync without `node_modules`, then `cp -Rc node_modules` for an APFS clone) served on another port.
- **Don't start a second Vite process in this repo** (not even to check a config change) while the user's `npm run dev` may be running; check `lsof -nP -iTCP:5555 -sTCP:LISTEN` first. Both processes share `node_modules/.vite`. The second one's dependency re-optimization deletes the live server's pre-bundled chunks, even if that process then dies on the port. Monaco's lazy chunks then return 504, which looks like no syntax highlighting and no IntelliSense. Fix: `touch vite.config.ts` (the live server restarts and re-optimizes), then reload the page. Test against the copy instead; it has its own cache.
- Pages in `pure/` and the React sandboxes are same-origin with the lab, so any script they load can call `/__lab`. Don't load untrusted third-party scripts there.
- Monaco renders spaces as non-breaking spaces (U+00A0), so normalize them when reading editor text in UI tests.
- With Vite 8.3 + `@vitejs/plugin-react` 6.3, a cold start (empty `node_modules/.vite`) logs `Cannot optimize dependency: react`. This is upstream noise and React still gets pre-bundled.

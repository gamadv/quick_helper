# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A personal code playground for Node, plain HTML and React. It's one Vite project at the root, with a three-column UI (file list | Monaco editor | result) over three playground folders:

- `node/`: any `.ts/.js`. It runs and its output is streamed to the UI; it re-runs on save. `node/index.ts` is the user's scratch file, so don't rewrite it.
- `pure/`: any `.html` page (with its own CSS/JS), shown in an iframe.
- `react/`: any `.tsx` with a default-exported component, shown in an iframe. `react/index.tsx` is the user's React scratch file.

The UI runs in two modes, behind the `LabBackend` interface (`lab/app/backend/`):

- **Local** (`npm run dev`): files are real files on disk, `node/` runs in a real Node process, and React gets Fast Refresh. The Vite plugin `lab/plugin.ts` is the backend.
- **Browser** (`npm run build`, deployed as a static site on Netlify): everything runs in the visitor's browser. Files live in IndexedDB. A service worker serves them to previews, and `node/` scripts run in a Web Worker with Node-like `console`/`process`/timers and shims for a few `node:` modules.

Identifiers, comments and UI strings are often in Portuguese.

## Commands

```bash
npm run dev         # Vite dev server on http://localhost:5555 (strictPort) + lab UI (opens the browser)
npm run build       # static browser-only lab in dist/ (what Netlify runs, see netlify.toml)
npm run preview     # serves dist/ (vite preview)
npm run node        # node --watch node/index.ts, terminal alternative to the UI
npm test            # vitest (watch); `npx vitest run lab/shared.test.ts` for a single file, `-t "name"` for a single test
npm run typecheck   # tsc (noEmit)
npm run format      # prettier --write . (no semicolons, single quotes, trailing commas)
```

There is no linter.

## Architecture

- `lab/shared.ts` holds the constants, types and path helpers used on both sides: sections, `isRunnable`, `RunMessage`, `LAB_HEADER`, `normalizeLabPath` (confines paths to `node|pure|react/`, rejects dotfiles and `node_modules`) and `groupFiles`. Keep it free of Node/DOM imports. `lab/files.ts` holds the Node-side file helpers (`listFiles`, `resolveLabPath`, `collectTypes`) shared by the dev plugin and the build.
- `lab/plugin.ts` is a Vite plugin (`apply: 'serve'`) that acts as the local backend. All routes live under `/__lab`. `isTrustedRequest` returns 403 unless all of these hold: the `x-quick-lab: 1` header, a loopback client, and a same-origin `Origin`/`Sec-Fetch-Site`. Vite's default CORS lets any localhost origin through, so the origin check matters.
  - `files`: lists every file in the three folders.
  - `file?path=`: read (GET) and delete (DELETE).
    - Save (PUT) only writes an existing file (404 otherwise), so a late auto-save can't resurrect a deleted or renamed file.
    - Create (POST) refuses to overwrite (409) and replies `{ path }` with the normalized path.
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
  - `backend/index.ts` picks the backend with `import.meta.env.DEV` (a build-time constant, so each bundle carries only its own). `local.ts` wraps the `/__lab` API and HMR events; `browser.ts` is the browser mode. Components only talk to `backend`, never to `/__lab` directly.
  - `monaco.ts` configures workers (Vite `?worker` imports), compiler options and themes.
  - `workspace.ts` owns the Monaco models: one per file, URI `file:///<path>`. It preloads all code files and types for cross-file IntelliSense, tracks dirty state via `getAlternativeVersionId()`, and pulls in changes made elsewhere (`syncFromStorage`: VS Code, another tab) unless the buffer is dirty.
    - `save` serializes per file.
    - Before deleting, call `discardChanges`; after renaming, call `forget` on the old path. Otherwise a pending auto-save targets a path that no longer exists.
    - `dirtyFiles()` feeds the sidebar markers and the `beforeunload` guard.
  - `Editor.tsx` keeps a single Monaco instance and swaps models. It handles auto-save (600 ms debounce), ⌘S, flushing on file switch, and the inline rename field. Model swaps run in layout effects and show no model while a file loads; otherwise keystrokes could land in, and be auto-saved to, the previous file.
  - Layout: `App.tsx` sets `--sidebar-width`, `--editor-share` and `--result-share` on `.lab`, and `styles.css` uses them in `grid-template-areas` layouts. Drag handles (`ResizeHandle.tsx`) are grid items that share an area with a pane. Sizes persist through `useStoredState` (localStorage). The `STACKED` media query in `App.tsx` must match the 1000px breakpoint in CSS.
  - `NodeRunner.tsx` batches output per animation frame and keeps only the last 200k characters (a script printing in a loop must not freeze the tab).
  - `Preview.tsx` waits for `backend.ready()` (the service worker) and, when `backend.hotPreview` is false, reloads the iframe after a save in its section.
  - `StorageTools.tsx` (browser mode only): export/import `.zip` (fflate) and restore the repo's examples.
- `lab/frame/mount.tsx` renders a sandbox in `StrictMode` + an error boundary. Two hosts use it:
  - Local: `lab/frame/react.html?file=react/X.tsx` loads the file via `import.meta.glob('/react/**/*.tsx')`. The glob change re-runs the module via HMR, so the React root is kept in `import.meta.hot.data`.
  - Browser: `lab/frame/browser.tsx` (built to `/runtime/frame.js`), loaded by a host page that the service worker generates.
- Browser mode (`lab/browser/`, URLs in `paths.ts`):
  - `vfs.ts`: the IndexedDB store (`quick-lab` DB, `files` path → content), with the same rules as the plugin (save requires an existing file, create/rename refuse to overwrite). It's used by both the UI and the service worker. The first visit seeds it from `/lab-seed.json` (the repo's files at build time). Tabs sync through a `BroadcastChannel`.
  - `sw.ts` → `/sw.js`, scope `/vfs/`: serves `/vfs/<path>` from IndexedDB.
    - HTML gets the console bridge plus an import map for React.
    - TS/TSX/JSX go through `transform.ts`: sucrase (keeps line numbers), then es-module-lexer rewrites imports. Relative imports are resolved (Vite-like extensions except under `node/`, which needs the exact file like Node). React goes to `/runtime/react*.js`, `node:` built-ins to `/runtime/node/<shim>.js` or an error, and other packages to `https://esm.sh/` (React kept external).
    - A static import that can't load is replaced by a `throw` with a Node-like message. Otherwise the browser fails at link time with "does not provide an export named…".
    - CSS/JSON/other imports get `?module` (a small JS module).
    - It also generates the React host page (`__frame/react.html`) and the hidden node runner page (`__node/runner.html`).
  - Running `node/`: the UI adds a hidden iframe `/vfs/__node/runner.html`, which starts a module Worker at `/vfs/__node/worker.js`. Both are under the service worker's scope, so the worker's imports are served and transpiled. Removing the iframe kills the worker (Stop, re-run). `runtime/node-worker.ts` installs `console` (`runtime/console.ts`, `inspect.ts` = port of Node's `util.inspect`/`util.format`, tested against Node), `process`, Node-style timers (`Timeout` with `ref`/`unref`) and a tracked `fetch`. It exits like Node: when the main module is done and no timer or fetch is pending (plus a 15 ms grace period). It batches output (at most one message per 30 ms) and maps browser stack URLs back to `node/x.ts:line:col`.
- `lab/build.ts` (plugin, `apply: 'build'`) adds entries with stable URLs under `/runtime/` (`preserveEntrySignatures: 'exports-only'`):
  - virtual ES facades over the app's own React (`react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`), so sandboxes share one React copy;
  - the frame, the node worker and the `node:` shims.
  - It also emits `lab-types.json`, `lab-seed.json` and `404.html` (retries a `/vfs/` miss once through the service worker), then builds `sw.js` as a separate IIFE (classic service worker).
- `vite.config.ts` also holds the Vitest config (`test.include`: `{node,react,lab}/**/*.test.{ts,tsx}`).

## Gotchas

- Node files run via Node's native type stripping (Node ≥ 22.18), with no compile step: type errors don't block execution.
  - `tsconfig.json` uses `moduleResolution: bundler`, so `tsc` accepts extensionless relative imports in `node/` that fail at runtime. Relative imports there must include `.ts`.
  - `erasableSyntaxOnly` forbids `enum`/`namespace`/parameter properties (in `lab/` too: declare fields explicitly).
- The project type-checks with TypeScript 7 (`tsc`), but Monaco bundles its own TS 5.9 with options mirrored in `lab/app/monaco.ts`. Keep the two in sync when changing compiler options. Both use `moduleDetection: force`.
- The DOM and `@types/node` globals are shared across all folders, both in `tsc` and in the editor. So in browser-side code, `setTimeout` is typed as Node's (it returns `Timeout`); `node-worker.ts` casts the native timers. `sw.ts` declares its own minimal service worker types instead of pulling in the `webworker` lib.
- `package.json` has `"type": "module"`, so node scripts are ESM (no `require`; top-level `await` works).
- Browser mode is Node-_like_:
  - There is no `fs`/`http`/`child_process`/`Buffer`, and `process.version` is `v0.0.0-browser`.
  - Packages come from esm.sh, so they need network access.
  - React is the production build, so StrictMode doesn't double-render.
  - The seed only fills an empty browser. A new deploy doesn't change files a visitor already has; "Restaurar exemplos" does.
- **Never drive the lab UI (Playwright etc.) against the real working tree.** Auto-save writes to disk, and `node/index.ts` holds the user's live work. Run UI automation against a copy of the repo (rsync without `node_modules`, then `cp -Rc node_modules` for an APFS clone) served on another port. For browser mode, build in the copy and serve its `dist/`. `vite preview` falls back to `index.html` for unknown paths, while Netlify serves `404.html`.
- **Don't start a second Vite dev server (or Vitest) in this repo** (not even to check a config change) while the user's `npm run dev` may be running; check `lsof -nP -iTCP:5555 -sTCP:LISTEN` first.
  - Both processes share `node_modules/.vite`. The second one's dependency re-optimization deletes the live server's pre-bundled chunks, even if that process then dies on the port. Monaco's lazy chunks then return 504, which looks like no syntax highlighting and no IntelliSense. Fix: `touch vite.config.ts` (the live server restarts and re-optimizes), then reload the page. Test against the copy instead; it has its own cache.
  - `vite build` doesn't touch `node_modules/.vite`.
- Pages in `pure/` and the React sandboxes are same-origin with the lab, so any script they load can call `/__lab` (local) or read IndexedDB (browser). Don't load untrusted third-party scripts there.
- Monaco renders spaces as non-breaking spaces (U+00A0), so normalize them when reading editor text in UI tests. Typing `{` + newline via `keyboard.insertText` also gets auto-closed, so keep test snippets on single-line blocks.
- With Vite 8.3 + `@vitejs/plugin-react` 6.3, a cold start (empty `node_modules/.vite`) logs `Cannot optimize dependency: react`. This is upstream noise and React still gets pre-bundled.

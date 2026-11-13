import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import CssWorker from 'monaco-editor/languages/features/css/css.worker?worker'
import HtmlWorker from 'monaco-editor/languages/features/html/html.worker?worker'
import JsonWorker from 'monaco-editor/languages/features/json/json.worker?worker'
import TsWorker from 'monaco-editor/languages/features/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_id, label) {
    switch (label) {
      case 'typescript':
      case 'javascript':
        return new TsWorker()
      case 'html':
        return new HtmlWorker()
      case 'css':
        return new CssWorker()
      case 'json':
        return new JsonWorker()
      default:
        return new EditorWorker()
    }
  },
}

const { typescript } = monaco

// Mirrors tsconfig.json. `moduleDetection: 3` (force) treats every file as a module, like
// Node ESM, so top-level names in different playground files don't collide.
const compilerOptions: monaco.typescript.CompilerOptions = {
  target: typescript.ScriptTarget.ESNext,
  module: typescript.ModuleKind.ESNext,
  moduleResolution: typescript.ModuleResolutionKind.NodeJs,
  jsx: typescript.JsxEmit.ReactJSX,
  strict: true,
  noEmit: true,
  allowJs: true,
  allowNonTsExtensions: true,
  allowImportingTsExtensions: true,
  esModuleInterop: true,
  skipLibCheck: true,
  moduleDetection: 3,
  // Flag what Node's type stripping rejects at runtime (enum, namespace, untyped type imports).
  erasableSyntaxOnly: true,
  verbatimModuleSyntax: true,
}
typescript.typescriptDefaults.setCompilerOptions(compilerOptions)
typescript.javascriptDefaults.setCompilerOptions(compilerOptions)
// Plain JS (mostly pure/ scripts) gets syntax checks only: classic scripts share one global scope.
typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
})
// Sync every model to the TS worker, so imports between playground files resolve.
typescript.typescriptDefaults.setEagerModelSync(true)

const AMBIENT_TYPES = `
declare module '*.css'
declare module '*.svg' { const src: string; export default src }
declare module '*.png' { const src: string; export default src }
declare module '*.jpg' { const src: string; export default src }
`

/** Registers .d.ts files (keyed by their file:///node_modules/... path) with both language services. */
export function setTypeDefinitions(types: Record<string, string>) {
  const libs = [
    ...Object.entries(types).map(([filePath, content]) => ({
      filePath,
      content,
    })),
    { filePath: 'file:///lab-ambient.d.ts', content: AMBIENT_TYPES },
  ]
  typescript.typescriptDefaults.setExtraLibs(libs)
  typescript.javascriptDefaults.setExtraLibs(libs)
}

monaco.editor.defineTheme('lab-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: { 'editor.background': '#111318' },
})
const darkMode = matchMedia('(prefers-color-scheme: dark)')
const applyTheme = () =>
  monaco.editor.setTheme(darkMode.matches ? 'lab-dark' : 'vs')
applyTheme()
darkMode.addEventListener('change', applyTheme)

export { monaco }

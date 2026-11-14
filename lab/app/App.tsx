import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  isRunnable,
  sectionOf,
  SECTIONS,
  type LabFiles,
  type Section,
} from '../shared.ts'
import { backend } from './backend/index.ts'
import { Editor } from './Editor.tsx'
import { NodeRunner } from './NodeRunner.tsx'
import { Preview } from './Preview.tsx'
import { clamp, ResizeHandle } from './ResizeHandle.tsx'
import { Sidebar } from './Sidebar.tsx'
import { DEFAULT_EXTENSION, templateFor } from './templates.ts'
import { useStoredState } from './useStoredState.ts'
import {
  dirtyFiles,
  discardChanges,
  forget,
  save,
  syncFileList,
  syncFromStorage,
} from './workspace.ts'

// Keep in sync with the media query in styles.css that stacks the editor above the result.
const STACKED = '(max-width: 1000px)'
const SIDEBAR = { initial: 220, min: 140, max: 480 }
const SPLIT = { initial: 0.5, min: 0.15, max: 0.85 }

function useLabFiles() {
  const [files, setFiles] = useState<LabFiles>()
  const [error, setError] = useState<string>()

  const refresh = useCallback(async () => {
    const next = await backend.listFiles()
    setFiles(next)
    return next
  }, [])

  useEffect(() => {
    refresh().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : String(err)),
    )
    return backend.onFilesChange(setFiles)
  }, [refresh])

  return [files, refresh, error] as const
}

function useHash() {
  const read = () => decodeURI(location.hash.slice(1))
  const [hash, setHash] = useState(read)

  useEffect(() => {
    const onChange = () => setHash(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  // Updates state right away (not on the async hashchange event), so a file list refresh
  // and the navigation that follows it render together.
  const navigate = useCallback((file: string) => {
    location.hash = encodeURI(file)
    setHash(file)
  }, [])

  return [hash, navigate] as const
}

/**
 * What the result pane shows: the open file if it runs on its own; otherwise (a CSS file, a hook…)
 * the last runnable file opened in that section, or the first one in the same folder.
 */
function useTarget(current: string | undefined, all: string[]) {
  const last = useRef<Partial<Record<Section, string>>>({})
  const section = current && sectionOf(current)
  if (!current || !section) return undefined
  if (isRunnable(current) && all.includes(current)) {
    last.current[section] = current
    return current
  }
  const remembered = last.current[section]
  if (remembered && all.includes(remembered)) return remembered
  const folder = current.slice(0, current.lastIndexOf('/') + 1)
  return (
    all.find((f) => f.startsWith(folder) && isRunnable(f)) ??
    all.find((f) => sectionOf(f) === section && isRunnable(f))
  )
}

export function App() {
  const [files, refreshFiles, filesError] = useLabFiles()
  const all = useMemo(
    () => (files ? SECTIONS.flatMap((s) => files[s]) : []),
    [files],
  )
  const [hash, navigate] = useHash()
  const current = hash || all.find(isRunnable) || all[0]
  const target = useTarget(current, all)

  const [sidebarWidth, setSidebarWidth] = useStoredState(
    'lab:sidebar-width',
    SIDEBAR.initial,
  )
  const [split, setSplit] = useStoredState('lab:split', SPLIT.initial)
  const labRef = useRef<HTMLDivElement>(null)
  const editorPane = useRef<HTMLElement>(null)
  const resultPane = useRef<HTMLElement>(null)

  useEffect(() => {
    document.title = current ? `${current} · Quick Helper` : 'Quick Helper'
  }, [current])

  useEffect(() => {
    if (files) syncFileList(all).catch(() => undefined)
  }, [files, all])

  useEffect(
    () => backend.onFileChange((file) => void syncFromStorage(file)),
    [],
  )

  // With auto-save off, switching files keeps unsaved buffers around: warn before losing them.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyFiles()) event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  async function createFile(section: Section, name: string) {
    // Typing the section itself ("node/x.ts" in Node) shouldn't create node/node/x.ts.
    let rel = name.replace(/^\/+/, '').replace(new RegExp(`^${section}/`), '')
    if (!/\.\w+$/.test(rel.split('/').pop()!)) rel += DEFAULT_EXTENSION[section]
    const file = `${section}/${rel}`
    const created = await backend.createFile(file, templateFor(file)) // normalized
    await refreshFiles()
    navigate(created)
  }

  async function renameFile(from: string, to: string) {
    const destination = to.trim().replace(/^\/+/, '')
    if (!destination || destination === from) return
    await save(from) // the moved file must carry unsaved edits
    const moved = await backend.renameFile(from, destination) // normalized
    forget(from) // a pending auto-save must not target the old path
    await refreshFiles()
    navigate(moved)
  }

  async function deleteFile(file: string) {
    if (!confirm(`Excluir ${file}? Isso não pode ser desfeito.`)) return
    try {
      // A pending (or on-leave) auto-save would otherwise recreate the file.
      discardChanges(file)
      await backend.deleteFile(file)
      forget(file)
      const refreshed = await refreshFiles()
      const next = SECTIONS.flatMap((s) => refreshed[s])
      navigate(
        next.find((f) => sectionOf(f) === sectionOf(file) && isRunnable(f)) ??
          next[0] ??
          '',
      )
    } catch (err) {
      alert(String(err))
    }
  }

  function startSidebarResize() {
    const left = labRef.current!.getBoundingClientRect().left
    return (move: PointerEvent) =>
      setSidebarWidth(
        Math.round(clamp(move.clientX - left, SIDEBAR.min, SIDEBAR.max)),
      )
  }

  // Side by side the divider moves horizontally; on narrow screens (stacked) vertically.
  function startSplitResize() {
    const editor = editorPane.current!.getBoundingClientRect()
    const result = resultPane.current!.getBoundingClientRect()
    const stacked = matchMedia(STACKED).matches
    const start = stacked ? editor.top : editor.left
    const total = stacked
      ? editor.height + result.height
      : editor.width + result.width
    return (move: PointerEvent) => {
      const position = (stacked ? move.clientY : move.clientX) - start
      const share = clamp(position / total, SPLIT.min, SPLIT.max)
      setSplit(Math.round(share * 1000) / 1000)
    }
  }

  const share = clamp(split, SPLIT.min, SPLIT.max)
  const layout = {
    '--sidebar-width': `${clamp(sidebarWidth, SIDEBAR.min, SIDEBAR.max)}px`,
    '--editor-share': `${share}fr`,
    '--result-share': `${1 - share}fr`,
  } as CSSProperties

  const exists = !!current && all.includes(current)

  return (
    <div className="lab" ref={labRef} style={layout}>
      <Sidebar files={files} current={current} onCreate={createFile} />
      <ResizeHandle
        className="resize-sidebar"
        label="Redimensionar barra lateral"
        onResizeStart={startSidebarResize}
        onReset={() => setSidebarWidth(SIDEBAR.initial)}
      />
      <section className="pane editor-pane" ref={editorPane}>
        {exists ? (
          <Editor
            file={current}
            onRename={(to) => renameFile(current, to)}
            onDelete={() => void deleteFile(current)}
          />
        ) : (
          (files || filesError) && (
            <p className="empty">
              {filesError ??
                (current
                  ? `Arquivo não encontrado: ${current}`
                  : 'Crie um arquivo na barra lateral.')}
            </p>
          )
        )}
      </section>
      <ResizeHandle
        className="resize-split"
        label="Redimensionar editor e resultado"
        onResizeStart={startSplitResize}
        onReset={() => setSplit(SPLIT.initial)}
      />
      <section className="pane result-pane" ref={resultPane}>
        {target ? (
          sectionOf(target) === 'node' ? (
            <NodeRunner key={target} file={target} />
          ) : (
            <Preview key={target} file={target} />
          )
        ) : (
          files && <p className="empty">Nada para executar aqui.</p>
        )}
      </section>
    </div>
  )
}

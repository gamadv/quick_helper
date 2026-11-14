import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from 'react'
import { backend } from './backend/index.ts'
import { monaco } from './monaco.ts'
import { Toolbar } from './Toolbar.tsx'
import { useStoredState } from './useStoredState.ts'
import {
  fileOf,
  isDirty,
  loadedModel,
  openModel,
  save,
  subscribe,
} from './workspace.ts'

const BINARY =
  /\.(png|jpe?g|gif|webp|avif|ico|bmp|woff2?|ttf|otf|eot|mp3|mp4|webm|ogg|wav|pdf|zip)$/i
const AUTO_SAVE_DELAY = 600

/** Inline input that replaces the file name in the toolbar; Enter renames, Esc/blur cancels. */
function RenameField({
  file,
  onRename,
  onDone,
}: {
  file: string
  onRename: (to: string) => Promise<void>
  onDone: () => void
}) {
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Select just the name, like VS Code: "react/hooks/useFoo.ts" -> "useFoo".
  useEffect(() => {
    const input = inputRef.current!
    const start = file.lastIndexOf('/') + 1
    const dot = file.lastIndexOf('.')
    input.focus()
    input.setSelectionRange(start, dot > start ? dot : file.length)
  }, [file])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const to = String(new FormData(event.currentTarget).get('path')).trim()
    if (!to || to === file) return onDone()
    setBusy(true)
    try {
      await onRename(to)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <form className="rename" onSubmit={(event) => void submit(event)}>
      <input
        ref={inputRef}
        name="path"
        aria-label="Novo caminho do arquivo"
        defaultValue={file}
        autoComplete="off"
        spellCheck={false}
        // readOnly (not disabled) while saving, so the input keeps focus and Esc still works.
        readOnly={busy}
        onKeyDown={(e) => e.key === 'Escape' && onDone()}
        onBlur={() => !busy && onDone()}
      />
      {error && <span className="rename-error">{error}</span>}
    </form>
  )
}

export function Editor({
  file,
  onRename,
  onDelete,
}: {
  file: string
  onRename: (to: string) => Promise<void>
  onDelete: () => void
}) {
  const [renaming, setRenaming] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>(null)
  const viewStates = useRef(
    new Map<string, monaco.editor.ICodeEditorViewState | null>(),
  )
  const [autoSave, setAutoSave] = useStoredState('lab:auto-save', true)
  const autoSaveRef = useRef(autoSave)
  const [message, setMessage] = useState<string>()
  const [saveError, setSaveError] = useState<string>()
  const dirty = useSyncExternalStore(subscribe, () => isDirty(file))

  const saveFile = useCallback(
    (target: string) =>
      save(target).then(
        () => setSaveError(undefined),
        (err: unknown) => setSaveError(`Erro ao salvar ${target}: ${err}`),
      ),
    [],
  )

  useEffect(() => {
    autoSaveRef.current = autoSave
  }, [autoSave])

  useEffect(() => setRenaming(false), [file])

  // One Monaco instance for the whole session; files swap models in and out. Layout effects
  // (in this order) so the title and the buffer on screen never disagree, not even for a frame.
  useLayoutEffect(() => {
    const editor = monaco.editor.create(container.current!, {
      model: null,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      tabSize: 2,
      scrollBeyondLastLine: false,
      fixedOverflowWidgets: true,
      padding: { top: 12 },
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const model = editor.getModel()
      if (model) void saveFile(fileOf(model))
    })
    editorRef.current = editor
    return () => {
      editor.dispose()
      editorRef.current = null
    }
  }, [saveFile])

  useLayoutEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    let cancelled = false
    setMessage(undefined)

    if (BINARY.test(file)) {
      editor.setModel(null)
      setMessage('Arquivo binário: não dá para editar aqui.')
      return
    }

    const show = (model: monaco.editor.ITextModel) => {
      editor.setModel(model)
      const viewState = viewStates.current.get(file)
      if (viewState) editor.restoreViewState(viewState)
      // After a slow load, don't steal focus from a text field elsewhere (e.g. the
      // new-file box): keystrokes would land in this file and get auto-saved.
      const active = document.activeElement
      const typingElsewhere =
        (active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement) &&
        !container.current?.contains(active)
      if (!typingElsewhere) editor.focus()
    }

    // Never leave the previous file's buffer on screen while this one loads: keystrokes
    // would land (and be auto-saved) in the wrong file.
    const loaded = loadedModel(file)
    if (loaded) {
      show(loaded)
    } else {
      editor.setModel(null)
      openModel(file).then(
        (model) => !cancelled && show(model),
        (err: unknown) => !cancelled && setMessage(String(err)),
      )
    }

    return () => {
      cancelled = true
      const model = editor.getModel()
      if (model && fileOf(model) === file) {
        viewStates.current.set(file, editor.saveViewState())
      }
      // Leaving the file: flush a pending auto-save right away.
      if (autoSaveRef.current && isDirty(file)) void saveFile(file)
    }
  }, [file, saveFile])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !autoSave) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const subscription = editor.onDidChangeModelContent(() => {
      const model = editor.getModel()
      if (!model) return
      const target = fileOf(model)
      clearTimeout(timer)
      timer = setTimeout(() => void saveFile(target), AUTO_SAVE_DELAY)
    })
    return () => {
      clearTimeout(timer)
      subscription.dispose()
    }
  }, [autoSave, saveFile])

  function toggleAutoSave(value: boolean) {
    setAutoSave(value)
    if (value && isDirty(file)) void saveFile(file)
  }

  return (
    <>
      <Toolbar
        title={
          renaming ? (
            <RenameField
              file={file}
              onRename={onRename}
              onDone={() => setRenaming(false)}
            />
          ) : (
            <button
              type="button"
              className="file-name"
              title="Clique para renomear ou mover"
              onClick={() => setRenaming(true)}
            >
              {file}
              {dirty && (
                <span className="dirty" title="Alterações não salvas">
                  {' '}
                  ●
                </span>
              )}
              <span className="pencil" aria-hidden>
                ✎
              </span>
            </button>
          )
        }
      >
        <label className="toggle" title="Salva enquanto você digita">
          <input
            type="checkbox"
            checked={autoSave}
            onChange={(e) => toggleAutoSave(e.target.checked)}
          />
          Auto-salvar
        </label>
        <button
          type="button"
          onClick={() => void saveFile(file)}
          disabled={!dirty}
          title="Salvar (⌘S / Ctrl+S)"
        >
          Salvar
        </button>
        {backend.openInEditor && (
          <button
            type="button"
            title="Abrir no editor do sistema (VS Code)"
            onClick={() => backend.openInEditor?.(file)}
          >
            VS Code
          </button>
        )}
        <button type="button" className="danger" onClick={onDelete}>
          Excluir
        </button>
      </Toolbar>
      {saveError && <p className="banner">{saveError}</p>}
      <div className="editor" ref={container} hidden={!!message} />
      {message && <p className="empty">{message}</p>}
    </>
  )
}

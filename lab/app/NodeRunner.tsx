import { useCallback, useEffect, useRef, useState } from 'react'
import { NODE_SCRIPT } from '../shared.ts'
import { backend } from './backend/index.ts'
import { Toolbar } from './Toolbar.tsx'
import { useStoredState } from './useStoredState.ts'

type Chunk = { stream: 'stdout' | 'stderr'; text: string }
type Output = { chunks: Chunk[]; truncated: boolean }

const EMPTY_OUTPUT: Output = { chunks: [], truncated: false }
const MAX_OUTPUT = 200_000 // characters kept on screen

/** Appends output, merging same-stream chunks and dropping the oldest text past MAX_OUTPUT. */
function appendOutput(prev: Output, added: Chunk[]): Output {
  const chunks = [...prev.chunks]
  for (const chunk of added) {
    const last = chunks.at(-1)
    if (last?.stream === chunk.stream) {
      chunks[chunks.length - 1] = { ...last, text: last.text + chunk.text }
    } else {
      chunks.push(chunk)
    }
  }
  let size = chunks.reduce((total, chunk) => total + chunk.text.length, 0)
  let truncated = prev.truncated
  while (size > MAX_OUTPUT) {
    const first = chunks[0]
    const excess = size - MAX_OUTPUT
    if (first.text.length <= excess) {
      chunks.shift()
      size -= first.text.length
    } else {
      chunks[0] = { ...first, text: first.text.slice(excess) }
      size -= excess
    }
    truncated = true
  }
  return { chunks, truncated }
}
type Status =
  | { state: 'running' }
  | { state: 'stopped' }
  | { state: 'exited'; code: number | null; signal: string | null; ms: number }

function describe(status: Status | undefined) {
  if (!status) return { text: 'Clique em Rodar para executar.', tone: '' }
  if (status.state === 'running') return { text: 'Rodando…', tone: 'running' }
  if (status.state === 'stopped') return { text: 'Interrompido.', tone: '' }
  if (status.signal)
    return { text: `Encerrado por ${status.signal}.`, tone: '' }
  if (status.code === 0)
    return { text: `Finalizado em ${status.ms} ms.`, tone: 'ok' }
  return {
    text: `Saiu com código ${status.code} em ${status.ms} ms.`,
    tone: 'error',
  }
}

export function NodeRunner({ file }: { file: string }) {
  const [output, setOutput] = useState(EMPTY_OUTPUT)
  const [status, setStatus] = useState<Status>()
  const [autoRun, setAutoRun] = useStoredState('lab:auto-run', true)
  const abortRef = useRef<AbortController>(null)
  const outputRef = useRef<HTMLPreElement>(null)
  // Output is buffered and committed once per animation frame, not once per chunk.
  const pending = useRef<Chunk[]>([])
  const frame = useRef(0)

  const flush = useCallback(() => {
    frame.current = 0
    const added = pending.current
    pending.current = []
    if (added.length) setOutput((prev) => appendOutput(prev, added))
  }, [])

  const push = useCallback(
    (chunk: Chunk) => {
      pending.current.push(chunk)
      frame.current ||= requestAnimationFrame(flush)
    },
    [flush],
  )

  const resetOutput = useCallback(() => {
    cancelAnimationFrame(frame.current)
    frame.current = 0
    pending.current = []
    setOutput(EMPTY_OUTPUT)
  }, [])

  const run = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    resetOutput()
    setStatus({ state: 'running' })

    let exited = false
    try {
      await backend.run(
        file,
        (msg) => {
          if (controller.signal.aborted) return
          if (msg.type === 'exit') {
            exited = true
            cancelAnimationFrame(frame.current)
            flush() // commit buffered output together with the final status
            setStatus({ state: 'exited', ...msg })
          } else {
            push({ stream: msg.type, text: msg.data })
          }
        },
        controller.signal,
      )
      if (!exited && !controller.signal.aborted) setStatus({ state: 'stopped' })
    } catch (err) {
      if (controller.signal.aborted) return
      push({ stream: 'stderr', text: String(err) })
      setStatus({ state: 'stopped' })
    }
  }, [file, flush, push, resetOutput])

  function stop() {
    abortRef.current?.abort()
    setStatus({ state: 'stopped' })
  }

  // Run on open; abort (and stop the script) when switching files or leaving.
  // `run` only changes with `file`, and this component is keyed by file, so this runs once.
  useEffect(() => {
    if (autoRun) void run()
    return () => {
      abortRef.current?.abort()
      cancelAnimationFrame(frame.current)
    }
  }, [run])

  // Re-run whenever a script under node/ is saved (from the lab editor or elsewhere).
  useEffect(() => {
    if (!autoRun) return
    let timer: ReturnType<typeof setTimeout>
    const unsubscribe = backend.onFileChange((changed) => {
      if (!changed.startsWith('node/') || !NODE_SCRIPT.test(changed)) return
      clearTimeout(timer)
      timer = setTimeout(() => void run(), 100)
    })
    return () => {
      clearTimeout(timer)
      unsubscribe()
    }
  }, [autoRun, run])

  useEffect(() => {
    const el = outputRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [output])

  const { text, tone } = describe(status)

  return (
    <>
      <Toolbar title={<>▶ {file}</>}>
        <label className="toggle">
          <input
            type="checkbox"
            checked={autoRun}
            onChange={(e) => setAutoRun(e.target.checked)}
          />
          Rodar ao salvar
        </label>
        {status?.state === 'running' && (
          <button type="button" onClick={stop}>
            Parar
          </button>
        )}
        <button type="button" className="primary" onClick={() => void run()}>
          Rodar
        </button>
      </Toolbar>
      <pre className="console" ref={outputRef}>
        {output.truncated && (
          <span className="muted">
            … início da saída omitido (mostrando os últimos{' '}
            {MAX_OUTPUT.toLocaleString('pt-BR')} caracteres)
            {'\n'}
          </span>
        )}
        {output.chunks.map((chunk, i) => (
          <span key={i} className={chunk.stream}>
            {chunk.text}
          </span>
        ))}
        {output.chunks.length === 0 && status?.state === 'exited' && (
          <span className="muted">(sem saída)</span>
        )}
      </pre>
      <footer className={`status ${tone}`}>{text}</footer>
    </>
  )
}

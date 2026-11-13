import { useEffect, useRef, useState } from 'react'
import { clamp, ResizeHandle } from './ResizeHandle.tsx'
import { Toolbar } from './Toolbar.tsx'
import { useStoredState } from './useStoredState.ts'

type Log = { level: string; text: string }
const MAX_LOGS = 500
const CONSOLE_HEIGHT = { initial: 150, min: 60 }

// HTML pages and React sandboxes render in an iframe so their CSS and errors stay isolated.
// lab/console-bridge.js (injected into those pages) forwards their console here.
export function Preview({ file }: { file: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const logsRef = useRef<HTMLDivElement>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [consoleOpen, setConsoleOpen] = useStoredState('lab:console', true)
  const [consoleHeight, setConsoleHeight] = useStoredState(
    'lab:console-height',
    CONSOLE_HEIGHT.initial,
  )
  const src = file.startsWith('react/')
    ? `/lab/frame/react.html?file=${encodeURIComponent(file)}`
    : `/${encodeURI(file)}`

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string } & Log
      if (event.source !== frame.current?.contentWindow) return
      if (data?.source !== 'quick-lab') return
      if (data.level === 'reset') setLogs([])
      else
        setLogs((prev) => [
          ...prev.slice(-MAX_LOGS + 1),
          { level: data.level, text: data.text },
        ])
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    const el = logsRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs, consoleOpen])

  const errors = logs.filter((log) => log.level === 'error').length

  return (
    <>
      <Toolbar title={<>▶ {file}</>}>
        <button
          type="button"
          onClick={() => frame.current?.contentWindow?.location.reload()}
        >
          Recarregar
        </button>
        <a className="button" href={src} target="_blank" rel="noreferrer">
          Nova aba
        </a>
      </Toolbar>
      <iframe ref={frame} className="preview" src={src} title={file} />
      <section className="frame-console">
        {consoleOpen && (
          <ResizeHandle
            className="resize-console"
            label="Redimensionar console"
            onResizeStart={(event) => {
              const startY = event.clientY
              const startHeight = logsRef.current?.offsetHeight ?? consoleHeight
              const pane = event.currentTarget.closest('.pane')
              const max = Math.max(
                CONSOLE_HEIGHT.min,
                (pane?.clientHeight ?? 600) - 160,
              )
              return (move) =>
                setConsoleHeight(
                  Math.round(
                    clamp(
                      startHeight + startY - move.clientY,
                      CONSOLE_HEIGHT.min,
                      max,
                    ),
                  ),
                )
            }}
            onReset={() => setConsoleHeight(CONSOLE_HEIGHT.initial)}
          />
        )}
        <header>
          <button
            type="button"
            className="link"
            aria-expanded={consoleOpen}
            onClick={() => setConsoleOpen(!consoleOpen)}
          >
            {consoleOpen ? '▾' : '▸'} Console
            {logs.length > 0 && (
              <span className={errors ? 'count error' : 'count'}>
                {logs.length}
              </span>
            )}
          </button>
          {consoleOpen && logs.length > 0 && (
            <button type="button" className="link" onClick={() => setLogs([])}>
              Limpar
            </button>
          )}
        </header>
        {consoleOpen && (
          <div className="logs" ref={logsRef} style={{ height: consoleHeight }}>
            {logs.length === 0 && (
              <div className="log muted">
                console.log da página aparece aqui
              </div>
            )}
            {logs.map((log, i) => (
              <div key={i} className={`log ${log.level}`}>
                {log.text}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

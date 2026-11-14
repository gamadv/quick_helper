import {
  Component,
  StrictMode,
  type ComponentType,
  type ReactNode,
} from 'react'
import type { Root } from 'react-dom/client'

export type SandboxModule = { default?: ComponentType }

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error?: Error }
> {
  state: { error?: Error } = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return <Message>{error.stack ?? String(error)}</Message>
  }
}

function Message({ children }: { children: ReactNode }) {
  return (
    <pre style={{ color: '#dc2626', whiteSpace: 'pre-wrap' }}>{children}</pre>
  )
}

/** Renders the sandbox `file` (a module whose default export is a component) into `root`. */
export function mount(
  root: Root,
  file: string,
  load: (() => Promise<SandboxModule>) | undefined,
) {
  if (!load) {
    root.render(<Message>Sandbox não encontrado: {file}</Message>)
    return
  }
  load()
    .then(({ default: Sandbox }) =>
      root.render(
        Sandbox ? (
          <StrictMode>
            <ErrorBoundary>
              <Sandbox />
            </ErrorBoundary>
          </StrictMode>
        ) : (
          <Message>{file} não tem um componente em export default.</Message>
        ),
      ),
    )
    .catch((err: unknown) =>
      root.render(
        <Message>
          {err instanceof Error ? (err.stack ?? String(err)) : String(err)}
        </Message>,
      ),
    )
}

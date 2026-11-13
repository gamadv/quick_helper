import {
  Component,
  StrictMode,
  type ComponentType,
  type ReactNode,
} from 'react'
import { createRoot, type Root } from 'react-dom/client'

// Every .tsx under react/ can be opened as a sandbox; it must `export default` a component.
const sandboxes = import.meta.glob<{ default?: ComponentType }>(
  '/react/**/*.tsx',
)

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

const file = new URLSearchParams(location.search).get('file') ?? ''
// This module re-runs via HMR whenever a .tsx is added under react/ (the glob changes),
// so keep a single React root across runs.
const root: Root =
  import.meta.hot?.data.root ?? createRoot(document.getElementById('root')!)
if (import.meta.hot) import.meta.hot.data.root = root
const load = sandboxes[`/${file}`]

if (!load) {
  root.render(<Message>Sandbox não encontrado: {file}</Message>)
} else {
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
    .catch((err: unknown) => root.render(<Message>{String(err)}</Message>))
}

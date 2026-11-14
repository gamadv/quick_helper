// React sandbox host for `npm run dev`: Vite serves the sandboxes (with Fast Refresh).
import { createRoot, type Root } from 'react-dom/client'
import { mount, type SandboxModule } from './mount.tsx'

// Every .tsx under react/ can be opened as a sandbox; it must `export default` a component.
const sandboxes = import.meta.glob<SandboxModule>('/react/**/*.tsx')

const file = new URLSearchParams(location.search).get('file') ?? ''
// This module re-runs via HMR whenever a .tsx is added under react/ (the glob changes),
// so keep a single React root across runs.
const root: Root =
  import.meta.hot?.data.root ?? createRoot(document.getElementById('root')!)
if (import.meta.hot) import.meta.hot.data.root = root

mount(root, file, sandboxes[`/${file}`])

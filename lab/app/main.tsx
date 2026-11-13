import { createRoot, type Root } from 'react-dom/client'
import { App } from './App.tsx'
import './styles.css'

// Reuse the root if this module re-runs via HMR.
const root: Root =
  import.meta.hot?.data.root ?? createRoot(document.getElementById('root')!)
if (import.meta.hot) import.meta.hot.data.root = root

// No StrictMode here on purpose: its double-mounted effects would run node scripts twice.
root.render(<App />)

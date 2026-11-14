// React sandbox host for the browser mode (built to /runtime/frame.js). The service worker serves
// the page and the sandbox modules; they import React through /runtime/react*.js, which share
// this file's copy of React.
import { createRoot } from 'react-dom/client'
import { vfsUrl } from '../browser/paths.ts'
import { mount, type SandboxModule } from './mount.tsx'

const file = new URLSearchParams(location.search).get('file') ?? ''

mount(
  createRoot(document.getElementById('root')!),
  file,
  () => import(/* @vite-ignore */ vfsUrl(file)) as Promise<SandboxModule>,
)

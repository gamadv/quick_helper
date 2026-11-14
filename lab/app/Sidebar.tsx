import { useState, useSyncExternalStore, type FormEvent } from 'react'
import { isRunnable, SECTIONS, type LabFiles, type Section } from '../shared.ts'
import { backend } from './backend/index.ts'
import { StorageTools } from './StorageTools.tsx'
import { dirtyFiles, subscribe } from './workspace.ts'

const LABELS: Record<Section, { label: string; placeholder: string }> = {
  node: { label: 'Node', placeholder: 'nome.ts' },
  pure: { label: 'HTML puro', placeholder: 'nome.html' },
  react: { label: 'React', placeholder: 'Nome.tsx' },
}

export function Sidebar({
  files,
  current,
  onCreate,
}: {
  files?: LabFiles
  current?: string
  onCreate: (section: Section, name: string) => Promise<void>
}) {
  const [creating, setCreating] = useState<Section>()
  const dirty = new Set(useSyncExternalStore(subscribe, dirtyFiles).split('\n'))
  const [error, setError] = useState<string>()

  function startCreating(section: Section) {
    setCreating(section)
    setError(undefined)
  }

  async function submit(event: FormEvent<HTMLFormElement>, section: Section) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('name')).trim()
    if (!name) return setCreating(undefined)
    try {
      await onCreate(section, name)
      setCreating(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <aside className="sidebar">
      <h1>🧪 Quick Helper</h1>
      {files &&
        SECTIONS.map((section) => (
          <nav key={section} aria-label={LABELS[section].label}>
            <div className="section-header">
              <h2>{LABELS[section].label}</h2>
              <button
                type="button"
                className="icon"
                title={`Novo arquivo em ${section}/`}
                aria-label={`Novo arquivo em ${section}/`}
                onClick={() => startCreating(section)}
              >
                +
              </button>
            </div>

            {creating === section && (
              <form
                className="new-file"
                onSubmit={(event) => void submit(event, section)}
              >
                <input
                  name="name"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={LABELS[section].placeholder}
                  onKeyDown={(e) =>
                    e.key === 'Escape' && setCreating(undefined)
                  }
                  onBlur={(e) =>
                    !e.currentTarget.value && setCreating(undefined)
                  }
                />
                <p className={error ? 'hint error' : 'hint'}>
                  {error ??
                    'Enter cria · Esc cancela · pasta/nome cria subpasta'}
                </p>
              </form>
            )}

            <ul>
              {files[section].map((file) => {
                const rel = file.slice(section.length + 1)
                const slash = rel.lastIndexOf('/') + 1
                return (
                  <li key={file}>
                    <a
                      href={`#${encodeURI(file)}`}
                      aria-current={file === current ? 'page' : undefined}
                      className={isRunnable(file) ? undefined : 'support'}
                    >
                      {slash > 0 && (
                        <span className="dir">{rel.slice(0, slash)}</span>
                      )}
                      {rel.slice(slash)}
                      {dirty.has(file) && (
                        <span className="dirty" title="Alterações não salvas">
                          {' '}
                          ●
                        </span>
                      )}
                    </a>
                  </li>
                )
              })}
            </ul>
            {files[section].length === 0 && creating !== section && (
              <p className="hint">Nenhum arquivo ainda.</p>
            )}
          </nav>
        ))}
      {backend.storage && <StorageTools storage={backend.storage} />}
    </aside>
  )
}

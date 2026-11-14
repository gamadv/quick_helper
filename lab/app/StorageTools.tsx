import { useRef, useState, type ChangeEvent } from 'react'
import type { BrowserStorage } from './backend/index.ts'

/** Browser mode: files live in this browser, so offer backup (zip) and the repo's examples. */
export function StorageTools({ storage }: { storage: BrowserStorage }) {
  const [status, setStatus] = useState<{ text: string; error?: boolean }>()
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function act(action: () => Promise<string>) {
    setBusy(true)
    try {
      setStatus({ text: await action() })
    } catch (err) {
      setStatus({
        text: err instanceof Error ? err.message : String(err),
        error: true,
      })
    } finally {
      setBusy(false)
    }
  }

  const exportZip = () =>
    act(async () => {
      const url = URL.createObjectURL(await storage.exportZip())
      const link = document.createElement('a')
      link.href = url
      link.download = `quick-helper-${new Date().toISOString().slice(0, 10)}.zip`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return 'Backup baixado.'
    })

  function importZip(event: ChangeEvent<HTMLInputElement>) {
    const zip = event.target.files?.[0]
    event.target.value = '' // choosing the same file again must fire onChange
    if (!zip) return
    void act(async () => {
      const count = await storage.importZip(zip)
      return count
        ? `${count} arquivo(s) importado(s).`
        : 'Nenhum arquivo de node/, pure/ ou react/ no .zip.'
    })
  }

  function restore() {
    if (
      !confirm(
        'Restaurar os exemplos do repositório? Os arquivos com o mesmo nome serão substituídos; os outros ficam.',
      )
    )
      return
    void act(
      async () =>
        `${await storage.restoreExamples()} exemplo(s) restaurado(s).`,
    )
  }

  return (
    <footer className="storage">
      <p className="hint">
        Arquivos salvos só neste navegador. Exporte um .zip para não perdê-los.
      </p>
      <div className="storage-actions">
        <button type="button" disabled={busy} onClick={() => void exportZip()}>
          Exportar .zip
        </button>
        <button
          type="button"
          disabled={busy}
          title="Arquivos com o mesmo caminho são substituídos"
          onClick={() => input.current?.click()}
        >
          Importar .zip
        </button>
        <button
          type="button"
          className="link"
          disabled={busy}
          onClick={restore}
        >
          Restaurar exemplos
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept=".zip,application/zip"
        hidden
        onChange={importZip}
      />
      {status && (
        <p className={status.error ? 'hint error' : 'hint'} role="status">
          {status.text}
        </p>
      )}
    </footer>
  )
}

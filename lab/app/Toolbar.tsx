import type { ReactNode } from 'react'

export function Toolbar({
  title,
  children,
}: {
  title: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="toolbar">
      <div className="toolbar-title">{title}</div>
      <div className="actions">{children}</div>
    </header>
  )
}

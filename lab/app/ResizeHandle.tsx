import type { PointerEvent as ReactPointerEvent } from 'react'

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/**
 * A draggable divider. `onResizeStart` measures what it needs when the drag begins and returns
 * the function called on every pointer move. Double-click calls `onReset`.
 */
export function ResizeHandle({
  className,
  label,
  onResizeStart,
  onReset,
}: {
  className: string
  label: string
  onResizeStart: (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => (move: PointerEvent) => void
  onReset: () => void
}) {
  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    const handle = event.currentTarget
    const drag = onResizeStart(event)
    handle.setPointerCapture(event.pointerId)
    // Iframes would swallow pointer moves; .resizing disables them while dragging.
    document.body.classList.add('resizing')
    // lostpointercapture also covers drags that end without a pointerup (e.g. switching apps);
    // otherwise .resizing would stay on and iframes would stop taking clicks.
    const endEvents = ['pointerup', 'pointercancel', 'lostpointercapture']
    const end = () => {
      handle.removeEventListener('pointermove', drag)
      for (const type of endEvents) handle.removeEventListener(type, end)
      document.body.classList.remove('resizing')
    }
    handle.addEventListener('pointermove', drag)
    for (const type of endEvents) handle.addEventListener(type, end)
  }

  return (
    <div
      className={`resize-handle ${className}`}
      role="separator"
      aria-label={label}
      title={`${label} · duplo clique restaura`}
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
    />
  )
}

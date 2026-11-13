import { useState } from 'react'

/** A UI preference remembered in localStorage (in memory only if storage is unavailable). */
export function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored === null) return fallback
      const parsed: unknown = JSON.parse(stored)
      // Ignore values of the wrong type (corrupted or from an older version).
      return typeof parsed === typeof fallback ? (parsed as T) : fallback
    } catch {
      return fallback
    }
  })

  function update(next: T) {
    setValue(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // Storage unavailable (private mode): keep the value for this session only.
    }
  }

  return [value, update] as const
}

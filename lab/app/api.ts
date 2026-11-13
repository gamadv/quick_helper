import { LAB_HEADER } from '../shared.ts'

export function labFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set(LAB_HEADER, '1')
  return fetch(url, { ...init, headers })
}

export const fileUrl = (file: string) =>
  `/__lab/file?path=${encodeURIComponent(file)}`

export async function expectOk(res: Response) {
  if (!res.ok) throw new Error((await res.text()) || res.statusText)
  return res
}

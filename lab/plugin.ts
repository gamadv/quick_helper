import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import type { Readable } from 'node:stream'
import type { Plugin } from 'vite'
import { collectTypes, listFiles, resolveLabPath, toPosix } from './files.ts'
import {
  CODE_FILE,
  IGNORED_PATH,
  LAB_HEADER,
  NODE_SCRIPT,
  sectionOf,
  type RunMessage,
} from './shared.ts'

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

function reply(res: ServerResponse, status: number, body?: string | object) {
  res.statusCode = status
  if (body === undefined) return res.end()
  if (typeof body === 'string') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return res.end(body)
  }
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

/**
 * Only the lab page itself may call /__lab:
 * - the custom header forces a CORS preflight on any cross-origin request;
 * - Origin / Sec-Fetch-Site reject other origins, including other localhost ports, which
 *   Vite's default CORS policy would otherwise let through;
 * - the loopback check keeps the API closed even if the server is started with --host.
 */
function isTrustedRequest(req: IncomingMessage) {
  if (req.headers[LAB_HEADER] !== '1') return false
  if (!LOOPBACK.has(req.socket.remoteAddress ?? '')) return false
  const site = req.headers['sec-fetch-site']
  if (site !== undefined && site !== 'same-origin') return false
  const origin = req.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

/** SIGTERM, then SIGKILL if the script ignores it (e.g. it traps SIGTERM). */
function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return
  child.kill('SIGTERM')
  const timer = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null)
      child.kill('SIGKILL')
  }, 3000)
  timer.unref()
  child.once('exit', () => clearTimeout(timer))
}

export function lab(): Plugin {
  let consoleBridge = ''
  let typesJson: string | undefined

  return {
    name: 'quick-helper-lab',
    apply: 'serve',

    configResolved(config) {
      consoleBridge = readFileSync(
        path.join(config.root, 'lab/console-bridge.js'),
        'utf8',
      )
    },

    // Mirror console output of pure/ pages and React sandboxes into the lab UI.
    transformIndexHtml(_html, ctx) {
      if (!/^\/(pure|lab\/frame)\//.test(ctx.path)) return
      return [
        { tag: 'script', children: consoleBridge, injectTo: 'head-prepend' },
      ]
    },

    // A changed JS file under pure/ makes Vite reload every open page (the lab UI included).
    // Reload only the pure/ pages instead; CSS keeps Vite's HMR and HTML its own reload.
    hotUpdate({ file, server }) {
      if (this.environment.name !== 'client') return
      const rel = toPosix(path.relative(server.config.root, file))
      if (sectionOf(rel) !== 'pure' || /\.(html|css)$/.test(rel)) return
      for (const page of listFiles(server.config.root).pure) {
        if (page.endsWith('.html')) {
          this.environment.hot.send({ type: 'full-reload', path: `/${page}` })
        }
      }
      return []
    },

    configureServer(server) {
      const root = server.config.root
      const children = new Set<ChildProcess>()

      const routes: Record<
        string,
        (req: IncomingMessage, res: ServerResponse, url: URL) => unknown
      > = {
        '/files': (_req, res) => reply(res, 200, listFiles(root)),

        // Contents of every code file, so the editor can resolve imports between them.
        '/sources': async (_req, res) => {
          const files = Object.values(listFiles(root))
            .flat()
            .filter((f) => CODE_FILE.test(f))
          // A file deleted between listing and reading is just skipped.
          const contents = await Promise.all(
            files.map((f) =>
              readFile(path.join(root, f), 'utf8').catch(() => undefined),
            ),
          )
          reply(
            res,
            200,
            Object.fromEntries(
              files
                .map((f, i) => [f, contents[i]])
                .filter(([, content]) => content !== undefined),
            ),
          )
        },

        '/types': (_req, res) => {
          typesJson ??= JSON.stringify(collectTypes(root))
          res.setHeader('Content-Type', 'application/json')
          res.end(typesJson)
        },

        '/file': async (req, res, url) => {
          const target = resolveLabPath(root, url.searchParams.get('path'))
          if (!target) return reply(res, 400, 'Caminho inválido')
          try {
            switch (req.method) {
              case 'GET':
                return reply(res, 200, await readFile(target.abs, 'utf8'))
              // Save: only to an existing file, so a late auto-save can't resurrect a file
              // that was just deleted or renamed.
              case 'PUT': {
                const body = await readBody(req)
                if (!(await stat(target.abs)).isFile()) return reply(res, 400)
                await writeFile(target.abs, body)
                return reply(res, 204)
              }
              // Create: refuses to overwrite. Replies with the normalized path.
              case 'POST': {
                const body = await readBody(req)
                await mkdir(path.dirname(target.abs), { recursive: true })
                await writeFile(target.abs, body, { flag: 'wx' })
                return reply(res, 201, { path: target.rel })
              }
              case 'DELETE':
                await rm(target.abs)
                return reply(res, 204)
              default:
                return reply(res, 405)
            }
          } catch (err) {
            const code = (err as NodeJS.ErrnoException).code
            const status =
              code === 'ENOENT' ? 404 : code === 'EEXIST' ? 409 : 500
            return reply(res, status, String(err))
          }
        },

        // Moves a file; the destination may be in another folder or section, but must not exist.
        '/rename': async (req, res, url) => {
          if (req.method !== 'POST') return reply(res, 405)
          const from = resolveLabPath(root, url.searchParams.get('from'))
          const to = resolveLabPath(root, url.searchParams.get('to'))
          if (!from || !to) return reply(res, 400, 'Caminho inválido')
          // Case-only renames (a.ts -> A.ts) "exist" already on case-insensitive filesystems.
          const caseOnly = from.abs.toLowerCase() === to.abs.toLowerCase()
          if (!caseOnly && existsSync(to.abs)) {
            return reply(res, 409, `${to.rel} já existe`)
          }
          try {
            await mkdir(path.dirname(to.abs), { recursive: true })
            await rename(from.abs, to.abs)
            return reply(res, 200, { path: to.rel })
          } catch (err) {
            const code = (err as NodeJS.ErrnoException).code
            return reply(res, code === 'ENOENT' ? 404 : 500, String(err))
          }
        },

        // Runs a node/ file in a real Node process and streams its output as NDJSON.
        // Closing the request (Stop, re-run, switching file) kills the process.
        '/run': (_req, res, url) => {
          const target = resolveLabPath(root, url.searchParams.get('file'))
          if (
            !target ||
            sectionOf(target.rel) !== 'node' ||
            !NODE_SCRIPT.test(target.rel) ||
            !existsSync(target.abs)
          ) {
            return reply(
              res,
              400,
              `Arquivo inválido: ${url.searchParams.get('file')}`,
            )
          }

          res.writeHead(200, {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Cache-Control': 'no-cache',
          })
          const send = (msg: RunMessage) =>
            res.write(`${JSON.stringify(msg)}\n`)
          const startedAt = performance.now()

          const child = spawn(process.execPath, [target.abs], {
            cwd: root,
            env: { ...process.env, FORCE_COLOR: '0' },
            stdio: ['ignore', 'pipe', 'pipe'],
          })
          children.add(child)

          // Backpressure: a script printing in a tight loop must not pile up output in memory.
          const forward = (stream: Readable, type: 'stdout' | 'stderr') =>
            stream.setEncoding('utf8').on('data', (data: string) => {
              if (!send({ type, data })) {
                stream.pause()
                res.once('drain', () => stream.resume())
              }
            })
          forward(child.stdout, 'stdout')
          forward(child.stderr, 'stderr')
          child.on('error', (err) =>
            send({ type: 'stderr', data: String(err) }),
          )
          child.on('close', (code, signal) => {
            children.delete(child)
            const ms = Math.round(performance.now() - startedAt)
            send({ type: 'exit', code, signal, ms })
            res.end()
          })
          res.on('close', () => stop(child))
        },
      }

      // These routes write files and run code, so only the lab page itself may call them.
      // Vite's Host check (DNS rebinding) runs before plugin middlewares, but its default CORS
      // policy lets any localhost origin through, hence isTrustedRequest.
      server.middlewares.use('/__lab', (req, res, next) => {
        if (!isTrustedRequest(req)) return reply(res, 403, 'Forbidden')
        const url = new URL(req.url ?? '/', 'http://lab')
        const route = routes[url.pathname]
        if (!route) return next()
        Promise.resolve(route(req, res, url)).catch((err) =>
          reply(res, 500, String(err)),
        )
      })

      server.httpServer?.on('close', () => children.forEach(stop))

      const relOf = (abs: string) => toPosix(path.relative(root, abs))

      // Keep the sidebar in sync with files being created or deleted.
      const onTreeChange = (abs: string) => {
        if (sectionOf(relOf(abs))) server.ws.send('lab:files', listFiles(root))
      }
      for (const event of ['add', 'unlink', 'addDir', 'unlinkDir'] as const) {
        server.watcher.on(event, onTreeChange)
      }

      // Lets the UI re-run node scripts and refresh editor buffers changed outside the lab.
      server.watcher.on('change', (abs) => {
        const file = relOf(abs)
        if (sectionOf(file) && !IGNORED_PATH.test(file))
          server.ws.send('lab:change', { file })
      })
    },
  }
}

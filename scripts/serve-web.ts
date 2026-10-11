// Serves the browser build in build/web over HTTP, for a local look at the
// production bundle and for the Playwright tests. Build it first with
// bun run web:build.
//
// Usage: bun scripts/serve-web.ts [port]
// The port defaults to PORT, then 4173.

import { existsSync, statSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'

const ROOT = resolve(import.meta.dir, '..', 'build', 'web')

// Maps a URL path to a file under ROOT. A path that leaves ROOT gives null.
export function fileFor(pathname: string): string | null {
  let decoded = ''
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const relative = normalize(decoded).replace(/^([/\\]|\.\.[/\\])+/, '')
  const path = join(ROOT, relative)
  if (!path.startsWith(ROOT)) return null
  if (existsSync(path) && statSync(path).isDirectory()) return join(path, 'index.html')
  return path
}

function main(): void {
  if (!existsSync(join(ROOT, 'index.html'))) {
    console.error('serve-web: no build in build/web. Run bun run web:build first.')
    process.exit(1)
  }
  const port = Number(process.argv[2] ?? process.env.PORT ?? 4173)
  const server = Bun.serve({
    port,
    fetch(request) {
      const path = fileFor(new URL(request.url).pathname)
      if (path === null || !existsSync(path)) return new Response('not found', { status: 404 })
      return new Response(Bun.file(path))
    },
  })
  console.log(`serve-web: toKin at ${server.url}`)
}

if (import.meta.main) main()

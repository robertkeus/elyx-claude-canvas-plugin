// Serves an overview of an Elyx project on localhost: its boards with every layer
// clickable, all components and tokens, and small edits. Built on the public `elyx` CLI.
// Usage: node canvas.mjs <file.elyx>. Prints the URL, then serves until killed.
// With --app first, opens the file's project in the Elyx app instead and exits.
import { execFile, execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { watch } from 'node:fs'
import { mkdtemp, readdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { importAlias, setProperty, setToken, tokenLiteral } from './edit.mjs'

const IMAGES = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }
const FONT = /\.(ttf|otf|ttc|woff2?)$/i
const EXPORT = /^((?:@[\w-]+(?:\([^)\n]*\))?\s+)*)export ([\w-]+) = (\w+)/gm
const EDITABLE = new Set(['contents', 'fill', 'font-size', 'corner-radius', 'layout.item-gap', 'padding', 'display'])
const LITERAL = /^(-?\d+(\.\d+)?(px|%)?|#[\da-f]{3,8}|\.(visible|hidden))$/i
const TOKEN_VALUE = /^[\w#.%(), -]+$/

// The CLI reports `file:line:column: reason` among other lines. People only need the reason.
const reasonFor = cause => {
  const text = cause.stderr?.trim() || cause.message
  return text.match(/:\d+:\d+: (.+)/)?.[1] ?? text.split('\n')[0]
}

const fail = message => {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

const isFile = async file => (await stat(file).catch(() => null))?.isFile() === true

const projectRoot = async file => {
  for (let dir = path.dirname(file); ; dir = path.dirname(dir)) {
    if (await isFile(path.join(dir, 'elyx.json'))) return dir
    if (dir === path.dirname(dir)) return path.dirname(file)
  }
}

const isApp = process.argv[2] === '--app'
const target = process.argv[isApp ? 3 : 2]
if (!target) fail('Usage: canvas.mjs [--app] <file.elyx>')
const opened = path.resolve(target)
if (!opened.endsWith('.elyx') || !(await isFile(opened))) fail(`Not an .elyx file: ${opened}`)
const root = await realpath(await projectRoot(opened))

// The app takes a project folder: `elyx <file>` is refused, and `open -a` with a
// file has no visible effect. Each call opens a new window.
if (isApp) {
  execFileSync('elyx', [root], { stdio: ['ignore', 'ignore', 'inherit'] })
  process.stdout.write(`${root}\n`)
  process.exit(0)
}

const run = promisify(execFile)
const elyx = async (...args) => (await run('elyx', args, { cwd: root, maxBuffer: 2 ** 28 })).stdout
const elyxJson = async (...args) => JSON.parse(await elyx(...args))
await elyx('--version').catch(() => fail('The elyx CLI is missing. Install it with: npm install --global @elyx-design/cli'))

const relative = file => path.relative(root, file).split(path.sep).join('/')

const inProject = async file => {
  const absolute = await realpath(path.resolve(root, String(file)))
  if (!absolute.startsWith(root + path.sep)) throw new Error(`${file} is outside the project.`)
  return absolute
}

const elyxFile = async file => {
  const absolute = await inProject(file)
  if (!absolute.endsWith('.elyx')) throw new Error(`${file} is not an .elyx file.`)
  return absolute
}

const readTokens = async sources => {
  const owners = {}
  for (const [file, source] of sources) for (const [, scope] of source.matchAll(/\b([\w-]+) = tokens\b/g)) owners[scope] = file
  const lists = await Promise.all([...new Set(Object.values(owners))].map(file => elyxJson('tokens', path.join(root, file))))
  const tokens = new Map()
  for (const token of lists.flatMap(list => list.tokens)) {
    const file = owners[token.scope[0]]
    if (!file) continue
    const literal = tokenLiteral(sources.get(file), token.scope[0], token.name)
    tokens.set(JSON.stringify([token.scope, token.name]), { ...token, file: path.join(root, file), literal })
  }
  return [...tokens.values()]
}

const project = async () => {
  const names = (await readdir(root, { recursive: true })).filter(name => !/(^|\/)(\.|node_modules\/)/.test(name)).sort()
  const elyxNames = names.filter(name => name.endsWith('.elyx'))
  const sources = new Map(await Promise.all(elyxNames.map(async name => [name, await readFile(path.join(root, name), 'utf8')])))
  const tokens = await readTokens(sources)
  const config = JSON.parse(await readFile(path.join(root, 'elyx.json'), 'utf8').catch(() => '{}'))
  const isCanvas = token => !Object.keys(token.context).length && [...token.scope, token.name].join('.') === config.canvasColor?.token
  const files = [...sources].flatMap(([file, source]) => {
    const exports = [...source.matchAll(EXPORT)]
      .filter(match => match[3] !== 'tokens')
      .map(match => ({ name: match[2], variant: /@variant\b/.test(match[1]) }))
    return exports.length || !/= tokens\b/.test(source) ? [{ file, exports }] : []
  })
  return {
    name: path.basename(root) === 'design' ? path.basename(path.dirname(root)) : path.basename(root),
    root,
    opened: relative(await realpath(opened)),
    canvas: tokens.find(isCanvas)?.value,
    files,
    tokens,
    images: names.filter(name => Object.hasOwn(IMAGES, path.extname(name).toLowerCase())),
    fonts: names.filter(name => FONT.test(name)),
  }
}

const board = async file => {
  const absolute = await elyxFile(file)
  const [{ tree }, source] = await Promise.all([elyxJson('tree', absolute, '--depth=shallow'), readFile(absolute, 'utf8')])
  const frames = tree.children
    .filter(layer => layer.resolvedSize?.width)
    .map(layer => {
      // A private instance of another file's symbol only places it on this board,
      // so its layers belong to that file, and edits must land there.
      const { instanceOf: base, name } = layer
      const isPlaced = base && !base.variant && base.file !== absolute && !new RegExp(`\\bexport ${name} =`).test(source)
      return {
        name,
        x: layer.position.x,
        y: layer.position.y,
        w: layer.resolvedSize.width,
        h: layer.resolvedSize.height,
        source: isPlaced ? { file: relative(base.file), ref: base.symbol } : { file: relative(absolute), ref: name },
      }
    })
  return { frames }
}

const layers = async (file, ref) => (await elyxJson('tree', await elyxFile(file), `--ref=${ref}`, '--depth=full')).tree

const scratch = await mkdtemp(path.join(tmpdir(), 'elyx-canvas-'))

const render = async (file, ref, scale) => {
  if (!(scale > 0 && scale <= 8)) throw new Error(`Scale ${scale} is out of range.`)
  const output = path.join(scratch, `${randomBytes(8).toString('hex')}.png`)
  await elyx('render', await elyxFile(file), '-o', output, `--scale=${scale}`, ...(ref ? [`--ref=${ref}`] : []))
  const bytes = await readFile(output)
  await rm(output)
  return bytes
}

const diagnose = async file => JSON.parse(await elyx('diagnostics', file).catch(cause => cause.stdout))

const history = []
let queue = Promise.resolve()

const enqueue = work => {
  const task = queue.then(work)
  queue = task.catch(() => {})
  return task
}

// Writes the patch, then keeps it only if the file still validates.
const commit = (file, patch) =>
  enqueue(async () => {
    const before = await readFile(file, 'utf8')
    const known = (await diagnose(file)).summary.total
    try {
      await writeFile(file, await patch(before))
      const { summary, diagnostics } = await diagnose(file)
      if (summary.total > known) throw new Error(diagnostics[0]?.diagnostics[0]?.message ?? 'The change does not validate.')
    } catch (cause) {
      await writeFile(file, before)
      throw new Error(reasonFor(cause))
    }
    history.push({ file, before, after: await readFile(file, 'utf8') })
    return { file: relative(file) }
  })

const literalFor = async (source, file, { token, text, raw }) => {
  if (text !== undefined) return { source, literal: JSON.stringify(String(text)) }
  if (token) {
    const [tokenFile, member] = String(token).split('#')
    if (!/^[\w-]+(\.[\w-]+)+$/.test(member)) throw new Error(`${member} is not a token.`)
    const { source: next, alias } = importAlias(source, file, await elyxFile(tokenFile), root)
    return { source: next, literal: `${alias}.${member}` }
  }
  if (!LITERAL.test(raw)) throw new Error(`${raw} is not a plain value.`)
  return { source, literal: raw }
}

const edit = async ({ target: layer, prop, value }) => {
  if (!EDITABLE.has(prop)) throw new Error(`${prop} cannot be changed here.`)
  const file = await elyxFile(layer.filePath)
  return commit(file, async before => {
    const { source, literal } = await literalFor(before, file, value)
    return setProperty(source, { ref: layer.sourceRef, overridePath: layer.overridePath }, prop, literal)
  })
}

const editToken = async ({ file, scope, name, value }) => {
  if (!TOKEN_VALUE.test(value)) throw new Error(`${value} is not a token value.`)
  return commit(await elyxFile(file), source => setToken(source, String(scope), String(name), value))
}

const undo = () =>
  enqueue(async () => {
    const last = history.at(-1)
    if (!last) throw new Error('Nothing to undo.')
    if ((await readFile(last.file, 'utf8')) !== last.after) throw new Error(`${relative(last.file)} changed since that edit.`)
    await writeFile(last.file, last.before)
    history.pop()
    return { file: relative(last.file) }
  })

const asset = async name => {
  const file = await inProject(name)
  const type = IMAGES[path.extname(file).toLowerCase()]
  if (!type) throw new Error(`${name} is not an image.`)
  return { type, bytes: await readFile(file) }
}

const token = randomBytes(16).toString('hex')
const listeners = new Set()
let revision = 0

const readBody = async request => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const getters = {
  project,
  board: query => board(query.get('file')),
  layers: query => layers(query.get('file'), query.get('ref')),
}
const posters = { edit, token: editToken, undo }

const server = createServer(async (request, response) => {
  const respond = (status, type, body, headers = {}) => {
    response.writeHead(status, { 'content-type': type, ...headers })
    response.end(body)
  }
  const origin = `http://127.0.0.1:${server.address().port}`
  const { pathname, searchParams: query } = new URL(request.url, origin)
  const route = pathname.startsWith(`/${token}/`) ? pathname.slice(token.length + 2) : null
  const isForeign = request.headers.host !== origin.slice(7) || (request.headers.origin && request.headers.origin !== origin)
  if (route === null || isForeign) return respond(404, 'text/plain', 'Not found')

  try {
    const isGet = request.method === 'GET'
    if (isGet && route === '') return respond(200, 'text/html', await readFile(new URL('ui.html', import.meta.url)))
    if (isGet && route === 'events') {
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' })
      response.write(':\n\n')
      listeners.add(response)
      request.on('close', () => listeners.delete(response))
      return
    }
    if (isGet && route === 'render') {
      const bytes = await render(query.get('file'), query.get('ref'), Number(query.get('scale')))
      return respond(200, 'image/png', bytes, { 'cache-control': 'max-age=86400' })
    }
    if (isGet && route === 'asset') {
      const { type, bytes } = await asset(query.get('path'))
      return respond(200, type, bytes, { 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" })
    }
    if (isGet && Object.hasOwn(getters, route)) return respond(200, 'application/json', JSON.stringify(await getters[route](query)))
    if (request.method === 'POST' && Object.hasOwn(posters, route)) {
      return respond(200, 'application/json', JSON.stringify(await posters[route](await readBody(request))))
    }
    respond(404, 'text/plain', 'Not found')
  } catch (cause) {
    respond(500, 'application/json', JSON.stringify({ error: reasonFor(cause) }))
  }
})

let settle
watch(root, { recursive: true }, (_, name) => {
  if (!name || /(^|\/)(\.|node_modules\/)/.test(name)) return
  clearTimeout(settle)
  settle = setTimeout(() => {
    revision++
    for (const listener of listeners) listener.write(`data: ${revision}\n\n`)
  }, 150)
})

const stop = async () => {
  await rm(scratch, { recursive: true, force: true })
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)

server.listen(0, '127.0.0.1', () => {
  process.stdout.write(`http://127.0.0.1:${server.address().port}/${token}/\n`)
})

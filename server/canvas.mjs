// Serves an overview of an Elyx project on localhost: its boards with every layer
// clickable, all components and tokens, and small edits. Built on the public `elyx` CLI.
// With ELYX_CANVAS_BRIDGE set, requests for Claude are printed as `ask <json>` lines
// for the plugin's hook to submit.
// Usage: node canvas.mjs <file.elyx>. Prints the URL, then serves until killed.
// With --app first, opens the file's project in the Elyx app instead and exits.
import { execFile, execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { watch } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { blockSource, importAlias, setProperty, setToken, tokenLiteral } from './edit.mjs'
import { fileVersions, hash, indexTree, LOG_FORMAT, mergeIndexes, parseLog } from './insight.mjs'

const IMAGES = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }
const FONTS = { '.ttf': 'font/ttf', '.otf': 'font/otf', '.ttc': 'font/collection', '.woff': 'font/woff', '.woff2': 'font/woff2' }
const UI_TYPES = { '.js': 'text/javascript', '.css': 'text/css' }
const FOREVER = { 'cache-control': 'max-age=31536000, immutable' }
const EXPORT = /^((?:@[\w-]+(?:\([^)\n]*\))?\s+)*)export ([\w-]+) = (\w+)/gm
const EDITABLE = new Set(['contents', 'fill', 'font-size', 'font-style', 'corner-radius', 'layout.item-gap', 'padding', 'display'])
const LITERAL = /^(-?\d+(\.\d+)?(px|%)?|#[\da-f]{3,8}|\.(visible|hidden))$/i
const TOKEN_VALUE = /^[\w#.%(), -]+$/
const CONTEXT = /^[\w-]+=[\w-]+$/
const MEMORY_LIMIT = 2 ** 28
const RENDER_SLOTS = 4
const MAX_PIXELS = 4e7
const BASE_PIXELS = 2600

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

// Keeps results, newest used last, until they outgrow the budget. Keys carry the content
// version, so nothing here can go stale.
const memory = new Map()
let memoryUsed = 0
const remember = (key, make) => {
  if (memory.has(key)) {
    const entry = memory.get(key)
    memory.delete(key)
    memory.set(key, entry)
    return entry.value
  }
  const entry = { value: make(), size: 0 }
  memory.set(key, entry)
  entry.value.then(
    result => {
      entry.size = result?.length ?? 2 ** 16
      memoryUsed += entry.size
      for (const [oldest, { size }] of memory) {
        if (memoryUsed <= MEMORY_LIMIT) break
        memory.delete(oldest)
        memoryUsed -= size
      }
    },
    () => memory.delete(key),
  )
  return entry.value
}

// What you are looking at goes first. Thumbnails and background reads wait their turn.
const slots = { active: 0, urgent: [], later: [] }
const pump = () => {
  while (slots.active < RENDER_SLOTS) {
    const job = slots.urgent.shift() ?? slots.later.shift()
    if (!job) return
    slots.active++
    job().finally(() => {
      slots.active--
      pump()
    })
  }
}
const inTurn = (work, isLater) =>
  new Promise((resolve, reject) => {
    ;(isLater ? slots.later : slots.urgent).push(() => work().then(resolve, reject))
    pump()
  })

const projectFiles = async () => (await readdir(root, { recursive: true })).filter(name => !/(^|\/)(\.|node_modules\/)/.test(name)).sort()

const readSnapshot = async () => {
  const names = await projectFiles()
  const elyxNames = names.filter(name => name.endsWith('.elyx'))
  const sources = new Map(await Promise.all(elyxNames.map(async name => [name, await readFile(path.join(root, name), 'utf8')])))
  const stats = new Map(await Promise.all(names.map(async name => [name, await stat(path.join(root, name)).catch(() => null)])))
  const assets = new Map([...stats].map(([name, info]) => [name, `${info?.mtimeMs}:${info?.size}`]))
  const versions = fileVersions(sources, assets)
  return { names, sources, stats, versions, stamp: hash(JSON.stringify([versions, [...assets]])) }
}

let snapshotting = null
const snapshot = () => (snapshotting ??= readSnapshot())

const readTokens = async ({ sources, versions }) => {
  const owners = {}
  for (const [file, source] of sources) for (const [, scope] of source.matchAll(/\b([\w-]+) = tokens\b/g)) owners[scope] = file
  const files = [...new Set(Object.values(owners))]
  return remember(`tokens:${files.map(file => versions[file]).join()}`, async () => {
    const lists = await Promise.all(files.map(file => elyxJson('tokens', path.join(root, file))))
    const tokens = new Map()
    for (const token of lists.flatMap(list => list.tokens)) {
      const file = owners[token.scope[0]]
      if (!file) continue
      const literal = tokenLiteral(sources.get(file), token.scope[0], token.name)
      tokens.set(JSON.stringify([token.scope, token.name]), { ...token, file: path.join(root, file), literal })
    }
    return [...tokens.values()]
  })
}

const branch = async () => (await run('git', ['-C', root, 'rev-parse', '--abbrev-ref', 'HEAD']).catch(() => ({ stdout: '' }))).stdout.trim()

const project = async () => {
  const current = await snapshot()
  return remember(`project:${current.stamp}`, async () => {
    const { names, sources, stats, versions, stamp } = current
    const [tokens, config, onBranch, openedFile] = await Promise.all([
      readTokens(current),
      readFile(path.join(root, 'elyx.json'), 'utf8').catch(() => '{}'),
      branch(),
      realpath(opened),
    ])
    const { canvasColor } = JSON.parse(config)
    const isCanvas = token => !Object.keys(token.context).length && [...token.scope, token.name].join('.') === canvasColor?.token
    const files = [...sources].flatMap(([file, source]) => {
      const exports = [...source.matchAll(EXPORT)]
        .filter(match => match[3] !== 'tokens')
        .map(match => ({ name: match[2], variant: /@variant\b/.test(match[1]) }))
      return exports.length || !/= tokens\b/.test(source) ? [{ file, exports }] : []
    })
    return {
      name: path.basename(root) === 'design' ? path.basename(path.dirname(root)) : path.basename(root),
      root,
      stamp,
      branch: onBranch,
      canAsk: Boolean(process.env.ELYX_CANVAS_BRIDGE),
      opened: relative(openedFile),
      canvas: tokens.find(isCanvas)?.value,
      files,
      tokens,
      versions,
      modified: Object.fromEntries([...sources.keys()].map(file => [file, stats.get(file)?.mtimeMs])),
      images: names.filter(name => Object.hasOwn(IMAGES, path.extname(name).toLowerCase())),
      fonts: names.filter(name => Object.hasOwn(FONTS, path.extname(name).toLowerCase())),
    }
  })
}

const activity = async () => {
  const args = ['-C', root, 'log', '-n', '40', '--relative', '--name-status', `--format=${LOG_FORMAT}`, '--', '.']
  const log = await run('git', args, { maxBuffer: 2 ** 26 }).catch(() => ({ stdout: '' }))
  return parseLog(log.stdout).slice(0, 12)
}

const versionOf = async file => (await snapshot()).versions[relative(file)] ?? ''

// Reads every screen once, so counts mean "as drawn", through nested components. Only
// screens an edit reached are read again.
const usage = async () => {
  const { names, versions, stamp } = await snapshot()
  return remember(`usage:${stamp}`, async () => {
    const drawn = names.filter(name => name.endsWith('.elyx') && name.includes('/'))
    const screens = drawn.filter(name => name.startsWith('screens/'))
    const indexes = await Promise.all((screens.length ? screens : drawn).map(file =>
      remember(`index:${versions[file]}:${file}`, () => inTurn(async () => {
        const { tree } = await elyxJson('tree', path.join(root, file), '--depth=full').catch(() => ({ tree: {} }))
        return indexTree(tree, file)
      }, true))))
    return mergeIndexes(indexes, relative)
  })
}

const contextArgs = values => values.filter(value => CONTEXT.test(value)).map(value => `--context=${value}`)

const board = async file => {
  const absolute = await elyxFile(file)
  const { sources, versions } = await snapshot()
  const source = sources.get(relative(absolute)) ?? ''
  return remember(`board:${versions[relative(absolute)]}:${file}`, () => inTurn(async () => {
    const { tree } = await elyxJson('tree', absolute, '--depth=shallow')
    const isExported = name => new RegExp(`\\bexport ${name} =`).test(source)
    const frames = tree.children
      .filter(layer => layer.resolvedSize?.width)
      .map(layer => {
        // A private instance of another file's symbol only places it on this board,
        // so its layers belong to that file, and edits must land there.
        const { instanceOf: base, name, type } = layer
        const isPlaced = base && !base.variant && base.file !== absolute && !isExported(name)
        return {
          name,
          type,
          x: layer.position.x,
          y: layer.position.y,
          w: layer.resolvedSize.width,
          h: layer.resolvedSize.height,
          // Only an exported layer can be imported, which drawing a region needs.
          canCrop: isPlaced || isExported(name),
          source: isPlaced ? { file: relative(base.file), ref: base.symbol } : { file: relative(absolute), ref: name },
        }
      })
    // A small board gets a finer base image, so it holds up until the sharp layer lands.
    const wide = Math.max(...frames.map(frame => frame.x + frame.w)) - Math.min(...frames.map(frame => frame.x))
    return { frames, baseScale: Math.round(Math.min(4, Math.max(0.25, BASE_PIXELS / wide)) * 1000) / 1000 }
  }))
}

// Renders a board's base image ahead of being asked, behind anything you are waiting for.
const warm = async (file, isLater = true) => {
  const { baseScale } = await board(file)
  await render(file, null, baseScale, [], true, isLater)
}

const layers = async (file, ref, contexts) => {
  const absolute = await elyxFile(file)
  return remember(`layers:${await versionOf(absolute)}:${file}:${ref}:${contexts}`, () => inTurn(async () => (await elyxJson('tree', absolute, `--ref=${ref}`, '--depth=full', ...contextArgs(contexts))).tree))
}

const scratch = await mkdtemp(path.join(tmpdir(), 'elyx-canvas-'))

const renderTo = async (file, scale, options) => {
  const output = path.join(scratch, `${randomBytes(8).toString('hex')}.png`)
  await elyx('render', file, '-o', output, `--scale=${scale}`, ...options)
  const bytes = await readFile(output)
  await rm(output)
  return bytes
}

const render = async (file, ref, scale, contexts, connections, isLater) => {
  if (!(scale > 0 && scale <= 16)) throw new Error(`Scale ${scale} is out of range.`)
  const absolute = await elyxFile(file)
  const options = [...(ref ? [`--ref=${ref}`] : []), ...contextArgs(contexts), ...(connections ? [] : ['--no-connections'])]
  return remember(`render:${await versionOf(absolute)}:${file}:${scale}:${options}`, () => inTurn(() => renderTo(absolute, scale, options), isLater))
}

// A file's own @with-context, which an import of it does not carry over.
const contextOf = source => {
  const axes = source.match(/^@with-context\(([^)]*)\)/m)?.[1] ?? ''
  return axes.split(',').map(axis => axis.replace(/["\s]/g, '')).filter(Boolean)
}

const VIEWS = path.join(root, '.elyx-canvas')

// The CLI can only render a whole layer, and a screen at 16x would be enormous. So a
// throwaway frame clips the layer to the visible region, and the engine draws just that
// at the exact zoom: sharp at any scale, for the cost of one screenful of pixels. It has
// to sit inside the project, because imports do not resolve from outside it.
const view = async ({ file, ref, kind, x, y, w, h, scale, contexts }) => {
  const absolute = await elyxFile(file)
  const numbers = [x, y, w, h, scale]
  if (!numbers.every(Number.isFinite) || w <= 0 || h <= 0 || scale <= 0 || w * h * scale * scale > MAX_PIXELS) throw new Error('That region is out of range.')
  if (!/^[\w-]+$/.test(ref) || !/^(frame|text|asset|shape)$/.test(kind) || /["\n]/.test(file)) throw new Error('That layer cannot be drawn.')
  const { sources } = await snapshot()
  const chosen = new Set(contexts.map(context => context.split('=')[0]))
  const own = contextOf(sources.get(relative(absolute)) ?? '').filter(context => !chosen.has(context.split('=')[0]))
  const options = ['--ref=view', ...contextArgs([...own, ...contexts])]
  return remember(`view:${await versionOf(absolute)}:${file}:${ref}:${numbers}:${options}`, () => inTurn(async () => {
    await mkdir(VIEWS, { recursive: true })
    const viewFile = path.join(VIEWS, `${randomBytes(8).toString('hex')}.elyx`)
    await writeFile(viewFile, `import "${relative(absolute)}" as Source

view = frame {
  left: 0px,
  top: 0px,
  width: ${w}px,
  height: ${h}px,
  children: inner,

  inner = ${kind} : Source.${ref} {
    left: ${-x}px,
    top: ${-y}px
  }
}
`)
    try {
      return await renderTo(viewFile, scale, options)
    } finally {
      await rm(viewFile, { force: true })
    }
  }))
}

const diagnose = async file => JSON.parse(await elyx('diagnostics', file).catch(cause => cause.stdout))

const history = []
let queue = Promise.resolve()

const enqueue = work => {
  const task = queue.then(work)
  queue = task.catch(() => {})
  return task
}

// Writes the patch, then keeps it only if the file still validates. A move may warn,
// because screens overlapping for a moment is the designer's call.
const commit = (file, patch, { allowWarnings = false } = {}) =>
  enqueue(async () => {
    const before = await readFile(file, 'utf8')
    const measure = ({ summary }) => (allowWarnings ? summary.errors : summary.total)
    const known = measure(await diagnose(file))
    try {
      await writeFile(file, await patch(before))
      const result = await diagnose(file)
      if (measure(result) > known) throw new Error(result.diagnostics[0]?.diagnostics[0]?.message ?? 'The change does not validate.')
    } catch (cause) {
      await writeFile(file, before)
      throw new Error(reasonFor(cause))
    }
    history.push({ file, before, after: await readFile(file, 'utf8') })
    await announce()
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

const moveFrame = async ({ file, name, x, y }) => {
  if (!/^[\w-]+$/.test(name) || !Number.isFinite(x) || !Number.isFinite(y)) throw new Error('That screen cannot move.')
  const place = (source, prop, value) => setProperty(source, { ref: name }, prop, `${Math.round(value)}px`)
  return commit(await elyxFile(file), source => place(place(source, 'left', x), 'top', y), { allowWarnings: true })
}

const undo = () =>
  enqueue(async () => {
    const last = history.at(-1)
    if (!last) throw new Error('Nothing to undo.')
    if ((await readFile(last.file, 'utf8')) !== last.after) throw new Error(`${relative(last.file)} changed since that edit.`)
    await writeFile(last.file, last.before)
    history.pop()
    await announce()
    return { file: relative(last.file) }
  })

const asset = async name => {
  const file = await inProject(name)
  const extension = path.extname(file).toLowerCase()
  const type = IMAGES[extension] ?? FONTS[extension]
  if (!type) throw new Error(`${name} is not an image or a font.`)
  return { type, bytes: await readFile(file) }
}

const source = async (file, ref, overridePath) => {
  const text = await readFile(await elyxFile(file), 'utf8')
  return { text: ref ? blockSource(text, { ref, overridePath: overridePath ?? '' }) : text }
}

const ask = async ({ text, file, layer }) => {
  if (!process.env.ELYX_CANVAS_BRIDGE) throw new Error('This canvas was not opened from Claude.')
  const where = [file && `In the Elyx design ${path.join(root, String(file))}`, layer && `on the layer ${layer}`].filter(Boolean).join(', ')
  process.stdout.write(`ask ${JSON.stringify({ text: where ? `${where}: ${text}` : String(text) })}\n`)
  return {}
}

const token = randomBytes(16).toString('hex')
const listeners = new Set()
let announced = ''

// Tells open pages about a change at once, and only about real ones.
const announce = async () => {
  snapshotting = null
  const { stamp } = await snapshot()
  if (stamp === announced) return
  announced = stamp
  for (const listener of listeners) listener.write(`data: ${stamp}\n\n`)
}

const readBody = async request => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const getters = {
  project,
  activity,
  usage,
  board: query => {
    warm(query.get('file')).catch(() => {})
    return board(query.get('file'))
  },
  layers: query => layers(query.get('file'), query.get('ref'), query.getAll('context')),
  source: query => source(query.get('file'), query.get('ref'), query.get('path')),
}
const posters = { edit, token: editToken, move: moveFrame, undo, ask }

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
    if (isGet && route === '') return respond(200, 'text/html', await readFile(new URL('ui/index.html', import.meta.url)))
    if (isGet && /^ui\/[\w-]+\.(js|css)$/.test(route)) {
      return respond(200, UI_TYPES[path.extname(route)], await readFile(new URL(route, import.meta.url)), { 'cache-control': 'no-store' })
    }
    if (isGet && route === 'events') {
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' })
      response.write(':\n\n')
      listeners.add(response)
      request.on('close', () => listeners.delete(response))
      return
    }
    if (isGet && route === 'render') {
      const bytes = await render(query.get('file'), query.get('ref'), Number(query.get('scale')), query.getAll('context'), query.get('connections') !== '0', query.has('later'))
      return respond(200, 'image/png', bytes, FOREVER)
    }
    if (isGet && route === 'view') {
      const [x, y, w, h, scale] = ['x', 'y', 'w', 'h', 'scale'].map(name => Number(query.get(name)))
      const bytes = await view({ file: query.get('file'), ref: String(query.get('ref')), kind: String(query.get('kind')), x, y, w, h, scale, contexts: query.getAll('context') })
      return respond(200, 'image/png', bytes, FOREVER)
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
  settle = setTimeout(announce, 120)
})

const stop = async () => {
  await Promise.all([rm(scratch, { recursive: true, force: true }), rm(VIEWS, { recursive: true, force: true })])
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)

server.listen(0, '127.0.0.1', () => {
  process.stdout.write(`http://127.0.0.1:${server.address().port}/${token}/\n`)
  // Reads ahead, so the first page finds its data ready.
  project().then(async ({ opened: file, stamp, files }) => {
    announced = stamp
    await warm(file, false)
    for (const item of files) await warm(item.file).catch(() => {})
  }).catch(() => {})
})

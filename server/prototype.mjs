// Prototype links. `elyx tree` does not list connections, so they are read from source:
// which layer leads to which screen, its label, and the motion its `meta` asks for.
import { blocksWith, propertyIn } from './edit.mjs'

export const TRANSITIONS = ['smart', 'push', 'slide', 'dissolve', 'instant']

// The top-level `{…}` groups in a connection value: one map, or a list of them.
const mapsIn = text => {
  const maps = []
  let depth = 0
  let start = -1
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      for (i++; i < text.length && text[i] !== '"'; i++) if (text[i] === '\\') i++
      continue
    }
    if (char === '{' && depth++ === 0) start = i + 1
    if (char === '}' && --depth === 0) maps.push(text.slice(start, i))
  }
  return maps
}

const STRING = /^"((?:[^"\\]|\\.)*)"$/
const unquote = text => JSON.parse(`"${text.match(STRING)[1]}"`)

// `meta: {transition: "push", duration: 300}` as an object of strings, numbers and booleans.
export const parseMeta = text => {
  const meta = {}
  for (const [, key, raw] of (text ?? '').matchAll(/([A-Za-z_][\w-]*)\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|\.true|\.false)/g)) {
    meta[key] = STRING.test(raw) ? unquote(raw) : raw === '.true' ? true : raw === '.false' ? false : Number(raw)
  }
  return meta
}

export const linksIn = source =>
  blocksWith(source, 'connections').flatMap(({ names, value, body }) => {
    const meta = parseMeta(propertyIn(source, body, 'meta'))
    return mapsIn(value).flatMap(map => {
      const target = map.match(/(?:^|[\s,])target\s*:\s*(?:::)?([\w-]+(?:\.[\w-]+)*)/)?.[1]
      const label = map.match(/(?:^|[\s,])label\s*:\s*("(?:[^"\\]|\\.)*")/)?.[1]
      return target ? [{ names, target, label: label ? unquote(label) : '', meta }] : []
    })
  })

// Links on a board, from one screen to another. A screen placed from another file
// carries the links that file draws inside it; its targets name that file's symbols.
export const resolveLinks = (frames, boardFile, linksByFile) => {
  const resolved = []
  const seen = new Set()
  const add = (from, link, file, isLocal) => {
    const last = link.target.split('.').at(-1)
    const to = (isLocal ? frames.find(frame => frame.name === last) : null)
      ?? frames.find(frame => frame.source.file === file && frame.source.ref === last)
      ?? frames.find(frame => frame.name === last || frame.source.ref === last)
    if (!to || to === from) return
    const path = link.names.slice(1)
    const key = JSON.stringify([from.name, path, to.name])
    if (seen.has(key)) return
    seen.add(key)
    resolved.push({ from: from.name, path, to: to.name, label: link.label, meta: link.meta, file, ref: link.names.join('.') })
  }
  for (const link of linksByFile[boardFile] ?? []) {
    const from = frames.find(frame => frame.name === link.names[0])
    if (from) add(from, link, boardFile, true)
  }
  for (const frame of frames) {
    if (frame.source.file === boardFile) continue
    for (const link of linksByFile[frame.source.file] ?? []) if (link.names[0] === frame.source.ref) add(frame, link, frame.source.file, false)
  }
  return resolved
}

// The `meta` map as Elyx source. Only strings, numbers and booleans are allowed there.
export const metaLiteral = meta => {
  const parts = Object.entries(meta).map(([key, value]) => {
    if (!/^[A-Za-z_][\w-]*$/.test(key)) throw new Error(`${key} is not a meta key.`)
    if (typeof value === 'boolean') return `${key}: ${value ? '.true' : '.false'}`
    if (typeof value === 'number' && Number.isFinite(value)) return `${key}: ${Math.round(value * 1e4) / 1e4}`
    if (typeof value === 'string') return `${key}: ${JSON.stringify(value.replace(/[\n\r]/g, ' '))}`
    throw new Error(`${key} must be text, a number or true/false.`)
  })
  return `{${parts.join(', ')}}`
}

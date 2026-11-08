// What the overview knows about a project beyond one file: where components and tokens
// are used, what changed, and which files a change reaches. Pure functions over
// source text and `elyx tree` and `git log` output.
import { createHash } from 'node:crypto'
import path from 'node:path'

export const hash = text => createHash('sha1').update(text).digest('hex').slice(0, 12)

const importsOf = (source, file) =>
  [...source.matchAll(/^(?:import|use)\s+"([^"]+)"/gm)].map(([, spec]) => (spec.startsWith('.') ? path.posix.join(path.posix.dirname(file), spec) : spec))

// A version per file, over its own text and everything it imports, however deep. A
// render stays valid until its version changes, so an edit only redraws what it reaches.
const graphOf = sources => new Map([...sources].map(([file, text]) => [file, importsOf(text, file)]))

const reachIn = (graph, file) => {
  const seen = new Set()
  const pending = [file]
  while (pending.length) {
    const next = pending.pop()
    if (seen.has(next)) continue
    seen.add(next)
    pending.push(...(graph.get(next) ?? []))
  }
  return [...seen].sort()
}

// A file and everything it imports, however deep: what a change to it can reach.
export const reachOf = (sources, file) => reachIn(graphOf(sources), file)

export const fileVersions = (sources, assets = new Map()) => {
  const own = new Map([...sources].map(([file, text]) => [file, hash(text)]))
  const graph = graphOf(sources)
  return Object.fromEntries([...sources.keys()].map(file => [file, hash(reachIn(graph, file).map(name => `${name}:${own.get(name) ?? assets.get(name) ?? ''}`).join('\n'))]))
}

const tokensIn = (value, found = new Set()) => {
  if (typeof value !== 'object' || value === null) return found
  if (typeof value.token === 'string') found.add(value.token)
  for (const child of Object.values(value)) tokensIn(child, found)
  return found
}

// Every component instance, token reference and text in one file's resolved tree.
// Positions are relative to the top-level frame, so they map onto its render.
export const indexTree = (tree, file) => {
  const uses = []
  const tokens = []
  const texts = []
  for (const top of tree.children ?? []) {
    const size = { fw: top.resolvedSize?.width, fh: top.resolvedSize?.height }
    const walk = (layer, path, x, y) => {
      const base = layer.instanceOf
      if (base) {
        const source = base.variant ?? base
        uses.push({
          component: source.file,
          symbol: source.symbol,
          file,
          frame: top.name,
          path,
          x,
          y,
          w: layer.resolvedSize?.width ?? 0,
          h: layer.resolvedSize?.height ?? 0,
          ...size,
        })
      }
      for (const token of tokensIn([layer.style, layer.text, layer.size, layer.layout])) tokens.push({ token, file })
      if (layer.text?.content?.trim()) texts.push({ text: layer.text.content, name: layer.name, file, frame: top.name, path })
      for (const [index, child] of (layer.children ?? []).entries()) {
        walk(child, [...path, index], x + (child.position?.x ?? 0), y + (child.position?.y ?? 0))
      }
    }
    walk(top, [], 0, 0)
  }
  return { uses, tokens, texts }
}

// Merges the per-file indexes, keyed by project-relative `file#symbol`.
export const mergeIndexes = (indexes, relative) => {
  const key = (file, member) => `${relative(file)}#${member}`
  const components = {}
  const tokens = {}
  for (const { uses, tokens: references } of indexes) {
    for (const { component, symbol, ...use } of uses) (components[key(component, symbol)] ??= []).push(use)
    for (const { token, file } of references) {
      const [source, member] = token.split('#')
      const entry = (tokens[key(source, member)] ??= { layers: 0, files: {} })
      entry.layers++
      entry.files[file] = (entry.files[file] ?? 0) + 1
    }
  }
  return { components, tokens, texts: indexes.flatMap(index => index.texts) }
}

export const LOG_FORMAT = '%x00%H%x1f%an%x1f%aI%x1f%s'

// Commits from `git log --name-status --format=LOG_FORMAT`, keeping .elyx files only.
export const parseLog = text =>
  text
    .split('\0')
    .slice(1)
    .flatMap(entry => {
      const [head, ...lines] = entry.split('\n')
      const [hash, author, date, subject] = head.split('\x1f')
      const files = lines
        .map(line => line.split('\t'))
        .filter(columns => columns.length > 1 && columns.at(-1).endsWith('.elyx'))
        .map(columns => ({ file: columns.at(-1), status: columns[0][0] }))
      return files.length ? [{ hash, author, date, subject, files }] : []
    })

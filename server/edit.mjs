// Small text patches to .elyx source. The CLI can read a design but not change it,
// so these find a block by name and set one property, leaving every other byte alone.
// `elyx normalize` is not used: it rewrites each hex color and reorders imports, which
// would turn a one-line edit into a whole-file diff. The caller validates the result.
import path from 'node:path'

const CLOSERS = { '(': ')', '[': ']', '{': '}' }

// The index just past the string, comment or bracket group at i, else i + 1.
const step = (s, i) => {
  if (s[i] === '"') {
    for (i++; i < s.length && s[i] !== '"'; i++) if (s[i] === '\\') i++
    return i + 1
  }
  if (s.startsWith('//', i)) return (s.indexOf('\n', i) + 1 || s.length + 1) - 1
  if (s.startsWith('/*', i)) return (s.indexOf('*/', i) + 1 || s.length) + 1
  const closer = CLOSERS[s[i]]
  if (!closer) return i + 1
  for (i++; i < s.length && s[i] !== closer; ) i = step(s, i)
  return i + 1
}

// The properties and blocks directly inside body, a [start, end) range of s.
const entries = (s, [start, end]) => {
  const head = /(?:@[\w-]+(?:\([^)\n]*\))?\s+)*(?:export\s+)?([\w-]+(?:\[\d+\])?(?:\.[\w-]+)*)\s*(=|:|\{)/y
  const found = []
  for (let i = start; i < end; ) {
    if (/[\s,]/.test(s[i]) || s.startsWith('//', i) || s.startsWith('/*', i)) {
      i = step(s, i)
      continue
    }
    head.lastIndex = i
    const match = head.exec(s)
    if (!match) {
      i = (s.indexOf('\n', i) + 1 || end + 1) // an import or a use
      continue
    }
    const [text, key, kind] = match
    let j = i + text.length
    if (kind === ':') {
      while (s[j] === ' ') j++
      const from = j
      while (j < end && s[j] !== ',' && s[j] !== '\n') j = step(s, j)
      found.push({ key, start: i, value: [from, j] })
      i = j
      continue
    }
    if (kind === '=') while (j < end && s[j] !== '{' && s[j] !== '\n') j = step(s, j)
    else j--
    if (s[j] !== '{') {
      i = j
      continue
    }
    const after = step(s, j)
    found.push({ key, start: i, block: [j + 1, after - 1] })
    i = after
  }
  return found
}

const child = (s, body, name) => entries(s, body).find(entry => entry.key === name && entry.block)

const splice = (s, [start, end], text) => s.slice(0, start) + text + s.slice(end)

const indentAt = (s, index) => s.slice(s.lastIndexOf('\n', index - 1) + 1).match(/^[ \t]*/)[0]

const insertProperty = (s, body, prop, value) => {
  const outer = indentAt(s, body[0])
  const text = s.slice(...body)
  if (!text.trim()) return splice(s, body, `\n${outer}  ${prop}: ${value}\n${outer}`)
  if (!text.includes('\n')) return splice(s, [body[0], body[0]], `${prop}: ${value}, `)
  return splice(s, [body[0], body[0]], `\n${outer}  ${prop}: ${value},`)
}

// Adds an empty override block at the end of body. Returns the text and the new body.
const openBlock = (s, body, name) => {
  const outer = indentAt(s, body[0])
  let end = body[1]
  while (end > body[0] && /\s/.test(s[end - 1])) end--
  const open = `${end === body[0] ? '' : '\n'}\n${outer}  ${name} {`
  const close = `\n${outer}  }`
  const tail = s.slice(end, body[1]).includes('\n') ? '' : `\n${outer}`
  const inner = end + open.length
  return { s: splice(s, [end, end], open + close + tail), body: [inner, inner + close.length - 1] }
}

const removeLine = (s, entry) => {
  const lineStart = s.lastIndexOf('\n', entry.start) + 1
  const start = s.slice(lineStart, entry.start).trim() ? entry.start : lineStart
  let end = entry.value[1]
  if (s[end] === ',') end++
  if (s[end] === '\n') end++
  return { s: splice(s, [start, end], ''), removed: end - start }
}

// Sets prop on the layer a tree target names, opening override blocks where the
// path has none yet. Writes `value`, which is already valid Elyx source.
export const setProperty = (source, { ref, overridePath = '' }, prop, value) => {
  let s = source
  let body = [0, s.length]
  for (const name of ref.split('.')) {
    const entry = child(s, body, name)
    if (!entry) throw new Error(`${ref} is not declared in this file.`)
    body = entry.block
  }
  for (const segment of overridePath.split('/').filter(Boolean)) {
    const name = segment.split('.').at(-1)
    const entry = child(s, body, name)
    if (entry) {
      body = entry.block
      continue
    }
    ;({ s, body } = openBlock(s, body, name))
  }

  let props = entries(s, body).filter(entry => !entry.block)
  if (prop === 'padding') {
    // A side left in place would win over the new value.
    for (const side of props.filter(entry => entry.key.startsWith('padding-')).reverse()) {
      const line = removeLine(s, side)
      s = line.s
      body = [body[0], body[1] - line.removed]
    }
    props = entries(s, body).filter(entry => !entry.block)
  }
  if (prop === 'layout.item-gap') {
    // normalize drops this key beside a `layout` map, so the map has to change.
    const layout = props.find(entry => entry.key === 'layout')
    if (layout) {
      const map = s.slice(...layout.value)
      const gap = `item-gap: ${value}`
      return splice(s, layout.value, /item-gap:/.test(map) ? map.replace(/item-gap:[^,}]*/, gap) : map.replace(/\s*\}$/, `, ${gap}}`))
    }
  }
  const keys = prop === 'fill' ? ['fill', 'fill[0].color'] : [prop]
  const existing = props.find(entry => keys.includes(entry.key))
  return existing ? splice(s, existing.value, value) : insertProperty(s, body, prop, value)
}

// The declaration a tree target names, or the nearest block above it when the
// override has not been written yet.
export const blockSource = (source, { ref, overridePath = '' }) => {
  let body = [0, source.length]
  let text = source
  const names = [...ref.split('.'), ...overridePath.split('/').filter(Boolean).map(segment => segment.split('.').at(-1))]
  for (const name of names) {
    const entry = child(source, body, name)
    if (!entry) break
    body = entry.block
    text = `${indentAt(source, entry.start)}${source.slice(entry.start, entry.block[1] + 1)}`
  }
  return text
}

const tokenGroup = (s, scope) => {
  const group = child(s, [0, s.length], scope)
  if (!group) throw new Error(`${scope} is not declared in this file.`)
  return group.block
}

// The source text of a token's value, such as `12px`, or undefined when it inherits.
export const tokenLiteral = (source, scope, name) => {
  const entry = entries(source, tokenGroup(source, scope)).find(candidate => candidate.key === name)
  return entry?.value && source.slice(...entry.value)
}

export const setToken = (source, scope, name, value) => {
  const body = tokenGroup(source, scope)
  const list = entries(source, body)
  const entry = list.find(candidate => candidate.key === name)
  if (entry) return splice(source, entry.value, value)
  const comma = list.length ? ',' : ''
  const end = list.at(-1)?.value[1] ?? body[0]
  return splice(source, [end, end], `${comma}\n${indentAt(source, body[0])}  ${name}: ${value}`)
}

// The alias `file` imports tokenFile under, adding the import when there is none.
export const importAlias = (source, file, tokenFile, root) => {
  for (const [, spec, alias] of source.matchAll(/^import "([^"]+)" as ([\w-]+)/gm)) {
    if (path.resolve(spec.startsWith('.') ? path.dirname(file) : root, spec) === tokenFile) return { source, alias }
  }
  const base = path.basename(tokenFile, '.elyx').replace(/\W/g, '')
  let alias = base[0].toUpperCase() + base.slice(1)
  while (new RegExp(`^import .* as ${alias}$`, 'm').test(source)) alias += 'Tokens'
  const spec = path.relative(root, tokenFile).split(path.sep).join('/')
  const last = [...source.matchAll(/^import .*\n/gm)].at(-1)
  const at = last ? last.index + last[0].length : 0
  return { source: splice(source, [at, at], `import "${spec}" as ${alias}\n`), alias }
}

// Every block that sets key, with the names that lead to it from the top of the file.
export const blocksWith = (source, key) => {
  const found = []
  const walk = (body, names) => {
    for (const entry of entries(source, body)) {
      if (entry.block) walk(entry.block, [...names, entry.key])
      else if (entry.key === key && names.length) found.push({ names, value: source.slice(...entry.value), body })
    }
  }
  walk([0, source.length], [])
  return found
}

// The value of one property set directly in body, as source text.
export const propertyIn = (source, body, key) => {
  const entry = entries(source, body).find(item => item.key === key && !item.block)
  return entry ? source.slice(...entry.value) : null
}

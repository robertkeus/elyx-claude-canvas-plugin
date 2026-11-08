// Shared state and small helpers. Project text only ever reaches the page as textContent.
import { ICONS } from './icons.js'

export const state = {
  project: null,
  projects: [],
  usage: null,
  activity: [],
  revision: 0,
  view: {},
  frames: [],
  selection: null,
  // The same layer as its component declares it, when "Everywhere" can apply.
  componentLayer: null,
  scope: 'here',
  hover: null,
  camera: { x: 0, y: 0, z: 1 },
  baseScale: 0.25,
  origin: { x: 0, y: 0 },
  contexts: {},
  overlays: true,
  inspecting: true,
  railTab: 'inspect',
  // The commit the board shows instead of now, if any.
  rev: null,
  token: null,
  tokenContext: '{}',
  filter: {},
}

export const $ = id => document.getElementById(id)

export const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...kids.flat(Infinity).filter(kid => kid != null && kid !== false))
  return node
}

export const icon = (name, size = 16) => {
  const holder = el('span', { className: 'glyph' })
  holder.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`
  holder.style.display = 'grid'
  return holder
}

export const query = params => new URLSearchParams(params)

const read = async response => {
  const body = await response.json()
  if (!response.ok) throw new Error(body.error)
  return body
}
export const get = url => fetch(url).then(read)
export const post = (url, data) => fetch(url, { method: 'POST', body: JSON.stringify(data) }).then(read)

export const clamp = (value, low, high) => Math.min(high, Math.max(low, value))
export const unwrap = value => value?.value ?? value
export const tokenOf = value => value?.token?.split('#')[1]
export const tokenPath = token => [...token.scope, token.name].join('.')
export const isBase = token => !Object.keys(token.context).length
export const shortName = file => file.split('/').at(-1).replace(/\.elyx$/, '')
export const humanize = name => {
  const words = name.replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words[0].toUpperCase() + words.slice(1)
}
export const sectionOf = file => (file.includes('/') ? file.split('/')[0] : '')
export const local = file => file.replace(`${state.project.root}/`, '')
export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const UNITS = [['year', 31536e6], ['month', 2592e6], ['week', 6048e5], ['day', 864e5], ['hour', 36e5], ['minute', 6e4]]
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
// "2 hours ago", from a date or a time in milliseconds.
export const ago = when => {
  const elapsed = Date.now() - new Date(when).getTime()
  const [unit, size] = UNITS.find(([, length]) => elapsed >= length) ?? ['minute', 6e4]
  return elapsed < 6e4 ? 'just now' : relative.format(-Math.floor(elapsed / size), unit)
}

const contextParams = () => Object.entries(state.contexts).map(([axis, value]) => `${axis}=${value}`)

export const withContext = params => {
  const search = query(params)
  for (const context of contextParams()) search.append('context', context)
  return search
}

const versionOf = file => state.project.versions[file] ?? ''

// URLs carry the content version, so an unchanged render always comes from the cache.
export const renderUrl = (file, ref, scale, isLater) =>
  `render?${withContext({ file, ...(ref && { ref }), scale, v: versionOf(file), ...(state.overlays ? {} : { connections: 0 }), ...(isLater && { later: 1 }) })}`

export const viewUrl = ({ source, type }, { x, y, w, h }, scale) =>
  `view?${withContext({ ...source, kind: type, x, y, w, h, scale, v: versionOf(source.file) })}`

// Thumbnails load two at a time after the page, so they never hold up what you are
// looking at. A browser only opens a few connections to one server.
const waiting = []
const loaded = new Set()
let loadingThumbs = 0
const nextThumb = () => {
  while (loadingThumbs < 2 && waiting.length) {
    const { image, url } = waiting.shift()
    if (!image.isConnected) continue
    loadingThumbs++
    const finish = () => {
      loadingThumbs--
      loaded.add(url)
      nextThumb()
    }
    image.addEventListener('load', finish, { once: true })
    image.addEventListener('error', finish, { once: true })
    image.src = url
  }
}
export const thumb = (file, props) => {
  const url = renderUrl(file, null, 0.1, true)
  const image = el('img', props)
  if (loaded.has(url)) image.src = url
  else {
    waiting.push({ image, url })
    setTimeout(nextThumb, 200)
  }
  return image
}

export const contextAxes = () => {
  const axes = {}
  for (const { context } of state.project.tokens) {
    for (const [axis, value] of Object.entries(context)) (axes[axis] ??= new Set()).add(value)
  }
  return Object.fromEntries(Object.entries(axes).map(([axis, values]) => [axis, [...values]]))
}

// Tokens have no role of their own, so names decide. Anything unmatched is a surface.
const ROLES = [
  ['Text', /^on-|^ink$|^body$|text|secondary|^link$|foreground|heading|muted/i],
  ['Brand and status', /brand|accent|primary|st-|status|success|warn|danger|error|info/i],
  ['Lines', /line|border|stroke|divider|outline/i],
]
export const roleOf = name => ROLES.find(([, pattern]) => pattern.test(name))?.[0] ?? 'Surfaces'
export const ROLE_ORDER = ['Surfaces', 'Text', 'Lines', 'Brand and status']

export const colorTokens = () => state.project.tokens.filter(token => token.type === 'color' && isBase(token) && token.scope.length === 1)
export const tokenValue = token => ({ token: `${token.file}#${tokenPath(token)}` })

// The renderer reports rgb(r g b / a). Show the source's own spelling where it has one.
export const hex = value => {
  const match = String(value).match(/rgb\(([\d.]+) ([\d.]+) ([\d.]+)/)
  return match ? `#${match.slice(1, 4).map(part => Math.round(Number(part)).toString(16).padStart(2, '0')).join('')}`.toUpperCase() : String(value)
}

export const stored = {
  get: (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(`elyx-${key}`)) ?? fallback
    } catch {
      return fallback
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(`elyx-${key}`, JSON.stringify(value))
    } catch {}
  },
}

let toastTimer
export const toast = (message, { error = false, action } = {}) => {
  clearTimeout(toastTimer)
  const box = $('toast')
  box.className = error ? 'error' : ''
  box.replaceChildren(el('span', { textContent: message }), action ?? '')
  box.hidden = false
  toastTimer = setTimeout(() => (box.hidden = true), error ? 8000 : 5000)
}
export const report = cause => toast(cause.message, { error: true })

// Reading every screen takes a moment, so it starts only when a view needs it.
let loadingUsage = null
export const needUsage = () => {
  if (state.usage || loadingUsage) return
  const revision = state.revision
  loadingUsage = get('usage').then(usage => {
    loadingUsage = null
    if (revision !== state.revision) return needUsage()
    state.usage = usage
    document.dispatchEvent(new Event('usage'))
  }, cause => {
    loadingUsage = null
    report(cause)
  })
}

export const undo = async () => {
  try {
    const { file } = await post('undo', {})
    toast(`Undid the last change to ${file}`)
  } catch (cause) {
    report(cause)
  }
}
export const saved = file => toast(`Saved to ${file}`, { action: el('button', { textContent: 'Undo', onclick: undo }) })

export const edit = async (layer, prop, value) => {
  try {
    saved((await post('edit', { target: layer.target, prop, value })).file)
  } catch (cause) {
    report(cause)
  }
}

// The sidebar: four views of a project, with a body for each.
import { popover } from './pickers.js'
import { $, colorTokens, durationTokens, easingTokens, el, get, humanize, icon, isBase, isMotionGroup, query, ROLE_ORDER, roleOf, sectionOf, shortName, state, thumb } from './lib.js'

export const isScreenFile = file => !sectionOf(file) || sectionOf(file) === 'screens'

const parts = () => state.project.files.filter(item => !isScreenFile(item.file))
const screens = () => state.project.files.filter(item => sectionOf(item.file) === 'screens')

export const tabOf = view => {
  if (view.kind === 'board') return isScreenFile(view.file) ? 'screens' : 'parts'
  if (view.kind === 'gallery' || view.kind === 'component') return 'parts'
  if (view.kind === 'tokens') return 'tokens'
  if (view.kind === 'assets') return 'assets'
  return 'screens'
}

const TABS = [
  ['screens', 'Screens', () => (state.project.files.some(item => !sectionOf(item.file)) ? `#board:${state.project.files.find(item => !sectionOf(item.file)).file}` : '#home')],
  ['parts', 'Components', () => '#gallery:all'],
  ['tokens', 'Tokens', () => '#tokens:colors'],
  ['assets', 'Assets', () => '#assets:all'],
]

const isCurrent = href => {
  const hash = decodeURI(location.hash)
  return hash === href || hash.startsWith(`${href}:`)
}
const current = href => (isCurrent(href) ? { ariaCurrent: 'page' } : {})

const head = (label, count) => el('div', { className: 'nav-head' }, label, el('span', { className: 'figure', textContent: count }))

const row = (href, glyph, label, count) =>
  el('a', { href, className: 'nav-row', ...current(href) }, glyph && icon(glyph, 15), el('span', { className: 'label', textContent: label, title: label }), count != null && el('span', { className: 'count figure', textContent: count }))

const pill = (href, glyph, label, count) =>
  el('a', { href, className: 'pill-row', ...current(href) }, icon(glyph, 15), el('span', { className: 'label', textContent: label }), el('span', { className: 'count figure', textContent: count }))

// Pointing at a row starts the work, so the click finds it done.
const warm = file => get(`board?${query({ file })}`).catch(() => {})

const thumbRow = (file, label) => {
  const href = `#board:${file}`
  return el('a', { href, className: 'nav-row', onpointerenter: () => warm(file), ...current(href) },
    thumb(file, { className: 'thumb', alt: '' }),
    el('span', { className: 'label', textContent: label, title: label }))
}

// Screens that share a first word, such as admin-overview, form a group of their own.
const screenGroups = files => {
  const prefix = file => shortName(file).split('-')[0]
  const counts = Object.groupBy(files, ({ file }) => prefix(file))
  const groups = Object.groupBy(files, ({ file }) => (counts[prefix(file)].length >= 3 ? prefix(file) : ''))
  return Object.entries(groups).sort(([a], [b]) => !a - !b || a.localeCompare(b))
}

const screensBody = () => {
  const top = state.project.files.filter(item => !sectionOf(item.file))
  const listed = screens()
  const rows = top.map(({ file }) => pill(`#board:${file}`, 'grid', shortName(file) === 'index' ? 'All screens' : humanize(shortName(file)), listed.length))
  for (const [group, files] of screenGroups(listed)) {
    rows.push(head(group ? humanize(group) : 'Other', files.length))
    for (const { file } of files) {
      const name = shortName(file)
      rows.push(thumbRow(file, humanize(group ? name.slice(group.length + 1) || name : name)))
    }
  }
  return rows
}

const partsBody = () =>
  Object.entries(Object.groupBy(parts(), item => sectionOf(item.file))).sort(([a], [b]) => (b === 'components') - (a === 'components')).flatMap(([section, items]) => [
    head(humanize(section), items.reduce((sum, item) => sum + item.exports.length, 0)),
    items.map(({ file, exports }) => row(`#component:${file}`, section === 'components' ? 'component' : 'layers', shortName(file), exports.length)),
  ])

const dots = colors => el('span', { className: 'dots' }, colors.slice(0, 4).map(color => {
  const dot = el('i')
  dot.style.background = color
  return dot
}))

const SCALE_ICONS = [[/radius/i, 'corner'], [/font|letter|line/i, 'type'], [/space|gap/i, 'gap']]

const tokensBody = () => {
  const colors = colorTokens()
  const roles = Object.groupBy(colors, token => roleOf(token.name))
  const numbers = Object.groupBy(state.project.tokens.filter(token => token.type === 'number' && !isMotionGroup(token.rootScope[0])), token => token.rootScope[0])
  const motion = durationTokens().length + easingTokens().length
  const contexts = Object.groupBy(state.project.tokens.filter(token => !isBase(token)), token => JSON.stringify(token.context))
  return [
    pill('#tokens:colors', 'palette', 'All tokens', state.project.tokens.length),
    head('Colors', state.project.tokens.filter(token => token.type === 'color').length),
    ROLE_ORDER.filter(role => roles[role]).map(role => {
      const href = `#tokens:colors:${role}`
      return el('a', { href, className: 'nav-row', ...current(href) }, el('span', { className: 'label', textContent: role }), dots(roles[role].map(token => token.value)))
    }),
    Object.keys(numbers).length ? head('Scales', Object.values(numbers).flat().length) : null,
    Object.entries(numbers).map(([group, tokens]) => row(`#tokens:scales:${group}`, SCALE_ICONS.find(([pattern]) => pattern.test(group))?.[1] ?? 'frame', humanize(group), tokens.length)),
    motion ? [head('Motion', motion), row('#tokens:motion', 'play', 'Durations and easing', motion)] : null,
    Object.keys(contexts).length ? head('Contexts', Object.keys(contexts).length) : null,
    Object.entries(contexts).map(([key, tokens]) => {
      const label = Object.entries(JSON.parse(key)).map(([axis, value]) => `${axis}=${value}`).join(', ')
      return el('button', {
        className: 'nav-row',
        style: 'width:100%',
        onclick: () => {
          state.tokenContext = key
          location.hash = '#tokens:colors'
          dispatchEvent(new Event('hashchange'))
        },
      }, icon('layers', 15), el('span', { className: 'label', textContent: label, title: label, style: 'text-align:left' }), el('span', { className: 'count figure', textContent: tokens.length }))
    }),
  ]
}

const assetsBody = () => {
  const { images, fonts } = state.project
  const folders = Object.groupBy(images, image => sectionOf(image) || 'images')
  return [
    head('Assets', images.length + fonts.length),
    Object.entries(folders).map(([folder, items]) => row(`#assets:${folder}`, folder === 'icons' ? 'frame' : 'image', humanize(folder), items.length)),
    fonts.length ? row('#assets:fonts', 'type', 'Fonts', fonts.length) : null,
  ]
}

const BODIES = { screens: screensBody, parts: partsBody, tokens: tokensBody, assets: assetsBody }

export const renderNav = () => {
  const tab = tabOf(state.view)
  $('tabs').replaceChildren(...TABS.map(([id, label, href]) =>
    el('a', { className: 'tab', href: href(), ariaCurrent: String(id === tab), textContent: label })))
  $('links').replaceChildren(...[BODIES[tab]()].flat(Infinity).filter(Boolean))
  $('links').querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
}

export const openRecent = anchor => {
  const recent = Object.entries(state.project.modified).sort(([, a], [, b]) => b - a).slice(0, 8)
  popover(anchor, el('div', { className: 'menu' },
    el('div', { className: 'head', textContent: 'Recent files' }),
    recent.map(([file]) => el('a', { href: isOpenable(file) ? `#board:${file}` : '#tokens:colors', textContent: shortName(file) }))))
}

const isOpenable = file => state.project.files.some(item => item.file === file)

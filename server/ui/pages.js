// The overview pages: home, the component library, tokens and assets.
import { isScreenFile } from './nav.js'
import { selectToken } from './rail.js'
import { $, ago, colorTokens, el, humanize, icon, isBase, plural, query, renderUrl, ROLE_ORDER, roleOf, sectionOf, shortName, state } from './lib.js'

const show = (...content) => {
  const page = $('page')
  const scroll = page.scrollTop
  $('board').hidden = true
  page.hidden = false
  page.replaceChildren(el('div', { className: 'page-inner' }, content))
  page.scrollTop = scroll
}

const head = (title, note) => el('div', { className: 'page-head' }, el('h1', { textContent: title }), el('p', { textContent: note }))
const chips = (items, active) => el('div', { className: 'chips' }, items.map(([label, href]) => el('a', { href, textContent: label, className: label === active ? 'active' : '' })))
const rule = () => el('div', { className: 'rule' })

const library = () => state.project.files.filter(item => !isScreenFile(item.file)).toSorted((a, b) => (sectionOf(b.file) === 'components') - (sectionOf(a.file) === 'components'))
const screenCount = () => state.project.files.filter(item => sectionOf(item.file) === 'screens').length

// Home

const kindOf = file => {
  if (isScreenFile(file)) return 'Screens'
  return state.project.files.some(item => item.file === file) ? 'Components' : 'Tokens'
}

const STATUS = { A: 'New', M: 'Updated', R: 'Moved' }

// A file in the grid: its drawing, its name, when it changed, and what git says about it.
const fileCard = (file, time, status) => {
  const isDrawn = state.project.files.some(item => item.file === file)
  const shot = el('div', { className: 'card-shot' }, isDrawn
    ? el('img', { src: renderUrl(file, null, 0.25), alt: '', loading: 'lazy', onerror: event => event.target.replaceWith(icon('file', 20)) })
    : icon(kindOf(file) === 'Tokens' ? 'palette' : 'file', 20))
  return el('a', { className: 'card', href: isDrawn ? `#board:${file}` : '#tokens:colors' }, shot,
    el('div', { className: 'card-text' },
      el('div', {}, el('strong', { textContent: `${shortName(file)}.elyx`, title: file }), el('span', { textContent: `Changed ${ago(time)}` })),
      STATUS[status] ? el('span', { className: 'badge', textContent: STATUS[status] }) : null))
}

export const homePage = filter => {
  const { tokens, images, fonts, modified } = state.project
  const components = library().reduce((sum, item) => sum + item.exports.length, 0)
  const status = new Map()
  for (const entry of state.activity) for (const change of entry.files) if (!status.has(change.file)) status.set(change.file, change.status)
  const files = Object.entries(modified).filter(([file]) => !filter || kindOf(file) === filter).sort(([, a], [, b]) => b - a)
  show(
    head(humanize(state.project.name), `${plural(screenCount(), 'screen')}, ${plural(components, 'component')}, ${plural(tokens.length, 'token')} and ${plural(images.length + fonts.length, 'asset')}`),
    chips([['All', '#home'], ['Screens', '#home:Screens'], ['Components', '#home:Components'], ['Tokens', '#home:Tokens']], filter ?? 'All'),
    files.length
      ? el('div', { className: 'cards' }, files.map(([file, time]) => fileCard(file, time, status.get(file))))
      : el('div', { className: 'empty', textContent: 'Nothing here yet.' }),
  )
}

// Components

const usesOf = (file, name) => state.usage?.components[`${file}#${name}`] ?? []

const detail = ({ file, exports }) => {
  const variants = plural(exports.length, 'variant')
  if (!state.usage) return variants
  return `${variants}, ${plural(exports.reduce((sum, { name }) => sum + usesOf(file, name).length, 0), 'use')}`
}

const preview = ({ file, exports }) => {
  const main = exports.find(({ variant }) => !variant) ?? exports[0]
  return el('img', { srcset: `${renderUrl(file, main.name, 2)} 2x`, alt: `${shortName(file)} preview`, loading: 'lazy', onerror: event => event.target.remove() })
}

export const galleryPage = section => {
  const items = library().filter(item => item.exports.length && (section === 'all' || sectionOf(item.file) === section))
  const sections = [...new Set(library().map(item => sectionOf(item.file)))]
  const count = items.reduce((sum, item) => sum + item.exports.length, 0)
  show(
    head(section === 'all' ? 'Components' : humanize(section), `${count} in ${plural(items.length, 'file')}`),
    chips([['All', '#gallery:all'], ...sections.map(name => [humanize(name), `#gallery:${name}`])], section === 'all' ? 'All' : humanize(section)),
    rule(),
    el('div', { className: 'tiles' }, items.map(item =>
      el('a', { className: 'tile', href: `#component:${item.file}` },
        el('div', { className: 'well' }, preview(item)),
        el('div', { className: 'tile-text' }, el('strong', { textContent: `${shortName(item.file)}.elyx` }), el('span', { textContent: detail(item) }))))),
  )
}

const pathOf = use => use.path.join('.')

const useTile = use => {
  const mark = el('i')
  Object.assign(mark.style, { left: `${(use.x / use.fw) * 100}%`, top: `${(use.y / use.fh) * 100}%`, width: `${(use.w / use.fw) * 100}%`, height: `${(use.h / use.fh) * 100}%` })
  return el('a', { className: 'use', href: `#board:${use.file}:${use.frame}:${pathOf(use)}` },
    el('div', { className: 'use-shot' }, el('img', { src: renderUrl(use.file, use.frame, 0.5), alt: `${use.frame} screen`, loading: 'lazy' }), mark),
    el('span', { textContent: shortName(use.file) }))
}

export const componentPage = file => {
  const item = state.project.files.find(candidate => candidate.file === file)
  if (!item) return show(head(shortName(file), 'This file has no components.'))
  const uses = item.exports.flatMap(({ name }) => usesOf(file, name))
  const screens = [...new Map(uses.map(use => [`${use.file}#${use.frame}`, use])).values()]
  show(
    head(humanize(shortName(file)), state.usage ? `${plural(item.exports.length, 'variant')}, used in ${plural(screens.length, 'screen')}` : plural(item.exports.length, 'variant')),
    el('div', { className: 'variants' }, item.exports.map(({ name }) =>
      el('a', { className: 'variant', href: `#board:${file}:${name}` },
        el('span', { className: 'frame-title' }, icon('frame', 11), el('span', { textContent: name })),
        el('img', { srcset: `${renderUrl(file, name, 2)} 2x`, alt: `${name} preview`, loading: 'lazy', onerror: event => event.target.remove() })))),
    el('h3', { textContent: 'Where it is used' }),
    !state.usage
      ? el('p', { className: 'muted', textContent: 'Reading the screens…' })
      : screens.length
        ? el('div', { className: 'uses' }, screens.slice(0, 9).map(useTile))
        : el('div', { className: 'empty', textContent: 'No screen uses this yet.' }),
  )
}

// Tokens

const contextLabel = context => Object.values(context).map(humanize).join(' · ') || 'Base'

const colorTile = (base, override) => {
  const token = override ?? base
  const isChosen = state.token === token || (state.token && state.token.name === token.name && state.token.rootScope[0] === token.rootScope[0] && JSON.stringify(state.token.context) === JSON.stringify(token.context))
  const color = el('i')
  color.style.background = token.value
  return el('button', { className: 'swatch-tile', ariaPressed: String(Boolean(isChosen)), onclick: () => selectToken(token) },
    color,
    el('div', {}, el('strong', { textContent: base.name, title: base.name }),
      el('span', { className: state.tokenContext !== '{}' && !override ? 'inherited' : '', textContent: state.tokenContext !== '{}' && !override ? 'inherits' : (token.literal ?? token.value), title: token.literal ?? '' })))
}

export const colorsPage = role => {
  const colors = colorTokens()
  const contexts = [...new Set(state.project.tokens.filter(token => token.type === 'color').map(token => JSON.stringify(token.context)))].sort((a, b) => a.length - b.length)
  const overrides = state.project.tokens.filter(token => JSON.stringify(token.context) === state.tokenContext)
  const roles = Object.groupBy(colors, token => roleOf(token.name))
  const contextChips = el('div', { className: 'chips' }, contexts.map(key =>
    el('button', { textContent: contextLabel(JSON.parse(key)), className: key === state.tokenContext ? 'active' : '', onclick: () => {
      state.tokenContext = key
      state.token = null
      dispatchEvent(new Event('token'))
    } })))
  show(
    head(role ?? 'Colors', `${plural(state.project.tokens.filter(token => token.type === 'color').length, 'token')} across ${plural(contexts.length, 'context')}`),
    contextChips,
    rule(),
    ROLE_ORDER.filter(name => roles[name] && (!role || role === name)).map(name => [
      el('h3', { textContent: name }),
      el('div', { className: 'swatches-grid' }, roles[name].map(base => colorTile(base, isBase(base) && state.tokenContext === '{}' ? base : overrides.find(token => token.name === base.name)))),
    ]),
  )
}

const pressed = token => String(state.token?.name === token.name && state.token?.rootScope[0] === token.rootScope[0])

const typeSheet = tokens => el('div', { className: 'sheet scale-sheet' }, tokens.toSorted((a, b) => b.value - a.value).map(token => {
  const sample = el('span', { className: 'scale-sample', textContent: 'The quick overview' })
  sample.style.fontSize = `${token.value}px`
  return el('button', { className: 'scale-row', ariaPressed: pressed(token), onclick: () => selectToken(token) },
    el('span', { className: 'scale-name', textContent: token.name, title: token.name }), sample, el('span', { className: 'scale-value figure', textContent: token.literal ?? token.value }))
}))

const barSheet = tokens => {
  const most = Math.max(...tokens.map(token => Math.abs(token.value)))
  return el('div', { className: 'sheet scale-sheet' }, tokens.toSorted((a, b) => a.value - b.value).map(token => {
    const bar = el('div', { className: 'scale-bar' })
    bar.style.width = `${(Math.abs(token.value) / most) * 100}%`
    return el('button', { className: 'scale-row', ariaPressed: pressed(token), onclick: () => selectToken(token) },
      el('span', { className: 'scale-name', textContent: token.name, title: token.name }), el('div', { className: 'scale-track' }, bar), el('span', { className: 'scale-value figure', textContent: token.literal ?? token.value }))
  }))
}

const radiusSheet = tokens => el('div', { className: 'sheet radius-grid' }, tokens.toSorted((a, b) => a.value - b.value).map(token => {
  const corner = el('i')
  corner.style.borderRadius = `${Math.min(token.value, 28)}px`
  return el('button', { className: 'radius-item', ariaPressed: pressed(token), onclick: () => selectToken(token) }, corner, token.name)
}))

const sheetFor = (group, tokens) => (/radius/i.test(group) ? radiusSheet(tokens) : /font-?size/i.test(group) ? typeSheet(tokens) : barSheet(tokens))

export const scalesPage = group => {
  const groups = Object.groupBy(state.project.tokens.filter(token => token.type === 'number' && isBase(token)), token => token.rootScope[0])
  const names = Object.keys(groups).filter(name => !group || name === group)
  const typeFirst = names.toSorted((a, b) => /font/i.test(b) - /font/i.test(a))
  show(
    head(group ? humanize(group) : 'Scales', 'Drawn at true size. Pick one to change it.'),
    chips([['All', '#tokens:scales'], ...Object.keys(groups).map(name => [humanize(name), `#tokens:scales:${name}`])], group ? humanize(group) : 'All'),
    rule(),
    typeFirst.map(name => [el('h3', { textContent: humanize(name) }), sheetFor(name, groups[name])]),
  )
}

// Assets

const iconCell = image => el('figure', { className: 'icon-cell' },
  el('img', { src: `asset?${query({ path: image })}`, alt: image, loading: 'lazy' }),
  el('span', { textContent: image.split('/').at(-1).replace(/\.\w+$/, ''), title: image }))

const fontCard = font => {
  const family = `elyx-${font.replace(/\W/g, '-')}`
  const sample = el('strong', { textContent: 'Aa' })
  sample.style.fontFamily = `"${family}", inherit`
  new FontFace(family, `url("asset?${query({ path: font })}")`).load().then(face => document.fonts.add(face), () => {})
  return el('div', { className: 'sheet font-card' }, sample, el('div', {}, el('b', { textContent: font.split('/').at(-1).replace(/[-.].*$/, '') }), el('span', { textContent: font })))
}

export const assetsPage = filter => {
  const { images, fonts } = state.project
  const folders = Object.groupBy(images, image => sectionOf(image) || 'images')
  const shown = Object.entries(folders).filter(([folder]) => filter === 'all' || filter === folder)
  show(
    head('Assets', `${plural(images.length, 'image')}, ${plural(fonts.length, 'font')}`),
    chips([['All', '#assets:all'], ...Object.keys(folders).map(name => [humanize(name), `#assets:${name}`]), ...(fonts.length ? [['Fonts', '#assets:fonts']] : [])], filter === 'all' ? 'All' : humanize(filter)),
    rule(),
    shown.map(([folder, items]) => [el('h3', { textContent: humanize(folder) }), el('div', { className: 'icon-grid' }, items.map(iconCell))]),
    (filter === 'all' || filter === 'fonts') && fonts.length ? [el('h3', { textContent: 'Fonts' }), fonts.map(fontCard)] : null,
  )
}

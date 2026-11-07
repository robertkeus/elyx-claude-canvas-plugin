// The overview pages: home, the component library, tokens and assets.
import { isScreenFile } from './nav.js'
import { selectToken } from './rail.js'
import { $, colorTokens, el, humanize, icon, isBase, plural, query, renderUrl, ROLE_ORDER, roleOf, sectionOf, shortName, state } from './lib.js'

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

const STATUS = { A: 'New', M: 'Updated', D: 'Removed', R: 'Moved' }
const expanded = new Set()

const change = ({ file, status }) => {
  const isDrawn = status !== 'D' && state.project.files.some(item => item.file === file)
  const shot = el('div', { className: 'change-shot' }, isDrawn
    ? el('img', { src: renderUrl(file, null, 0.25), alt: '', loading: 'lazy', onerror: event => event.target.replaceWith(icon('file', 20)) })
    : icon('file', 20))
  const parts = [shot, el('strong', { textContent: `${shortName(file)}.elyx`, title: file }), el('div', { className: 'change-foot' }, el('span', { textContent: isDrawn ? 'Open' : ' ' }), el('span', { className: `status-${status}`, textContent: STATUS[status] ?? status }))]
  return isDrawn ? el('a', { className: 'change', href: `#board:${file}` }, parts) : el('div', { className: 'change' }, parts)
}

const commit = (entry, files) => {
  const isOpen = expanded.has(entry.hash)
  const counts = Object.groupBy(files, ({ status }) => status)
  const summary = [counts.A && `${counts.A.length} new`, counts.M && `${counts.M.length} updated`, counts.D && `${counts.D.length} removed`].filter(Boolean).join(', ')
  return el('div', { className: 'commit-row' }, el('div', { className: 'timeline' }),
    el('div', { className: 'sheet commit' },
      el('div', { className: 'commit-head' },
        el('div', {}, el('strong', { textContent: entry.subject, title: entry.subject }), el('span', { textContent: `${entry.author} committed to ${state.project.branch || 'this branch'}` })),
        el('span', { className: 'added', textContent: summary })),
      el('div', { className: 'change-grid' }, (isOpen ? files : files.slice(0, 4)).map(change)),
      files.length > 4 && el('button', {
        className: 'outline-button',
        textContent: isOpen ? 'Show fewer' : `Show all ${files.length} files`,
        onclick: () => {
          if (isOpen) expanded.delete(entry.hash)
          else expanded.add(entry.hash)
          homePage(state.view.filter)
        },
      })))
}

const dayOf = date => new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')

export const homePage = filter => {
  const { tokens, images, fonts } = state.project
  const components = library().reduce((sum, item) => sum + item.exports.length, 0)
  const shown = state.activity.flatMap(entry => {
    const files = entry.files.filter(({ file }) => !filter || kindOf(file) === filter)
    return files.length ? [{ entry, files }] : []
  })
  const changed = shown.reduce((sum, { files }) => sum + files.length, 0)
  const days = Object.entries(Object.groupBy(shown, ({ entry }) => dayOf(entry.date)))
  show(
    head('Overview', `Everything in ${state.project.name}, at a glance`),
    chips([['All', '#home'], ['Screens', '#home:Screens'], ['Components', '#home:Components'], ['Tokens', '#home:Tokens']], filter ?? 'All'),
    rule(),
    el('div', { className: 'stats' },
      [[screenCount(), 'Screens', state.project.opened ? `#board:${state.project.opened}` : '#home'], [components, 'Components', '#gallery:all'], [tokens.length, 'Tokens', '#tokens:colors'], [images.length + fonts.length, 'Assets', '#assets:all']].map(([count, label, href]) =>
        el('a', { className: 'stat', href }, el('strong', { textContent: count }), el('span', { textContent: label })))),
    shown.length
      ? [el('p', { className: 'muted', textContent: `${plural(changed, 'file change')} across ${plural(shown.length, 'commit')}` }), days.map(([day, entries]) => [el('h2', { textContent: day }), entries.map(({ entry, files }) => commit(entry, files))])]
      : el('div', { className: 'empty', textContent: state.project.branch ? 'No design changes in this history yet.' : 'Recent changes appear here once this project is in git.' }),
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
        el('span', { className: 'frame-title' }, el('span', { textContent: name }), el('i'), el('i')),
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

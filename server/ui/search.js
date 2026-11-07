// ⌘K: one box for screens, components, tokens and text across the project.
import { isScreenFile } from './nav.js'
import { selectToken } from './rail.js'
import { $, el, humanize, icon, isBase, needUsage, renderUrl, shortName, state, tokenPath } from './lib.js'

const PER_GROUP = 5

const results = text => {
  const needle = text.trim().toLowerCase()
  const matches = value => value.toLowerCase().includes(needle)
  const rank = value => (value.toLowerCase().startsWith(needle) ? 0 : 1)
  const best = (items, labelOf) => items.filter(item => matches(labelOf(item))).toSorted((a, b) => rank(labelOf(a)) - rank(labelOf(b))).slice(0, PER_GROUP)

  const screens = state.project.files.filter(item => isScreenFile(item.file))
  const parts = state.project.files.filter(item => !isScreenFile(item.file)).flatMap(item => item.exports.map(({ name }) => ({ file: item.file, name, label: `${shortName(item.file)} / ${name}` })))
  const tokens = state.project.tokens.filter(isBase)
  const texts = needle && state.usage ? state.usage.texts : []
  return [
    ['Screens', best(screens, item => shortName(item.file)).map(item => ({
      label: humanize(shortName(item.file)),
      where: item.file,
      thumb: renderUrl(item.file, null, 0.1, true),
      go: () => (location.hash = `#board:${item.file}`),
    }))],
    ['Components', best(parts, item => item.label).map(item => ({
      label: item.label,
      glyph: 'component',
      go: () => (location.hash = `#component:${item.file}`),
    }))],
    ['Tokens', best(tokens, token => tokenPath(token)).map(token => ({
      label: tokenPath(token),
      where: token.literal ?? String(token.value),
      glyph: 'palette',
      go: () => {
        location.hash = token.type === 'color' ? '#tokens:colors' : `#tokens:scales:${token.rootScope[0]}`
        selectToken(token)
      },
    }))],
    ['Layers', best(texts, item => item.text).map(item => ({
      label: `${item.name} “${item.text.split('\n')[0]}”`,
      where: item.frame,
      glyph: 'type',
      go: () => (location.hash = `#board:${item.file}:${item.frame}:${item.path.join('.')}`),
    }))],
  ].filter(([, items]) => items.length)
}

let closing = null

export const closeSearch = () => closing?.()

export const openSearch = () => {
  if (closing) return closing()
  needUsage()
  let chosen = 0
  let flat = []
  const list = el('div', { className: 'palette-results', role: 'listbox' })

  const draw = () => {
    const groups = results(input.value)
    flat = groups.flatMap(([, items]) => items)
    chosen = Math.min(chosen, Math.max(0, flat.length - 1))
    let index = 0
    list.replaceChildren(...groups.flatMap(([title, items]) => [
      el('div', { className: 'nav-head' }, title, el('span', { className: 'figure', textContent: items.length })),
      items.map(item => {
        const position = index++
        return el('button', {
          className: 'palette-row',
          role: 'option',
          ariaSelected: String(position === chosen),
          onpointermove: () => {
            if (position === chosen) return
            chosen = position
            draw()
          },
          onclick: () => open(item),
        }, item.thumb ? el('img', { className: 'thumb', src: item.thumb, alt: '' }) : icon(item.glyph, 15),
        el('span', { className: 'label', textContent: item.label }),
        item.where ? el('span', { className: 'where', textContent: item.where }) : null)
      }),
    ].flat()))
    if (!flat.length) list.replaceChildren(el('div', { className: 'empty', textContent: 'Nothing matches that.' }))
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }

  const open = item => {
    closing()
    item.go()
  }

  const input = el('input', {
    placeholder: 'Search screens, components, tokens and text',
    ariaLabel: 'Search',
    oninput: () => {
      chosen = 0
      draw()
    },
    onkeydown: event => {
      if (event.key === 'ArrowDown') chosen = Math.min(chosen + 1, flat.length - 1)
      else if (event.key === 'ArrowUp') chosen = Math.max(chosen - 1, 0)
      else if (event.key === 'Enter' && flat[chosen]) return open(flat[chosen])
      else if (event.key === 'Escape') return closing()
      else return
      event.preventDefault()
      draw()
    },
  })

  const scrim = el('div', { id: 'scrim', onclick: () => closing() })
  const palette = el('div', { className: 'palette', role: 'dialog', ariaLabel: 'Search' },
    el('div', { className: 'palette-entry' }, icon('search', 17), input, el('kbd', { textContent: 'esc' })),
    list,
    el('div', { className: 'palette-foot' }, el('span', { textContent: '↑ ↓  Move' }), el('span', { textContent: '↵  Open' })))
  $('floating').append(scrim, palette)
  const redraw = () => draw()
  document.addEventListener('usage', redraw)
  closing = () => {
    closing = null
    scrim.remove()
    palette.remove()
    document.removeEventListener('usage', redraw)
  }
  draw()
  input.focus()
}

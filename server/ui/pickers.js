// Popovers, the color and number pickers, and the quick-edit bar beside a selection.
import { editLayer, select, trailOf } from './board.js'
import { exportControls } from './export.js'
import { $, clamp, colorTokens, edit, el, icon, isBase, local, report, ROLE_ORDER, roleOf, state, stored, tokenOf, tokenPath, tokenValue, unwrap } from './lib.js'

let open = null

export const closePopover = () => {
  open?.close()
  open = null
}

export const popover = (anchor, content, { className = '' } = {}) => {
  const wasOpen = open?.anchor === anchor
  closePopover()
  if (wasOpen) return null
  const box = el('div', { className: `popover ${className}` }, content)
  $('floating').append(box)

  const rect = anchor.getBoundingClientRect()
  const { width, height } = box.getBoundingClientRect()
  const fitsBelow = rect.bottom + 8 + height <= innerHeight - 8
  box.style.left = `${clamp(rect.left, 8, innerWidth - width - 8)}px`
  box.style.top = `${fitsBelow ? rect.bottom + 8 : Math.max(8, rect.top - 8 - height)}px`

  const outside = event => {
    if (!box.contains(event.target) && !anchor.contains(event.target)) closePopover()
  }
  const escape = event => {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    closePopover()
  }
  addEventListener('pointerdown', outside, true)
  addEventListener('keydown', escape, true)
  open = {
    anchor,
    close: () => {
      box.remove()
      removeEventListener('pointerdown', outside, true)
      removeEventListener('keydown', escape, true)
    },
  }
  return box
}

const blurOnEnter = event => event.key === 'Enter' && event.target.blur()

export const colorOf = layer => layer.style?.fills?.[0]?.color
export const canColor = layer => ['text', 'frame', 'asset'].includes(layer.type) && (!layer.style?.fills?.length || Boolean(colorOf(layer)))

const swatch = color => {
  const chip = el('i', { className: 'swatch' })
  chip.style.background = color ?? 'transparent'
  return chip
}
export { swatch }

const rememberColor = token => stored.set('recent-colors', [tokenPath(token), ...stored.get('recent-colors', []).filter(path => path !== tokenPath(token))].slice(0, 8))

export const openColors = (anchor, layer) => {
  const current = tokenOf(colorOf(layer))
  const results = el('div', { style: 'display:contents' })
  const choose = token => {
    rememberColor(token)
    closePopover()
    edit(layer, 'fill', tokenValue(token))
  }
  const grid = tokens => el('div', { className: 'color-grid' }, tokens.map(token => {
    const button = el('button', { title: tokenPath(token), ariaLabel: tokenPath(token), ariaPressed: String(tokenPath(token) === current), onclick: () => choose(token) })
    button.style.background = token.value
    return button
  }))
  const draw = text => {
    const tokens = colorTokens().filter(token => token.name.includes(text.toLowerCase()))
    const recent = stored.get('recent-colors', []).flatMap(path => tokens.find(token => tokenPath(token) === path) ?? [])
    const roles = Object.groupBy(tokens, token => roleOf(token.name))
    results.replaceChildren(...[
      recent.length ? [el('div', { className: 'group-name', textContent: 'Recent' }), grid(recent)] : [],
      [...ROLE_ORDER].reverse().filter(role => roles[role]).map(role => [el('div', { className: 'group-name', textContent: role }), grid(roles[role])]),
    ].flat(Infinity))
  }
  const find = el('input', { className: 'field-input', placeholder: 'Search tokens', ariaLabel: 'Search tokens', oninput: () => draw(find.value) })
  const custom = el('input', {
    className: 'field-input',
    placeholder: 'Custom hex, when no token fits',
    ariaLabel: 'Custom color',
    onchange: () => {
      if (!custom.value.trim()) return
      closePopover()
      edit(layer, 'fill', { raw: custom.value.trim() })
    },
    onkeydown: blurOnEnter,
  })
  draw('')
  popover(anchor, [find, results, el('div', { className: 'foot' }, custom)], { className: 'color-popover' })
  find.focus()
}

const paddingOf = layer => {
  const padding = layer.layout?.padding
  if (!padding) return undefined
  const sides = Object.values(padding)
  return sides.every(side => unwrap(side) === unwrap(sides[0])) ? padding.top : { value: sides.map(unwrap).join(' ') }
}

export const FIELDS = [
  { prop: 'font-size', label: 'Font size', scale: /font/i, unit: '', read: layer => layer.text?.font?.size },
  { prop: 'corner-radius', label: 'Radius', scale: /radius/i, unit: 'px', read: layer => (layer.type === 'frame' ? (layer.style?.cornerRadius ?? 0) : undefined) },
  { prop: 'layout.item-gap', label: 'Gap', scale: /space|gap/i, unit: 'px', read: layer => (layer.layout?.type === 'stack' ? layer.layout.gap : undefined) },
  { prop: 'padding', label: 'Padding', scale: /space|gap/i, unit: 'px', read: paddingOf },
]

const numberTokens = pattern => {
  const numbers = state.project.tokens.filter(token => token.type === 'number' && isBase(token) && token.scope.length === 1)
  const fitting = numbers.filter(token => pattern.test(tokenPath(token)))
  return fitting.length ? fitting : numbers
}

export const openNumbers = (anchor, layer, field) => {
  const current = tokenOf(field.read(layer))
  const choose = value => {
    closePopover()
    edit(layer, field.prop, value)
  }
  const custom = el('input', {
    className: 'field-input',
    placeholder: 'Custom value',
    ariaLabel: `Custom ${field.label.toLowerCase()}`,
    onchange: () => {
      const number = Number(custom.value)
      if (!custom.value.trim() || Number.isNaN(number)) return report(new Error('Use a number.'))
      choose({ raw: `${number}${field.unit}` })
    },
    onkeydown: blurOnEnter,
  })
  popover(anchor, [
    numberTokens(field.scale).map(token =>
      el('button', { className: tokenPath(token) === current ? 'on' : '', onclick: () => choose(tokenValue(token)) }, tokenPath(token), el('span', { textContent: token.value }))),
    custom,
  ], { className: 'menu' })
}

const WEIGHTS = ['Regular', 'Medium', 'SemiBold', 'Bold']

export const openWeights = (anchor, layer) => {
  const current = layer.text.font?.style
  popover(anchor, WEIGHTS.map(weight =>
    el('button', { className: weight === current ? 'on' : '', textContent: weight, onclick: () => {
      closePopover()
      edit(layer, 'font-style', { text: weight })
    } })), { className: 'menu' })
}

// The quick-edit bar

const chevron = () => el('span', { className: 'faint' }, icon('chevron-down', 12))
const rule = () => el('span', { className: 'rule' })

const quickColor = layer => {
  const color = colorOf(layer)
  const button = el('button', { className: 'quick-button', title: 'Color', onclick: () => openColors(button, layer) },
    swatch(unwrap(color)), el('span', { className: 'figure', textContent: tokenOf(color)?.split('.').at(-1) ?? (color ? 'Custom' : 'None') }), chevron())
  return button
}

const quickNumber = (layer, field, value) => {
  const button = el('button', { className: 'quick-button', title: field.label, onclick: () => openNumbers(button, layer, field) },
    field.prop === 'corner-radius' ? icon('corner', 13) : field.prop === 'layout.item-gap' ? icon('gap', 13) : field.prop === 'padding' ? icon('padding', 13) : null,
    el('span', { className: 'figure', textContent: String(unwrap(value)) }), chevron())
  return button
}

const quickText = layer => {
  const isMultiline = layer.text.content.includes('\n')
  const input = el('input', {
    defaultValue: layer.text.content,
    ariaLabel: 'Text',
    readOnly: isMultiline,
    title: isMultiline ? 'Edit multi-line text in the inspector' : '',
    onchange: () => edit(layer, 'contents', { text: input.value }),
    onkeydown: blurOnEnter,
  })
  return el('label', { className: 'quick-text' }, icon('type', 13), input)
}

const moreMenu = anchor => {
  const trail = trailOf(state.selection)
  const layer = trail.at(-1)
  const source = trail.toReversed().find(step => step.instanceOf)?.instanceOf
  const base = source?.variant ?? source
  popover(anchor, [
    base && el('a', { href: `#component:${local(base.file)}`, textContent: 'Open component', onclick: closePopover }),
    el('button', { textContent: 'Select parent', disabled: !state.selection.path.length, onclick: () => {
      closePopover()
      select({ frame: state.selection.frame, path: state.selection.path.slice(0, -1) })
    } }),
    el('button', { textContent: layer.hidden ? 'Show layer' : 'Hide layer', onclick: () => {
      closePopover()
      edit(editLayer(), 'display', { raw: layer.hidden ? '.visible' : '.hidden' })
    } }),
    el('button', { textContent: 'Export…', onclick: () => {
      closePopover()
      popover(anchor, exportControls({ name: layer.name, target: layer.target }), { className: 'export-popover' })
    } }),
    el('button', { textContent: 'Ask Claude', onclick: () => {
      closePopover()
      $('ask').click()
    } }),
  ].filter(Boolean), { className: 'menu' })
}

export const renderQuick = () => {
  const box = $('quick')
  box.hidden = !state.selection
  if (!state.selection) return
  const layer = editLayer()
  const numbers = FIELDS.flatMap(field => {
    const value = field.read(layer)
    return value === undefined || value === null ? [] : [quickNumber(layer, field, value)]
  }).slice(0, 2)
  const more = el('button', { className: 'icon-button', ariaLabel: 'More', onclick: () => moreMenu(more) }, icon('ellipsis', 15))
  const items = [layer.text ? quickText(layer) : null, canColor(layer) ? quickColor(layer) : null, ...numbers, more].filter(Boolean)
  box.replaceChildren(...items.flatMap((item, index) => (index ? [rule(), item] : [item])))
}

// Sits under the selection, or above it when the stage runs out of room.
export const placeQuick = rect => {
  const box = $('quick')
  if (!rect || box.hidden) return
  const area = $('board').getBoundingClientRect()
  const rail = $('rail')
  const isOverRail = getComputedStyle(rail).position === 'fixed' && getComputedStyle(rail).display !== 'none'
  const width = area.width - (isOverRail ? rail.offsetWidth : 0)
  const { height } = area
  const size = box.getBoundingClientRect()
  const below = rect.y + rect.h + 12
  const top = below + size.height > height - 80 ? rect.y - size.height - 36 : below
  box.style.transform = `translate(${clamp(rect.x + rect.w / 2 - size.width / 2, 12, Math.max(12, width - size.width - 12))}px,${clamp(top, 12, Math.max(12, height - size.height - 80))}px)`
}

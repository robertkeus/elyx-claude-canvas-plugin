// The inspector on the right: what you selected, or where you are.
import { claudeBody } from './ask.js'
import { editLayer, leaveRevision, select, showRevision, trailOf } from './board.js'
import { exportControls } from './export.js'
import { openPlay } from './play.js'
import { canColor, closePopover, colorOf, FIELDS, openColors, openNumbers, openWeights, popover, renderQuick, swatch } from './pickers.js'
import { $, ago, contextAxes, DEFAULT_EASING, durationTokens, easingTokens, edit, el, get, hex, icon, isBase, local, plural, post, query, report, resolveMotion, saved, shortName, state, stored, tokenOf, tokenPath, TRANSITIONS, unwrap } from './lib.js'

const section = (title, ...kids) => el('div', { className: 'section' }, el('div', { className: 'section-head' }, title), kids)
const pair = (key, value) => el('div', { className: 'pair' }, el('span', { textContent: key }), typeof value === 'string' ? el('span', { textContent: value, title: value }) : value)
const linkPair = (label, href) => el('a', { className: 'link-pair', href }, el('span', { textContent: label, title: label }), el('span', { className: 'go' }, icon('arrow-right', 13)))

const boardLink = file => (state.project.files.some(item => item.file === file) ? `#board:${file}` : '#tokens:colors')

const recentFiles = count => Object.entries(state.project.modified).sort(([, a], [, b]) => b - a).slice(0, count).map(([file]) => file)

const recentRail = () => [
  el('div', { className: 'rail-body' }, section('Recent files', recentFiles(6).map(file => linkPair(`${shortName(file)}.elyx`, boardLink(file))))),
]

const TAB_NAMES = { claude: 'Claude', inspect: 'Inspect', source: 'Source', file: 'File', history: 'History', details: 'Details' }

const tabs = ids => el('div', { className: 'rail-tabs', role: 'tablist' }, ids.map(id => el('button', {
  className: 'tab',
  role: 'tab',
  ariaPressed: String(state.railTab === id),
  textContent: TAB_NAMES[id],
  onclick: () => {
    state.railTab = id
    renderRail()
  },
})))

const contextRows = () => Object.entries(contextAxes()).map(([axis, values]) => {
  const options = [undefined, ...values]
  const chosen = state.contexts[axis]
  return pair(axis, el('button', {
    className: 'chip figure',
    textContent: chosen ?? 'Base',
    title: `Switch ${axis}`,
    onclick: () => {
      const next = options[(options.indexOf(chosen) + 1) % options.length]
      if (next) state.contexts[axis] = next
      else delete state.contexts[axis]
      dispatchEvent(new Event('context'))
    },
  }))
})

const fileBody = () => {
  const { file } = state.view
  const modified = state.project.modified[file]
  const toggle = el('button', {
    className: 'toggle',
    role: 'switch',
    ariaChecked: String(state.overlays),
    ariaLabel: 'Draw connections',
    onclick: () => dispatchEvent(new Event('overlays')),
  })
  const axes = contextRows()
  return el('div', { className: 'rail-body' },
    section('File',
      pair('Name', el('span', { className: 'chip figure', textContent: `${shortName(file)}.elyx` })),
      pair('Path', file),
      modified ? pair('Last modified', new Date(modified).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })) : null),
    axes.length ? section('Context', axes) : null,
    section('Canvas', el('div', { className: 'toggle-row' }, 'Draw connections', toggle)),
    section('Changed recently', recentFiles(4).map(recent => linkPair(`${shortName(recent)}.elyx`, boardLink(recent)))),
    section('Export', exportControls({ name: shortName(file), file })))
}

const pathTrail = trail => el('div', { className: 'path' }, trail.slice(0, -1).flatMap((step, index) => [
  el('button', {
    textContent: step.name,
    onclick: () => select({ frame: state.selection.frame, path: state.selection.path.slice(0, index) }),
  }),
  el('span', { className: 'faint', textContent: '›' }),
]), el('span', { className: 'here', textContent: trail.at(-1).type }))

const scopeSection = own => {
  const layer = state.componentLayer
  const everywhere = state.scope === 'everywhere' && layer
  const choose = scope => () => {
    state.scope = scope
    renderRail()
    renderQuick()
  }
  return section('Apply to',
    el('div', { className: 'segments' },
      el('button', { className: everywhere ? '' : 'on', textContent: 'This screen', onclick: choose('here') }),
      el('button', { className: everywhere ? 'on' : '', textContent: 'Everywhere', disabled: !layer, title: layer ? '' : 'This layer is not part of a component', onclick: choose('everywhere') })),
    el('div', { className: 'note', textContent: `Writes to ${local((everywhere ? layer : own).target.filePath)}` }),
    everywhere ? el('div', { className: 'note', textContent: 'Screens with their own override keep it.' }) : null)
}

const textField = layer => {
  const input = el('textarea', {
    className: 'field-area',
    defaultValue: layer.text.content,
    ariaLabel: 'Text',
    onchange: () => edit(layer, 'contents', { text: input.value }),
    onkeydown: event => {
      if (event.key !== 'Enter' || event.shiftKey) return
      event.preventDefault()
      input.blur()
    },
  })
  return section('Text', input)
}

const picker = (lead, name, value, onclick) => {
  const button = el('button', { className: 'picker', onclick: () => onclick(button) },
    lead, el('span', { className: 'name', textContent: name, title: name }), value != null ? el('span', { className: 'value figure', textContent: value }) : null,
    el('span', { className: 'chevron' }, icon('chevron-down', 14)))
  return button
}

const styleSection = layer => {
  const color = colorOf(layer)
  const rows = []
  if (canColor(layer)) rows.push(picker(swatch(unwrap(color)), tokenOf(color) ?? (color ? hex(unwrap(color)) : 'None'), null, anchor => openColors(anchor, layer)))
  for (const field of FIELDS) {
    const value = field.read(layer)
    if (value === undefined || value === null) continue
    const token = tokenOf(value)
    rows.push(picker(el('span', { className: 'muted', style: 'font-size:12px', textContent: field.label }), token ?? '', unwrap(value), anchor => openNumbers(anchor, layer, field)))
  }
  if (layer.text) rows.push(picker(null, layer.text.font?.style ?? 'Regular', null, anchor => openWeights(anchor, layer)))
  const visible = el('button', {
    className: 'toggle',
    role: 'switch',
    ariaChecked: String(!layer.hidden),
    ariaLabel: 'Visible',
    onclick: () => edit(layer, 'display', { raw: layer.hidden ? '.visible' : '.hidden' }),
  })
  return section('Style', rows, el('div', { className: 'toggle-row' }, 'Visible', visible))
}

// A link's source names are a path through the file, which can skip layers the tree
// has between them; they match when they appear in order and end on this layer.
const sameNames = (path, names) => {
  if (!path.length || path.at(-1) !== names.at(-1)) return !path.length && !names.length
  let at = 0
  for (const name of names) if (name === path[at]) at++
  return at === path.length
}

// Where a layer leads in play, and how it moves there. Motion is kept in the layer's
// `meta`, so it lives in the design file beside the link.
const prototypeSection = () => {
  const { frame } = state.selection
  const names = trailOf(state.selection).slice(1).map(layer => layer.name)
  const links = state.links.filter(link => link.from === frame.name && sameNames(link.path, names))
  if (!links.length) return null
  const [link] = links
  const motion = resolveMotion(link.meta)
  const save = async changes => {
    try {
      saved((await post('motion', { file: link.file, ref: link.ref, meta: { ...link.meta, ...changes } })).file)
    } catch (cause) {
      report(cause)
    }
  }
  const choose = (label, current, options, key) => pair(label, el('button', {
    className: 'chip figure',
    textContent: current,
    title: `Change ${label.toLowerCase()}`,
    onclick: event => popover(event.currentTarget, options.map(([value, text]) => el('button', {
      onclick: () => {
        closePopover()
        save({ [key]: value })
      },
    }, text)), { className: 'menu' }),
  }))
  const durations = [...durationTokens().map(token => [tokenPath(token), `${tokenPath(token)} · ${token.value} ms`]), [150, '150 ms'], [300, '300 ms'], [500, '500 ms']]
  const easings = [...easingTokens().map(token => [tokenPath(token), tokenPath(token)]), [DEFAULT_EASING, 'Standard'], ['ease-out', 'Ease out'], ['ease-in-out', 'Ease in and out'], ['linear', 'Linear']]
  const easingName = typeof link.meta.easing === 'string' ? (easings.find(([value]) => value === link.meta.easing)?.[1] ?? link.meta.easing) : (easingTokens().find(token => token.value === motion.easing) ? tokenPath(easingTokens().find(token => token.value === motion.easing)) : 'Standard')
  return section('Prototype',
    links.map(item => pair('Goes to', `${item.to}${item.label ? ` · ${item.label}` : ''}`)),
    choose('Transition', TRANSITIONS.find(([id]) => id === motion.transition)[1], TRANSITIONS, 'transition'),
    choose('Duration', typeof link.meta.duration === 'string' ? link.meta.duration : `${motion.duration} ms`, durations, 'duration'),
    choose('Easing', easingName, easings, 'easing'),
    el('button', { className: 'button play-here', onclick: () => openPlay(frame.name) }, icon('play', 13), 'Play from here'))
}

const layerBody = () => {
  const trail = trailOf(state.selection)
  const own = trail.at(-1)
  const layer = editLayer()
  const source = own.instanceOf?.variant ?? own.instanceOf
  const size = `${Math.round(own.resolvedSize?.width ?? 0)} × ${Math.round(own.resolvedSize?.height ?? 0)}`
  return el('div', { className: 'rail-body' },
    el('div', { className: 'identity' }, el('h2', { textContent: own.name }), pathTrail(trail)),
    scopeSection(own),
    prototypeSection(),
    layer.text ? textField(layer) : null,
    styleSection(layer),
    section('Source',
      pair('Size', size),
      source ? linkPair(`${shortName(source.file)} / ${source.symbol}`, `#component:${local(source.file)}`) : null,
      own.meta?.code ? pair('Code', own.meta.code.split('/').at(-1)) : null),
    section('Export', exportControls({ name: own.name, target: own.target })))
}

const sourceBody = () => {
  const code = el('pre', { className: 'code', textContent: 'Loading…' })
  const target = state.selection && editLayer().target
  const params = target ? { file: local(target.filePath), ref: target.sourceRef, path: target.overridePath } : { file: state.view.file }
  get(`source?${query(params)}`).then(({ text }) => code.replaceChildren(text), report)
  return el('div', { className: 'rail-body' }, section(target ? 'Source' : `${shortName(state.view.file)}.elyx`, code))
}

// The commits that changed this board or anything it draws, newest first. Pick one to
// see the board as it was; Now comes back.
const revisionRow = (commit, label, detail) => el('button', {
  className: 'revision',
  ariaPressed: String((state.rev?.hash ?? null) === (commit?.hash ?? null)),
  onclick: () => (commit ? showRevision(commit) : leaveRevision()),
}, el('i'), el('div', {}, el('strong', { textContent: label, title: label }), el('span', { textContent: detail })), commit ? el('span', { className: 'hash', textContent: commit.hash.slice(0, 7) }) : el('span'))

const historyBody = () => {
  const list = el('div', { className: 'revisions' }, el('p', { className: 'note', textContent: 'Reading the history…' }))
  const { file } = state.view
  get(`revisions?${query({ file })}`).then(({ commits, isDirty }) => {
    if (state.view.file !== file) return
    list.replaceChildren(
      revisionRow(null, 'Now', isDirty ? 'With changes not yet committed' : 'As committed last'),
      ...commits.map(commit => revisionRow(commit, commit.subject, `${commit.author}, ${ago(commit.date)}`)))
    if (!commits.length) list.append(el('p', { className: 'note', textContent: state.project.branch ? 'No commits have changed this board yet.' : 'Revisions appear once this project is in git.' }))
  }, report)
  return el('div', { className: 'rail-body' }, section('Revisions', list))
}

const boardBody = () => {
  if (state.railTab === 'history') return historyBody()
  if (state.railTab === 'source') return sourceBody()
  return state.railTab === 'file' || !state.selection ? fileBody() : layerBody()
}

const pageBody = () => {
  const { kind } = state.view
  return kind === 'component' ? componentRail() : kind === 'tokens' && state.token ? tokenBody(state.token) : recentRail()
}

const usesOf = (file, symbol) => state.usage?.components[`${file}#${symbol}`] ?? []

const componentRail = () => {
  const { file } = state.view
  const { exports } = state.project.files.find(item => item.file === file)
  const uses = exports.flatMap(({ name }) => usesOf(file, name))
  const screens = [...new Set(uses.map(use => use.file))]
  return [el('div', { className: 'rail-body' },
    section('Component',
      pair('Name', el('span', { className: 'chip figure', textContent: `${shortName(file)}.elyx` })),
      pair('Path', file)),
    section('Variants', exports.map(({ name, variant }) =>
      pair(name, state.usage ? plural(usesOf(file, name).length, 'use') : variant ? 'Variant' : 'Base'))),
    state.usage ? section(`Used in ${plural(screens.length, 'screen')}`, screens.slice(0, 8).map(screen => linkPair(`${shortName(screen)}.elyx`, `#board:${screen}`))) : null)]
}

const siblings = token => state.project.tokens.filter(other => other.name === token.name && other.rootScope[0] === token.rootScope[0]).toSorted((a, b) => Object.keys(a.context).length - Object.keys(b.context).length)

const saveToken = async (token, value) => {
  try {
    saved((await post('token', { file: token.file, scope: token.scope[0], name: token.name, value })).file)
  } catch (cause) {
    report(cause)
  }
}

const tokenBody = token => {
  const input = el('input', {
    className: 'field-input figure',
    defaultValue: token.literal ?? '',
    disabled: token.scope.length > 1,
    ariaLabel: 'Value',
    onchange: () => input.value.trim() && saveToken(token, input.value.trim()),
    onkeydown: event => event.key === 'Enter' && input.blur(),
  })
  const preview = token.type === 'color' ? el('div', { className: 'preview' }) : null
  if (preview) preview.style.background = token.value
  const others = siblings(token)
  const base = others.find(isBase) ?? token
  const reference = `${local(base.file)}#${[...base.rootScope, base.name].join('.')}`
  const used = state.usage?.tokens[reference]
  const files = Object.entries(used?.files ?? {}).sort(([, a], [, b]) => b - a).slice(0, 5)
  return [el('div', { className: 'rail-body' },
    preview,
    el('div', { className: 'identity' }, el('h2', { textContent: tokenPath(base) }), el('div', { className: 'path', textContent: local(base.file) })),
    section('Value', input),
    others.length > 1 ? section('Contexts', others.map(other => {
      const key = Object.entries(other.context).map(([axis, value]) => `${axis}=${value}`).join(', ') || 'Base'
      const row = el('button', { className: 'ctx-row', ariaPressed: String(other === token), onclick: () => selectToken(other) },
        other.type === 'color' ? swatch(other.value) : null, el('span', { className: 'name', textContent: key, title: key }), el('span', { className: 'value', textContent: other.literal ?? '' }))
      return row
    })) : null,
    state.usage ? section(`Used by ${plural(used?.layers ?? 0, 'layer')}`, files.map(([file, count]) => linkPair(`${shortName(file)} (${count})`, `#board:${file}`))) : null)]
}

export const selectToken = token => {
  state.token = token
  state.railTab = 'details'
  document.body.classList.add('rail-open')
  dispatchEvent(new Event('token'))
}

export const renderRail = () => {
  const isBoard = state.view.kind === 'board'
  const ids = isBoard ? ['claude', 'inspect', 'source', 'file', 'history'] : ['claude', 'details']
  if (!ids.includes(state.railTab)) state.railTab = isBoard ? 'inspect' : 'details'
  const body = state.railTab === 'claude' ? claudeBody() : isBoard ? boardBody() : pageBody()
  $('ask').ariaPressed = String(state.railTab === 'claude' && document.body.classList.contains('rail-open'))
  $('rail').replaceChildren(tabs(ids), ...[body].flat())
}

// Ask Claude opens its tab, ready to type.
export const openClaude = () => {
  state.railTab = 'claude'
  renderRail()
  $('rail').querySelector('textarea')?.focus()
}

addEventListener('revision', () => {
  if (state.railTab === 'history') renderRail()
})

// A narrow pane has no room to spare, so there the rail opens only on request.
export const isNarrow = () => innerWidth < 1180

export const restoreRail = () => !isNarrow() && stored.get('rail-open', true)

export const keepRail = isOpen => {
  if (!isNarrow()) stored.set('rail-open', isOpen)
}


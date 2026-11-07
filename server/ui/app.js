// Routing, the bars around the stage, and live updates.
import { openComposer } from './ask.js'
import { bounds, fit, focusOn, loadBoard, paint, refine, select, treeOf, zoomCenter } from './board.js'
import { $, contextAxes, el, get, icon, needUsage, plural, report, shortName, state, stored, undo } from './lib.js'
import { isScreenFile, openRecent, renderNav } from './nav.js'
import { assetsPage, colorsPage, componentPage, galleryPage, homePage, scalesPage } from './pages.js'
import { closePopover, popover, renderQuick } from './pickers.js'
import { isNarrow, keepRail, renderRail, restoreRail } from './rail.js'
import { closeSearch, openSearch } from './search.js'

const USES_USAGE = new Set(['gallery', 'component', 'tokens'])

const crumbTitle = () => {
  const { kind, file, focus, first } = state.view
  if (kind === 'board') return focus ?? (shortName(file) === 'index' ? 'All screens' : shortName(file))
  if (kind === 'component') return shortName(file)
  if (kind === 'gallery') return 'Components'
  if (kind === 'tokens') return first === 'scales' ? 'Scales' : 'Colors'
  if (kind === 'assets') return 'Assets'
  return 'Home'
}

const stageChip = (id, label, key, onclick) => {
  const chip = el('button', { className: 'stage-chip figure', onclick: () => onclick(chip) }, el('span', { id, textContent: label }), key ? el('kbd', { textContent: key }) : null)
  return chip
}

const openContexts = anchor => {
  const axes = Object.entries(contextAxes())
  popover(anchor, axes.length
    ? axes.map(([axis, values]) => [
        el('div', { className: 'head', textContent: axis }),
        [undefined, ...values].map(value =>
          el('button', { className: state.contexts[axis] === value ? 'on' : '', textContent: value ?? 'Base', onclick: () => {
            if (value) state.contexts[axis] = value
            else delete state.contexts[axis]
            closePopover()
            changeContext()
          } })),
      ])
    : el('div', { className: 'head', textContent: 'This project has no contexts.' }), { className: 'menu' })
}

const openZoom = anchor => popover(anchor, [
  ['Zoom in', () => zoomCenter(1.4), '+'],
  ['Zoom out', () => zoomCenter(1 / 1.4), '−'],
  ['Zoom to 100%', () => zoomCenter(1 / state.camera.z)],
  ['Zoom to fit', () => fit(bounds()), '0'],
].map(([label, run, key]) => el('button', { onclick: () => {
  closePopover()
  run()
} }, label, key ? el('span', { textContent: key }) : null)), { className: 'menu' })

const renderHud = () => {
  const hud = $('hud')
  hud.hidden = state.view.kind !== 'board' || !state.frames.length
  if (hud.hidden) return
  const count = state.frames.length
  const isBoard = isScreenFile(state.view.file) && count > 1
  const chosen = Object.values(state.contexts).join(', ')
  hud.replaceChildren(
    stageChip('count-label', plural(count, isBoard ? 'Screen' : 'Frame'), 'S', () => fit(bounds())),
    stageChip('context-label', chosen || 'Context', 'C', openContexts),
    stageChip('level-label', `${Math.round(state.camera.z * 100)}%`, null, openZoom),
  )
}

const renderPage = () => {
  const { kind, first, second, filter } = state.view
  if (kind === 'gallery') galleryPage(first ?? 'all')
  else if (kind === 'component') componentPage(state.view.file)
  else if (kind === 'tokens' && first === 'scales') scalesPage(second)
  else if (kind === 'tokens') colorsPage(second)
  else if (kind === 'assets') assetsPage(first ?? 'all')
  else homePage(filter)
}

const renderChrome = () => {
  $('crumb-title').textContent = crumbTitle()
  renderNav()
  renderHud()
  renderRail()
}

const showBoard = () => {
  $('page').hidden = true
  $('board').hidden = false
}

const route = async () => {
  closePopover()
  closeSearch()
  if (isNarrow() && !state.token) document.body.classList.remove('rail-open')
  const [kind = 'home', first, second, third] = decodeURIComponent(location.hash.slice(1)).split(':')
  const previous = state.view
  if (kind === 'board' && first) {
    const isSameFile = previous.kind === 'board' && previous.file === first
    state.view = { kind, file: first, focus: second }
    showBoard()
    const path = third === undefined ? undefined : third.split('.').filter(Boolean).map(Number)
    if (!isSameFile) {
      state.selection = null
      renderChrome()
      renderQuick()
      await loadBoard()
    }
    if (!state.frames.length && !isSameFile) {
      state.view = { kind: 'component', file: first }
      return renderView()
    }
    await focusOn(second, path)
    return renderChrome()
  }
  select(null)
  if (kind === 'home') {
    state.view = { kind, filter: first }
    loadActivity()
  }
  else if (kind === 'component') state.view = { kind, file: first }
  else state.view = { kind, first, second }
  if (kind !== 'tokens') state.token = null
  renderView()
}

const loadActivity = () =>
  get('activity').then(activity => {
    state.activity = activity
    if (state.view.kind === 'home') renderPage()
  }, report)

const renderView = () => {
  if (USES_USAGE.has(state.view.kind)) needUsage()
  renderPage()
  renderChrome()
}

const isTyping = () => {
  const active = document.activeElement
  return active?.matches('input, textarea') && active.value !== active.defaultValue
}

const refreshToken = () => {
  if (!state.token) return
  const { name, rootScope, context } = state.token
  state.token = state.project.tokens.find(token => token.name === name && token.rootScope[0] === rootScope[0] && JSON.stringify(token.context) === JSON.stringify(context)) ?? null
}

let refreshing = false
let stale = false
const refresh = async () => {
  if (refreshing) return void (stale = true)
  refreshing = true
  try {
    const previous = state.project
    state.project = await get('project')
    state.usage = null
    applyProject()
    refreshToken()
    if (state.view.kind === 'board') {
      refine()
      if (state.project.versions[state.view.file] !== previous.versions[state.view.file]) await reloadBoard()
      renderChrome()
    } else if (!isTyping()) renderView()
  } catch (cause) {
    report(cause)
  }
  refreshing = false
  if (stale) {
    stale = false
    refresh()
  }
}

// Keeps the selection through a reload, by frame name and child path.
const reloadBoard = async () => {
  const chosen = state.selection && { name: state.selection.frame.name, path: state.selection.path }
  const { scope } = state
  await loadBoard()
  paint()
  const frame = chosen && state.frames.find(item => item.name === chosen.name)
  if (frame) await treeOf(frame)
  if (isTyping()) return
  select(frame ? { frame, path: chosen.path } : null)
  state.scope = scope
}

const changeContext = async () => {
  await reloadBoard()
  refine()
  renderHud()
  renderRail()
}

const applyProject = () => {
  const { project } = state
  document.title = `${project.name} · Elyx`
  document.documentElement.style.setProperty('--canvas', project.canvas ?? 'var(--stage)')
  $('project').replaceChildren(project.name, project.branch ? el('small', { textContent: project.branch }) : '')
}

const setTheme = theme => {
  document.documentElement.dataset.theme = theme
  stored.set('theme', theme)
}

const setRail = isOpen => {
  document.body.classList.toggle('rail-open', isOpen)
  keepRail(isOpen)
  if (state.view.kind === 'board') paint()
}

const toggleOverlays = async () => {
  state.overlays = !state.overlays
  document.body.classList.toggle('clean', !state.overlays)
  $('overlays').ariaPressed = String(state.overlays)
  if (state.view.kind === 'board') await changeContext()
}

const wireBars = () => {
  $('recent').append(icon('history', 16))
  $('toggle-side').append(icon('columns', 16))
  $('inspect').append(icon('pointer', 16))
  $('overlays').append(icon('eye', 16))
  $('theme').append(icon('moon', 16))
  $('go-home').append(icon('house', 15))
  $('go-back').append(icon('chevron-left', 15))
  $('go-forward').append(icon('chevron-right', 15))
  $('crumb-close').append(icon('x', 13))
  $('toggle-rail').append(icon('columns', 15))
  $('orb').append(icon('sparkles', 16))

  $('find').prepend(icon('search', 14))
  $('find').onclick = openSearch
  $('recent').onclick = () => openRecent($('recent'))
  $('toggle-side').onclick = () => {
    document.body.classList.toggle('no-side')
    if (state.view.kind === 'board') paint()
  }
  $('inspect').onclick = () => {
    state.inspecting = !state.inspecting
    $('inspect').ariaPressed = String(state.inspecting)
    if (!state.inspecting) select(null)
  }
  $('overlays').onclick = toggleOverlays
  $('theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
  $('go-back').onclick = () => history.back()
  $('go-forward').onclick = () => history.forward()
  $('toggle-rail').onclick = () => setRail(!document.body.classList.contains('rail-open'))
  $('orb').onclick = openComposer
}

addEventListener('keydown', event => {
  const isCommand = event.metaKey || event.ctrlKey
  if (isCommand && event.key === 'k') {
    event.preventDefault()
    return openSearch()
  }
  if (event.target.matches?.('input, textarea')) return
  if (isCommand && event.key === 'z') {
    event.preventDefault()
    return undo()
  }
  if (isCommand || state.view.kind !== 'board') return
  if (event.key === 'Escape' && state.selection) select(state.selection.path.length ? { frame: state.selection.frame, path: state.selection.path.slice(0, -1) } : null)
  if (event.key === '+' || event.key === '=') zoomCenter(1.4)
  if (event.key === '-') zoomCenter(1 / 1.4)
  if (event.key === '0' || event.key === 's') fit(bounds())
  if (event.key === 'c') openContexts($('context-label').parentElement)
})

addEventListener('hashchange', () => route().catch(report))
let wasNarrow = isNarrow()
addEventListener('resize', () => {
  if (wasNarrow !== isNarrow()) document.body.classList.toggle('rail-open', restoreRail())
  wasNarrow = isNarrow()
  if (state.view.kind === 'board') paint()
})
addEventListener('context', () => changeContext().catch(report))
addEventListener('overlays', () => toggleOverlays().catch(report))
addEventListener('token', () => {
  renderPage()
  renderRail()
})
document.addEventListener('usage', () => {
  if (USES_USAGE.has(state.view.kind) && !isTyping()) renderPage()
  if (!isTyping()) renderRail()
})

setTheme(stored.get('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
document.body.classList.toggle('rail-open', restoreRail())
if (innerWidth < 720) document.body.classList.add('no-side')
wireBars()
try {
  state.project = await get('project')
  applyProject()
  if (!location.hash) history.replaceState(null, '', `#board:${state.project.opened}`)
  await route()
  state.revision = state.project.stamp
  new EventSource('events').onmessage = event => {
    if (event.data === state.revision) return
    state.revision = event.data
    refresh()
  }
} catch (cause) {
  report(cause)
}

// Routing, the bars around the stage, and live updates.
import { exportControls } from './export.js'
import { shareBoard } from './share.js'
import { bounds, fit, focusOn, leaveRevision, loadBoard, paint, refine, select, trailOf, treeOf, zoomCenter, zoomToSelection } from './board.js'
import { $, contextAxes, el, get, icon, needUsage, post, report, shortName, state, stored, toast, undo } from './lib.js'
import { openRecent, renderNav } from './nav.js'
import { assetsPage, colorsPage, componentPage, galleryPage, homePage, scalesPage } from './pages.js'
import { closePopover, popover, renderQuick } from './pickers.js'
import { isNarrow, keepRail, openClaude, renderRail, restoreRail } from './rail.js'
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

const isMac = /Mac|iPhone|iPad/.test(navigator.platform)
const command = isMac ? '⌘' : 'Ctrl+'

const openZoom = anchor => popover(anchor, [
  ['Zoom in', () => zoomCenter(1.4), `${command}+`],
  ['Zoom out', () => zoomCenter(1 / 1.4), `${command}−`],
  ['Zoom to 100%', () => zoomCenter(1 / state.camera.z), `${command}0`],
  ['Zoom to fit', () => fit(bounds()), '⇧1'],
  ['Zoom to selection', zoomToSelection, '⇧2'],
  ['Canvas mode', () => setCanvasMode(true), `${command}\\`],
].map(([label, run, key]) => el('button', { onclick: () => {
  closePopover()
  run()
} }, label, el('span', { textContent: key }))), { className: 'menu' })

// The one floating toolbar. Pages keep only the theme and Claude.
const renderHud = () => {
  const isBoard = state.view.kind === 'board' && state.frames.length > 0
  document.body.classList.toggle('on-board', isBoard)
  if (!isBoard) return
  const hasContexts = Object.keys(contextAxes()).length > 0
  $('context').hidden = !hasContexts
  $('context-label').textContent = Object.values(state.contexts).join(', ') || 'Context'
  $('level-label').textContent = `${Math.round(state.camera.z * 100)}%`
}

const renderPage = () => {
  const { kind, first, second, filter } = state.view
  $('page').dataset.kind = kind
  if (kind === 'gallery') galleryPage(first ?? 'all')
  else if (kind === 'component') componentPage(state.view.file)
  else if (kind === 'tokens' && first === 'scales') scalesPage(second)
  else if (kind === 'tokens') colorsPage(second)
  else if (kind === 'assets') assetsPage(first ?? 'all')
  else homePage(filter)
}

const renderChrome = () => {
  $('crumb-title').textContent = crumbTitle()
  $('export').hidden = state.view.kind !== 'board'
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
  const isSameBoard = kind === 'board' && previous.kind === 'board' && previous.file === first
  if (!isSameBoard) leaveRevision(false)
  if (kind !== 'board') setCanvasMode(false)
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
  const { project, projects } = state
  document.title = `${project.name} · Elyx`
  document.documentElement.style.setProperty('--canvas', project.canvas ?? 'var(--stage)')
  const canSwitch = projects.length > 1
  $('project').disabled = !canSwitch
  $('project').replaceChildren(el('span', { className: 'mark' }), el('span', { className: 'name', textContent: project.name }), canSwitch ? el('span', { className: 'faint' }, icon('chevron-down', 13)) : '')
  $('branch').hidden = !project.branch
  $('branch').textContent = project.branch ?? ''
}

const openProjects = () => popover($('project'), [
  el('div', { className: 'head', textContent: 'Projects in this repository' }),
  state.projects.map(item =>
    el('button', {
      className: `project-row ${item.isCurrent ? 'on' : ''}`,
      onclick: async () => {
        closePopover()
        await post('switch-project', { root: item.root }).catch(report)
      },
    }, el('div', {}, el('b', { textContent: item.name }), el('small', { textContent: item.path, title: item.path })), item.isCurrent ? icon('check', 14) : null)),
], { className: 'menu project-menu' })

const setTheme = theme => {
  document.documentElement.dataset.theme = theme
  stored.set('theme', theme)
}

const setRail = isOpen => {
  document.body.classList.toggle('rail-open', isOpen)
  keepRail(isOpen)
  renderRail()
  if (state.view.kind === 'board') paint()
}

// Canvas mode: the design and nothing else, full screen where the browser allows it.
const setCanvasMode = isOn => {
  if (isOn === document.body.classList.contains('canvas-mode')) return
  if (isOn && state.view.kind !== 'board') return
  document.body.classList.toggle('canvas-mode', isOn)
  closePopover()
  if (isOn) {
    document.documentElement.requestFullscreen?.().catch(() => {})
    toast(`Canvas mode. Press Esc or ${command}\\ to leave.`)
  } else if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  requestAnimationFrame(paint)
}
const toggleCanvasMode = () => setCanvasMode(!document.body.classList.contains('canvas-mode'))

const openExport = () => {
  const target = state.selection && trailOf(state.selection).at(-1)
  const source = target ? { name: target.name, target: target.target } : { file: state.view.file, name: shortName(state.view.file) }
  popover($('export'), [el('div', { className: 'section-head', textContent: target ? `Export ${target.name}` : `Export ${shortName(state.view.file)}` }), exportControls(source)], { className: 'export-popover' })
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
  $('go-home').append(icon('house', 16))
  $('go-back').append(icon('chevron-left', 16))
  $('go-forward').append(icon('chevron-right', 16))
  $('toggle-rail').append(icon('columns', 16))
  $('shared').append(icon('link', 16))
  $('share').prepend(icon('share', 15))
  $('inspect').append(icon('pointer', 16))
  $('overlays').append(icon('eye', 16))
  $('theme').append(icon('moon', 16))
  $('context').append(icon('chevron-down', 12))
  $('zoom').append(icon('chevron-down', 12))
  $('canvas-mode').append(icon('maximize', 16))
  $('leave-canvas').append(icon('minimize', 16))
  $('ask').prepend(icon('sparkles', 14))

  $('find').prepend(icon('search', 14))
  $('find').onclick = openSearch
  $('project').onclick = openProjects
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
  $('context').onclick = () => openContexts($('context'))
  $('zoom').onclick = () => openZoom($('zoom'))
  $('canvas-mode').onclick = () => setCanvasMode(true)
  $('leave-canvas').onclick = () => setCanvasMode(false)
  $('ask').onclick = () => {
    setRail(true)
    openClaude()
  }
  $('export').onclick = openExport
  $('share').onclick = shareBoard
}

// Zoom keys work with or without ⌘, as in other design tools: + and − step, 0 is
// 100%, ⇧1 fits everything and ⇧2 the selection.
const zoomFor = event => {
  const isCommand = event.metaKey || event.ctrlKey
  if (event.key === '+' || event.key === '=') return () => zoomCenter(1.4)
  if (event.key === '-' || event.key === '_') return () => zoomCenter(1 / 1.4)
  if (event.code === 'Digit0' && (isCommand || event.shiftKey)) return () => zoomCenter(1 / state.camera.z)
  if (event.code === 'Digit1' && event.shiftKey) return () => fit(bounds())
  if (event.code === 'Digit2' && event.shiftKey) return zoomToSelection
  if (!isCommand && !event.shiftKey && (event.key === '0' || event.key === 's')) return () => fit(bounds())
  return null
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
  if (isCommand && event.key === '\\') {
    event.preventDefault()
    return toggleCanvasMode()
  }
  if (state.view.kind !== 'board' || event.altKey) return
  const zoom = zoomFor(event)
  if (zoom) {
    event.preventDefault()
    return zoom()
  }
  if (isCommand) return
  if (event.key === 'Escape') {
    if (state.selection) return select(state.selection.path.length ? { frame: state.selection.frame, path: state.selection.path.slice(0, -1) } : null)
    if (state.rev) return leaveRevision()
    return setCanvasMode(false)
  }
  if (event.key === 'c' && !$('context').hidden) openContexts($('context'))
})

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) setCanvasMode(false)
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
  ;[state.project, state.projects] = await Promise.all([get('project'), get('projects')])
  applyProject()
  if (!location.hash) history.replaceState(null, '', `#board:${state.project.opened}`)
  await route()
  state.revision = state.project.stamp
  new EventSource('events').onmessage = event => {
    if (event.data === 'switched') {
      history.replaceState(null, '', location.pathname)
      return location.reload()
    }
    if (event.data === state.revision) return
    state.revision = event.data
    refresh()
  }
} catch (cause) {
  report(cause)
}

// The canvas: pan, zoom, click and drag. A cheap image of the whole board sits underneath,
// and the engine redraws whatever is in view at the exact zoom once you stop moving, so
// it stays sharp however far you go in.
import { placeQuick, renderQuick } from './pickers.js'
import { renderRail } from './rail.js'
import { $, clamp, el, get, local, post, query, renderUrl, report, saved, state, viewUrl, withContext } from './lib.js'

const MAX_ZOOM = 64
const REFINE_DELAY = 80
const board = $('board')
const camera = state.camera

export const bounds = () => {
  const left = Math.min(...state.frames.map(frame => frame.x))
  const top = Math.min(...state.frames.map(frame => frame.y))
  return { x: left, y: top, w: Math.max(...state.frames.map(frame => frame.x + frame.w)) - left, h: Math.max(...state.frames.map(frame => frame.y + frame.h)) - top }
}

export const trailOf = ({ frame, path }) => {
  const trail = [frame.layers]
  for (const index of path) {
    const next = trail.at(-1)?.children?.[index]
    if (!next) break
    trail.push(next)
  }
  return trail
}

// The layer an edit writes to: this screen's, or its component's.
export const editLayer = () => (state.scope === 'everywhere' && state.componentLayer) || trailOf(state.selection).at(-1)

const rectOf = ({ frame, trail }) => {
  const rect = { x: frame.x, y: frame.y, w: trail.at(-1).resolvedSize?.width ?? 0, h: trail.at(-1).resolvedSize?.height ?? 0 }
  for (const layer of trail.slice(1)) {
    rect.x += layer.position?.x ?? 0
    rect.y += layer.position?.y ?? 0
  }
  return rect
}

const onScreen = ({ x, y, w, h }) => ({ x: x * camera.z + camera.x, y: y * camera.z + camera.y, w: w * camera.z, h: h * camera.z })

const drawBox = (box, target) => {
  box.hidden = !target
  if (!target) return null
  const rect = onScreen(rectOf(target))
  box.style.transform = `translate(${rect.x}px,${rect.y}px)`
  box.style.width = `${rect.w}px`
  box.style.height = `${rect.h}px`
  box.querySelector('span')?.replaceChildren(target.trail.at(-1).name)
  return rect
}

let refineTimer

export const paint = () => {
  $('world').style.transform = `translate(${camera.x}px,${camera.y}px) scale(${camera.z})`
  for (const frame of state.frames) {
    frame.title.style.transform = `translate(${frame.x * camera.z + camera.x - 3}px,${frame.y * camera.z + camera.y - 21}px)`
    frame.title.style.maxWidth = `${Math.max(frame.w * camera.z, 60)}px`
  }
  $('level-label')?.replaceChildren(`${Math.round(camera.z * 100)}%`)
  drawBox($('hovered'), state.hover)
  const selected = state.selection && { frame: state.selection.frame, trail: trailOf(state.selection) }
  placeQuick(drawBox($('selected'), selected))
  clearTimeout(refineTimer)
  refineTimer = setTimeout(refine, REFINE_DELAY)
}

// Wheel and pointer events outrun the screen, so at most one paint happens per frame.
let paintQueued = false
const queuePaint = () => {
  if (paintQueued) return
  paintQueued = true
  requestAnimationFrame(() => {
    paintQueued = false
    paint()
  })
}

export const fit = ({ x, y, w, h }, most = 4) => {
  const { width, height } = board.getBoundingClientRect()
  camera.z = Math.min(most, (width - 96) / w, (height - 120) / h)
  camera.x = (width - w * camera.z) / 2 - x * camera.z
  camera.y = (height - h * camera.z) / 2 - y * camera.z
  paint()
}

const zoomBy = (factor, x, y) => {
  const z = clamp(camera.z * factor, 0.02, MAX_ZOOM)
  camera.x = x - ((x - camera.x) * z) / camera.z
  camera.y = y - ((y - camera.y) * z) / camera.z
  camera.z = z
}

export const zoomCenter = factor => {
  const { width, height } = board.getBoundingClientRect()
  zoomBy(factor, width / 2, height / 2)
  paint()
}

// Sharp detail

const detailKey = frame => `${state.project.versions[frame.source.file]}|${Object.values(state.contexts)}`

// Steps of a half power of two, so nearby zooms share a render.
const quantize = density => Math.round(2 ** (Math.ceil(Math.log2(density) * 2) / 2) * 1000) / 1000

// The part of a frame in view, in the frame's own coordinates.
const visibleArea = (frame, margin) => {
  const { width, height } = board.getBoundingClientRect()
  const viewWidth = width / camera.z
  const viewHeight = height / camera.z
  const left = clamp(-camera.x / camera.z - viewWidth * margin - frame.x, 0, frame.w)
  const top = clamp(-camera.y / camera.z - viewHeight * margin - frame.y, 0, frame.h)
  const right = clamp(-camera.x / camera.z + viewWidth * (1 + margin) - frame.x, 0, frame.w)
  const bottom = clamp(-camera.y / camera.z + viewHeight * (1 + margin) - frame.y, 0, frame.h)
  return { x: left, y: top, w: right - left, h: bottom - top }
}

// Rounds outward to a grid, so small pans ask for the same region.
const onGrid = area => {
  const grid = 64 / camera.z
  const x = Math.floor(area.x / grid) * grid
  const y = Math.floor(area.y / grid) * grid
  const round = value => Math.round(value * 100) / 100
  return { x: round(x), y: round(y), w: round(Math.ceil((area.x + area.w - x) / grid) * grid), h: round(Math.ceil((area.y + area.h - y) / grid) * grid) }
}

const covers = (detail, area, scale, key) =>
  detail && detail.key === key && detail.scale >= scale && detail.area.x <= area.x + 1 && detail.area.y <= area.y + 1 &&
  detail.area.x + detail.area.w >= area.x + area.w - 1 && detail.area.y + detail.area.h >= area.y + area.h - 1

const placeDetail = frame => {
  const { image, area } = frame.detail
  Object.assign(image.style, { left: `${frame.x + area.x}px`, top: `${frame.y + area.y}px`, width: `${area.w}px`, height: `${area.h}px` })
}

const dropDetail = frame => {
  frame.detail?.image.remove()
  frame.detail = null
  frame.pending = null
}

// Past 100% the blurred base only shows as a halo around frames, so once everything in
// view is sharp it steps aside.
const updateBase = () => {
  const density = camera.z * devicePixelRatio
  const { width, height } = board.getBoundingClientRect()
  const inView = state.frames.filter(frame => {
    const { x, y, w, h } = onScreen(frame)
    return x < width && y < height && x + w > 0 && y + h > 0
  })
  const isSharp = inView.every(frame => covers(frame.detail, visibleArea(frame, 0), quantize(density), detailKey(frame)))
  $('base').style.opacity = density > 2 && density > state.baseScale * 1.5 && isSharp ? 0 : 1
}

const draw = (frame, area, scale, key) => {
  const url = frame.canCrop ? viewUrl(frame, area, scale) : renderUrl(frame.source.file, frame.source.ref, Math.min(scale, 8))
  if (frame.pending === url) return
  frame.pending = url
  const image = el('img', { alt: '', decoding: 'async' })
  image.onload = () => {
    if (frame.pending !== url || !state.frames.includes(frame)) return
    frame.pending = null
    frame.detail?.image.remove()
    frame.detail = { image, area, scale, key }
    placeDetail(frame)
    $('sharp').append(image)
    updateBase()
  }
  image.onerror = () => {
    if (frame.pending === url) frame.pending = null
  }
  image.src = url
}

export const refine = () => {
  clearTimeout(refineTimer)
  if (board.hidden || drag?.mode === 'move') return
  const density = camera.z * devicePixelRatio
  const { width, height } = board.getBoundingClientRect()
  for (const frame of state.frames) {
    const { x, y, w, h } = onScreen(frame)
    if (x > width || y > height || x + w < 0 || y + h < 0) continue
    treeOf(frame)
    if (density <= state.baseScale) {
      dropDetail(frame)
      continue
    }
    const scale = quantize(density)
    const key = detailKey(frame)
    if (covers(frame.detail, visibleArea(frame, 0), scale, key)) continue
    const wanted = visibleArea(frame, 0.2)
    const snapped = onGrid(wanted)
    const area = {
      x: snapped.x,
      y: snapped.y,
      w: Math.min(snapped.w, frame.w - snapped.x),
      h: Math.min(snapped.h, frame.h - snapped.y),
    }
    draw(frame, frame.canCrop ? area : { x: 0, y: 0, w: frame.w, h: frame.h }, scale, key)
  }
  updateBase()
}

export const treeOf = frame => (frame.tree ??= get(`layers?${withContext(frame.source)}`).then(tree => (frame.layers = tree), report))

const toWorld = ({ x, y }) => ({ x: (x - camera.x) / camera.z, y: (y - camera.y) / camera.z })
const point = event => {
  const { left, top } = board.getBoundingClientRect()
  return { x: event.clientX - left, y: event.clientY - top }
}
const frameAt = ({ x, y }) => state.frames.findLast(frame => x >= frame.x && y >= frame.y && x < frame.x + frame.w && y < frame.y + frame.h)

// The deepest visible layer at a board point. Children only count inside their
// parent, because frames clip.
const pick = (frame, { x, y }) => {
  if (!frame.layers) return null
  const trail = [frame.layers]
  const path = []
  let left = frame.x
  let top = frame.y
  for (;;) {
    const children = trail.at(-1).children ?? []
    const index = children.findLastIndex(layer => {
      const size = layer.resolvedSize
      const lx = left + (layer.position?.x ?? 0)
      const ly = top + (layer.position?.y ?? 0)
      return !layer.hidden && size?.width && x >= lx && y >= ly && x < lx + size.width && y < ly + size.height
    })
    if (index < 0) return { frame, trail, path }
    left += children[index].position?.x ?? 0
    top += children[index].position?.y ?? 0
    trail.push(children[index])
    path.push(index)
  }
}

// "Everywhere" edits the nearest component the layer belongs to. Its tree is walked
// by name, because an instance can hold children its source does not have.
const findComponentLayer = async trail => {
  for (let index = trail.length - 1; index >= 0; index--) {
    const base = trail[index].instanceOf
    if (!base) continue
    const source = base.variant ?? base
    let layer = await get(`layers?${query({ file: local(source.file), ref: source.symbol })}`).catch(() => null)
    for (const step of trail.slice(index + 1)) layer = layer?.children?.find(child => child.name === step.name)
    if (layer) return layer
  }
  return null
}

export const select = target => {
  state.selection = target && { frame: target.frame, path: target.path }
  state.scope = 'here'
  state.componentLayer = null
  renderRail()
  renderQuick()
  paint()
  if (!target) return
  const chosen = state.selection
  findComponentLayer(trailOf(chosen)).then(layer => {
    if (state.selection !== chosen) return
    const own = trailOf(chosen).at(-1)
    state.componentLayer = layer?.target.filePath === own.target.filePath ? null : layer
    renderRail()
  }, report)
}

const titleFor = (frame, next) =>
  el('button', {
    className: 'frame-title',
    title: frame.name,
    onpointerdown: event => {
      event.stopPropagation()
      startDrag(event, next, true)
    },
    // Pointers are handled above. This is for the keyboard.
    onclick: async event => {
      if (event.detail) return
      await treeOf(next)
      select({ frame: next, path: [] })
    },
  }, el('span', { textContent: frame.name }), el('i'), el('i'))

// Each frame's outline, so the board has its shape before any image arrives.
const drawSlots = () => {
  $('slots').replaceChildren(...state.frames.map(({ x, y, w, h }) => {
    const slot = el('div')
    Object.assign(slot.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` })
    return slot
  }))
}

const showBase = (url, size) => {
  const base = $('base')
  Object.assign(base.style, { width: `${size.w}px`, height: `${size.h}px` })
  base.src = url
  $('lift').replaceChildren()
}

// Raw board positions run from any origin. The world starts at the top-left frame, which
// is also where the render starts, so the two line up.
export const loadBoard = async () => {
  const stage = $('stage')
  const file = state.view.file
  const isSameBoard = state.boardFile === file
  stage.classList.add('busy')
  try {
    const { frames: loaded, baseScale } = await get(`board?${query({ file })}`)
    if (state.view.file !== file) return
    const previous = isSameBoard ? state.frames : []
    if (!isSameBoard) {
      $('sharp').replaceChildren()
      $('lift').replaceChildren()
      $('base').removeAttribute('src')
      state.frames = []
    }
    const origin = { x: Math.min(...loaded.map(frame => frame.x)), y: Math.min(...loaded.map(frame => frame.y)) }
    state.baseScale = baseScale
    const url = renderUrl(file, null, baseScale)
    const rendered = new Promise(resolve => {
      const next = new Image()
      next.onload = next.onerror = resolve
      next.src = url
    })
    // A change on this board swaps in together with its render, so nothing jumps.
    if (isSameBoard) await rendered
    if (state.view.file !== file) return

    const shift = isSameBoard ? { x: origin.x - state.origin.x, y: origin.y - state.origin.y } : { x: 0, y: 0 }
    state.origin = origin
    state.boardFile = file
    state.frames = loaded.map(frame => {
      const old = previous.find(item => item.name === frame.name)
      const made = { ...frame, x: frame.x - origin.x, y: frame.y - origin.y, detail: old?.detail ?? null, pending: null }
      made.title = titleFor(frame, made)
      return made
    })
    for (const { detail, name } of previous) if (detail && !loaded.some(frame => frame.name === name)) detail.image.remove()
    $('titles').replaceChildren(...state.frames.map(frame => frame.title))
    drawSlots()
    camera.x += shift.x * camera.z
    camera.y += shift.y * camera.z
    for (const frame of state.frames) if (frame.detail) placeDetail(frame)
    if (!state.frames.length) return
    const size = bounds()
    if (isSameBoard) showBase(url, size)
    else rendered.then(() => state.view.file === file && showBase(url, size))
  } catch (cause) {
    report(cause)
  } finally {
    stage.classList.remove('busy')
  }
}

export const focusOn = async (focus, path) => {
  const frame = state.frames.find(item => item.name === focus)
  fit(frame ?? bounds(), frame ? 2 : 1)
  refine()
  if (!frame || !path) return
  await treeOf(frame)
  select({ frame, path })
}

// Input

let drag = null
let isSpaceDown = false

// Lifts a frame off the base image, which holds every frame in one picture: a hole where
// it was, and a cut-out of it that follows the pointer.
const lift = frame => {
  const base = $('base')
  const box = { left: `${frame.x}px`, top: `${frame.y}px`, width: `${frame.w}px`, height: `${frame.h}px` }
  const hole = el('div', { className: 'hole' })
  const ghost = el('div', { className: 'ghost' })
  Object.assign(hole.style, box)
  Object.assign(ghost.style, box, {
    backgroundImage: `url("${base.src}")`,
    backgroundSize: `${base.style.width} ${base.style.height}`,
    backgroundPosition: `${-frame.x}px ${-frame.y}px`,
  })
  $('lift').append(hole, ghost)
  return ghost
}

const canMove = frame => frame && state.frames.length > 1 && state.inspecting && !isSpaceDown

const startDrag = (event, frame, isTitle) => {
  if (event.button) return
  drag = { x: event.clientX, y: event.clientY, moved: false, mode: canMove(frame) ? 'move' : 'pan', frame, isTitle }
  board.setPointerCapture(event.pointerId)
}

const moveFrame = (frame, dx, dy) => {
  frame.x += dx / camera.z
  frame.y += dy / camera.z
  drag.ghost.style.left = `${frame.x}px`
  drag.ghost.style.top = `${frame.y}px`
  if (frame.detail) placeDetail(frame)
}

const saveMove = async frame => {
  const { file } = state.view
  try {
    const result = await post('move', { file, name: frame.name, x: frame.x + state.origin.x, y: frame.y + state.origin.y })
    saved(result.file)
  } catch (cause) {
    report(cause)
    await loadBoard()
    paint()
  }
}

board.addEventListener('wheel', event => {
  event.preventDefault()
  const { x, y } = point(event)
  if (event.ctrlKey || event.metaKey) zoomBy(Math.exp(-event.deltaY * 0.01), x, y)
  else {
    camera.x -= event.deltaX
    camera.y -= event.deltaY
  }
  queuePaint()
}, { passive: false })

board.addEventListener('pointerdown', event => {
  if (event.target.closest('#quick')) return
  startDrag(event, frameAt(toWorld(point(event))), false)
})

board.addEventListener('pointermove', event => {
  if (drag) {
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.moved && Math.hypot(dx, dy) < 4) return
    if (!drag.moved) {
      board.classList.add(drag.mode === 'move' ? 'moving' : 'panning')
      if (drag.mode === 'move') {
        state.hover = null
        drag.ghost = lift(drag.frame)
      }
    }
    drag = { ...drag, x: event.clientX, y: event.clientY, moved: true }
    if (drag.mode === 'move') moveFrame(drag.frame, dx, dy)
    else {
      camera.x += dx
      camera.y += dy
    }
    return queuePaint()
  }
  if (!state.inspecting || isSpaceDown || event.target.closest('#quick')) return
  const at = toWorld(point(event))
  const frame = frameAt(at)
  if (frame) treeOf(frame)
  state.hover = frame ? pick(frame, at) : null
  drawBox($('hovered'), state.hover)
})

board.addEventListener('pointerup', async event => {
  const finished = drag
  drag = null
  board.classList.remove('panning', 'moving')
  if (!finished) return
  if (finished.moved) {
    if (finished.mode === 'move') await saveMove(finished.frame)
    return refine()
  }
  if (!state.inspecting) return
  if (finished.isTitle) {
    await treeOf(finished.frame)
    return select({ frame: finished.frame, path: [] })
  }
  const at = toWorld(point(event))
  const frame = frameAt(at)
  if (!frame) return select(null)
  await treeOf(frame)
  if (state.frames.includes(frame)) select(pick(frame, at))
})

board.addEventListener('pointerleave', () => {
  state.hover = null
  drawBox($('hovered'), null)
})

board.addEventListener('dblclick', event => {
  if (event.target.closest('#quick')) return
  const frame = frameAt(toWorld(point(event)))
  if (frame) fit(frame, 8)
})

const setSpace = isDown => {
  isSpaceDown = isDown
  board.classList.toggle('space', isDown)
}
addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.target.matches?.('input, textarea, button')) return
  event.preventDefault()
  setSpace(true)
})
addEventListener('keyup', event => event.code === 'Space' && setSpace(false))
addEventListener('blur', () => setSpace(false))

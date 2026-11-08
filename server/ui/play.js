// Play: the board as a prototype. One screen at a time, at the size it fits; layers with
// a link are clickable, and moving on animates the way the link's `meta` asks, with the
// project's motion tokens: smart animate, push, slide in, dissolve or instant.
import { treeOf } from './board.js'
import { closePopover, popover } from './pickers.js'
import { $, el, get, icon, query, renderUrl, report, resolveMotion, state, TRANSITIONS } from './lib.js'

const BARS = 52 + 64
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)')

export const loadLinks = async () => {
  const file = state.view.file
  const links = await get(`prototype?${query({ file })}`).catch(() => [])
  if (state.view.file === file) state.links = links
  return links
}

// The layer a link starts from: its names in order, each found at any depth below the
// last, because a source block can sit in a different place from the layer it draws.
const below = (node, name) => {
  const queue = (node.children ?? []).map((child, index) => [child, [index]])
  while (queue.length) {
    const [layer, path] = queue.shift()
    if (layer.name === name) return path
    queue.push(...(layer.children ?? []).map((child, index) => [child, [...path, index]]))
  }
  return null
}

export const trailFor = (frame, names) => {
  if (!frame.layers) return null
  const trail = [frame.layers]
  for (const name of names) {
    const path = below(trail.at(-1), name)
    if (!path) return null
    for (const index of path) trail.push(trail.at(-1).children[index])
  }
  return trail
}

const rectOf = trail => {
  const rect = { x: 0, y: 0, w: trail.at(-1).resolvedSize?.width ?? 0, h: trail.at(-1).resolvedSize?.height ?? 0 }
  for (const layer of trail.slice(1)) {
    rect.x += layer.position?.x ?? 0
    rect.y += layer.position?.y ?? 0
  }
  return rect
}

// Smart animate pairs layers by name, level by level. A pair that moved or resized
// animates as a piece; one that stayed put lets its children be compared instead.
export const matchLayers = (a, b, offA = { x: 0, y: 0 }, offB = { x: 0, y: 0 }, pairs = []) => {
  const used = new Set()
  for (const childA of a.children ?? []) {
    if (childA.hidden) continue
    const index = (b.children ?? []).findIndex((child, at) => !used.has(at) && !child.hidden && child.name === childA.name)
    if (index < 0) continue
    used.add(index)
    const childB = b.children[index]
    const ra = { x: offA.x + (childA.position?.x ?? 0), y: offA.y + (childA.position?.y ?? 0), w: childA.resolvedSize?.width ?? 0, h: childA.resolvedSize?.height ?? 0 }
    const rb = { x: offB.x + (childB.position?.x ?? 0), y: offB.y + (childB.position?.y ?? 0), w: childB.resolvedSize?.width ?? 0, h: childB.resolvedSize?.height ?? 0 }
    if (!ra.w || !ra.h || !rb.w || !rb.h) continue
    const moved = ['x', 'y', 'w', 'h'].some(key => Math.abs(ra[key] - rb[key]) > 0.5)
    if (moved) pairs.push([ra, rb])
    else matchLayers(childA, childB, ra, rb, pairs)
  }
  return pairs
}

let play = null

const frameNamed = name => state.frames.find(frame => frame.name === name)
const linksFrom = frame => state.links.filter(link => link.from === frame.name)
const layerLinks = frame => linksFrom(frame).filter(link => link.path.length && trailFor(frame, link.path))
const screenLinks = frame => linksFrom(frame).filter(link => !link.path.length || !trailFor(frame, link.path))

const fitScale = frame => {
  const stage = $('play').querySelector('.play-stage')
  const width = stage?.clientWidth || innerWidth
  const height = stage?.clientHeight || innerHeight - BARS
  return Math.min(2, (width - 64) / frame.w, (height - 48) / frame.h)
}

const imageUrl = (frame, scale) => renderUrl(frame.source.file, frame.source.ref, Math.min(4, Math.max(0.5, Math.ceil(scale * devicePixelRatio * 2) / 2)))

const follow = link => go(frameNamed(link.to), link, 1)

const hint = () => {
  const screen = play.view
  screen.classList.remove('hint')
  void screen.offsetWidth
  screen.classList.add('hint')
}

const screenView = (frame, scale) => {
  const view = el('div', { className: 'play-screen', onclick: hint })
  Object.assign(view.style, { width: `${frame.w * scale}px`, height: `${frame.h * scale}px` })
  const image = el('img', { alt: frame.name, draggable: false, src: imageUrl(frame, scale) })
  const spots = layerLinks(frame).map(link => {
    const rect = rectOf(trailFor(frame, link.path))
    const spot = el('button', {
      className: 'hotspot',
      title: link.label || `Go to ${link.to}`,
      ariaLabel: link.label || `Go to ${link.to}`,
      onclick: event => {
        event.stopPropagation()
        follow(link)
      },
    })
    Object.assign(spot.style, { left: `${rect.x * scale}px`, top: `${rect.y * scale}px`, width: `${rect.w * scale}px`, height: `${rect.h * scale}px` })
    return spot
  })
  view.append(image, ...spots)
  return { view, image, frame, scale }
}

const motionFor = link => {
  const motion = resolveMotion(link?.meta)
  if (play.override) motion.transition = play.override
  if (REDUCED.matches) return { ...motion, transition: motion.transition === 'instant' ? 'instant' : 'dissolve', duration: Math.min(motion.duration, 150) }
  return motion
}

const run = (element, keyframes, motion) => element.animate(keyframes, { duration: motion.duration, easing: motion.easing, fill: 'both' }).finished

const smart = (from, to, motion) => {
  const pairs = matchLayers(from.frame.layers ?? {}, to.frame.layers ?? {})
  const fades = [run(to.view, [{ opacity: 0 }, { opacity: 1 }], motion), run(from.view, [{ opacity: 1 }, { opacity: 0 }], motion)]
  if (!pairs.length) return fades
  const stage = to.view.parentElement
  const morph = el('div', { className: 'play-morph' })
  stage.append(morph)
  const box = stage.getBoundingClientRect()
  const a = from.view.getBoundingClientRect()
  const b = to.view.getBoundingClientRect()
  const pieces = pairs.map(([ra, rb]) => {
    const piece = el('div')
    const left = b.left - box.left + rb.x * to.scale
    const top = b.top - box.top + rb.y * to.scale
    Object.assign(piece.style, {
      left: `${left}px`, top: `${top}px`, width: `${rb.w * to.scale}px`, height: `${rb.h * to.scale}px`,
      backgroundImage: `url("${to.image.src}")`,
      backgroundSize: `${to.frame.w * to.scale}px ${to.frame.h * to.scale}px`,
      backgroundPosition: `${-rb.x * to.scale}px ${-rb.y * to.scale}px`,
    })
    morph.append(piece)
    const dx = a.left - box.left + ra.x * from.scale - left
    const dy = a.top - box.top + ra.y * from.scale - top
    const sx = (ra.w * from.scale) / (rb.w * to.scale)
    const sy = (ra.h * from.scale) / (rb.h * to.scale)
    return run(piece, [{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transform: 'none' }], motion)
  })
  return [...fades, Promise.all(pieces).finally(() => morph.remove())]
}

const animate = (from, to, motion, direction) => {
  const width = to.view.parentElement.clientWidth
  const slideIn = [{ transform: `translateX(${direction * width}px)` }, { transform: 'none' }]
  if (motion.transition === 'instant' || !motion.duration) return []
  if (motion.transition === 'dissolve') return [run(to.view, [{ opacity: 0 }, { opacity: 1 }], motion)]
  if (motion.transition === 'slide') return [run(to.view, slideIn, motion)]
  if (motion.transition === 'push') return [run(to.view, slideIn, motion), run(from.view, [{ transform: 'none' }, { transform: `translateX(${-direction * width}px)` }], motion)]
  return smart(from, to, motion)
}

const go = async (frame, link, direction) => {
  if (!frame || play.busy) return
  play.busy = true
  try {
    await treeOf(frame)
    if (!play) return
    const next = screenView(frame, fitScale(frame))
    await next.image.decode().catch(() => {})
    if (!play) return
    const from = play.current
    const stage = $('play').querySelector('.play-stage')
    stage.append(next.view)
    if (from) await Promise.all(animate(from, next, motionFor(link), direction)).catch(() => {})
    from?.view.remove()
    next.view.getAnimations().forEach(animation => animation.cancel())
    play.current = next
    play.view = next.view
    if (direction > 0 && from) play.stack.push({ frame: from.frame, link })
    renderBars()
  } catch (cause) {
    report(cause)
  } finally {
    if (play) play.busy = false
  }
}

const back = () => {
  const last = play.stack.pop()
  if (last) go(last.frame, last.link, -1).then(() => renderBars())
}

// Frames in reading order, for stepping through a board with no links.
const ordered = () => state.frames.toSorted((a, b) => (Math.abs(a.y - b.y) > Math.min(a.h, b.h) / 2 ? a.y - b.y : a.x - b.x))

const next = () => {
  const frame = play.current.frame
  const link = linksFrom(frame)[0]
  if (link) return follow(link)
  const frames = ordered()
  const after = frames[frames.indexOf(frame) + 1]
  if (after) go(after, null, 1)
}

const openTransitions = anchor => popover(anchor, [
  el('div', { className: 'head', textContent: 'Transition' }),
  [[null, 'As designed'], ...TRANSITIONS].map(([id, label]) => el('button', {
    className: play.override === id ? 'on' : '',
    onclick: () => {
      play.override = id
      closePopover()
      renderBars()
    },
  }, label, play.override === id ? icon('check', 14) : null)),
], { className: 'menu' })

const renderBars = () => {
  if (!play) return
  const { frame } = play.current
  const links = screenLinks(frame)
  const spots = layerLinks(frame).length
  const label = play.override ? TRANSITIONS.find(([id]) => id === play.override)[1] : 'As designed'
  const transitions = el('button', { className: 'button play-transitions', onclick: () => openTransitions(transitions) }, label, icon('chevron-down', 12))
  $('play').querySelector('.play-bar').replaceChildren(
    el('span', { className: 'play-mark' }, icon('play', 13)),
    el('span', { className: 'title', textContent: frame.name }),
    el('span', { className: 'where', textContent: spots ? `${spots} link${spots === 1 ? '' : 's'} to click` : linksFrom(frame).length ? '' : 'No links here: → steps through the board' }),
    el('span', { className: 'grow' }),
    transitions,
    el('button', { className: 'icon-button', ariaLabel: 'Close play', title: 'Close (Esc)', onclick: closePlay }, icon('x', 16)),
  )
  $('play').querySelector('.play-foot').replaceChildren(...[
    play.stack.length && !links.some(link => link.to === play.stack.at(-1).frame.name) ? el('button', { className: 'play-link quiet', onclick: back }, icon('chevron-left', 14), 'Back') : null,
    ...links.map(link => el('button', { className: 'play-link', onclick: () => follow(link) }, link.label || link.to, icon('arrow-right', 14))),
  ].filter(Boolean))
}

const onKey = event => {
  if (!play) return
  if (event.key === 'Escape') return closePlay()
  if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
    event.preventDefault()
    return back()
  }
  if (event.key === 'ArrowRight' || event.key === ' ') {
    event.preventDefault()
    next()
  }
}

const onResize = () => {
  if (!play?.current || play.busy) return
  const fresh = screenView(play.current.frame, fitScale(play.current.frame))
  play.current.view.replaceWith(fresh.view)
  play.current = fresh
  play.view = fresh.view
}

// Starts at the frame you picked, else where the flow begins: a screen with links out
// and none in, else the first screen.
export const openPlay = async (start = state.selection?.frame?.name) => {
  if (play || !state.frames.length) return
  await loadLinks()
  const targets = new Set(state.links.map(link => link.to))
  const first = frameNamed(start) ?? state.frames.find(frame => linksFrom(frame).length && !targets.has(frame.name)) ?? ordered()[0]
  play = { stack: [], override: null, current: null, busy: false }
  state.playing = true
  const root = $('play')
  root.replaceChildren(el('div', { className: 'play-bar' }), el('div', { className: 'play-stage' }), el('div', { className: 'play-foot' }))
  root.hidden = false
  addEventListener('keydown', onKey)
  addEventListener('resize', onResize)
  await go(first, null, 0)
}

export const closePlay = () => {
  if (!play) return
  play = null
  state.playing = false
  closePopover()
  $('play').hidden = true
  $('play').replaceChildren()
  removeEventListener('keydown', onKey)
  removeEventListener('resize', onResize)
}

// Writes an `elyx tree` as real SVG, because the CLI only exports PNG. Shapes, gradients,
// borders, shadows and icons carry over exactly. Text stays live <text>, so it needs the
// font installed, and the tree does not say where lines wrapped, so wraps are estimated.

const WEIGHTS = { thin: 100, extralight: 200, light: 300, regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 }

// Inter's vertical metrics, as fractions of the font size.
const ASCENT = 0.96875
const DESCENT = 0.2412
const NORMAL_LINE = ASCENT + DESCENT

const escape = text => String(text).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char])
const unwrap = value => value?.value ?? value
const round = number => Math.round(number * 1000) / 1000

const paint = value => {
  const match = String(unwrap(value)).match(/rgba?\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[/,]\s*([\d.]+))?\)/)
  if (!match) return { color: String(unwrap(value)), alpha: 1 }
  const [red, green, blue] = match.slice(1, 4).map(part => Math.round(Number(part)).toString(16).padStart(2, '0'))
  return { color: `#${red}${green}${blue}`, alpha: match[4] === undefined ? 1 : Number(match[4]) }
}

const opacityAttribute = (name, value) => (value < 1 ? ` ${name}="${round(value)}"` : '')

const radiusOf = ({ style }, width, height) => {
  const radius = unwrap(style?.cornerRadius)
  const limit = Math.min(width, height) / 2
  if (Array.isArray(radius)) return radius.map(corner => Math.min(Number(unwrap(corner)) || 0, limit))
  return Math.min(Number(radius) || 0, limit)
}

// A rounded rectangle, with one radius or one per corner.
const outline = (x, y, width, height, radius) => {
  if (!Array.isArray(radius)) return `<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}"${radius ? ` rx="${round(radius)}"` : ''}`
  const [a, b, c, d] = radius
  const right = x + width
  const bottom = y + height
  return `<path d="M${round(x + a)} ${round(y)}H${round(right - b)}A${b} ${b} 0 0 1 ${round(right)} ${round(y + b)}V${round(bottom - c)}A${c} ${c} 0 0 1 ${round(right - c)} ${round(bottom)}H${round(x + d)}A${d} ${d} 0 0 1 ${round(x)} ${round(bottom - d)}V${round(y + a)}A${a} ${a} 0 0 1 ${round(x + a)} ${round(y)}Z"`
}

// Estimates line breaks, as the widest character width that gives the line count the
// layer's height says it has.
export const wrapText = (content, width, size, count) => {
  const paragraphs = content.split('\n')
  if (count <= paragraphs.length) return paragraphs
  const wrapAt = limit => paragraphs.flatMap(paragraph => {
    const lines = ['']
    for (const word of paragraph.split(' ')) {
      const joined = lines.at(-1) ? `${lines.at(-1)} ${word}` : word
      if (joined.length > limit && lines.at(-1)) lines.push(word)
      else lines[lines.length - 1] = joined
    }
    return lines
  })
  for (let factor = 0.42; factor <= 0.7; factor += 0.01) {
    const lines = wrapAt(width / (size * factor))
    if (lines.length === count) return lines
  }
  return wrapAt(width / (size * 0.53))
}

const textOf = layer => {
  const { text, style, resolvedSize } = layer
  const size = Number(unwrap(text.font?.size)) || 14
  const fill = style?.fills?.find(candidate => candidate.visible !== false && candidate.color)
  const { color, alpha } = paint(fill?.color ?? '#000000')
  const line = (Number(unwrap(text.font?.lineHeight)) || NORMAL_LINE) * size
  const lines = wrapText(text.content, resolvedSize.width, size, Math.max(1, Math.round(resolvedSize.height / line)))
  const block = line * lines.length
  const shift = { center: (resolvedSize.height - block) / 2, bottom: resolvedSize.height - block }[text.verticalAlign] ?? 0
  const baseline = shift + (line - (ASCENT + DESCENT) * size) / 2 + ASCENT * size
  const [anchor, x] = { center: ['middle', resolvedSize.width / 2], right: ['end', resolvedSize.width] }[text.align] ?? ['start', 0]
  const face = String(text.font?.style ?? 'Regular')
  const weight = WEIGHTS[face.toLowerCase().replace(/\s*italic$/, '').replace(/[\s-]/g, '')] ?? 400
  const tracking = Number.parseFloat(unwrap(text.font?.letterSpacing))
  const spacing = String(unwrap(text.font?.letterSpacing)).endsWith('%') ? (tracking / 100) * size : tracking
  const decoration = [text.underline && 'underline', text.strikethrough && 'line-through'].filter(Boolean).join(' ')
  const attributes = [
    `font-family="${escape(text.font?.family ?? 'Inter')}, sans-serif"`,
    `font-size="${round(size)}"`,
    `font-weight="${weight}"`,
    /italic/i.test(face) ? 'font-style="italic"' : '',
    spacing ? `letter-spacing="${round(spacing)}"` : '',
    decoration ? `text-decoration="${decoration}"` : '',
    anchor === 'start' ? '' : `text-anchor="${anchor}"`,
    `fill="${color}"`,
  ].filter(Boolean).join(' ')
  const rows = lines.map((row, index) => `<tspan x="${round(x)}" y="${round(baseline + index * line)}">${escape(row)}</tspan>`).join('')
  return `<text ${attributes}${opacityAttribute('fill-opacity', alpha)} xml:space="preserve">${rows}</text>`
}

const tinted = (markup, color) => markup.replace(/(fill|stroke)="(#000000|#000|black|currentColor)"/g, `$1="${color}"`)

export const treeToSvg = async (root, readAsset) => {
  const defs = []
  let ids = 0
  const nextId = prefix => `${prefix}${++ids}`

  const gradient = fill => {
    const id = nextId('g')
    const stops = fill.stops.map(({ color, position }) => {
      const stop = paint(color)
      return `<stop offset="${round(position)}" stop-color="${stop.color}"${opacityAttribute('stop-opacity', stop.alpha)}/>`
    }).join('')
    const { from, to } = fill
    defs.push(fill.gradient === 'radial'
      ? `<radialGradient id="${id}" cx="${round(from.x)}" cy="${round(from.y)}" r="${round(Math.hypot(to.x - from.x, to.y - from.y))}">${stops}</radialGradient>`
      : `<linearGradient id="${id}" x1="${round(from.x)}" y1="${round(from.y)}" x2="${round(to.x)}" y2="${round(to.y)}">${stops}</linearGradient>`)
    return `url(#${id})`
  }

  const shadow = shadows => {
    const drops = shadows.filter(item => item.visible !== false && item.type === 'drop')
    if (!drops.length) return ''
    const id = nextId('s')
    const parts = drops.map(item => {
      const { color, alpha } = paint(item.color)
      return `<feDropShadow dx="${round(item.offsetX)}" dy="${round(item.offsetY)}" stdDeviation="${round(item.blur / 2)}" flood-color="${color}" flood-opacity="${round(alpha)}"/>`
    })
    defs.push(`<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">${parts.join('')}</filter>`)
    return ` filter="url(#${id})"`
  }

  const imageFill = async (fill, width, height, radius) => {
    const image = await readAsset(fill.image?.ref ?? fill.ref ?? fill.image)
    if (!image?.data) return ''
    const clip = nextId('c')
    defs.push(`<clipPath id="${clip}">${outline(0, 0, width, height, radius)}/></clipPath>`)
    return `<image href="${image.data}" width="${round(width)}" height="${round(height)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>`
  }

  const surface = async layer => {
    const { width, height } = layer.resolvedSize
    const radius = radiusOf(layer, width, height)
    const parts = []
    let effect = shadow(layer.style?.shadows ?? [])
    for (const fill of layer.style?.fills ?? []) {
      if (fill.visible === false) continue
      if (fill.type === 'image') parts.push(await imageFill(fill, width, height, radius))
      else if (fill.stops) parts.push(`${outline(0, 0, width, height, radius)} fill="${gradient(fill)}"${opacityAttribute('fill-opacity', fill.opacity ?? 1)}${effect}/>`)
      else if (fill.color) {
        const { color, alpha } = paint(fill.color)
        parts.push(`${outline(0, 0, width, height, radius)} fill="${color}"${opacityAttribute('fill-opacity', alpha * (fill.opacity ?? 1))}${effect}/>`)
      }
      effect = ''
    }
    if (effect) parts.push(`${outline(0, 0, width, height, radius)} fill="#000" fill-opacity="0.001"${effect}/>`)
    for (const border of layer.style?.borders ?? []) {
      if (border.visible === false || !border.color) continue
      const strokeWidth = Number(unwrap(border.width)) || 1
      const inset = { outside: -strokeWidth / 2, center: 0 }[border.position] ?? strokeWidth / 2
      const { color, alpha } = paint(border.color)
      const inner = Array.isArray(radius) ? radius.map(corner => Math.max(0, corner - inset)) : Math.max(0, radius - inset)
      const dash = border.dash?.length ? ` stroke-dasharray="${border.dash.map(unwrap).join(' ')}"` : ''
      parts.push(`${outline(inset, inset, width - inset * 2, height - inset * 2, inner)} fill="none" stroke="${color}" stroke-width="${round(strokeWidth)}"${opacityAttribute('stroke-opacity', alpha * (border.opacity ?? 1))}${dash}/>`)
    }
    return parts.join('')
  }

  const assetOf = async layer => {
    const { width, height } = layer.resolvedSize
    const file = await readAsset(layer.asset.contents)
    if (!file) return ''
    if (file.data) return `<image href="${file.data}" width="${round(width)}" height="${round(height)}"/>`
    const tint = layer.style?.fills?.find(fill => fill.visible !== false && fill.color)
    const box = file.svg.match(/viewBox="([^"]+)"/)?.[1] ?? `0 0 ${width} ${height}`
    const inner = file.svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    const root = file.svg.match(/<svg([^>]*)>/)?.[1] ?? ''
    const inherited = [...root.matchAll(/\b(fill|stroke|stroke-width|stroke-linecap|stroke-linejoin)="[^"]*"/g)].map(match => match[0]).join(' ')
    const markup = `<svg width="${round(width)}" height="${round(height)}" viewBox="${box}" ${inherited}>${inner}</svg>`
    return tint ? tinted(markup, paint(tint.color).color) : markup
  }

  const layerMarkup = async (layer, isRoot) => {
    if (layer.hidden || !layer.resolvedSize?.width) return ''
    const { width, height } = layer.resolvedSize
    const x = isRoot ? 0 : (layer.position?.x ?? 0)
    const y = isRoot ? 0 : (layer.position?.y ?? 0)
    const moves = [x || y ? `translate(${round(x)} ${round(y)})` : '']
    const { rotation = 0, scaleX = 1, scaleY = 1 } = (!isRoot && layer.transform) || {}
    if (rotation) moves.push(`rotate(${round(rotation)})`)
    if (scaleX !== 1 || scaleY !== 1) moves.push(`scale(${round(scaleX)} ${round(scaleY)})`)
    const place = moves.filter(Boolean).join(' ')
    const opacity = Number(layer.style?.opacity ?? 1)

    let content = layer.text ? textOf(layer) : layer.asset ? await assetOf(layer) : await surface(layer)
    const children = (await Promise.all((layer.children ?? []).map(child => layerMarkup(child, false)))).join('')
    if (children) {
      const clips = (layer.style?.overflow ?? 'clip') === 'clip'
      if (clips) {
        const clip = nextId('c')
        defs.push(`<clipPath id="${clip}">${outline(0, 0, width, height, radiusOf(layer, width, height))}/></clipPath>`)
        content += `<g clip-path="url(#${clip})">${children}</g>`
      } else content += children
    }
    const name = layer.name ? ` id="${escape(nextId(`${String(layer.name).replace(/[^\w-]/g, '')}-`))}"` : ''
    return `<g${name}${place ? ` transform="${place}"` : ''}${opacityAttribute('opacity', opacity)}>${content}</g>`
  }

  // A whole board has no size of its own, so its frames set the canvas.
  if (root.type === 'board') {
    const frames = (root.children ?? []).filter(frame => !frame.hidden && frame.resolvedSize?.width)
    const left = Math.min(...frames.map(frame => frame.position.x))
    const top = Math.min(...frames.map(frame => frame.position.y))
    const width = Math.max(...frames.map(frame => frame.position.x + frame.resolvedSize.width)) - left
    const height = Math.max(...frames.map(frame => frame.position.y + frame.resolvedSize.height)) - top
    const body = (await Promise.all(frames.map(frame => layerMarkup(frame, false)))).join('')
    return document(defs, `<g transform="translate(${round(-left)} ${round(-top)})">${body}</g>`, width, height)
  }
  const body = await layerMarkup(root, true)
  return document(defs, body, root.resolvedSize.width, root.resolvedSize.height)
}

const document = (defs, body, width, height) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}" viewBox="0 0 ${round(width)} ${round(height)}">${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${body}</svg>\n`

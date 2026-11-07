// Exporting a layer or a board. Files go to the project's exports folder, because a
// browser download is not dependable inside the Browser pane.
import { el, plural, post, query, report, state, stored, toast, withContext } from './lib.js'

const FORMATS = [['PNG', 'png'], ['JPG', 'jpg'], ['WebP', 'webp'], ['SVG', 'svg'], ['CSS', 'css']]
const SCALES = [0.5, 1, 2, 3, 4]
const RASTER = new Set(['png', 'jpg', 'webp'])

const contexts = () => Object.entries(state.contexts).map(([axis, value]) => `${axis}=${value}`)

const safe = name => String(name).replace(/[^\w.-]+/g, '-')

// The CLI only writes PNG, so the page redraws it in the other formats.
const convert = async (source, scale, format) => {
  const { target, file, name } = source
  const params = { file: target?.filePath ?? file, ref: target?.sourceRef ?? '', path: target?.overridePath ?? '', scale }
  const image = new Image()
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = () => reject(new Error('That layer could not be drawn.'))
    image.src = `export-image?${withContext(params)}`
  })
  const canvas = el('canvas', { width: image.naturalWidth, height: image.naturalHeight })
  const context = canvas.getContext('2d')
  if (format === 'jpg') {
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  context.drawImage(image, 0, 0)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, format === 'jpg' ? 'image/jpeg' : 'image/webp', 0.92))
  const fileName = `${safe(name)}${scale === 1 ? '' : `@${scale}x`}.${format}`
  const response = await fetch(`export-file?${query({ name: fileName })}`, { method: 'POST', body: blob })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error)
  return body.file
}

const run = async (source, format, scales) => {
  if (format === 'jpg' || format === 'webp') return Promise.all(scales.map(scale => convert(source, scale, format)))
  const { files } = await post('export', { ...source, format, scales, contexts: contexts() })
  return files
}

const shown = files => (files.length === 1 ? files[0] : `${plural(files.length, 'file')} to exports`)

export const exportControls = source => {
  let format = stored.get('export-format', 'png')
  let scales = stored.get('export-scales', [1, 2])
  const box = el('div', { className: 'export' })

  const draw = () => {
    const isRaster = RASTER.has(format)
    const count = isRaster ? scales.length : 1
    const go = el('button', {
      className: 'export-go',
      textContent: `Export ${plural(count, 'file')}`,
      disabled: !count,
      onclick: async () => {
        go.disabled = true
        go.textContent = 'Exporting…'
        try {
          const files = await run(source, format, scales.toSorted((a, b) => a - b))
          toast(`Exported ${shown(files)}`, { action: el('button', { textContent: 'Show', onclick: () => post('reveal', {}).catch(report) }) })
        } catch (cause) {
          report(cause)
        }
        draw()
      },
    })
    box.replaceChildren(
      el('div', { className: 'export-row' }, FORMATS.map(([label, value]) =>
        el('button', { textContent: label, ariaPressed: String(value === format), onclick: () => {
          format = value
          stored.set('export-format', format)
          draw()
        } }))),
      isRaster ? el('div', { className: 'export-row' }, SCALES.map(scale =>
        el('button', { className: 'figure', textContent: `${scale}×`, ariaPressed: String(scales.includes(scale)), onclick: () => {
          scales = scales.includes(scale) ? scales.filter(item => item !== scale) : [...scales, scale]
          stored.set('export-scales', scales)
          draw()
        } }))) : null,
      go,
    )
  }
  draw()
  return box
}

// Ask Claude: the page hands a request to the session that opened it.
import { trailOf } from './board.js'
import { closePopover, popover } from './pickers.js'
import { $, el, post, report, state, toast } from './lib.js'

const layerPath = () => (state.selection ? trailOf(state.selection).map(layer => layer.name).join(' › ') : '')

const fileInView = () => state.view.file ?? ''

const send = async text => {
  const file = fileInView()
  const layer = layerPath()
  if (state.project.canAsk) {
    await post('ask', { text, file, layer })
    return toast('Sent to Claude')
  }
  // Opened by hand, there is no session to reach, so the request goes on the clipboard.
  const where = [file && `In the Elyx design ${file}`, layer && `on the layer ${layer}`].filter(Boolean).join(', ')
  await navigator.clipboard.writeText(where ? `${where}: ${text}` : text)
  toast('Copied. Paste it into Claude.')
}

export const openComposer = () => {
  const about = layerPath() || (fileInView() ? fileInView() : state.project.name)
  const input = el('textarea', {
    className: 'field-area',
    placeholder: 'Ask Claude to change something bigger',
    ariaLabel: 'Ask Claude',
    onkeydown: event => {
      if (event.key !== 'Enter' || event.shiftKey) return
      event.preventDefault()
      submit()
    },
  })
  const submit = async () => {
    const text = input.value.trim()
    if (!text) return
    closePopover()
    await send(text).catch(report)
  }
  popover($('orb'), [
    el('div', { className: 'about', textContent: `About ${about}` }),
    input,
    el('button', { className: 'send', textContent: state.project.canAsk ? 'Send' : 'Copy for Claude', onclick: submit }),
  ], { className: 'composer' })
  input.focus()
}

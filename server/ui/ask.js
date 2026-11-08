// Ask Claude: the page hands a request to the session that opened it.
import { trailOf } from './board.js'
import { el, icon, post, report, state, toast } from './lib.js'

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

// What you were writing survives the tab being redrawn, as it is on every click.
let draft = ''

// The Claude tab: an empty space, and the composer at the bottom.
export const claudeBody = () => {
  const about = layerPath() || (fileInView() ? fileInView() : state.project.name)
  const input = el('textarea', {
    placeholder: 'Ask Claude to change something bigger',
    ariaLabel: 'Ask Claude',
    value: draft,
    oninput: () => (draft = input.value),
    onkeydown: event => {
      if (event.key !== 'Enter' || event.shiftKey) return
      event.preventDefault()
      submit()
    },
  })
  const button = el('button', { className: 'send', ariaLabel: state.project.canAsk ? 'Send' : 'Copy for Claude', title: state.project.canAsk ? 'Send' : 'Copy for Claude' }, icon('arrow-up', 14))
  const submit = async () => {
    const text = input.value.trim()
    if (!text) return
    button.disabled = true
    try {
      await send(text)
      input.value = draft = ''
    } catch (cause) {
      report(cause)
    }
    button.disabled = false
  }
  button.onclick = submit
  return el('div', { className: 'rail-body claude' },
    el('div', { className: 'composer-card' }, input, el('div', { className: 'composer-foot' }, icon('file', 13), el('span', { className: 'about', textContent: about, title: about }), button)),
    el('p', { className: 'note', textContent: state.project.canAsk ? 'Goes to the Claude session that opened this canvas.' : 'Copied for you to paste into Claude.' }))
}

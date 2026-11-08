// Share: packs the board in view as a page for a Claude artifact. Claude publishes it
// and answers in the chat; the canvas learns the page's link when Claude saves it, and
// keeps a button to it beside Share. On a canvas opened by hand, the request is copied.
import { $, el, get, post, query, report, state, toast } from './lib.js'

const boardInView = () => {
  const [kind, file] = decodeURIComponent(location.hash.slice(1)).split(':')
  return kind === 'board' ? file : ''
}

const status = file => get(`share-status?${query({ file })}`).catch(() => ({}))

const showLink = url => {
  $('shared').hidden = !url
  if (url) $('shared').href = url
}

export const refreshShared = async () => {
  const file = boardInView()
  showLink(file ? (await status(file)).url : '')
}

// Claude may ask a question first, or be busy, so the page waits a while, then lets go.
const waitForPage = async (board, since) => {
  for (let tries = 0; tries < 90; tries++) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    const { url, updated } = await status(board)
    if (!url || !(updated > since)) continue
    if (boardInView() === board) showLink(url)
    return toast('The shared page is ready', { action: el('a', { href: url, target: '_blank', rel: 'noopener', textContent: 'Open page' }) })
  }
}

export const shareBoard = async () => {
  const button = $('share')
  const label = button.querySelector('.label')
  button.disabled = true
  label.textContent = 'Packing…'
  try {
    const { board, at, sent, text, isUpdate } = await post('share', { file: state.view.file ?? '' })
    if (sent) {
      toast(`Sent to Claude: it will ${isUpdate ? 'update the page' : 'publish the page'} and reply in your chat with the link.`)
    } else {
      await navigator.clipboard.writeText(text)
      toast('Packed. The request is copied: paste it into Claude.')
    }
    waitForPage(board, at)
  } catch (cause) {
    report(cause)
  }
  button.disabled = false
  label.textContent = 'Share'
}

addEventListener('hashchange', refreshShared)
addEventListener('focus', refreshShared)
refreshShared()

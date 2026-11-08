// Share: packs the board in view as a page for a Claude artifact. Claude publishes it,
// or, on a canvas opened by hand, the request is copied to paste into Claude.
import { $, plural, post, report, state, toast } from './lib.js'

export const shareBoard = async () => {
  const button = $('share')
  const label = button.querySelector('span')
  button.disabled = true
  label.textContent = 'Packing…'
  try {
    const { sent, text, frames, isUpdate } = await post('share', { file: state.view.file ?? '' })
    if (sent) {
      toast(`${isUpdate ? 'Updating the shared page' : 'Sharing'} with ${plural(frames, 'frame')}: Claude is publishing it`)
    } else {
      await navigator.clipboard.writeText(text)
      toast('Packed. The request is copied: paste it into Claude.')
    }
  } catch (cause) {
    report(cause)
  }
  button.disabled = false
  label.textContent = 'Share'
}

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { frameIds, sharePage, shareRequest, shareScale } from './share.mjs'

test('frame ids are ASCII, unique, and never a hash claude.ai reserves', () => {
  assert.deepEqual(frameIds(['Home', 'Résumé page', 'home', 'pricingCard_v2', '✦', 'settings', 'comment-1']), [
    'home', 'resume-page', 'home-2', 'pricingcard-v2', 'frame', 'settings-frame', 'comment-1-frame',
  ])
})

test('frames render at 2x unless that passes the pixel budget', () => {
  assert.equal(shareScale({ w: 1440, h: 900 }), 2)
  const scale = shareScale({ w: 1440, h: 9000 })
  assert.ok(scale < 2 && 1440 * 9000 * scale ** 2 <= 1.6e7)
  assert.equal(shareScale({ w: 100000, h: 100000 }), 0.25)
})

test('the page carries its data inline, and no value can close the script', () => {
  const page = sharePage('<title>__TITLE__</title><script type="application/json">__DATA__</script>', { title: 'A & <B>', note: '</script><b>$&' })
  assert.match(page, /<title>A &amp; &lt;B&gt;<\/title>/)
  assert.equal(page.match(/<\/script>/g).length, 1)
  assert.deepEqual(JSON.parse(page.match(/json">(.*)<\/script>/)[1]), { title: 'A & <B>', note: '</script><b>$&' })
})

test('a first share asks for a new artifact, a later one for the same page', () => {
  const files = ['index.html', 'frames/home.png']
  const first = shareRequest({ folder: '/p/exports/share/home', files, title: 'p · home' })
  assert.match(first, /new artifact with publish_files: title "p · home"/)
  assert.match(first, /`index.html`, `frames\/home.png`/)
  assert.match(first, /\/p\/exports\/share\/home\/artifact\.json/)
  const again = shareRequest({ folder: '/p/exports/share/home', files, title: 'p · home', slug: 'abc' })
  assert.match(again, /shared before as the artifact abc: republish to it/)
  assert.doesNotMatch(again, /new artifact with/)
})

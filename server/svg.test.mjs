import assert from 'node:assert/strict'
import { test } from 'node:test'
import { treeToSvg, wrapText } from './svg.mjs'

const box = (fields = {}) => ({ name: 'box', type: 'frame', resolvedSize: { width: 100, height: 40 }, style: { fills: [] }, ...fields })
const solid = color => ({ type: 'solid', color: { token: 'f#c', value: color }, opacity: 1, visible: true })
const svg = (layer, readAsset = async () => null) => treeToSvg(layer, readAsset)

test('sizes the document to the layer, at the origin', async () => {
  const out = await svg(box({ position: { x: 500, y: 300 } }))
  assert.match(out, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="100" height="40" viewBox="0 0 100 40">/)
  assert.doesNotMatch(out, /translate\(500/)
})

test('draws a fill with its radius, reading token colors', async () => {
  const out = await svg(box({ style: { cornerRadius: { value: 8 }, fills: [solid('rgb(255 0 0 / 0.5)')] } }))
  assert.match(out, /<rect x="0" y="0" width="100" height="40" rx="8" fill="#ff0000" fill-opacity="0\.5"\/>/)
})

test('a radius larger than the box stops at a pill', async () => {
  assert.match(await svg(box({ style: { cornerRadius: 999, fills: [solid('rgb(0 0 0 / 1)')] } })), /rx="20"/)
})

test('writes gradients as real gradients', async () => {
  const fill = { type: 'gradient', gradient: 'linear', from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, visible: true, opacity: 1, stops: [{ color: 'rgb(0 0 0 / 1)', position: 0 }, { color: { value: 'rgb(255 255 255 / 1)' }, position: 1 }] }
  const out = await svg(box({ style: { fills: [fill] } }))
  assert.match(out, /<linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#000000"\/><stop offset="1" stop-color="#ffffff"\/>/)
  assert.match(out, /fill="url\(#g1\)"/)
})

test('keeps an inside border within the box', async () => {
  const border = { type: 'solid', color: 'rgb(0 0 0 / 1)', width: 2, position: 'inside', opacity: 1, visible: true }
  assert.match(await svg(box({ style: { fills: [], borders: [border] } })), /<rect x="1" y="1" width="98" height="38" fill="none" stroke="#000000" stroke-width="2"\/>/)
})

test('skips hidden layers', async () => {
  const out = await svg(box({ children: [box({ name: 'gone', hidden: true, position: { x: 1, y: 1 }, style: { fills: [solid('rgb(1 2 3 / 1)')] } })] }))
  assert.doesNotMatch(out, /#010203/)
})

test('clips children to a frame unless it overflows', async () => {
  const child = box({ position: { x: 0, y: 0 }, style: { fills: [solid('rgb(1 2 3 / 1)')] } })
  assert.match(await svg(box({ children: [child] })), /clip-path/)
  assert.doesNotMatch(await svg(box({ style: { overflow: 'visible', fills: [] }, children: [child] })), /clip-path/)
})

const label = (content, fields = {}) => box({
  type: 'text',
  resolvedSize: { width: 100, height: 20 },
  text: { content, align: 'left', font: { family: 'Inter', size: { value: 14 }, style: 'SemiBold', lineHeight: 1.4 } },
  style: { fills: [solid('rgb(10 20 30 / 1)')] },
  ...fields,
})

test('keeps text live, and escapes it', async () => {
  const out = await svg(label('Fish & <chips>'))
  assert.match(out, /<text font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#0a141e"/)
  assert.match(out, /Fish &amp; &lt;chips&gt;<\/tspan>/)
})

test('anchors centered text in the middle of its box', async () => {
  const text = { ...label('x').text, align: 'center' }
  assert.match(await svg(label('x', { text })), /text-anchor="middle"><tspan x="50"|text-anchor="middle" fill/)
})

test('wraps to the line count the height implies', () => {
  assert.deepEqual(wrapText('Notes that find you again.', 216, 26, 2).length, 2)
  assert.deepEqual(wrapText('one line', 200, 14, 1), ['one line'])
  assert.deepEqual(wrapText('a\nb', 200, 14, 2), ['a', 'b'])
})

test('inlines a tinted icon as vector', async () => {
  const icon = box({ type: 'asset', asset: { contents: '/p/x.svg' }, style: { fills: [solid('rgb(255 0 0 / 1)')] } })
  const out = await svg(icon, async () => ({ svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><path d="M1 1"/></svg>' }))
  assert.match(out, /<svg width="100" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff0000" stroke-width="2"><path d="M1 1"\/><\/svg>/)
})

test('a board takes its size from its frames', async () => {
  const frame = (x, y) => box({ position: { x, y } })
  const out = await svg({ type: 'board', children: [frame(-10, -10), frame(200, 100)] })
  assert.match(out, /width="310" height="150"/)
  assert.match(out, /translate\(10 10\)/)
})

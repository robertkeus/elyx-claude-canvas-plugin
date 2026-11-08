import assert from 'node:assert/strict'
import { test } from 'node:test'
import { linksIn, metaLiteral, parseMeta, resolveLinks } from './prototype.mjs'

const screens = `import "./parts.elyx" as Parts

export list = frame {
  width: 390px,
  connections: {target: ::settings},
  children: [card],

  card = frame {
    meta: {transition: "smart", duration: "motion.medium", stable: .true},
    connections: [{target: ::detail, label: "Open \\"trip\\"", route: [{y: -240px, near: -100px}]}, {target: Parts.sheet}],
    children: title,

    title = text {contents: "Trip, ideas {soon}"}
  }
}

export detail = frame {
  connections: [{target: list, label: "Back"}]
}
`

test('linksIn reads every connection with the names that lead to it', () => {
  assert.deepEqual(linksIn(screens), [
    { names: ['list'], target: 'settings', label: '', meta: {} },
    { names: ['list', 'card'], target: 'detail', label: 'Open "trip"', meta: { transition: 'smart', duration: 'motion.medium', stable: true } },
    { names: ['list', 'card'], target: 'Parts.sheet', label: '', meta: { transition: 'smart', duration: 'motion.medium', stable: true } },
    { names: ['detail'], target: 'list', label: 'Back', meta: {} },
  ])
})

test('linksIn finds links in override blocks too', () => {
  const board = 'home = frame : App.home {\n  left: 0px,\n\n  main {\n    button {\n      connections: {target: other, label: "Go"}\n    }\n  }\n}\n'
  assert.deepEqual(linksIn(board), [{ names: ['home', 'main', 'button'], target: 'other', label: 'Go', meta: {} }])
})

test('parseMeta keeps strings, numbers and booleans', () => {
  assert.deepEqual(parseMeta('{transition: "push", duration: 300, easing: "cubic-bezier(0.2, 0, 0, 1)", fast: .false}'), { transition: 'push', duration: 300, easing: 'cubic-bezier(0.2, 0, 0, 1)', fast: false })
  assert.deepEqual(parseMeta(null), {})
})

test('metaLiteral writes a map Elyx accepts, and refuses anything else', () => {
  assert.equal(metaLiteral({ code: 'src/Card.tsx', transition: 'push', duration: 300, stable: true }), '{code: "src/Card.tsx", transition: "push", duration: 300, stable: .true}')
  assert.throws(() => metaLiteral({ 'bad key': 1 }))
  assert.throws(() => metaLiteral({ list: [1] }))
})

test('resolveLinks joins screens on the board, wherever their links are written', () => {
  const frames = [
    { name: 'list', source: { file: 'screens/app.elyx', ref: 'list' } },
    { name: 'detail', source: { file: 'screens/app.elyx', ref: 'detail' } },
    { name: 'settings', source: { file: 'index.elyx', ref: 'settings' } },
  ]
  const linksByFile = {
    'index.elyx': [{ names: ['settings'], target: 'list', label: 'Done', meta: {} }],
    'screens/app.elyx': linksIn(screens),
  }
  assert.deepEqual(resolveLinks(frames, 'index.elyx', linksByFile).map(({ from, path, to, label, file, ref }) => ({ from, path, to, label, file, ref })), [
    { from: 'settings', path: [], to: 'list', label: 'Done', file: 'index.elyx', ref: 'settings' },
    { from: 'list', path: [], to: 'settings', label: '', file: 'screens/app.elyx', ref: 'list' },
    { from: 'list', path: ['card'], to: 'detail', label: 'Open "trip"', file: 'screens/app.elyx', ref: 'list.card' },
    { from: 'detail', path: [], to: 'list', label: 'Back', file: 'screens/app.elyx', ref: 'detail' },
  ])
})

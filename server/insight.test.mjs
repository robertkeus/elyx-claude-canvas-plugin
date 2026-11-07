import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileVersions, indexTree, LOG_FORMAT, mergeIndexes, parseLog } from './insight.mjs'

const tree = {
  children: [
    {
      name: 'signIn',
      position: { x: -680, y: -430 },
      resolvedSize: { width: 1360, height: 860 },
      instanceOf: { file: '/p/blocks/auth.elyx', symbol: 'centerScreen', variant: null },
      style: { fills: [{ color: { token: '/p/tokens/colors.elyx#colors.page', value: 'rgb(0 0 0 / 1)' } }] },
      children: [
        {
          name: 'submit',
          position: { x: 10, y: 20 },
          resolvedSize: { width: 100, height: 40 },
          instanceOf: { file: '/p/components/nav.elyx', symbol: 'item', variant: { file: '/p/components/nav.elyx', symbol: 'itemCurrent' } },
          style: { cornerRadius: { token: '/p/tokens/radius.elyx#radius.md', value: 8 } },
          children: [
            {
              name: 'label',
              position: { x: 5, y: 6 },
              resolvedSize: { width: 20, height: 10 },
              text: { content: 'Sign in', font: { size: { token: '/p/tokens/type.elyx#fontSize.sm', value: 14 } } },
              style: { fills: [{ color: { token: '/p/tokens/colors.elyx#colors.page', value: 'x' } }] },
            },
          ],
        },
      ],
    },
  ],
}

test('finds instances with their position inside the frame', () => {
  const { uses } = indexTree(tree, 'screens/a.elyx')
  assert.deepEqual(uses[1], {
    component: '/p/components/nav.elyx',
    symbol: 'itemCurrent',
    file: 'screens/a.elyx',
    frame: 'signIn',
    path: [0],
    x: 10,
    y: 20,
    w: 100,
    h: 40,
    fw: 1360,
    fh: 860,
  })
})

test('a top-level frame sits at the origin of its own render', () => {
  const { uses } = indexTree(tree, 'screens/a.elyx')
  assert.deepEqual([uses[0].x, uses[0].y, uses[0].path], [0, 0, []])
})

test('collects text with the path that selects it', () => {
  assert.deepEqual(indexTree(tree, 'screens/a.elyx').texts, [{ text: 'Sign in', name: 'label', file: 'screens/a.elyx', frame: 'signIn', path: [0, 0] }])
})

test('merging counts layers per token and per file', () => {
  const relative = file => file.replace('/p/', '')
  const merged = mergeIndexes([indexTree(tree, 'screens/a.elyx'), indexTree(tree, 'screens/b.elyx')], relative)
  assert.deepEqual(merged.tokens['tokens/colors.elyx#colors.page'], { layers: 4, files: { 'screens/a.elyx': 2, 'screens/b.elyx': 2 } })
  assert.equal(merged.components['components/nav.elyx#itemCurrent'].length, 2)
  assert.equal(merged.texts.length, 2)
})

test('a layer counts once per token, however often it uses it', () => {
  const twice = { children: [{ name: 'a', style: { fills: [{ color: { token: 'f#c.x' } }, { color: { token: 'f#c.x' } }] } }] }
  assert.equal(indexTree(twice, 's.elyx').tokens.length, 1)
})

test('the log keeps commits that touch .elyx files', () => {
  const entry = (subject, ...files) => `\0abc\x1fRobert\x1f2026-11-06T10:00:00+01:00\x1f${subject}\n\n${files.join('\n')}\n`
  const commits = parseLog(entry('feat: a', 'A\tscreens/a.elyx', 'M\tREADME.md', 'R100\told.elyx\tscreens/b.elyx') + entry('docs', 'M\tREADME.md'))
  assert.equal(commits.length, 1)
  assert.equal(commits[0].subject, 'feat: a')
  assert.deepEqual(commits[0].files, [
    { file: 'screens/a.elyx', status: 'A' },
    { file: 'screens/b.elyx', status: 'R' },
  ])
})

test('the format separates fields the parser expects', () => {
  assert.ok(LOG_FORMAT.startsWith('%x00') && LOG_FORMAT.includes('%x1f'))
})

const design = () =>
  new Map([
    ['screens/a.elyx', 'import "components/button.elyx" as Button\nimport "../icons/x.svg" as x\n'],
    ['screens/b.elyx', 'plain = frame {}\n'],
    ['components/button.elyx', 'import "./colors.elyx" as Colors\n'],
    ['components/colors.elyx', 'import "./button.elyx" as Button\n'],
  ])

test('a change reaches every file that imports it, however deep', () => {
  const before = fileVersions(design())
  const after = fileVersions(design().set('components/colors.elyx', 'import "./button.elyx" as Button\nexport c = tokens {}\n'))
  assert.notEqual(before['screens/a.elyx'], after['screens/a.elyx'])
  assert.notEqual(before['components/button.elyx'], after['components/button.elyx'])
})

test('a change leaves unrelated files at their version', () => {
  const before = fileVersions(design())
  const after = fileVersions(design().set('components/colors.elyx', '// changed\n'))
  assert.equal(before['screens/b.elyx'], after['screens/b.elyx'])
})

test('an imported asset counts towards the version', () => {
  const before = fileVersions(design(), new Map([['icons/x.svg', '1']]))
  const after = fileVersions(design(), new Map([['icons/x.svg', '2']]))
  assert.equal(before['screens/b.elyx'], after['screens/b.elyx'])
})

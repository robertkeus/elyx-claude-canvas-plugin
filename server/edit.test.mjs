import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blockSource, importAlias, setProperty, setToken, tokenLiteral } from './edit.mjs'

const screen = `import "components/button.elyx" as Button
import "./local.elyx" as Local

// A "quoted" { brace in a comment.
export signIn = frame : Center.centerScreen {
  title: "Sign { in",
  layout: {direction: .column, item-gap: 16px},
  padding-top: 8px,
  padding-left: 8px,

  card {
    heading {
      title {
        contents: "Old"
      }
    }
  }

  form = frame {
    width: 100%,
    fill: Colors.colors.page,

    @with-variant(Nav.current)
    submit = frame : Button.primary {
      width: 100%
    }
  }
}
`

test('replaces a value in an existing override block', () => {
  const out = setProperty(screen, { ref: 'signIn', overridePath: '/A.b.card/A.b.card.heading/A.b.card.heading.title' }, 'contents', '"New"')
  assert.match(out, /contents: "New"/)
  assert.doesNotMatch(out, /"Old"/)
})

test('walks a dotted ref into nested declarations', () => {
  const out = setProperty(screen, { ref: 'signIn.form' }, 'fill', 'Colors.colors.ink')
  assert.match(out, /form = frame \{\s+width: 100%,\s+fill: Colors\.colors\.ink,/)
})

test('opens override blocks the path does not have yet', () => {
  const out = setProperty(screen, { ref: 'signIn.form.submit', overridePath: '/Button.primary.box/Button.primary.box.label' }, 'contents', '"Go"')
  assert.ok(out.includes(`      width: 100%

      box {
        label {
          contents: "Go"
        }
      }
    }
`))
})

test('adds a missing property to the top of the block', () => {
  const out = setProperty(screen, { ref: 'signIn.form.submit' }, 'corner-radius', '4px')
  assert.ok(out.includes('Button.primary {\n      corner-radius: 4px,\n      width: 100%\n'))
})

test('adds to a one-line block in place', () => {
  const source = 'a = frame {\n  label {contents: "Code"}\n}\n'
  assert.equal(setProperty(source, { ref: 'a', overridePath: '/x.label' }, 'font-size', '12'), 'a = frame {\n  label {font-size: 12, contents: "Code"}\n}\n')
})

test('opens a block inside a one-line block on its own lines', () => {
  const source = 'a = frame {\n  b {contents: "x"}\n}\n'
  assert.equal(
    setProperty(source, { ref: 'a', overridePath: '/q.b/q.b.c' }, 'width', '1px'),
    'a = frame {\n  b {contents: "x"\n\n    c {\n      width: 1px\n    }\n  }\n}\n',
  )
})

test('fills an empty block', () => {
  assert.equal(setProperty('a = frame {}\n', { ref: 'a' }, 'width', '1px'), 'a = frame {\n  width: 1px\n}\n')
})

test('changes the gap inside a layout map', () => {
  const out = setProperty(screen, { ref: 'signIn' }, 'layout.item-gap', '4px')
  assert.match(out, /layout: \{direction: \.column, item-gap: 4px\}/)
})

test('adds a gap to a layout map without one', () => {
  const source = 'a = frame {\n  layout: {direction: .row}\n}\n'
  assert.match(setProperty(source, { ref: 'a' }, 'layout.item-gap', '4px'), /layout: \{direction: \.row, item-gap: 4px\}/)
})

test('writes the gap as a key when the block has no layout map', () => {
  assert.match(setProperty(screen, { ref: 'signIn.form.submit' }, 'layout.item-gap', '4px'), /layout\.item-gap: 4px/)
})

test('padding replaces the per-side values', () => {
  const out = setProperty(screen, { ref: 'signIn' }, 'padding', '12px')
  assert.ok(out.includes('  padding: 12px,\n  title: "Sign { in",\n  layout: {direction: .column, item-gap: 16px},\n\n  card {'))
  assert.doesNotMatch(out, /padding-/)
})

test('an unknown ref is refused', () => {
  assert.throws(() => setProperty(screen, { ref: 'signIn.nope' }, 'width', '1px'), /not declared/)
})

test('leaves everything else byte for byte', () => {
  const out = setProperty(screen, { ref: 'signIn.form' }, 'width', '50%')
  assert.equal(out, screen.replace('width: 100%,\n    fill', 'width: 50%,\n    fill'))
})

test('finds the source of a nested declaration', () => {
  assert.equal(blockSource(screen, { ref: 'signIn.form' }).split('\n')[0], '  form = frame {')
  assert.ok(blockSource(screen, { ref: 'signIn.form.submit' }).includes('submit = frame : Button.primary {\n      width: 100%\n    }'))
})

test('an override not written yet shows the nearest block', () => {
  assert.ok(blockSource(screen, { ref: 'signIn.form.submit', overridePath: '/Button.primary.label' }).includes('submit = frame'))
})

const tokens = `@variants(dark.darkColors)
export colors = tokens {
  ink: #232323,
  st-warn: oklch(76.9%, 0.188, 70.08deg),
  page: #ECEEE7
}
`

test('reads and replaces a token value', () => {
  assert.equal(tokenLiteral(tokens, 'colors', 'st-warn'), 'oklch(76.9%, 0.188, 70.08deg)')
  assert.match(setToken(tokens, 'colors', 'st-warn', '#fff'), /st-warn: #fff,\n {2}page/)
})

test('adds a token the group does not set', () => {
  assert.equal(tokenLiteral(tokens, 'colors', 'new'), undefined)
  assert.ok(setToken(tokens, 'colors', 'new', '#000').includes('page: #ECEEE7,\n  new: #000\n}'))
})

test('reuses an import of the token file, relative or from the root', () => {
  const root = '/p'
  assert.equal(importAlias(screen, '/p/screens/a.elyx', '/p/components/button.elyx', root).alias, 'Button')
  assert.equal(importAlias(screen, '/p/screens/a.elyx', '/p/screens/local.elyx', root).alias, 'Local')
})

test('adds an import under a free alias', () => {
  const { source, alias } = importAlias('import "a.elyx" as Colors\n', '/p/s.elyx', '/p/tokens/colors.elyx', '/p')
  assert.equal(alias, 'ColorsTokens')
  assert.equal(source, 'import "a.elyx" as Colors\nimport "tokens/colors.elyx" as ColorsTokens\n')
})
